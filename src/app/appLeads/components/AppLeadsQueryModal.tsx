import { FiX } from 'react-icons/fi';

type AppLeadsQueryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  leadName?: string;
};

const AppLeadsQueryModal = ({ isOpen, onClose, query, leadName }: AppLeadsQueryModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className="relative bg-white border border-[#5A4C33]/10 rounded-xl p-8 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] shadow-2xl transform transition-all">
          <div className="absolute top-0 right-0 pt-6 pr-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
              aria-label="Close modal"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-4">
              Lead Query Detail {leadName && <span className="text-[#D2A02A] font-medium">- {leadName}</span>}
            </h3>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap font-medium">
                {query || <span className="text-gray-400 italic">No query content provided</span>}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2.5 bg-[#D2A02A] text-sm font-semibold text-white rounded-lg hover:bg-[#B8911E] focus:outline-none focus:ring-2 focus:ring-[#D2A02A] focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-[#D2A02A]/20"
            >
              Close
            </button>
          </div>
        </div>
    </div>
  );
};

export default AppLeadsQueryModal;
