import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiX, FiCheck, FiGlobe } from 'react-icons/fi';

type BillcutLanguageBarrierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (language: string) => Promise<void>;
  leadId: string;
  leadName: string;
  existingLanguage?: string;
};

// List of Indian languages
const indianLanguages = [
  'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Kannada', 'Malayalam', 
  'Punjabi', 'Odia', 'Assamese', 'Maithili', 'Santali', 'Kashmiri', 'Nepali', 'Sindhi', 
  'Dogri', 'Konkani', 'Manipuri', 'Bodo', 'Sanskrit', 'Urdu', 'English', 'Other'
];

const BillcutLanguageBarrierModal: React.FC<BillcutLanguageBarrierModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  leadId,
  leadName,
  existingLanguage
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(existingLanguage || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedLanguage) {
      toast.error('Please select a language');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedLanguage);
      onClose();
    } catch (error) {
      console.error('Error updating language barrier:', error);
      toast.error('Failed to update language barrier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedLanguage(existingLanguage || '');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
        aria-hidden="true"
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-[#111c44] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl border border-gray-700/50 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <FiGlobe className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 italic tracking-tight uppercase">
                Language Barrier
              </h3>
              <p className="text-xs text-blue-400 font-bold tracking-widest uppercase mt-0.5">Configuration</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2.5 bg-gray-800/50 rounded-xl text-gray-400 hover:text-white transition-colors border border-gray-700/50"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="space-y-8">
          {/* Lead Info */}
          <div className="bg-gray-800/40 rounded-2xl p-5 border border-gray-700/30">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Target Lead</p>
            <p className="text-lg font-bold text-gray-100 italic">{leadName}</p>
          </div>

          {/* Selection */}
          <div className="relative">
            <label htmlFor="language-select" className="block text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-3 px-1">
              Select Preferred Language *
            </label>
            <div className="relative group">
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-14 bg-gray-900 border border-gray-700 rounded-2xl px-5 text-gray-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 appearance-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group-hover:bg-gray-800"
              >
                <option value="" disabled className="bg-gray-900">Choose a language</option>
                {indianLanguages.map((language) => (
                  <option key={language} value={language} className="bg-gray-900 py-3">
                    {language}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-gray-500 group-hover:text-blue-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-gray-500 font-medium px-1">Note: This will mark the lead for specific regional language follow-up.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-10 flex items-center gap-4">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-200 transition-colors active:scale-95"
          >
            Cancel Action
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedLanguage}
            className="flex-[1.5] py-4 bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white rounded-2xl border border-blue-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                <span>Applying...</span>
              </>
            ) : (
              <>
                <FiCheck className="w-5 h-5" />
                <span>Save Setting</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillcutLanguageBarrierModal; 
