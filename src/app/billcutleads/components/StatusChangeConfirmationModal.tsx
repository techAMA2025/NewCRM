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
    <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="bg-[#111c44] rounded-2xl shadow-2xl max-w-md w-full relative z-10 border border-gray-700/50 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl">
              <FiMessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-100 italic tracking-tight">
              Confirm Status
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50 text-gray-400"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Lead Info */}
            <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1.5">Lead Name</p>
              <p className="text-lg font-bold text-gray-100">{leadName}</p>
            </div>

            {/* Status Change Info */}
            <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10">
              <p className="text-[10px] uppercase font-bold text-blue-400/70 tracking-widest mb-2">New Status</p>
              <span className={`inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                newStatus === 'Interested' 
                  ? 'bg-green-900/40 text-green-400 border border-green-700/30'
                  : 'bg-orange-900/40 text-orange-400 border border-orange-700/30'
              }`}>
                {newStatus}
              </span>
            </div>

            {/* Main Question */}
            <div className="text-center pt-2">
              <h4 className="text-lg font-bold text-gray-100 mb-2">
                Send automated message?
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Updating to <span className="text-blue-400 font-bold">"{newStatus}"</span> will trigger an automatic notification to the lead.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 bg-gray-900/30">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-[1.5] py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <FiCheck className="w-4 h-4" />
                <span>Yes, Send Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>

  )
}

export default StatusChangeConfirmationModal 