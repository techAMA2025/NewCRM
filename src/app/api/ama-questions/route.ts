import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/ama_app';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  doc,
  updateDoc
} from 'firebase/firestore';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '20');
    const lastTimestampParam = searchParams.get('lastTimestamp');
    const lastIdParam = searchParams.get('lastId');

    const collectionRef = collection(db, 'questions');
    let q;
    let total = 0;

    // Get total count
    const countSnapshot = await getCountFromServer(collectionRef);
    total = countSnapshot.data().count;

    // Default query
    q = query(
      collectionRef,
      orderBy('timestamp', 'desc'),
      orderBy('__name__', 'desc'),
      limit(limitParam)
    );

    // Pagination
    if (lastTimestampParam && lastIdParam) {
      const lastTimestamp = parseInt(lastTimestampParam);
      if (!isNaN(lastTimestamp)) {
        q = query(
          collectionRef,
          orderBy('timestamp', 'desc'),
          orderBy('__name__', 'desc'),
          startAfter(lastTimestamp, lastIdParam),
          limit(limitParam)
        );
      }
    }

    const snapshot = await getDocs(q);

    const questions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        answer: data.answer,
        commentsCount: data.commentsCount || 0,
        content: data.content,
        phone: data.phone,
        profileImgUrl: data.profileImgUrl,
        timestamp: data.timestamp,
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole
      };
    });

    return NextResponse.json({
      questions,
      total,
      hasMore: questions.length === limitParam
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, answer } = body;

    if (!id || !answer) {
      return NextResponse.json({ error: 'Missing id or answer' }, { status: 400 });
    }

    const docRef = doc(db, 'questions', id);
    await updateDoc(docRef, {
      answer: answer
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
