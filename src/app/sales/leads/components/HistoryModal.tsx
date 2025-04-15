import { FaHistory } from 'react-icons/fa';

type HistoryEntry = {
  content: string;
  createdAt: string | Date;
  createdBy: string;
  createdById: string;
  displayDate?: string;
  leadId: string;
  assignedById: string;
};

type HistoryModalProps = {
  showHistoryModal: boolean;
  setShowHistoryModal: (show: boolean) => void;
  currentHistory: HistoryEntry[];
};

const HistoryModal = ({ 
  showHistoryModal, 
  setShowHistoryModal, 
  currentHistory 
}: HistoryModalProps) => {
  if (!showHistoryModal) return null;
  
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-gray-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6 border border-gray-700">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="bg-gray-900 rounded-md text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close modal"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div>
            <h3 className="text-lg leading-6 font-medium text-blue-400 mb-3" id="history-modal-title">
              Sales Notes History
            </h3>
            
            {currentHistory.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <FaHistory className="mx-auto h-10 w-10 text-gray-600 mb-3" />
                <p>No history available for this lead yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {(() => {
                  // Filter out entries without createdAt field
                  const validHistory = currentHistory.filter(entry => entry.createdAt != null);
                  
                  // Create a new sorted array to avoid mutating the original
                  const sortedHistory = [...validHistory].sort((a, b) => {
                    // Helper function to safely parse any date format
                    const parseDate = (dateInput: string | Date): number => {
                      try {
                        // Handle Date objects
                        if (dateInput instanceof Date) {
                          return dateInput.getTime();
                        }
                        
                        // Handle Firestore timestamp objects
                        if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
                          // @ts-ignore - Handle Firestore Timestamp objects
                          return dateInput.seconds * 1000;
                        }
                        
                        // Handle displayDate format directly if available
                        if (typeof a.displayDate === 'string' && typeof b.displayDate === 'string') {
                          // Parse date in format: "4/4/2025, 12:07:20 pm"
                          const parseDisplayDate = (displayDate: string) => {
                            const [datePart, timePart] = displayDate.split(', ');
                            if (!datePart || !timePart) return 0;
                            
                            const [month, day, year] = datePart.split('/');
                            const [timePortion, ampm] = timePart.split(' ');
                            const [hours, minutes, seconds] = timePortion.split(':');
                            
                            let hour = parseInt(hours);
                            if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
                            if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
                            
                            return new Date(
                              parseInt(year),
                              parseInt(month) - 1,
                              parseInt(day),
                              hour,
                              parseInt(minutes),
                              seconds ? parseInt(seconds) : 0
                            ).getTime();
                          };
                          
                          return parseDisplayDate(b.displayDate) - parseDisplayDate(a.displayDate);
                        }
                        
                        // Handle string formats
                        if (typeof dateInput === 'string') {
                          // Handle "April 4, 2025 at 11:08:27 AM UTC+5:30" format
                          if (dateInput.includes(' at ')) {
                            return new Date(dateInput.replace(/\s+at\s+/, ' ')).getTime();
                          }
                          
                          // Handle "Apr 02, 2025, 04:04 PM" format
                          if (dateInput.includes(', ')) {
                            return new Date(dateInput).getTime();
                          }
                          
                          return new Date(dateInput).getTime();
                        }
                        
                        // Fallback
                        return 0;
                      } catch (e) {
                        console.error('Error parsing date:', e, dateInput);
                        return 0;
                      }
                    };
                    
                    // First try to use displayDate which is likely already formatted consistently
                    if (a.displayDate && b.displayDate) {
                      return new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime();
                    }
                    
                    // Fallback to parsing createdAt
                    const timeA = parseDate(a.createdAt);
                    const timeB = parseDate(b.createdAt);
                    
                    // Sort descending (newest first)
                    return timeB - timeA;
                  });
                  
                  // Return the mapped components
                  return sortedHistory.map((entry, index) => (
                    <div key={`history-${entry.leadId}-${index}-${entry.createdById}`} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-500">
                            {entry.displayDate || (entry.createdAt instanceof Date 
                              ? entry.createdAt.toLocaleString('en-US', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit', 
                                  minute: '2-digit'
                                }) 
                              : new Date(entry.createdAt).toLocaleString('en-US', {
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit', 
                                  minute: '2-digit'
                                }))}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                      </div>
                      
                      {/* Display creator name */}
                      {entry.createdBy && (
                        <div className="mb-2 text-xs">
                          <span className="text-gray-500">Created by: </span>
                          <span className="text-yellow-400">
                            {entry.createdBy}
                          </span>
                        </div>
                      )}
                      
                      <div className="mt-1 whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-2 rounded border border-gray-700">
                        {entry.content || <span className="text-gray-500 italic">No content</span>}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
            
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal; 