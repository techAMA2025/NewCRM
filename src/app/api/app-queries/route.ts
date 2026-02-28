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
  where,
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
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const lastSubmittedAtParam = searchParams.get('lastSubmittedAt'); // Changed from lastCreatedAt
    const lastIdParam = searchParams.get('lastId');
    const searchQuery = searchParams.get('search');
    const statusFilter = searchParams.get('status');

    const collectionRef = collection(db, 'allQueries');
    let q;
    let total = 0;

    if (searchQuery) {
      const trimmedQuery = searchQuery.trim();
      // Search logic
      if (/^\d+$/.test(trimmedQuery)) {
        q = query(
          collectionRef,
          where('phone', '>=', trimmedQuery),
          where('phone', '<=', trimmedQuery + '\uf8ff'),
          limit(limitParam)
        );
      } else {
        // Search by query text
        q = query(
          collectionRef,
          where('query', '>=', trimmedQuery),
          where('query', '<=', trimmedQuery + '\uf8ff'),
          limit(limitParam)
        );
      }
    } else if (statusFilter && statusFilter !== 'all') {
      // Status filter logic
      q = query(
        collectionRef,
        where('status', '==', statusFilter),
        orderBy('submitted_at', 'desc'),
        limit(limitParam)
      );
      // Pagination with filter
      if (lastSubmittedAtParam && lastIdParam) {
        const lastSubmittedAt = parseInt(lastSubmittedAtParam);
        if (!isNaN(lastSubmittedAt)) {
          q = query(
            collectionRef,
            where('status', '==', statusFilter),
            orderBy('submitted_at', 'desc'),
            orderBy('__name__', 'desc'),
            startAfter(lastSubmittedAt, lastIdParam),
            limit(limitParam)
          );
        }
      }
    } else {
      // Default list
      const countSnapshot = await getCountFromServer(collectionRef);
      total = countSnapshot.data().count;

      q = query(
        collectionRef,
        orderBy('submitted_at', 'desc'),
        orderBy('__name__', 'desc'),
        limit(limitParam)
      );

      if (lastSubmittedAtParam && lastIdParam) {
        const lastSubmittedAt = parseInt(lastSubmittedAtParam);
        if (!isNaN(lastSubmittedAt)) {
          q = query(
            collectionRef,
            orderBy('submitted_at', 'desc'),
            orderBy('__name__', 'desc'),
            startAfter(lastSubmittedAt, lastIdParam),
            limit(limitParam)
          );
        }
      }
    }

    const snapshot = await getDocs(q);

    const queries = snapshot.docs.map(doc => {
      const data = doc.data();
      // Normalize status
      let status = data.status;
      if (status === 'resolved' && !data.resolved_at) {
        // If no resolved_at, maybe it's not really resolved or old data?
        // Keep as is.
      } else if (data.resolved_at && status !== 'resolved') {
        status = 'resolved';
      }

      return {
        id: doc.id,
        queryId: data.queryId,
        query: data.query,
        status: status,
        role: data.role,
        phone: data.phone,
        posted_by: data.posted_by,
        submitted_at: data.submitted_at,
        resolved_at: data.resolved_at,
        resolved_by: data.resolved_by,
        alloc_adv: data.alloc_adv,
        alloc_adv_secondary: data.alloc_adv_secondary,
        parentDocId: data.parentDocId,
        remarks: data.remarks
      };
    });

    return NextResponse.json({
      queries,
      total: searchQuery || (statusFilter && statusFilter !== 'all') ? queries.length : total,
      hasMore: queries.length === limitParam
    });
  } catch (error) {
    console.error('Error fetching app queries:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, status, remarks, resolved_by } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const dataToUpdate: any = {};

    if (status) dataToUpdate.status = status;
    if (remarks !== undefined) dataToUpdate.remarks = remarks;
    if (resolved_by) {
      dataToUpdate.resolved_by = resolved_by;
      // If marking as resolved, set timestamp if not present, or update it
      if (status === 'resolved') {
        dataToUpdate.resolved_at = Math.floor(Date.now() / 1000);
      }
    }

    const docRef = doc(db, 'allQueries', id);
    await updateDoc(docRef, dataToUpdate);

    return NextResponse.json({ success: true, updatedFields: dataToUpdate });
  } catch (error) {
    console.error('Error updating query:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
