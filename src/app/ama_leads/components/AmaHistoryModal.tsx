import { useState, useEffect } from 'react';
import { FaHistory } from 'react-icons/fa';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

export type AmaHistoryItem = {
  content: string;
  createdAt: any;
  createdBy: string;
  createdById: string;
  displayDate?: string;
  leadId: string;
};

type AmaHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
};

const AmaHistoryModal = ({ isOpen, onClose, leadId }: AmaHistoryModalProps) => {
  const [history, setHistory] = useState<AmaHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !leadId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/leads/${leadId}/history`, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className="relative bg-[#ffffff] border border-[#5A4C33]/10 rounded-lg p-6 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] shadow-xl">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent rounded-md text-[#5A4C33]/50 hover:text-[#5A4C33] focus:outline-none"
              aria-label="Close modal"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            <h3 className="text-lg leading-6 font-medium text-[#5A4C33] mb-3 flex items-center gap-2" id="ama-history-modal-title">
              <FaHistory /> Sales Notes History
            </h3>

            {loading ? (
              <div className="text-center py-6 text-[#5A4C33]/50">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D2A02A] mx-auto mb-2"></div>
                <p>Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-[#5A4C33]/50">
                <p>No history available for this lead yet.</p>
              </div>
            ) : (
              <div 
                className="space-y-4 overscroll-contain"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {history.map((entry, index) => (
                  <div key={`history-${leadId}-${index}`} className="bg-[#F8F5EC] p-3 rounded-lg border border-[#5A4C33]/10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-[#5A4C33]">
                        <span className="font-medium">
                          {entry.displayDate || "Unknown Date"}
                        </span>
                      </div>
                    </div>

                    {entry.createdBy && (
                      <div className="mb-2 text-xs">
                        <span className="text-[#5A4C33]/70">Created by: </span>
                        <span className="text-[#D2A02A] font-medium">{entry.createdBy}</span>
                      </div>
                    )}

                    <div className="mt-1 whitespace-pre-wrap text-sm text-[#5A4C33] bg-[#ffffff] p-2 rounded border border-[#5A4C33]/10">
                      {entry.content || <span className="text-[#5A4C33]/50 italic">No content</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#5A4C33]/10">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-sm font-medium text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
    </div>
  );
};

export default AmaHistoryModal; 