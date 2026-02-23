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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className="relative bg-[#ffffff] rounded-lg p-6 w-full max-w-lg mx-4 flex flex-col max-h-[90vh] shadow-xl border border-[#5A4C33]/10">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent rounded-md text-[#5A4C33]/50 hover:text-[#5A4C33] focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[#D2A02A]/10 sm:mx-0 sm:h-10 sm:w-10">
                <FaHistory className="h-5 w-5 text-[#D2A02A]" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-[#5A4C33]">
                Status History: {leadName}
              </h3>
            </div>

            <div 
              className="mt-4 flex-1 overflow-y-auto pr-2 overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {!sortedHistory || sortedHistory.length === 0 ? (
                <p className="text-sm text-[#5A4C33]/70 text-center py-4">
                  No status history available.
                </p>
              ) : (
                <ul className="space-y-4">
                  {sortedHistory.map((entry, index) => {
                    let dateDisplay = "Unknown Date";
                    try {
                      dateDisplay = new Date(entry.timestamp).toLocaleString("en-US", {
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
                      <li key={index} className="bg-[#F8F5EC] rounded-md p-3 border border-[#5A4C33]/10 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="block text-sm font-bold text-[#5A4C33]">
                              {entry.status}
                            </span>
                            <span className="block text-xs text-[#5A4C33]/70 mt-1">
                              By: {entry.updatedBy}
                            </span>
                          </div>
                          <span className="text-xs text-[#D2A02A] font-medium whitespace-nowrap ml-2">
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

          <div className="mt-6 pt-4 border-t border-[#5A4C33]/10">
            <button
              type="button"
              className="w-full sm:w-auto px-4 py-2 bg-[#D2A02A] text-sm font-medium text-white rounded-md hover:bg-[#B8911E] focus:outline-none transition-colors duration-200"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
    </div>
  );
};

export default LeadStatusHistoryModal;
