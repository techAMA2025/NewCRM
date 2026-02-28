import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

import { db } from '@/firebase/ama_app';
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    doc,
    getDoc
} from 'firebase/firestore';

export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    try {
        const searchParams = request.nextUrl.searchParams;
        const limitParam = parseInt(searchParams.get('limit') || '50');
        const lastSubmittedAtParam = searchParams.get('lastSubmittedAt');
        const lastIdParam = searchParams.get('lastId');
        const searchQuery = searchParams.get('search')?.trim();
        const statusFilter = searchParams.get('status');

        const collectionRef = collection(db, 'file_disputes');
        const snapshot = await getDocs(collectionRef);

        let allDisputes: any[] = [];

        // Create a unique ID for the disputes and store them
        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.disputes && Array.isArray(data.disputes)) {
                data.disputes.forEach((dispute: any, index: number) => {
                    allDisputes.push({
                        ...dispute,
                        parentDocId: docSnap.id,
                        arrayIndex: index,
                        id: `${docSnap.id}_${index}`,
                        status: dispute.status || 'No Status',
                        remarks: dispute.remarks || ''
                    });
                });
            }
        });

        // JOIN with user data from login_users BEFORE filtering so we can search by userPhone
        const uniqueUserIds = Array.from(new Set(allDisputes.map(d => d.parentDocId)));
        const userMap: { [key: string]: { email?: string; phone?: string } } = {};

        // Fetch user docs in parallel for all users involved
        await Promise.all(uniqueUserIds.map(async (uid) => {
            if (!uid) return;
            try {
                const userDocRef = doc(db, 'login_users', uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    userMap[uid] = {
                        email: userData.email,
                        phone: userData.phone
                    };
                }
            } catch (err) {
                console.error(`Error fetching user data for ${uid}:`, err);
            }
        }));

        // Map user data to ALL disputes before filtering
        allDisputes = allDisputes.map(dispute => ({
            ...dispute,
            userEmail: userMap[dispute.parentDocId]?.email || '',
            userPhone: userMap[dispute.parentDocId]?.phone || ''
        }));

        // Filter by search query
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const queryDigits = searchQuery.replace(/\D/g, '');

            allDisputes = allDisputes.filter(d => {
                // Name match
                if (d.name && d.name.toLowerCase().includes(lowerQuery)) return true;

                // Phone match (digit-only comparison)
                if (queryDigits) {
                    const leadPhoneDigits = String(d.phone || '').replace(/\D/g, '');
                    const userPhoneDigits = String(d.userPhone || '').replace(/\D/g, '');
                    if (leadPhoneDigits.includes(queryDigits)) return true;
                    if (userPhoneDigits.includes(queryDigits)) return true;
                }

                // Fallback literal match for userPhone/email in case they are non-numeric strings
                if (d.userPhone && String(d.userPhone).includes(searchQuery)) return true;
                if (d.userEmail && d.userEmail.toLowerCase().includes(lowerQuery)) return true;

                return false;
            });
        }

        // Filter by status
        if (statusFilter && statusFilter !== 'all') {
            if (statusFilter === 'No Status') {
                allDisputes = allDisputes.filter(d => ['No Status', '', null, undefined].includes(d.status));
            } else {
                allDisputes = allDisputes.filter(d => d.status === statusFilter);
            }
        }

        // Sort by submittedAt desc
        allDisputes.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

        const total = allDisputes.length;

        // Implement manual pagination
        let startIndex = 0;
        if (lastSubmittedAtParam && lastIdParam) {
            const lastSubmittedAt = parseInt(lastSubmittedAtParam);
            startIndex = allDisputes.findIndex(d => d.submittedAt === lastSubmittedAt && d.id === lastIdParam) + 1;
        }

        const paginatedDisputes = allDisputes.slice(startIndex, startIndex + limitParam);

        return NextResponse.json({
            disputes: paginatedDisputes,
            total: total,
            hasMore: startIndex + limitParam < total
        });
    } catch (error) {
        console.error('Error fetching disputes:', error);
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
            return NextResponse.json({ error: 'Dispute ID is required' }, { status: 400 });
        }

        // Split id into parentDocId and arrayIndex
        const [parentDocId, indexStr] = id.split('_');
        const arrayIndex = parseInt(indexStr);

        if (isNaN(arrayIndex)) {
            return NextResponse.json({ error: 'Invalid Dispute ID format' }, { status: 400 });
        }

        const docRef = amaAppDb.collection('file_disputes').doc(parentDocId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Parent document not found' }, { status: 404 });
        }

        const data = docSnap.data();
        if (!data || !data.disputes || !data.disputes[arrayIndex]) {
            return NextResponse.json({ error: 'Dispute not found in array' }, { status: 404 });
        }

        const disputes = [...data.disputes];
        const dispute = { ...disputes[arrayIndex], ...updates };
        disputes[arrayIndex] = dispute;

        // Check if remarks were updated for history
        if (updates.remarks !== undefined) {
            // For history, we might want to store it at the parent level or handle it differently
            // Since the child doesn't have its own doc, let's just update the array for now.
            // If the user wants full history modal support, we'd need a sub-collection on the parent
            // that references the array index or a unique field like submittedAt.

            const historyRef = docRef.collection('dispute_history');
            await historyRef.add({
                disputeId: id, // docId_index
                submittedAt: dispute.submittedAt,
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

        await docRef.update({ disputes });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating dispute:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
