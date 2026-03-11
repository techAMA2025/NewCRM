"use client";

import { FaHistory, FaTimes } from "react-icons/fa";

type HistoryItem = {
  status: string;
  timestamp: string;
  updatedBy: string;
};

type LeadStatusHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  history: HistoryItem[] | undefined;
};

const LeadStatusHistoryModal = ({
  isOpen,
  onClose,
  leadName,
  history,
}: LeadStatusHistoryModalProps) => {
  if (!isOpen) return null;

  // sort history by timestamp descending (newest first)
  const sortedHistory = history
    ? [...history].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
    : [];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className="relative bg-[#0b1437] rounded-2xl p-6 md:p-8 w-full max-w-lg flex flex-col max-h-[90vh] shadow-2xl border border-gray-700/50 animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 right-0 pt-6 pr-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-800/50 rounded-lg p-2 text-gray-400 hover:text-white transition-colors border border-gray-700/50"
            >
              <span className="sr-only">Close</span>
              <FaTimes className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <FaHistory className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-100 italic tracking-tight">
                  Status History
                </h3>
                <p className="text-sm text-gray-400 font-medium">{leadName}</p>
              </div>
            </div>

            <div 
              className="mt-2 flex-1 overflow-y-auto pr-2 overscroll-contain custom-scrollbar max-h-[60vh]"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {!sortedHistory || sortedHistory.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/40 rounded-2xl border border-gray-800/50">
                  <p className="text-sm text-gray-500">
                    No status history available for this lead.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {sortedHistory.map((entry, index) => {
                    let dateDisplay = "Unknown Date";
                    try {
                      dateDisplay = new Date(entry.timestamp).toLocaleString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      });
                    } catch (e) {
                        console.error("Date parse error", e);
                    }

                    return (
                      <li key={index} className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 relative hover:border-blue-500/30 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-900/20 text-blue-400 border border-blue-500/10 mb-2 uppercase tracking-wider">
                              {entry.status}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                                {entry.updatedBy?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <span className="text-sm font-medium text-gray-300">
                                {entry.updatedBy}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest whitespace-nowrap pt-1">
                            {dateDisplay}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800/50">
            <button
              type="button"
              className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 text-sm font-bold text-gray-200 rounded-xl border border-gray-700 transition-all shadow-lg active:scale-95"
              onClick={onClose}
            >
              Close History
            </button>
          </div>
        </div>
    </div>

  );
};

export default LeadStatusHistoryModal;
