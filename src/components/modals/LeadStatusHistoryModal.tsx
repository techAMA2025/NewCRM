"use client";

import { FaHistory, FaTimes, FaSpinner } from "react-icons/fa";

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
  isLoading?: boolean;
};

const getStatusColor = (status: string) => {
  const key = (status || "").toLowerCase();
  if (key === "no status" || key === "select status") return "bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20";
  if (key === "interested") return "bg-green-900 text-green-100 border border-green-700";
  if (key === "not interested") return "bg-red-900 text-red-100 border border-red-700";
  if (key === "not answering") return "bg-orange-900 text-orange-100 border border-orange-700";
  if (key === "callback") return "bg-yellow-900 text-yellow-100 border border-yellow-700";
  if (key === "future potential") return "bg-blue-900 text-blue-100 border border-blue-700";
  if (key === "converted") return "bg-emerald-900 text-emerald-100 border border-emerald-700";
  if (key === "loan required") return "bg-purple-900 text-purple-100 border border-purple-700";
  if (key === "short loan") return "bg-teal-900 text-teal-100 border border-teal-700";
  if (key === "cibil issue") return "bg-rose-900 text-rose-100 border border-rose-700";
  if (key === "language barrier") return "bg-indigo-900 text-indigo-100 border border-indigo-700";
  if (key === "retargeting") return "bg-cyan-900 text-cyan-100 border border-cyan-700";
  if (key === "closed lead") return "bg-gray-500 text-white border border-gray-700";
  return "bg-gray-700 text-gray-200 border border-gray-600";
};

const LeadStatusHistoryModal = ({
  isOpen,
  onClose,
  leadName,
  history,
  isLoading = false,
}: LeadStatusHistoryModalProps) => {
  if (!isOpen) return null;

  // sort history by timestamp descending (newest first)
  const sortedHistory = history
    ? [...history].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
    : [];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Modal Content */}
      <div className="relative bg-[#F8F5EC] rounded-3xl p-6 md:p-8 w-full max-w-2xl flex flex-col max-h-[85vh] shadow-2xl border border-[#5A4C33]/10 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#5A4C33]/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#D2A02A]/10 rounded-2xl border border-[#D2A02A]/20">
              <FaHistory className="h-6 w-6 text-[#D2A02A]" />
            </div>
            <div>
              <h3
                className="text-xl font-bold text-[#5A4C33] italic tracking-tight"
                id="status-history-modal-title"
              >
                Status History
              </h3>
              {leadName && (
                <p className="text-sm text-[#5A4C33]/60 font-bold">{leadName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 bg-white rounded-xl text-[#5A4C33]/40 hover:text-[#5A4C33] transition-all duration-200 border border-[#5A4C33]/10 shadow-sm"
            aria-label="Close modal"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto pr-2 overscroll-contain space-y-4 relative min-h-[200px]"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FaSpinner className="h-10 w-10 text-[#D2A02A] animate-spin mb-4" />
              <p className="text-[#5A4C33]/60 font-bold">Fetching history...</p>
            </div>
          ) : !sortedHistory || sortedHistory.length === 0 ? (
            <div className="text-center py-16 bg-white/40 rounded-3xl border border-[#5A4C33]/10 italic">
              <FaHistory className="mx-auto h-16 w-16 text-[#5A4C33]/10 mb-4" />
              <p className="text-[#5A4C33]/40 font-bold">No status history available yet.</p>
              <p className="text-xs text-[#5A4C33]/30 mt-1">Status changes will appear here once made.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
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
                  <div
                    key={index}
                    className="group bg-white p-5 rounded-3xl border border-[#5A4C33]/5 hover:border-[#D2A02A]/30 transition-all duration-300 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#5A4C33] flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-[#5A4C33]/10 border border-white/10">
                          {entry.updatedBy?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#5A4C33]">
                            {entry.updatedBy || "System User"}
                          </p>
                          <p className="text-[10px] text-[#D2A02A] font-bold uppercase tracking-widest">
                            {dateDisplay}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-[#F8F5EC] rounded-lg text-[10px] font-bold text-[#5A4C33]/40 border border-[#5A4C33]/5">
                        #{sortedHistory.length - index}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold ${getStatusColor(entry.status)}`}
                      >
                        {entry.status}
                      </span>
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
            onClick={onClose}
            className="w-full py-4 bg-[#5A4C33] hover:bg-[#4A3C2A] text-sm font-bold text-white rounded-2xl transition-all shadow-lg active:scale-95"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadStatusHistoryModal;
