import { NextRequest, NextResponse } from 'next/server';
import { amaAppDb } from '@/firebase/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!amaAppDb) {
        return NextResponse.json({ error: 'AMA App Admin not initialized' }, { status: 500 });
    }

    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Dispute ID is required' }, { status: 400 });
        }

        const [parentDocId] = id.split('_');

        // Fetch history from the parent document's dispute_history collection
        // filtered by the unique disputeId (parentDocId_index)
        // Note: We avoid combining .where() + .orderBy() as it requires a composite index.
        // Instead, we filter with .where() and sort in-memory.
        const historyRef = amaAppDb.collection('file_disputes').doc(parentDocId).collection('dispute_history');
        const snapshot = await historyRef
            .where('disputeId', '==', id)
            .get();

        const history = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
            };
        }).sort((a, b) => {
            // Sort by createdAt descending (newest first)
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json(history);
    } catch (error) {
        console.error('Error fetching dispute history:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
