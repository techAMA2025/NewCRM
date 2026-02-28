import { NextRequest, NextResponse } from 'next/server';
import { amaAppDb, amaAppMessaging } from '@/firebase/firebase-admin';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { user_id, topic, n_title, n_body, send_weekly } = body;

    if (!user_id || !topic || !n_title || !n_body) {
      return NextResponse.json({
        success: false,
        message: "user_id, topic, n_title and n_body are required",
      }, { status: 400 });
    }

    const topics = Array.isArray(topic) ? topic : [topic];

    // Verify app admin initialized
    if (!amaAppDb || !amaAppMessaging) {
      console.error("Firebase Admin (Ama App) not initialized");
      return NextResponse.json({
        success: false,
        message: "Service configuration error: AMA App Admin not initialized",
      }, { status: 500 });
    }

    const db = amaAppDb;
    const messaging = amaAppMessaging;

    const messagePayload = {
      notification: {
        title: n_title,
        body: n_body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        notification: {
          sound: "default",
          priority: "high" as const,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
          "apns-topic": "com.ama.amaLegalSolutions",
        },
        payload: {
          aps: {
            alert: {
              title: n_title,
              body: n_body,
            },
            sound: "default",
            badge: 1,
            "content-available": 1,
          },
        },
      },
    };

    const unixTs = Math.floor(Date.now() / 1000);

    const baseMessageDoc = {
      n_title,
      n_body,
      timestamp: unixTs,
      sent_by: user_id,
      topics,
      send_weekly: !!send_weekly,
    };

    if (send_weekly) {
      const weekTopics = topics; // e.g., ["first_week", "third_week"]

      // Send notification once per topic
      const sendPromises = weekTopics.map((week: string) => {
        const msg = { ...messagePayload, topic: week };
        return messaging.send(msg); // only 1 send per topic
      });

      await Promise.all(sendPromises);

      const messageDoc = {
        n_title,
        n_body,
        timestamp: unixTs,
        sent_by: user_id,
        topics: weekTopics,
        week_notification: true,
      };

      await db
        .collection("notifications")
        .doc("client")
        .collection("messages")
        .add(messageDoc);

      await db
        .collection("notification_history")
        .doc(user_id)
        .collection("messages")
        .add({
          ...baseMessageDoc,
          week_notification: true,
        });

      return NextResponse.json({
        success: true,
        message: `Weekly notification sent to topic(s): ${weekTopics.join(", ")}`,
      });

    } else {
      // DEFAULT LOGIC (all_clients / all_advocates / all_users)
      const sendResults = await Promise.allSettled(topics.map(async (t: string) => {
        try {
          const msg = { ...messagePayload, topic: t };
          const messageId = await messaging.send(msg);
          console.log(`[Notification] Successfully sent to topic ${t}: ${messageId}`);
          return { topic: t, messageId, success: true };
        } catch (err) {
          console.error(`[Notification] Failed to send to topic ${t}:`, err);
          throw err;
        }
      }));

      const successCount = sendResults.filter(r => r.status === 'fulfilled').length;
      if (successCount === 0 && topics.length > 0) {
        // If all failed, throw the first error to go to catch block
        const firstFailure = sendResults.find(r => r.status === 'rejected');
        throw new Error(`All notifications failed. First error: ${firstFailure?.reason}`);
      }

      const messageDoc = {
        n_title,
        n_body,
        timestamp: unixTs,
        sent_by: user_id,
        topics: topics,
      };

      const rolesToStore: string[] = [];

      if (topics.includes("all_clients")) rolesToStore.push("client");
      if (topics.includes("all_advocates")) rolesToStore.push("advocate");
      if (topics.includes("all_users")) rolesToStore.push("user");

      const storePromises = rolesToStore.map((role) =>
        db
          .collection("notifications")
          .doc(role)
          .collection("messages")
          .add(messageDoc)
      );

      await Promise.all(storePromises);

      await db
        .collection("notification_history")
        .doc(user_id)
        .collection("messages")
        .add(baseMessageDoc);

      return NextResponse.json({
        success: true,
        message: `Notification sent to topic(s): ${topics.join(", ")}`,
      });
    }

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to send notification",
      error: error.message || String(error),
    }, { status: 500 });
  }
}
