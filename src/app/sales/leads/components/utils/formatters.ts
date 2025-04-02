// Date and text formatting utilities

export const formatPhoneNumber = (phone: string) => {
  if (!phone) return '';
  
  // Return original if format doesn't match
  return phone;
}

export const getFormattedDate = (lead: any): { date: string, time: string } => {
  let date = null;
  
  // Prioritize synced_at field
  if (lead.synced_at) {
    if (lead.synced_at.toDate) {
      // Handle Firestore timestamps
      date = lead.synced_at.toDate();
    } else if (typeof lead.synced_at === 'number') {
      // Handle numeric timestamps
      date = new Date(lead.synced_at);
    } else {
      // Handle string dates or Date objects
      date = new Date(lead.synced_at);
    }
  }
  // Fallbacks if synced_at doesn't exist
  else if (lead.lastModified) {
    date = lead.lastModified instanceof Date ? lead.lastModified : 
          (lead.lastModified.toDate ? lead.lastModified.toDate() : new Date(lead.lastModified));
  }
  else if (lead.timestamp) {
    date = lead.timestamp instanceof Date ? lead.timestamp :
          (lead.timestamp.toDate ? lead.timestamp.toDate() : new Date(lead.timestamp));
  }
  else if (lead.created) {
    date = new Date(lead.created);
  }
  
  if (!date || isNaN(date.getTime())) {
    return { date: 'N/A', time: '' };
  }
  
  // Format the date: "Mar 28, 2023"
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  // Format the time: "10:45 AM"
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return { date: formattedDate, time: formattedTime };
};

export const getLastModifiedDate = (lead: any) => {
  try {
    // Always use lastModified field for the "Last Modified" column
    if (lead.lastModified) {
      const date = lead.lastModified instanceof Date ? lead.lastModified : 
                  (lead.lastModified?.toDate ? lead.lastModified.toDate() : new Date(lead.lastModified));
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    return 'Never updated';
  } catch (error) {
    console.error('Error formatting lastModified date:', error);
    return 'Error';
  }
}; 