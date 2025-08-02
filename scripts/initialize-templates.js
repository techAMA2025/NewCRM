// Script to initialize Firebase with default WhatsApp templates
// Run this script once to populate the database with existing templates

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  // This should match your project's configuration
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default templates to add to Firebase
const defaultTemplates = [
  // Sales Templates
  {
    name: "CIBIL",
    templateName: "ama_dashboard_credit_report",
    description: "Send CIBIL credit report information",
    type: "sales",
    isActive: true
  },
  {
    name: "Answered Call",
    templateName: "ama_dashboard_after_call",
    description: "Follow-up after answered call",
    type: "sales",
    isActive: true
  },
  {
    name: "Loan Settlement?",
    templateName: "ama_dashboard_loan_settlement1",
    description: "Ask about loan settlement",
    type: "sales",
    isActive: true
  },
  {
    name: "No Answer",
    templateName: "ama_dashboard_no_answer",
    description: "Follow-up for unanswered calls",
    type: "sales",
    isActive: true
  },
  {
    name: "What we do?",
    templateName: "ama_dashboard_struggling1",
    description: "Explain what AMA Legal Solutions does",
    type: "sales",
    isActive: true
  },
  // Advocate Templates
  {
    name: "Send Feedback Message",
    templateName: "advocate_feedback_20250801",
    description: "Send feedback request message to client",
    type: "advocate",
    isActive: true
  }
];

async function initializeTemplates() {
  try {
    console.log('Starting template initialization...');
    
    const templatesRef = collection(db, 'whatsappTemplates');
    
    for (const template of defaultTemplates) {
      const docRef = await addDoc(templatesRef, {
        ...template,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`Added template: ${template.name} (${template.type}) - ID: ${docRef.id}`);
    }
    
    console.log('✅ All templates initialized successfully!');
    console.log('You can now manage these templates through the Template Manager interface.');
    
  } catch (error) {
    console.error('❌ Error initializing templates:', error);
  }
}

// Run the initialization
initializeTemplates(); 