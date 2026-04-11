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
      <div className="relative bg-[#F8F5EC] rounded-3xl p-6 md:p-8 w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl border border-[#5A4C33]/10 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#5A4C33]/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#D2A02A]/10 rounded-2xl border border-[#D2A02A]/20">
              <FaHistory className="h-6 w-6 text-[#D2A02A]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#5A4C33] italic tracking-tight" id="history-modal-title">
                Sales Notes History
              </h3>
              {leadName && <p className="text-sm text-[#5A4C33]/60 font-bold">{leadName}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="p-2.5 bg-white rounded-xl text-[#5A4C33]/40 hover:text-[#5A4C33] transition-all duration-200 border border-[#5A4C33]/10 shadow-sm"
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FaSpinner className="h-10 w-10 text-[#D2A02A] animate-spin mb-4" />
              <p className="text-[#5A4C33]/60 font-bold">Fetching history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 bg-white/40 rounded-3xl border border-[#5A4C33]/10 italic">
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
                  .map((entry, index) => (
                    <div key={`history-${index}`} className="group bg-white p-5 rounded-3xl border border-[#5A4C33]/5 hover:border-[#D2A02A]/30 transition-all duration-300 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#5A4C33] flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-[#5A4C33]/10 border border-white/10">
                            {entry.createdBy?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#5A4C33]">{entry.createdBy || "System User"}</p>
                            <p className="text-[10px] text-[#D2A02A] font-bold uppercase tracking-widest">{entry.displayDate || "Recent"}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-[#F8F5EC] rounded-lg text-[10px] font-bold text-[#5A4C33]/40 border border-[#5A4C33]/5">#{history.length - index}</span>
                      </div>
                      
                      <div className="whitespace-pre-wrap text-sm text-[#5A4C33]/80 leading-relaxed bg-[#F8F5EC]/50 p-4 rounded-2xl border border-[#5A4C33]/5 group-hover:bg-white transition-colors">
                        {entry.content || <span className="text-[#5A4C33]/30 italic">No content</span>}
                      </div>
                    </div>
                  ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#5A4C33]/10">
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="w-full py-4 bg-[#5A4C33] hover:bg-[#4A3C2A] text-sm font-bold text-white rounded-2xl transition-all shadow-lg active:scale-95"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillcutHistoryModal; 
