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
      
      <div className="bg-[#F8F5EC] rounded-2xl shadow-2xl max-w-md w-full relative z-10 border border-[#5A4C33]/10 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#5A4C33]/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#D2A02A]/10 rounded-xl">
              <FiMessageSquare className="w-5 h-5 text-[#D2A02A]" />
            </div>
            <h3 className="text-xl font-bold text-[#5A4C33] italic tracking-tight uppercase">
              Confirm Status
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-white rounded-xl transition-all duration-200 disabled:opacity-50 text-[#5A4C33]/40 hover:text-[#5A4C33] border border-transparent hover:border-[#5A4C33]/10 shadow-sm"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Lead Info */}
            <div className="bg-white/60 rounded-xl p-4 border border-[#5A4C33]/10 shadow-inner">
              <p className="text-[10px] uppercase font-bold text-[#5A4C33]/40 tracking-widest mb-1.5">Lead Name</p>
              <p className="text-lg font-bold text-[#5A4C33] italic">{leadName}</p>
            </div>

            {/* Status Change Info */}
            <div className="bg-[#D2A02A]/5 rounded-xl p-4 border border-[#D2A02A]/10">
              <p className="text-[10px] uppercase font-bold text-[#D2A02A]/70 tracking-widest mb-2 px-1">New Status</p>
              <span className={`inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                newStatus === 'Interested' 
                  ? 'bg-green-900/40 text-green-400 border border-green-700/30'
                  : 'bg-orange-900/40 text-orange-400 border border-orange-700/30'
              }`}>
                {newStatus}
              </span>
            </div>

            {/* Main Question */}
            <div className="text-center pt-2 px-2">
              <h4 className="text-lg font-bold text-[#5A4C33] mb-2 italic">
                Send automated message?
              </h4>
              <p className="text-sm text-[#5A4C33]/60 leading-relaxed font-bold">
                Updating to <span className="text-[#D2A02A] italic">"{newStatus}"</span> will trigger an automatic notification to the lead.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 p-6 bg-white/40 border-t border-[#5A4C33]/5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 text-sm font-bold text-[#5A4C33]/40 hover:text-[#5A4C33] transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-[1.5] py-3 text-sm font-bold text-white bg-[#D2A02A] hover:bg-[#B8911E] rounded-xl transition-all shadow-lg shadow-[#D2A02A]/20 flex items-center justify-center space-x-2 active:scale-95"
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