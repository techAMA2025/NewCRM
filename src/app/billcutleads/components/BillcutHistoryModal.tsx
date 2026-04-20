import { useState, useEffect } from 'react';
import { FaHistory, FaTimes, FaSpinner } from 'react-icons/fa';
import { HistoryItem } from '../types';
import { authFetch } from '@/lib/authFetch';
import { toast } from 'react-toastify';

type BillcutHistoryModalProps = {
  showHistoryModal: boolean;
  setShowHistoryModal: (show: boolean) => void;
  leadId: string | null;
  leadName?: string;
};

const BillcutHistoryModal = ({ 
  showHistoryModal, 
  setShowHistoryModal, 
  leadId,
  leadName
}: BillcutHistoryModalProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showHistoryModal && leadId) {
      const fetchHistory = async () => {
        setIsLoading(true);
        try {
          const response = await authFetch(`/api/bill-cut-leads/history?leadId=${leadId}`);
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setHistory(data.history || []);
        } catch (error) {
          console.error("Error fetching notes history:", error);
          toast.error("Failed to load notes history");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchHistory();
    } else if (!showHistoryModal) {
      // Clear history when modal closes to avoid seeing old data for a new lead
      setHistory([]);
    }
  }, [showHistoryModal, leadId]);

  if (!showHistoryModal) return null;
  
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setShowHistoryModal(false)}
        aria-hidden="true"
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white border border-[#5A4C33]/10 rounded-lg p-6 md:p-8 w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 right-0 pt-4 pr-4">
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="p-2 text-[#5A4C33]/40 hover:text-[#5A4C33] transition-all duration-200"
            aria-label="Close modal"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div 
          className="flex-1 overflow-y-auto pr-2 overscroll-contain custom-scrollbar space-y-4 relative min-h-[200px]"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-6">
            <FaHistory className="h-5 w-5 text-[#D2A02A]" />
            <div>
              <h3 className="text-lg font-bold text-[#5A4C33]" id="history-modal-title">
                Sales Notes History
              </h3>
              {leadName && <p className="text-sm text-[#5A4C33]/60 font-bold">{leadName}</p>}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FaSpinner className="h-10 w-10 text-[#D2A02A] animate-spin mb-4" />
              <p className="text-[#5A4C33]/60 font-bold">Fetching history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 bg-white/40 rounded-xl border border-[#5A4C33]/10 italic">
              <FaHistory className="mx-auto h-16 w-16 text-[#5A4C33]/10 mb-4" />
              <p className="text-[#5A4C33]/40 font-bold">No sales notes history available yet.</p>
              <p className="text-xs text-[#5A4C33]/30 mt-1">New notes will appear here once saved.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
                {[...history]
                  .filter(entry => entry.createdAt != null)
                  .sort((a, b) => {
                    const getTime = (val: any) => {
                      if (!val) return 0;
                      if (val instanceof Date) return val.getTime();
                      if (typeof val === 'string') return new Date(val).getTime();
                      if (typeof val === 'object' && 'seconds' in val) return val.seconds * 1000;
                      return 0;
                    };
                    const timeA = getTime(a.createdAt);
                    const timeB = getTime(b.createdAt);
                    return timeB - timeA;
                  })
                  .map((entry, index) => {
                    const formatHistoryDate = (dateVal: any) => {
                      if (!dateVal) return "Recent";
                      
                      let date: Date | null = null;
                      if (dateVal instanceof Date) {
                        date = dateVal;
                      } else if (typeof dateVal === 'string') {
                        date = new Date(dateVal);
                      } else if (typeof dateVal === 'object') {
                        if ('seconds' in dateVal) {
                          date = new Date(dateVal.seconds * 1000);
                        } else if ('_seconds' in dateVal) {
                          date = new Date(dateVal._seconds * 1000);
                        }
                      }

                      if (!date || isNaN(date.getTime())) {
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
                    };

                    return (
                      <div key={`history-${index}`} className="group bg-[#F8F5EC] p-4 rounded-lg border border-[#5A4C33]/10 hover:border-[#D2A02A]/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div>
                               <p className="text-sm font-bold text-[#5A4C33]">{formatHistoryDate(entry.createdAt)}</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-white rounded text-[10px] font-bold text-[#5A4C33]/40 border border-[#5A4C33]/5">#{history.length - index}</span>
                        </div>
                        
                        {entry.createdBy && (
                          <div className="mb-2 text-xs">
                            <span className="text-[#5A4C33]/70 font-semibold">Created by: </span>
                            <span className="text-[#D2A02A] font-bold">{entry.createdBy}</span>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap text-sm text-[#5A4C33]/80 leading-relaxed bg-white p-3 rounded-md border border-[#5A4C33]/5">
                          {entry.content || <span className="text-[#5A4C33]/30 italic">No content</span>}
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#5A4C33]/10">
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all active:scale-95 text-sm font-medium"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillcutHistoryModal; 
