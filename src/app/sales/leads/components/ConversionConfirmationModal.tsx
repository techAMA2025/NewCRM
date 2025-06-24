import React from 'react';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

type ConversionConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  leadName: string;
  isLoading?: boolean;
};

const ConversionConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  isLoading = false
}: ConversionConfirmationModalProps) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-700 shadow-xl transition-all">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                  <CheckCircleIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="ml-4">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold leading-6 text-white"
                >
                  Confirm Lead Conversion
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-300">
                    Are you sure you want to mark <span className="font-medium text-emerald-400">{leadName}</span> as converted?
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    This action will:
                  </p>
                  <ul className="text-xs text-gray-400 mt-1 ml-4 list-disc">
                    <li>Change the lead status to "Converted"</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Converting...
                  </>
                ) : (
                  'Confirm Conversion'
                )}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ConversionConfirmationModal; 