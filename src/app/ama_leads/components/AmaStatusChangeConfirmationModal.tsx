"use client"

import React from 'react'
import { FiX, FiMessageSquare, FiCheck } from 'react-icons/fi'

interface AmaStatusChangeConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  leadName: string
  newStatus: string
  isLoading?: boolean
}

const AmaStatusChangeConfirmationModal: React.FC<AmaStatusChangeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  newStatus,
  isLoading = false
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-[#5A4C33]/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#ffffff] rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#5A4C33]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#5A4C33]/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#D2A02A]/20 rounded-full">
              <FiMessageSquare className="w-5 h-5 text-[#D2A02A]" />
            </div>
            <h3 className="text-lg font-semibold text-[#5A4C33]">
              Status Change Confirmation
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-[#F8F5EC] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiX className="w-5 h-5 text-[#5A4C33]/50" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center space-y-4">
            {/* Lead Info */}
            <div className="bg-[#F8F5EC] rounded-lg p-4">
              <p className="text-sm text-[#5A4C33]/70 mb-1">Lead Name</p>
              <p className="font-medium text-[#5A4C33]">{leadName}</p>
            </div>

            {/* Status Change Info */}
            <div className="bg-[#D2A02A]/10 rounded-lg p-4">
              <p className="text-sm text-[#D2A02A] mb-1">New Status</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                newStatus === 'Interested' 
                  ? 'bg-green-100 text-green-800'
                  : newStatus === 'Callback'
                  ? 'bg-blue-100 text-blue-800'
                  : newStatus === 'Converted'
                  ? 'bg-purple-100 text-purple-800'
                  : newStatus === 'Language Barrier'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {newStatus}
              </span>
            </div>

            {/* Main Question */}
            <div className="py-4">
              <h4 className="text-lg font-medium text-[#5A4C33] mb-2">
                Do you want to send the message?
              </h4>
              <p className="text-sm text-[#5A4C33]/70">
                Changing the status to "{newStatus}" will automatically send a message to the lead.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-[#5A4C33]/10">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[#5A4C33] bg-[#ffffff] border border-[#5A4C33]/20 rounded-lg hover:bg-[#F8F5EC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[#ffffff] bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-[#5A4C33]/30 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#ffffff]"></div>
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

export default AmaStatusChangeConfirmationModal 