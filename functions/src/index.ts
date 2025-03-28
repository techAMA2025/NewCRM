/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


// import * as functionsV2 from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as path from "path";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";


// Initialize primary Firebase app (for CRM)
admin.initializeApp({
  // Default app uses the credentials from environment
}, "crm");

// Initialize the other Firebase apps
const credsettleeApp = admin.initializeApp({
  credential: admin.credential.cert(
    require(path.join(__dirname, "../service-accounts/credsettle-key.json"))
  )
}, "credsettlee");

const settleloansApp = admin.initializeApp({
  credential: admin.credential.cert(
    require(path.join(__dirname, "../service-accounts/settleloans-key.json"))
  )
}, "settleloans");

const amaApp = admin.initializeApp({
  credential: admin.credential.cert(
    require(path.join(__dirname, "../service-accounts/ama-key.json"))
  )
}, "amalegalsolutionss");

// Get Firestore instances for each app
const crmDb = admin.app("crm").firestore();
const credsettleeDb = credsettleeApp.firestore();
const settleloansDb = settleloansApp.firestore();
const amaDb = amaApp.firestore();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// Hello world function to demonstrate onRequest and logger usage
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// Test function to check connection to all databases and specific collections
export const testSpecificCollections = onRequest(async (request, response) => {
  try {
    const results: {
      credsettlee: { Form: number | string },
      settleloans: { ContactPageForm: number | string },
      ama: { form: number | string }
    } = {
      credsettlee: { Form: 0 },
      settleloans: { ContactPageForm: 0 },
      ama: { form: 0 }
    };
    
    // Test Credsettlee's "Form" collection
    try {
      const snapshot = await credsettleeDb.collection('Form').limit(10).get();
      results.credsettlee.Form = snapshot.size;
    } catch (error: unknown) {
      logger.error('Error accessing credsettlee Form collection:', error);
      results.credsettlee.Form = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    // Test Settleloans' "ContactPageForm" collection
    try {
      const snapshot = await settleloansDb.collection('ContactPageForm').limit(10).get();
      results.settleloans.ContactPageForm = snapshot.size;
    } catch (error: unknown) {
      logger.error('Error accessing settleloans ContactPageForm collection:', error);
      results.settleloans.ContactPageForm = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    // Test AMA's "form" collection
    try {
      const snapshot = await amaDb.collection('form').limit(10).get();
      results.ama.form = snapshot.size;
    } catch (error: unknown) {
      logger.error('Error accessing ama form collection:', error);
      results.ama.form = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    response.json({
      success: true,
      results
    });
  } catch (error: unknown) {
    logger.error('Error testing specific collections:', error);
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Sync only today's data from specific collections across databases
export const syncTodaysLeads = onRequest(async (request, response) => {
  try {
    // Calculate start of today in UTC
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    
    // Start of today in milliseconds (for numeric timestamps)
    const startOfTodayMs = startOfToday.getTime();
    
    logger.info(`Syncing leads from ${startOfToday.toISOString()} (${startOfTodayMs} ms)`);
    
    const results: {
      credsettlee: number;
      settleloans: number;
      ama: number;
      errors: string[];
    } = {
      credsettlee: 0,
      settleloans: 0,
      ama: 0,
      errors: []
    };
    
    // Sync from Credsettlee "Form" collection - uses "created" field with numeric timestamp
    try {
      const snapshot = await credsettleeDb.collection('Form')
        .where('created', '>=', startOfTodayMs)
        .get();
      
      logger.info(`Found ${snapshot.size} documents from credsettlee Form created today`);
      
      for (const doc of snapshot.docs) {
        await crmDb.collection('crm_leads').doc(`credsettlee_${doc.id}`).set({
          ...doc.data(),
          original_id: doc.id,
          original_collection: 'Form',
          source_database: 'credsettlee',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        });
        results.credsettlee++;
      }
      logger.info(`Synced ${results.credsettlee} documents from credsettlee Form`);
    } catch (error) {
      logger.error('Error syncing from credsettlee Form:', error);
      results.errors.push(`Error syncing from credsettlee Form: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Sync from Settleloans "ContactPageForm" collection - uses "created" field with numeric timestamp
    try {
      const snapshot = await settleloansDb.collection('ContactPageForm')
        .where('created', '>=', startOfTodayMs)
        .get();
      
      logger.info(`Found ${snapshot.size} documents from settleloans ContactPageForm created today`);
      
      for (const doc of snapshot.docs) {
        await crmDb.collection('crm_leads').doc(`settleloans_${doc.id}`).set({
          ...doc.data(),
          original_id: doc.id,
          original_collection: 'ContactPageForm',
          source_database: 'settleloans',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        });
        results.settleloans++;
      }
      logger.info(`Synced ${results.settleloans} documents from settleloans ContactPageForm`);
    } catch (error) {
      logger.error('Error syncing from settleloans ContactPageForm:', error);
      results.errors.push(`Error syncing from settleloans ContactPageForm: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Sync from AMA "form" collection - uses "timestamp" field with Firestore timestamp
    try {
      const snapshot = await amaDb.collection('form')
        .where('timestamp', '>=', startOfToday)
        .get();
      
      logger.info(`Found ${snapshot.size} documents from ama form created today`);
      
      for (const doc of snapshot.docs) {
        await crmDb.collection('crm_leads').doc(`ama_${doc.id}`).set({
          ...doc.data(),
          original_id: doc.id,
          original_collection: 'form',
          source_database: 'ama',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        });
        results.ama++;
      }
      logger.info(`Synced ${results.ama} documents from ama form`);
    } catch (error) {
      logger.error('Error syncing from ama form:', error);
      results.errors.push(`Error syncing from ama form: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    response.json({
      success: true,
      results,
      query: {
        startOfToday: startOfToday.toISOString(),
        startOfTodayMs: startOfTodayMs
      }
    });
  } catch (error) {
    logger.error('Error in syncTodaysLeads:', error);
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Manual sync function to copy all existing data
export const manualSync = onRequest(async (request, response) => {
  try {
    const results: {
      credsettlee: number;
      settleloans: number;
      ama: number;
      errors: string[];
    } = {
      credsettlee: 0,
      settleloans: 0,
      ama: 0,
      errors: []
    };
    
    // Sync credsettlee
    try {
      const credsettleeSnapshot = await crmDb.collection('credsettlee').get();
      for (const doc of credsettleeSnapshot.docs) {
        await crmDb.collection('crm_leads').doc(doc.id).set({
          ...doc.data(),
          original_id: doc.id,
          source_database: 'credsettlee',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        });
        results.credsettlee++;
      }
      logger.info(`Synced ${results.credsettlee} documents from credsettlee`);
    } catch (error: unknown) {
      logger.error('Error syncing credsettlee:', error);
      results.errors.push(`Error syncing credsettlee: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Sync settleloans
    try {
      const settleloansSnapshot = await crmDb.collection('settleloans').get();
      for (const doc of settleloansSnapshot.docs) {
        await crmDb.collection('crm_leads').doc(doc.id).set({
          ...doc.data(),
          original_id: doc.id,
          source_database: 'settleloans',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        });
        results.settleloans++;
      }
      logger.info(`Synced ${results.settleloans} documents from settleloans`);
    } catch (error: unknown) {
      logger.error('Error syncing settleloans:', error);
      results.errors.push(`Error syncing settleloans: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Sync ama
    try {
      const amaSnapshot = await crmDb.collection('ama').get();
      for (const doc of amaSnapshot.docs) {
        await crmDb.collection('crm_leads').doc(doc.id).set({
          ...doc.data(),
          original_id: doc.id,
          source_database: 'ama',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        });
        results.ama++;
      }
      logger.info(`Synced ${results.ama} documents from ama`);
    } catch (error: unknown) {
      logger.error('Error syncing ama:', error);
      results.errors.push(`Error syncing ama: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    response.json({
      success: true,
      results
    });
  } catch (error: unknown) {
    logger.error('Error in manual sync:', error);
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Use v2 syntax
export const syncCredSettleLeads = onDocumentCreated('credsettlee/{leadId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  
  const leadData = snapshot.data();
  const leadId = event.params.leadId;
  
  try {
    // Add source and sync metadata
    const crmLeadData = {
      ...leadData,
      original_id: leadId,
      source_database: 'credsettlee',
      synced_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Write to centralized CRM collection
    await crmDb.collection('crm_leads').doc(leadId).set(crmLeadData);
    
    logger.info(`Successfully synced lead ${leadId} from credsettlee to CRM`);
    return null;
  } catch (error: unknown) {
    logger.error(`Error syncing lead ${leadId} from credsettlee:`, error);
    throw error instanceof Error ? error : new Error(String(error)); // Ensure we throw a proper Error
  }
});

export const syncSettleLoansLeads = onDocumentCreated('settleloans/{leadId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  
  const leadData = snapshot.data();
  const leadId = event.params.leadId;
  
  try {
    const crmLeadData = {
      ...leadData,
      original_id: leadId,
      source_database: 'settleloans',
      synced_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await crmDb.collection('crm_leads').doc(leadId).set(crmLeadData);
    
    logger.info(`Successfully synced lead ${leadId} from settleloans to CRM`);
    return null;
  } catch (error: unknown) {
    logger.error(`Error syncing lead ${leadId} from settleloans:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
});

export const syncAmaLeads = onDocumentCreated('ama/{leadId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  
  const leadData = snapshot.data();
  const leadId = event.params.leadId;
  
  try {
    const crmLeadData = {
      ...leadData,
      original_id: leadId,
      source_database: 'ama',
      synced_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await crmDb.collection('crm_leads').doc(leadId).set(crmLeadData);
    
    logger.info(`Successfully synced lead ${leadId} from ama to CRM`);
    return null;
  } catch (error: unknown) {
    logger.error(`Error syncing lead ${leadId} from ama:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
});

// Optional: Add a function to test if collections exist
export const testCollections = onRequest(async (request, response) => {
  try {
    const collections: Record<string, number | string> = {};
    
    try {
      collections['credsettlee'] = (await crmDb.collection('credsettlee').limit(1).get()).size;
    } catch (e: unknown) {
      collections['credsettlee'] = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    try {
      collections['settleloans'] = (await crmDb.collection('settleloans').limit(1).get()).size;
    } catch (e: unknown) {
      collections['settleloans'] = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    try {
      collections['ama'] = (await crmDb.collection('ama').limit(1).get()).size;
    } catch (e: unknown) {
      collections['ama'] = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    response.json({
      success: true,
      collections
    });
  } catch (error: unknown) {
    logger.error('Error testing collections:', error);
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Replace the v1 function with v2 syntax
export const syncCredsettleeRealtimeLeads = onDocumentCreated({
  document: 'Form/{docId}',
  maxInstances: 10
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;
  
  const context = event.params;
  const leadData = snapshot.data();
  const leadId = context.docId;
  
  try {
    // Check if this document was created today
    const creationTime = leadData.created;
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    
    if (creationTime < startOfToday.getTime()) {
      logger.info(`Skipping credsettlee document ${leadId} - not created today`);
      return null;
    }
    
    // Add source and sync metadata
    const crmLeadData = {
      ...leadData,
      original_id: leadId,
      original_collection: 'Form',
      source_database: 'credsettlee',
      synced_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Write to centralized CRM collection
    await crmDb.collection('crm_leads').doc(`credsettlee_${leadId}`).set(crmLeadData);
    
    logger.info(`Successfully synced lead ${leadId} from credsettlee to CRM in real-time`);
    return null;
  } catch (error) {
    logger.error(`Error syncing lead ${leadId} from credsettlee in real-time:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
});

// Real-time sync function for Settleloans
export const syncSettleloansRealtimeLeads = onDocumentCreated({
  document: 'ContactPageForm/{docId}',
  maxInstances: 10
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;
  
  const context = event.params;
  const leadData = snapshot.data();
  const leadId = context.docId;
  
  try {
    // Check if this document was created today
    const creationTime = leadData.created;
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    
    if (creationTime < startOfToday.getTime()) {
      logger.info(`Skipping settleloans document ${leadId} - not created today`);
      return null;
    }
    
    const crmLeadData = {
      ...leadData,
      original_id: leadId,
      original_collection: 'ContactPageForm',
      source_database: 'settleloans',
      synced_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await crmDb.collection('crm_leads').doc(`settleloans_${leadId}`).set(crmLeadData);
    
    logger.info(`Successfully synced lead ${leadId} from settleloans to CRM in real-time`);
    return null;
  } catch (error) {
    logger.error(`Error syncing lead ${leadId} from settleloans in real-time:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
});

// Real-time sync function for AMA
export const syncAmaRealtimeLeads = onDocumentCreated({
  document: 'form/{docId}',
  maxInstances: 10
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;
  
  const context = event.params;
  const leadData = snapshot.data();
  const leadId = context.docId;
  
  try {
    // Check if this document was created today
    const creationTime = leadData.timestamp;
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    
    // Handle different timestamp formats - might be a timestamp object or a numeric value
    let creationDate;
    if (creationTime && typeof creationTime.toDate === 'function') {
      creationDate = creationTime.toDate(); // Firestore Timestamp
    } else if (creationTime && typeof creationTime === 'number') {
      creationDate = new Date(creationTime); // Milliseconds
    } else {
      // Default to current time if timestamp is missing or in unknown format
      creationDate = new Date();
      logger.warn(`Unknown timestamp format in ama document ${leadId}, defaulting to current time`);
    }
    
    if (creationDate < startOfToday) {
      logger.info(`Skipping ama document ${leadId} - not created today`);
      return null;
    }
    
    const crmLeadData = {
      ...leadData,
      original_id: leadId,
      original_collection: 'form',
      source_database: 'ama',
      synced_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await crmDb.collection('crm_leads').doc(`ama_${leadId}`).set(crmLeadData);
    
    logger.info(`Successfully synced lead ${leadId} from ama to CRM in real-time`);
    return null;
  } catch (error) {
    logger.error(`Error syncing lead ${leadId} from ama in real-time:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
});

// Scheduled function to sync today's leads every 15 minutes
export const scheduledSyncLeads = onSchedule({
  schedule: "every 15 minutes",
  timeZone: "Asia/Kolkata", // Using Indian timezone
  retryCount: 3,
  maxInstances: 1,
}, async (context) => {
  try {
    logger.info("Starting scheduled sync of today's leads");
    
    // Calculate start of today in UTC
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    
    // Start of today in milliseconds (for numeric timestamps)
    const startOfTodayMs = startOfToday.getTime();
    
    logger.info(`Syncing leads from ${startOfToday.toISOString()} (${startOfTodayMs} ms)`);
    
    const results: {
      credsettlee: number;
      settleloans: number;
      ama: number;
      errors: string[];
    } = {
      credsettlee: 0,
      settleloans: 0,
      ama: 0,
      errors: []
    };
    
    // Sync from Credsettlee "Form" collection - uses "created" field with numeric timestamp
    try {
      const snapshot = await credsettleeDb.collection('Form')
        .where('created', '>=', startOfTodayMs)
        .get();
      
      logger.info(`Found ${snapshot.size} documents from credsettlee Form created today`);
      
      for (const doc of snapshot.docs) {
        await crmDb.collection('crm_leads').doc(`credsettlee_${doc.id}`).set({
          ...doc.data(),
          original_id: doc.id,
          original_collection: 'Form',
          source_database: 'credsettlee',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); // Use merge to avoid overwriting existing data
        results.credsettlee++;
      }
      logger.info(`Synced ${results.credsettlee} documents from credsettlee Form`);
    } catch (error) {
      logger.error('Error syncing from credsettlee Form:', error);
      results.errors.push(`Error syncing from credsettlee Form: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Sync from Settleloans "ContactPageForm" collection - uses "created" field with numeric timestamp
    try {
      const snapshot = await settleloansDb.collection('ContactPageForm')
        .where('created', '>=', startOfTodayMs)
        .get();
      
      logger.info(`Found ${snapshot.size} documents from settleloans ContactPageForm created today`);
      
      for (const doc of snapshot.docs) {
        await crmDb.collection('crm_leads').doc(`settleloans_${doc.id}`).set({
          ...doc.data(),
          original_id: doc.id,
          original_collection: 'ContactPageForm',
          source_database: 'settleloans',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); // Use merge to avoid overwriting existing data
        results.settleloans++;
      }
      logger.info(`Synced ${results.settleloans} documents from settleloans ContactPageForm`);
    } catch (error) {
      logger.error('Error syncing from settleloans ContactPageForm:', error);
      results.errors.push(`Error syncing from settleloans ContactPageForm: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Sync from AMA "form" collection - uses "timestamp" field with Firestore timestamp
    try {
      const snapshot = await amaDb.collection('form')
        .where('timestamp', '>=', startOfToday)
        .get();
      
      logger.info(`Found ${snapshot.size} documents from ama form created today`);
      
      for (const doc of snapshot.docs) {
        await crmDb.collection('crm_leads').doc(`ama_${doc.id}`).set({
          ...doc.data(),
          original_id: doc.id,
          original_collection: 'form',
          source_database: 'ama',
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); // Use merge to avoid overwriting existing data
        results.ama++;
      }
      logger.info(`Synced ${results.ama} documents from ama form`);
    } catch (error) {
      logger.error('Error syncing from ama form:', error);
      results.errors.push(`Error syncing from ama form: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Add a record of this sync to a sync_logs collection
    await crmDb.collection('sync_logs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      results: results,
      schedule: "every 15 minutes"
    });
    
    logger.info(`Scheduled sync completed with results:`, results);
  } catch (error) {
    logger.error('Error in scheduledSyncLeads:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
});
