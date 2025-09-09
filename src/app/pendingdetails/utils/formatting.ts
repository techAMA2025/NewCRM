import { Lead } from '../types/lead'

// Format phone number for better readability
export const formatPhoneNumber = (phone: string) => {
  if (!phone) return '';
  
  // Remove non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's an international number
  if (cleaned.length > 10) {
    // Format as international with the country code
    return `+${cleaned.slice(0, cleaned.length-10)} ${cleaned.slice(-10, -5)} ${cleaned.slice(-5)}`;
  } else if (cleaned.length === 10) {
    // Format as regular 10-digit number
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // Return original if format doesn't match
  return phone;
}

// Get formatted date for a lead based on its source
export const getFormattedDate = (lead: Lead) => {
  try {
    // Get date based on source database - prioritize source-specific fields
    if (lead.source_database === 'ama' && lead.timestamp) {
      // For AMA, use timestamp field
      const timestamp = lead.timestamp;
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } 
    
    if (lead.source_database === 'credsettlee' && lead.date) {
      // For CredSettle, use date field directly
      const date = typeof lead.date === 'number' ? new Date(lead.date) : new Date(lead.date);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } 
    
    if (lead.source_database === 'settleloans' && lead.created) {
      // For SettleLoans, use created field
      const date = typeof lead.created === 'number' ? new Date(lead.created) : 
                 (lead.created?.toDate ? lead.created.toDate() : new Date(lead.created));
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    
    // Fall back to lastModified if source-specific field is not available
    if (lead.lastModified) {
      let date: Date;
      
      if (lead.lastModified instanceof Date) {
        date = lead.lastModified;
      } else if (lead.lastModified?.toDate && typeof lead.lastModified.toDate === 'function') {
        date = lead.lastModified.toDate();
      } else if (typeof lead.lastModified === 'string' || typeof lead.lastModified === 'number') {
        date = new Date(lead.lastModified);
      } else {
        date = new Date();
      }
      
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Get appropriate color class for financial values
export const getFinancialColor = (type: string) => {
  switch(type) {
    case 'pl': return 'text-yellow-400 font-medium';
    case 'cc': return 'text-blue-400 font-medium';
    case 'income': return 'text-green-400 font-medium';
    default: return 'text-gray-300';
  }
}

// Type guard to check if the object is a Firestore Timestamp
export function isFirestoreTimestamp(value: any): value is { toDate: () => Date } {
  return value && typeof value.toDate === 'function';
}

// Calculate the completeness of a lead
export const calculateLeadCompleteness = (lead: Lead): { 
  percentage: number, 
  missingFields: string[] 
} => {
  // Define required fields for a complete client record
  const requiredFields = [
    { name: 'name', label: 'Name' },
    { name: 'phone', label: 'Phone Number' },
    { name: 'email', label: 'Email' },
    { name: 'city', label: 'City' },
    { name: 'occupation', label: 'Occupation' },
    { name: 'personalLoanDues', label: 'Personal Loan Dues' },
    { name: 'creditCardDues', label: 'Credit Card Dues' },
    { name: 'monthlyIncome', label: 'Monthly Income' },
    { name: 'tenure', label: 'Tenure' },
    { name: 'monthlyFees', label: 'Monthly Fees' },
    { name: 'startDate', label: 'Start Date' },
  ];
  
  // Check if banks information exists and is not empty
  const hasBanks = lead.banks && lead.banks.length > 0;
  if (!hasBanks) {
    requiredFields.push({ name: 'banks', label: 'Bank Details' });
  }
  
  // Count how many required fields are filled
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    if (!lead[field.name] || lead[field.name] === '') {
      missingFields.push(field.label);
    }
  });
  
  const filledFields = requiredFields.length - missingFields.length;
  const percentage = Math.round((filledFields / requiredFields.length) * 100);
  
  return { percentage, missingFields };
};