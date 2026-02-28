import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

import { db } from '@/firebase/ama_app';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  where
} from 'firebase/firestore';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const lastCreatedAtParam = searchParams.get('lastCreatedAt');
    const lastIdParam = searchParams.get('lastId');
    const searchQuery = searchParams.get('search');
    const statusFilter = searchParams.get('status');

    const collectionRef = collection(db, 'leads');
    let q;
    let total = 0;

    // Base query filters
    let baseFilters = [];
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'No Status') {
        baseFilters.push(where('status', 'in', ['No Status', '', null]));
      } else {
        baseFilters.push(where('status', '==', statusFilter));
      }
    }

    if (searchQuery) {
      const trimmedQuery = searchQuery.trim();

      // ... existing search logic ...
      // Note: Firestore doesn't allow multiple inequalities on different fields.
      // Search already uses inequalities on 'phone' or 'name'.
      // If status filter is also present, it's an equality, so it should be fine.

      if (/^\d+$/.test(trimmedQuery)) {
        q = query(
          collectionRef,
          ...baseFilters,
          where('phone', '>=', trimmedQuery),
          where('phone', '<=', trimmedQuery + '\uf8ff'),
          limit(limitParam)
        );
      } else {
        q = query(
          collectionRef,
          ...baseFilters,
          where('name', '>=', trimmedQuery),
          where('name', '<=', trimmedQuery + '\uf8ff'),
          limit(limitParam)
        );
      }
    } else {
      // Default pagination logic
      // Get total count only for default view (or with status filter)
      const countQuery = query(collectionRef, ...baseFilters);
      const countSnapshot = await getCountFromServer(countQuery);
      total = countSnapshot.data().count;

      q = query(
        collectionRef,
        ...baseFilters,
        orderBy('created_at', 'desc'),
        orderBy('__name__', 'desc'),
        limit(limitParam)
      );

      if (lastCreatedAtParam && lastIdParam) {
        const lastCreatedAt = parseInt(lastCreatedAtParam);
        if (!isNaN(lastCreatedAt)) {
          q = query(
            collectionRef,
            ...baseFilters,
            orderBy('created_at', 'desc'),
            orderBy('__name__', 'desc'),
            startAfter(lastCreatedAt, lastIdParam),
            limit(limitParam)
          );
        }
      }
    }

    const snapshot = await getDocs(q);

    const leads = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        created_at: data.created_at,
        email: data.email,
        name: data.name,
        phone: data.phone,
        query: data.query,
        source: data.source,
        state: data.state,
        status: data.status || 'No Status',
        remarks: data.remarks || ''
      };
    });

    return NextResponse.json({
      leads,
      total: searchQuery ? leads.length : total, // Approximate total for search
      hasMore: leads.length === limitParam
    });
  } catch (error) {
    console.error('Error fetching app leads:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

import { amaAppDb } from '@/firebase/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  if (!amaAppDb) {
    return NextResponse.json({ error: 'AMA App Admin not initialized' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, user, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const docRef = amaAppDb.collection('leads').doc(id);

    // Check if remarks were updated
    if (updates.remarks !== undefined) {
      const historyRef = docRef.collection('history');
      await historyRef.add({
        content: updates.remarks,
        createdBy: user?.name || 'Unknown User',
        createdById: user?.uid || '',
        createdAt: FieldValue.serverTimestamp(),
        displayDate: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      });
    }

    await docRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating app lead:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
