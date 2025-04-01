/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as path from "path";
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

// Use v2 syntax
// export const syncCredSettleLeads = onDocumentCreated({
//   document: 'credsettlee/{leadId}'
// }, async (event) => {
//   const snapshot = event.data;
//   if (!snapshot) return null;
  
//   const leadData = snapshot.data();
//   const leadId = event.params.leadId;
  
//   try {
//     // Add source and sync metadata
//     const crmLeadData = {
//       ...leadData,
//       original_id: leadId,
//       source_database: 'credsettlee',
//       synced_at: admin.firestore.FieldValue.serverTimestamp()
//     };
    
//     // Write to centralized CRM collection
//     await crmDb.collection('crm_leads').doc(leadId).set(crmLeadData);
    
//     logger.info(`Successfully synced lead ${leadId} from credsettlee to CRM`);
//     return null;
//   } catch (error: unknown) {
//     logger.error(`Error syncing lead ${leadId} from credsettlee:`, error);
//     throw error instanceof Error ? error : new Error(String(error)); // Ensure we throw a proper Error
//   }
// });

// export const syncSettleLoansLeads = onDocumentCreated({
//   document: 'settleloans/{leadId}'
// }, async (event) => {
//   const snapshot = event.data;
//   if (!snapshot) return null;
  
//   const leadData = snapshot.data();
//   const leadId = event.params.leadId;
  
//   try {
//     const crmLeadData = {
//       ...leadData,
//       original_id: leadId,
//       source_database: 'settleloans',
//       synced_at: admin.firestore.FieldValue.serverTimestamp()
//     };
    
//     await crmDb.collection('crm_leads').doc(leadId).set(crmLeadData);
    
//     logger.info(`Successfully synced lead ${leadId} from settleloans to CRM`);
//     return null;
//   } catch (error: unknown) {
//     logger.error(`Error syncing lead ${leadId} from settleloans:`, error);
//     throw error instanceof Error ? error : new Error(String(error));
//   }
// });

// export const syncAmaLeads = onDocumentCreated({
//   document: 'ama/{leadId}'
// }, async (event) => {
//   const snapshot = event.data;
//   if (!snapshot) return null;
  
//   const leadData = snapshot.data();
//   const leadId = event.params.leadId;
  
//   try {
//     const crmLeadData = {
//       ...leadData,
//       original_id: leadId,
//       source_database: 'ama',
//       synced_at: admin.firestore.FieldValue.serverTimestamp()
//     };
    
//     await crmDb.collection('crm_leads').doc(leadId).set(crmLeadData);
    
//     logger.info(`Successfully synced lead ${leadId} from ama to CRM`);
//     return null;
//   } catch (error: unknown) {
//     logger.error(`Error syncing lead ${leadId} from ama:`, error);
//     throw error instanceof Error ? error : new Error(String(error));
//   }
// });


// export const syncCredsettleeRealtimeLeads = onDocumentCreated({
//   document: 'Form/{docId}'
// }, async (event) => {
//   const snapshot = event.data;
//   if (!snapshot) return null;
  
//   const context = event.params;
//   const leadData = snapshot.data();
//   const leadId = context.docId;
  
//   try {
//     // Check if this document was created today
//     const creationTime = leadData.created;
//     const startOfToday = new Date();
//     startOfToday.setUTCHours(0, 0, 0, 0);
    
//     if (creationTime < startOfToday.getTime()) {
//       logger.info(`Skipping credsettlee document ${leadId} - not created today`);
//       return null;
//     }
    
//     // Add source and sync metadata
//     const crmLeadData = {
//       ...leadData,
//       original_id: leadId,
//       original_collection: 'Form',
//       source_database: 'credsettlee',
//       synced_at: admin.firestore.FieldValue.serverTimestamp()
//     };
    
//     // Write to centralized CRM collection
//     await crmDb.collection('crm_leads').doc(`credsettlee_${leadId}`).set(crmLeadData);
    
//     logger.info(`Successfully synced lead ${leadId} from credsettlee to CRM in real-time`);
//     return null;
//   } catch (error) {
//     logger.error(`Error syncing lead ${leadId} from credsettlee in real-time:`, error);
//     throw error instanceof Error ? error : new Error(String(error));
//   }
// });


// export const syncSettleloansRealtimeLeads = onDocumentCreated({
//   document: 'ContactPageForm/{docId}'
// }, async (event) => {
//   const snapshot = event.data;
//   if (!snapshot) return null;
  
//   const context = event.params;
//   const leadData = snapshot.data();
//   const leadId = context.docId;
  
//   try {
//     // Check if this document was created today
//     const creationTime = leadData.created;
//     const startOfToday = new Date();
//     startOfToday.setUTCHours(0, 0, 0, 0);
    
//     if (creationTime < startOfToday.getTime()) {
//       logger.info(`Skipping settleloans document ${leadId} - not created today`);
//       return null;
//     }
    
//     const crmLeadData = {
//       ...leadData,
//       original_id: leadId,
//       original_collection: 'ContactPageForm',
//       source_database: 'settleloans',
//       synced_at: admin.firestore.FieldValue.serverTimestamp()
//     };
    
//     await crmDb.collection('crm_leads').doc(`settleloans_${leadId}`).set(crmLeadData);
    
//     logger.info(`Successfully synced lead ${leadId} from settleloans to CRM in real-time`);
//     return null;
//   } catch (error) {
//     logger.error(`Error syncing lead ${leadId} from settleloans in real-time:`, error);
//     throw error instanceof Error ? error : new Error(String(error));
//   }
// });


// export const syncAmaRealtimeLeads = onDocumentCreated({
//   document: 'form/{docId}'
// }, async (event) => {
//   const snapshot = event.data;
//   if (!snapshot) return null;
  
//   const context = event.params;
//   const leadData = snapshot.data();
//   const leadId = context.docId;
  
//   try {
//     // Check if this document was created today
//     const creationTime = leadData.timestamp;
//     const startOfToday = new Date();
//     startOfToday.setUTCHours(0, 0, 0, 0);
    
//     // Handle different timestamp formats - might be a timestamp object or a numeric value
//     let creationDate;
//     if (creationTime && typeof creationTime.toDate === 'function') {
//       creationDate = creationTime.toDate(); // Firestore Timestamp
//     } else if (creationTime && typeof creationTime === 'number') {
//       creationDate = new Date(creationTime); // Milliseconds
//     } else {
//       // Default to current time if timestamp is missing or in unknown format
//       creationDate = new Date();
//       logger.warn(`Unknown timestamp format in ama document ${leadId}, defaulting to current time`);
//     }
    
//     if (creationDate < startOfToday) {
//       logger.info(`Skipping ama document ${leadId} - not created today`);
//       return null;
//     }
    
//     const crmLeadData = {
//       ...leadData,
//       original_id: leadId,
//       original_collection: 'form',
//       source_database: 'ama',
//       synced_at: admin.firestore.FieldValue.serverTimestamp()
//     };
    
//     await crmDb.collection('crm_leads').doc(`ama_${leadId}`).set(crmLeadData);
    
//     logger.info(`Successfully synced lead ${leadId} from ama to CRM in real-time`);
//     return null;
//   } catch (error) {
//     logger.error(`Error syncing lead ${leadId} from ama in real-time:`, error);
//     throw error instanceof Error ? error : new Error(String(error));
//   }
// });

// Scheduled function to sync today's leads every 15 minutes
export const scheduledSyncLeads = onSchedule({
  schedule: "every 15 minutes",
  timeZone: "Asia/Kolkata"
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
        const docRef = crmDb.collection('crm_leads').doc(`credsettlee_${doc.id}`);
        const existingDoc = await docRef.get();
        
        if (!existingDoc.exists) {
          // Only create new documents, never update existing ones
          await docRef.set({
            ...doc.data(),
            original_id: doc.id,
            original_collection: 'Form',
            source_database: 'credsettlee',
            synced_at: admin.firestore.FieldValue.serverTimestamp()
          });
          results.credsettlee++;
          logger.info(`Created new lead from credsettlee: ${doc.id}`);
        } else {
          logger.info(`Skipping existing credsettlee lead: ${doc.id}`);
        }
      }
      logger.info(`Created ${results.credsettlee} new documents from credsettlee Form`);
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
        const docRef = crmDb.collection('crm_leads').doc(`settleloans_${doc.id}`);
        const existingDoc = await docRef.get();
        
        if (!existingDoc.exists) {
          // Only create new documents, never update existing ones
          await docRef.set({
            ...doc.data(),
            original_id: doc.id,
            original_collection: 'ContactPageForm',
            source_database: 'settleloans',
            synced_at: admin.firestore.FieldValue.serverTimestamp()
          });
          results.settleloans++;
          logger.info(`Created new lead from settleloans: ${doc.id}`);
        } else {
          logger.info(`Skipping existing settleloans lead: ${doc.id}`);
        }
      }
      logger.info(`Created ${results.settleloans} new documents from settleloans ContactPageForm`);
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
        const docRef = crmDb.collection('crm_leads').doc(`ama_${doc.id}`);
        const existingDoc = await docRef.get();
        
        if (!existingDoc.exists) {
          // Only create new documents, never update existing ones
          await docRef.set({
            ...doc.data(),
            original_id: doc.id,
            original_collection: 'form',
            source_database: 'ama',
            synced_at: admin.firestore.FieldValue.serverTimestamp()
          });
          results.ama++;
          logger.info(`Created new lead from ama: ${doc.id}`);
        } else {
          logger.info(`Skipping existing ama lead: ${doc.id}`);
        }
      }
      logger.info(`Created ${results.ama} new documents from ama form`);
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
