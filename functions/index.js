const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Sync new leads from credsettle to centralized CRM
exports.syncCredSettleLeads = functions.firestore
  .document('credsettle/{leadId}')
  .onCreate(async (snapshot, context) => {
    const leadData = snapshot.data();
    const leadId = context.params.leadId;
    
    try {
      // Add source and sync metadata
      const crmLeadData = {
        ...leadData,
        original_id: leadId,
        source_database: 'credsettle',
        synced_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Write to centralized CRM collection
      await db.collection('leads').doc(leadId).set(crmLeadData);
      
      console.log(`Successfully synced lead ${leadId} from credsettle to CRM`);
      return null;
    } catch (error) {
      console.error(`Error syncing lead ${leadId} from credsettle:`, error);
      throw error; // This will cause Firebase to retry the function
    }
  });

// Sync new leads from settleloans to centralized CRM
exports.syncSettleLoansLeads = functions.firestore
  .document('settleloans/{leadId}')
  .onCreate(async (snapshot, context) => {
    const leadData = snapshot.data();
    const leadId = context.params.leadId;
    
    try {
      const crmLeadData = {
        ...leadData,
        original_id: leadId,
        source_database: 'settleloans',
        synced_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('leads').doc(leadId).set(crmLeadData);
      
      console.log(`Successfully synced lead ${leadId} from settleloans to CRM`);
      return null;
    } catch (error) {
      console.error(`Error syncing lead ${leadId} from settleloans:`, error);
      throw error;
    }
  });

// Sync new leads from ama to centralized CRM
exports.syncAmaLeads = functions.firestore
  .document('ama/{leadId}')
  .onCreate(async (snapshot, context) => {
    const leadData = snapshot.data();
    const leadId = context.params.leadId;
    
    try {
      const crmLeadData = {
        ...leadData,
        original_id: leadId,
        source_database: 'ama',
        synced_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('leads').doc(leadId).set(crmLeadData);
      
      console.log(`Successfully synced lead ${leadId} from ama to CRM`);
      return null;
    } catch (error) {
      console.error(`Error syncing lead ${leadId} from ama:`, error);
      throw error;
    }
  }); 