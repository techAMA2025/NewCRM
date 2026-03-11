'use client';

import React from 'react';
import { FiX } from 'react-icons/fi';

interface QueryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  name: string;
}

const QueryViewModal: React.FC<QueryViewModalProps> = ({ isOpen, onClose, query, name }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">
            Query Details - <span className="text-[#D2A02A]">{name}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-6 sm:py-8 max-h-[60vh] overflow-y-auto">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 sm:p-5">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap italic text-sm sm:text-base">
              "{query}"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#D2A02A] text-white rounded-lg font-medium hover:bg-[#B8911E] transition-all focus:ring-2 focus:ring-[#D2A02A] focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryViewModal;
