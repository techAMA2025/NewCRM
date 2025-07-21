"use client"

import React from 'react'
import { FiX, FiMessageSquare, FiCheck } from 'react-icons/fi'

interface StatusChangeConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  leadName: string
  newStatus: string
  isLoading?: boolean
}

const StatusChangeConfirmationModal: React.FC<StatusChangeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  newStatus,
  isLoading = false
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FiMessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Status Change Confirmation
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center space-y-4">
            {/* Lead Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lead Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{leadName}</p>
            </div>

            {/* Status Change Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">New Status</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                newStatus === 'Interested' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
              }`}>
                {newStatus}
              </span>
            </div>

            {/* Main Question */}
            <div className="py-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Do you want to send the message?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Changing the status to "{newStatus}" will automatically send a message to the lead.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <FiCheck className="w-4 h-4" />
                <span>Yes, Send Message</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StatusChangeConfirmationModal 