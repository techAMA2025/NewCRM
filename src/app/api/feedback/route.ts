import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/ama_app';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer
} from 'firebase/firestore';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const lastSubmittedAtParam = searchParams.get('lastSubmittedAt');
    const lastIdParam = searchParams.get('lastId');

    const collectionRef = collection(db, 'feedback');
    let q;
    let total = 0;

    // Get total count
    const countSnapshot = await getCountFromServer(collectionRef);
    total = countSnapshot.data().count;

    q = query(
      collectionRef,
      orderBy('submittedAt', 'desc'),
      orderBy('__name__', 'desc'),
      limit(limitParam)
    );

    if (lastSubmittedAtParam && lastIdParam) {
      q = query(
        collectionRef,
        orderBy('submittedAt', 'desc'),
        orderBy('__name__', 'desc'),
        startAfter(lastSubmittedAtParam, lastIdParam),
        limit(limitParam)
      );
    }

    const snapshot = await getDocs(q);

    const feedbacks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        feedback: data.feedback,
        rate: data.rate,
        submittedAt: data.submittedAt
      };
    });

    return NextResponse.json({
      feedbacks,
      total,
      hasMore: feedbacks.length === limitParam
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}













