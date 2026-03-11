import React from 'react';
import { FiX, FiCheck, FiStar } from 'react-icons/fi';

type BillcutConversionConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  leadName: string;
  isLoading?: boolean;
};

const BillcutConversionConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  isLoading = false
}: BillcutConversionConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-[#0b1437] rounded-3xl p-6 md:p-10 w-full max-w-md shadow-2xl border border-gray-700/50 animate-in zoom-in-95 duration-200 overflow-hidden text-center">
        {/* Decorative background element */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 blur-[100px] -z-10 rounded-full"></div>

        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 mb-6 relative">
            <FiStar className="h-10 w-10 text-emerald-400" />
            <div className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-100 italic tracking-tight uppercase">
            Lead Conversion
          </h3>
          <p className="text-[10px] text-emerald-400 font-bold tracking-[0.2em] uppercase mt-2">Achievement Unlocked</p>
        </div>

        {/* Body Content */}
        <div className="mt-8 space-y-6">
          <div className="pb-6 border-b border-gray-700/50">
            <h4 className="text-gray-400 text-sm font-medium leading-relaxed">
              Confirm conversion of lead:
            </h4>
            <p className="text-2xl font-bold text-gray-100 mt-2 italic">“{leadName}”</p>
          </div>
          
          <div className="text-left space-y-4 px-2">
            <div className="flex items-start gap-4 group">
              <div className="mt-1 h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <FiCheck className="w-3 h-3 text-emerald-400 group-hover:text-white" />
              </div>
              <p className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Mark lead status as <span className="text-emerald-400 font-bold">Converted</span></p>
            </div>
            <div className="flex items-start gap-4 group">
              <div className="mt-1 h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <FiCheck className="w-3 h-3 text-emerald-400 group-hover:text-white" />
              </div>
              <p className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Add conversion timestamp to history</p>
            </div>
            <div className="flex items-start gap-4 group">
              <div className="mt-1 h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <FiCheck className="w-3 h-3 text-emerald-400 group-hover:text-white" />
              </div>
              <p className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Update performance metrics & targets</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-sm font-bold text-white rounded-2xl border border-emerald-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <FiCheck className="w-5 h-5" />
                <span>Confirm Conversion</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-4 text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            Go Back
          </button>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-gray-800/50 hover:bg-gray-800 rounded-full text-gray-400 transition-all border border-gray-700/50 md:hidden"
      >
        <FiX className="w-5 h-5" />
      </button>
    </div>
  );
};

export default BillcutConversionConfirmationModal; 
