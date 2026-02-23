import { FaHistory } from 'react-icons/fa';
import { HistoryItem } from '../../../billcutleads/types';

type HistoryModalProps = {
  showHistoryModal: boolean;
  setShowHistoryModal: (show: boolean) => void;
  currentHistory: HistoryItem[];
};

const HistoryModal = ({ 
  showHistoryModal, 
  setShowHistoryModal, 
  currentHistory 
}: HistoryModalProps) => {
  if (!showHistoryModal) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40" 
        onClick={() => setShowHistoryModal(false)}
        aria-hidden="true"
      ></div>
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-blue-400" id="history-modal-title">
            Sales Notes History
          </h3>
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Close modal"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div 
          className="flex-1 overflow-y-auto pr-2 overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
            
          {currentHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <FaHistory className="mx-auto h-10 w-10 text-gray-600 mb-3" />
              <p>No history available for this lead yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
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
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-sm font-medium text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal; 