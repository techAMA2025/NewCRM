import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/firebase/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    try {
        const body = await request.json()
        const { action, leadIds, payload } = body

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: "No lead IDs provided" }, { status: 400 })
        }

        const batch = adminDb.batch()
        const leadsRef = adminDb.collection("ama_leads")

        // Process based on action type
        if (action === "assign") {
            const { assignedTo, assignedToId } = payload
            if (!assignedTo || !assignedToId) {
                return NextResponse.json({ error: "Missing assignment details" }, { status: 400 })
            }

            leadIds.forEach((id) => {
                const docRef = leadsRef.doc(id)
                batch.update(docRef, {
                    assignedTo,
                    assignedToId,
                    assigned_to: assignedTo, // Update snake_case field
                    assigned_to_id: assignedToId, // Update snake_case field
                    assignedAt: FieldValue.serverTimestamp(),
                    lastModified: FieldValue.serverTimestamp(),
                })
            })
        } else if (action === "unassign") {
            leadIds.forEach((id) => {
                const docRef = leadsRef.doc(id)
                batch.update(docRef, {
                    assignedTo: "-",
                    assignedToId: "-",
                    assigned_to: "-", // Important for filters
                    assigned_to_id: "-",
                    assignedAt: FieldValue.delete(),
                    lastModified: FieldValue.serverTimestamp(),
                })
            })
        } else if (action === "update_status") {
            const { status } = payload
            if (!status) {
                return NextResponse.json({ error: "Missing status" }, { status: 400 })
            }

            // Prefetch leads to get current status and assignment details
            // This allows us to determine if a target update is needed (e.g. Converted status change)
            // and allows us to use the data for CAPI triggers without re-fetching.
            const leadSnaps = await Promise.all(leadIds.map(id => leadsRef.doc(id).get()))

            interface TargetUpdate {
                userId: string;
                userName: string;
                change: number;
            }
            const targetUpdates: TargetUpdate[] = [];

            leadSnaps.forEach((snap) => {
                if (!snap.exists) return; // Should not happen given leadIds are valid, but safety check

                const id = snap.id
                const docRef = leadsRef.doc(id)
                const data = snap.data();
                const currentStatus = data?.status;

                const updateData: any = {
                    status,
                    lastModified: FieldValue.serverTimestamp(),
                }

                // Add specific timestamps based on status
                if (status === 'Converted') {
                    updateData.convertedAt = FieldValue.serverTimestamp()
                    updateData.convertedToClient = true
                } else {
                    // If status is NOT Converted, remove the converted flags/timestamps
                    updateData.convertedAt = FieldValue.delete()
                    updateData.convertedToClient = FieldValue.delete()
                }

                // Handle Language Barrier (Moved up, Not Answering logic removed)

                // Handle Language Barrier
                if (status === 'Language Barrier' && payload.language) {
                    updateData.language = payload.language
                }

                // --- Status History Logic ---
                // Get existing history or initialize
                const existingHistory = data?.statusHistory || [];
                const newHistoryEntry = {
                    status: status,
                    timestamp: new Date().toISOString(),
                    updatedBy: 'api' // Default, will try to get from user context if available
                };

                // If we have access to the user performing the action, we should use it. 
                // But this route handler doesn't seem to extract user from request easily without auth middleware details.
                // However, target updates logic below extracts userId/Name from the lead doc (assignedTo). 
                // That might not be the *updater*, but the *assignee*.
                // For now, we'll store 'api' or if payload has updatedBy.
                if (payload.updatedBy) {
                    newHistoryEntry.updatedBy = payload.updatedBy;
                }

                let newHistory = [...existingHistory, newHistoryEntry];

                // Enforce Limit of 5 (FIFO)
                if (newHistory.length > 5) {
                    newHistory = newHistory.slice(newHistory.length - 5);
                }

                updateData.statusHistory = newHistory;
                // ---------------------------

                batch.update(docRef, updateData)

                // --- Target Update Logic ---
                // Identify if status changed to/from 'Converted'
                const isConverting = status === 'Converted' && currentStatus !== 'Converted';
                const isDeconverting = status !== 'Converted' && currentStatus === 'Converted';

                if (isConverting || isDeconverting) {
                    // Identify Salesperson
                    // Try assigned_to_id (snake_case) first as per schema seen in 'assign' action
                    // Fallback to assignedToId (camelCase) or userId or assigned_to (name)
                    const assignedToId = data?.assigned_to_id || data?.assignedToId || data?.userId;
                    const assignedToName = data?.assigned_to || data?.assignedTo || 'Unknown';

                    if (assignedToId) {
                        targetUpdates.push({
                            userId: assignedToId,
                            userName: assignedToName,
                            change: isConverting ? 1 : -1
                        });
                    } else if (assignedToName && assignedToName !== 'Unknown') {
                        // Fallback: If no ID but name exists (legacy?), log warning or try name match?
                        // For safety, we prefer ID. But if system relies on names, we might store name as ID? 
                        // Billcut leads uses 'userName' for matching. We should try to find by Name if ID missing.
                        // But best practice is ID. We'll store what we have.
                        targetUpdates.push({
                            userId: '', // Flag to searching by name if needed, or just skip if critical
                            userName: assignedToName,
                            change: isConverting ? 1 : -1
                        });
                    }
                }
            })

            // Meta CAPI Trigger Logic (Moved outside loop, uses pre-fetched leadSnaps)
            // COMMMENTED OUT AS PER REQUEST - META CAPI NOT NEEDED FOR NOW
            /*
            if (status === 'Converted' || status === 'Qualified') {
                const { testEventCode } = payload
                const triggerCapi = async () => {
                    try {
                        for (const snap of leadSnaps) {
                            if (!snap.exists) continue

                            const data = snap.data()
                            if (!data) continue

                            const source = (data.source || "").toLowerCase().trim()
                            if (source.includes("credsettle")) {
                                const email = String(data.email || "")
                                const phone = String(data.phone || data.mobile || data.number || "")

                                if (email || phone) {
                                    console.log(`[CAPI] Triggering for lead ${snap.id} (Source: ${source})`)
                                    fetch("https://www.credsettle.com/api/meta/capi", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            email: email,
                                            phone: phone,
                                            eventName: 'LeadQualified',
                                            status: status,
                                            leadId: snap.id,
                                            testEventCode: testEventCode
                                        })
                                    }).catch(console.error)
                                }
                            }
                        }
                    } catch (err) {
                        console.error("[CAPI ERROR]", err)
                    }
                }
                triggerCapi() // Fire and forget
            }
            */

            // Execute Target Updates (Async, but awaited before response to ensure consistency if possible, 
            // or fire-and-forget if latency concern. Awaiting is safer for "targets updated" guarantee)
            if (targetUpdates.length > 0) {
                await processTargetUpdates(targetUpdates);
            }
        } else if (action === "update_notes") {
            const { salesNotes } = payload
            // Allow empty string to clear notes
            if (salesNotes === undefined) {
                return NextResponse.json({ error: "Missing salesNotes" }, { status: 400 })
            }

            leadIds.forEach((id) => {
                const docRef = leadsRef.doc(id)
                batch.update(docRef, {
                    salesNotes,
                    lastModified: FieldValue.serverTimestamp(),
                })
            })
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        // Commit the batch
        await batch.commit()

        return NextResponse.json({ success: true, count: leadIds.length })
    } catch (error) {
        console.error("Error performing lead action:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// Helper function to process target updates
async function processTargetUpdates(updates: { userId: string, userName: string, change: number }[]) {
    try {
        const now = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonth = monthNames[now.getMonth()];
        const currentYear = now.getFullYear();
        const monthDocId = `${currentMonth}_${currentYear}`;

        const targetsRef = adminDb!.collection('targets');
        const monthDocRef = targetsRef.doc(monthDocId);
        const salesTargetsRef = monthDocRef.collection('sales_targets');

        // We process updates sequentially to handle creation/updates safely
        for (const update of updates) {
            const { userId, userName, change } = update;
            if (!userId && !userName) continue;

            // Query for existing target document
            // If userId is present, use it. If not, fallback to userName (legacy compat)
            let query = salesTargetsRef.limit(1);
            if (userId) {
                query = query.where('userId', '==', userId);
            } else {
                query = query.where('userName', '==', userName);
            }

            const snapshot = await query.get();

            if (!snapshot.empty) {
                // Update existing
                const docRef = snapshot.docs[0].ref;
                // Atomic increment
                await docRef.update({
                    convertedLeads: FieldValue.increment(change),
                    updatedAt: FieldValue.serverTimestamp()
                });
            } else if (change > 0) {
                // Create new (only if incrementing)
                await salesTargetsRef.add({
                    userId: userId || '',
                    userName: userName || 'Unknown',
                    convertedLeads: change,
                    convertedLeadsTarget: 0,
                    amountCollected: 0,
                    amountCollectedTarget: 0,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    createdBy: 'api'
                });
            }
        }
    } catch (error) {
        console.error("Error processing target updates:", error);
        // We do not throw here to avoid failing the main API response
    }
}
