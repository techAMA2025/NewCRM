import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin";
import { verifyAuth } from "@/lib/auth";

// Map source_database values to standardized source names
const SOURCE_DATABASE_MAP: Record<string, string> = {
    ama: "AMA",
    billcut: "Billcut",
    credsettlee: "Credsettle",
    settleloans: "Settleloans",
};

export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    if (!adminDb) {
        return NextResponse.json(
            { error: "Firebase Admin not initialized" },
            { status: 500 }
        );
    }

    try {
        const settlementsRef = adminDb.collection("settlements");
        const clientsRef = adminDb.collection("clients");

        // Fetch all settlements
        const settlementsSnapshot = await settlementsRef.get();

        let processed = 0;
        let skipped = 0;
        let updated = 0;
        let clientNotFound = 0;
        let noSourceDatabase = 0;
        let unknownSource = 0;
        const errors: string[] = [];

        // Cache client documents to avoid repeated lookups
        const clientCache: Record<string, { source_database?: string } | null> = {};

        // Process settlements in batches of 500 (Firestore batch limit)
        const BATCH_SIZE = 500;
        let batch = adminDb.batch();
        let batchCount = 0;

        for (const settlementDoc of settlementsSnapshot.docs) {
            processed++;
            const settlementData = settlementDoc.data();

            // Skip if source field already exists and is non-empty
            if (settlementData.source && settlementData.source.trim() !== "") {
                skipped++;
                continue;
            }

            const clientId = settlementData.clientId;

            if (!clientId) {
                errors.push(
                    `Settlement ${settlementDoc.id}: No clientId field found`
                );
                continue;
            }

            // Look up client from cache or Firestore
            let clientData = clientCache[clientId];
            if (clientData === undefined) {
                // Not in cache yet, fetch from Firestore
                try {
                    const clientDoc = await clientsRef.doc(clientId).get();
                    if (clientDoc.exists) {
                        clientData = clientDoc.data() as { source_database?: string };
                    } else {
                        clientData = null;
                    }
                    clientCache[clientId] = clientData;
                } catch (err) {
                    errors.push(
                        `Settlement ${settlementDoc.id}: Error fetching client ${clientId}: ${err}`
                    );
                    continue;
                }
            }

            if (clientData === null) {
                clientNotFound++;
                continue;
            }

            const sourceDatabase = clientData.source_database;

            if (!sourceDatabase || sourceDatabase.trim() === "") {
                noSourceDatabase++;
                continue;
            }

            // Map source_database to standardized source name
            const sourceLower = sourceDatabase.toLowerCase().trim();
            const mappedSource = SOURCE_DATABASE_MAP[sourceLower];

            if (!mappedSource) {
                unknownSource++;
                errors.push(
                    `Settlement ${settlementDoc.id}: Unknown source_database value "${sourceDatabase}" from client ${clientId}`
                );
                continue;
            }

            // Add update to batch
            batch.update(settlementDoc.ref, { source: mappedSource });
            batchCount++;
            updated++;

            // Commit batch when it reaches the limit
            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                batch = adminDb.batch();
                batchCount = 0;
            }
        }

        // Commit any remaining updates
        if (batchCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalProcessed: processed,
                updated,
                skipped,
                clientNotFound,
                noSourceDatabase,
                unknownSource,
                errors: errors.length,
            },
            errors: errors.length > 0 ? errors.slice(0, 50) : [], // Limit error output
        });
    } catch (error) {
        console.error("Error backfilling settlement sources:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: String(error) },
            { status: 500 }
        );
    }
}
