import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin";
import { verifyAuth } from "@/lib/auth";

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
        const clientsRef = adminDb.collection("clients");
        const clientsSnapshot = await clientsRef.get();

        let processed = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        const BATCH_SIZE = 500;
        let batch = adminDb.batch();
        let batchCount = 0;

        for (const clientDoc of clientsSnapshot.docs) {
            processed++;
            const clientData = clientDoc.data();

            // Determine agreement type based on source_database
            // source billcut -> pps
            // others -> retainer
            const sourceDatabase = (clientData.source_database || "").toLowerCase().trim();
            const newAgreementType = sourceDatabase === "billcut" ? "pps" : "retainer";

            // Skip if it already has the correct agreementType to avoid unnecessary writes
            if (clientData.agreementType === newAgreementType) {
                skipped++;
                continue;
            }

            batch.update(clientDoc.ref, { agreementType: newAgreementType });
            batchCount++;
            updated++;

            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                batch = adminDb.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalProcessed: processed,
                updated,
                skipped,
                errors: errors.length,
            },
        });
    } catch (error) {
        console.error("Error backfilling client agreement types:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: String(error) },
            { status: 500 }
        );
    }
}
