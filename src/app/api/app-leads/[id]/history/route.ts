import { NextRequest, NextResponse } from "next/server"
import { amaAppDb } from "@/firebase/firebase-admin"
import { verifyAuth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    if (!amaAppDb) {
        return NextResponse.json({ error: "AMA App Admin not initialized" }, { status: 500 });
    }

    try {
        const { id } = await params;
        const leadId = id;
        if (!leadId) {
            return NextResponse.json({ error: "Missing lead ID" }, { status: 400 })
        }

        const historyRef = amaAppDb
            .collection("leads")
            .doc(leadId)
            .collection("history")
            .orderBy("createdAt", "desc");

        const snapshot = await historyRef.get();

        const history = snapshot.docs.map((doc) => {
            const data = doc.data();

            // Format displayDate as dd-mm-yyyy if possible
            let displayDate = data.displayDate;
            if (!displayDate && data.createdAt) {
                const date = data.createdAt.toDate();
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                displayDate = `${day}-${month}-${year}, ${time}`;
            }

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString(),
                displayDate: displayDate
            };
        });

        return NextResponse.json(history);
    } catch (error) {
        console.error("Error fetching app lead history:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
