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
  updateDoc,
  getDoc,
  addDoc,
  setDoc
} from 'firebase/firestore';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const lastCreatedAtParam = searchParams.get('lastCreatedAt');
    const lastIdParam = searchParams.get('lastId');
    const searchQuery = searchParams.get('search');
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');
    const loggedInFilter = searchParams.get('loggedIn');

    const collectionRef = collection(db, 'login_users');
    let q;
    let total = 0;

    const isFiltered = searchQuery || (roleFilter && roleFilter !== 'all') || (statusFilter && statusFilter !== 'all') || (loggedInFilter && loggedInFilter !== 'all');

    if (!isFiltered) {
      // Optimized path for no filters
      const countSnapshot = await getCountFromServer(collectionRef);
      total = countSnapshot.data().count;

      q = query(
        collectionRef,
        orderBy('created_at', 'desc'),
        orderBy('__name__', 'desc'),
        limit(limitParam)
      );

      if (lastIdParam) {
        const docRef = doc(db, 'login_users', lastIdParam);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          q = query(
            collectionRef,
            orderBy('created_at', 'desc'),
            orderBy('__name__', 'desc'),
            startAfter(docSnap),
            limit(limitParam)
          );
        }
      }

      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          created_at: data.created_at,
          email: data.email,
          name: data.name,
          otp: data.otp,
          phone: data.phone,
          role: data.role,
          start_date: data.start_date,
          status: data.status,
          topic: data.topic,
          updated_at: data.updated_at,
          service_type: data.service_type
        };
      });

      return NextResponse.json({
        users,
        total,
        hasMore: users.length === limitParam
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

    } else {
      // Filtered path: Fetch all, filter in memory, paginate in memory
      const allDocsQuery = query(collectionRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(allDocsQuery);

      let allUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          created_at: data.created_at,
          email: data.email,
          name: data.name,
          otp: data.otp,
          phone: data.phone,
          role: data.role,
          start_date: data.start_date,
          status: data.status,
          topic: data.topic,
          updated_at: data.updated_at,
          service_type: data.service_type
        };
      });

      // Apply Filters
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase().trim();
        allUsers = allUsers.filter(user =>
          (user.name && user.name.toLowerCase().includes(queryLower)) ||
          (user.email && user.email.toLowerCase().includes(queryLower)) ||
          (user.phone && user.phone.includes(queryLower))
        );
      }

      if (roleFilter && roleFilter !== 'all') {
        allUsers = allUsers.filter(user => user.role === roleFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        allUsers = allUsers.filter(user => user.status === statusFilter);
      }

      if (loggedInFilter && loggedInFilter !== 'all') {
        if (loggedInFilter === 'yes') {
          allUsers = allUsers.filter(user => user.otp !== undefined && user.otp !== null);
        } else if (loggedInFilter === 'no') {
          allUsers = allUsers.filter(user => user.otp === undefined || user.otp === null);
        }
      }

      total = allUsers.length;

      // Apply Pagination
      let startIndex = 0;
      if (lastIdParam) {
        const lastIndex = allUsers.findIndex(u => u.id === lastIdParam);
        if (lastIndex !== -1) {
          startIndex = lastIndex + 1;
        }
      }

      const paginatedUsers = allUsers.slice(startIndex, startIndex + limitParam);

      return NextResponse.json({
        users: paginatedUsers,
        total,
        hasMore: startIndex + limitParam < total
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
  } catch (error) {
    console.error('Error fetching app users:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Fields that are allowed to be updated
    const allowedFields = ['email', 'name', 'otp', 'phone', 'role', 'start_date', 'status', 'topic', 'service_type'];
    const dataToUpdate: any = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    dataToUpdate.updated_at = Math.floor(Date.now() / 1000);

    const userRef = doc(db, 'login_users', id);
    await updateDoc(userRef, dataToUpdate);

    return NextResponse.json({ success: true, updatedFields: dataToUpdate });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();

    // Basic validation
    if (!body.email || !body.name || !body.phone) {
      return NextResponse.json({ error: 'Missing required fields (email, name, phone)' }, { status: 400 });
    }

    // Calculate week_topic
    const startDate = new Date(body.start_date || new Date());
    const day = startDate.getDate();
    let week_topic = 'fourth_week';

    if (day >= 1 && day <= 7) {
      week_topic = 'first_week';
    } else if (day >= 8 && day <= 14) {
      week_topic = 'second_week';
    } else if (day >= 15 && day <= 22) {
      week_topic = 'third_week';
    }

    const rawPhone = String(body.phone);
    const phone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const docId = phone;

    const newUser = {
      ...body,
      phone,
      id: docId,
      week_topic,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
      // Ensure defaults if not provided
      role: body.role || 'user',
      status: body.status || 'active',
      start_date: body.start_date || new Date().toISOString().split('T')[0]
    };

    // Use setDoc with the custom ID
    await setDoc(doc(db, 'login_users', docId), newUser);

    return NextResponse.json({ success: true, id: docId, user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
