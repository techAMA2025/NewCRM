import { useState, useEffect } from 'react';
import { FaHistory } from 'react-icons/fa';
import { authFetch } from '@/lib/authFetch';

export type AppHistoryItem = {
  content: string;
  createdAt: any;
  createdBy: string;
  createdById: string;
  displayDate?: string;
  id: string;
};

type AppLeadsHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName?: string;
  apiPath?: string;
};

const AppLeadsHistoryModal = ({ isOpen, onClose, leadId, leadName, apiPath = '/api/app-leads' }: AppLeadsHistoryModalProps) => {
  const [history, setHistory] = useState<AppHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !leadId) return;
      
      setLoading(true);
      try {
        const response = await authFetch(`${apiPath}/${leadId}/history`, {
            cache: 'no-store',
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
        });
        if (!response.ok) throw new Error("Failed to fetch history");
        const historyData = await response.json();
        setHistory(historyData);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-[#ffffff] rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6 border border-gray-200">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-3 flex items-center gap-2">
              <FaHistory className="text-[#D2A02A]" /> Remarks History {leadName && `- ${leadName}`}
            </h3>

            {loading ? (
              <div className="text-center py-6 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D2A02A] mx-auto mb-2"></div>
                <p>Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No history available for this lead yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {history.map((entry) => (
                  <div key={entry.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">
                          {(() => {
                            const dateVal = entry.createdAt;
                            if (!dateVal) return "Recent";
                            
                            let date: Date;
                            if (dateVal instanceof Date) {
                              date = dateVal;
                            } else if (typeof dateVal === 'string') {
                              date = new Date(dateVal);
                            } else if (typeof dateVal === 'object' && 'seconds' in dateVal) {
                              date = new Date(dateVal.seconds * 1000);
                            } else {
                              return "Recent";
                            }

                            const datePart = date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            });
                            const timePart = date.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit', 
                              second: '2-digit', 
                              hour12: true 
                            });
                            
                            return `${datePart} at ${timePart}`;
                          })()}
                        </span>
                      </div>
                    </div>

                    {entry.createdBy && (
                      <div className="mb-2 text-xs">
                        <span className="text-gray-500">Created by: </span>
                        <span className="text-[#D2A02A] font-medium">{entry.createdBy}</span>
                      </div>
                    )}

                    <div className="mt-1 whitespace-pre-wrap text-sm text-gray-900 bg-[#ffffff] p-2 rounded border border-gray-200">
                      {entry.content || <span className="text-gray-400 italic">No content</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A] sm:text-sm"
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

export default AppLeadsHistoryModal;
