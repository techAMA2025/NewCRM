import React from 'react';
import { FaHistory, FaTimes } from 'react-icons/fa';
import { HistoryItem } from '../types';

type BillcutHistoryModalProps = {
  showHistoryModal: boolean;
  setShowHistoryModal: (show: boolean) => void;
  currentHistory: HistoryItem[];
  leadName?: string;
};

const BillcutHistoryModal = ({ 
  showHistoryModal, 
  setShowHistoryModal, 
  currentHistory,
  leadName
}: BillcutHistoryModalProps) => {
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
      <div className="relative bg-[#0b1437] rounded-3xl p-6 md:p-8 w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl border border-gray-700/50 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <FaHistory className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 italic tracking-tight" id="history-modal-title">
                Sales Notes History
              </h3>
              {leadName && <p className="text-sm text-gray-400 font-medium">{leadName}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="p-2.5 bg-gray-800/50 rounded-xl text-gray-400 hover:text-white transition-colors border border-gray-700/50"
            aria-label="Close modal"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div 
          className="flex-1 overflow-y-auto pr-2 overscroll-contain custom-scrollbar space-y-4"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {currentHistory.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/40 rounded-3xl border border-gray-800/50">
              <FaHistory className="mx-auto h-16 w-16 text-gray-700 mb-4 opacity-50" />
              <p className="text-gray-400 font-medium">No sales notes history available yet.</p>
              <p className="text-xs text-gray-500 mt-1">New notes will appear here once saved.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
                {[...currentHistory]
                  .filter(entry => entry.createdAt != null)
                  .sort((a, b) => {
                    const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 
                                 (a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? (a.createdAt as any).seconds * 1000 : 0);
                    const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 
                                 (b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? (b.createdAt as any).seconds * 1000 : 0);
                    return timeB - timeA;
                  })
                  .map((entry, index) => (
                    <div key={`history-${index}`} className="group bg-gray-800/40 p-5 rounded-3xl border border-gray-700/30 hover:border-blue-500/30 transition-all duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-500/20">
                            {entry.createdBy?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-200">{entry.createdBy || "System User"}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{entry.displayDate || "Recent"}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-gray-900/50 rounded-lg text-[10px] font-bold text-gray-500 border border-gray-800">#{currentHistory.length - index}</span>
                      </div>
                      
                      <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed bg-gray-900/60 p-4 rounded-2xl border border-gray-800 group-hover:bg-gray-900 transition-colors">
                        {entry.content || <span className="text-gray-600 italic">No content</span>}
                      </div>
                    </div>
                  ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700/50">
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-sm font-bold text-gray-200 rounded-2xl border border-gray-700 transition-all shadow-lg active:scale-95"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillcutHistoryModal; 
