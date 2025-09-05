"use client"

import type React from "react"

interface AmaConversionConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  leadName: string
  isLoading?: boolean
}

const AmaConversionConfirmationModal: React.FC<AmaConversionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  isLoading = false,
}) => {
  console.log("🔍 AmaConversionConfirmationModal render:", { isOpen, leadName, isLoading })

  if (!isOpen) return null

  const handleConfirm = () => {
    if (isLoading) return
    console.log("🔍 Conversion modal confirm button clicked")
    onConfirm()
  }

  const handleClose = () => {
    if (isLoading) return
    console.log("🔍 Conversion modal close button clicked")
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-[#5A4C33]/50 flex items-center justify-center z-50"
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget && !isLoading) {
          console.log("🔍 Conversion modal background clicked - closing modal")
          onClose()
        }
      }}
    >
      <div className="bg-[#ffffff] rounded-xl p-6 w-full max-w-md border border-[#5A4C33]/20 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-[#5A4C33] flex items-center">
            <span className="mr-2">🎉</span>
            Convert Lead
          </h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors duration-200 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-[#5A4C33]/70 text-sm mb-2">Are you sure you want to convert this lead to a client?</p>
          <p className="text-[#5A4C33] font-medium">
            Lead: <span className="text-[#D2A02A]">{leadName}</span>
          </p>
          <div className="mt-3 p-3 bg-[#F8F5EC] rounded-lg border border-[#5A4C33]/10">
            <p className="text-sm text-[#5A4C33]/70">
              <strong>Note:</strong> This action will:
            </p>
            <ul className="text-sm text-[#5A4C33]/70 mt-1 ml-4 list-disc">
              <li>Mark the lead as "Converted"</li>
              <li>Add a conversion timestamp</li>
              <li>Update the salesperson's targets count</li>
              <li>Send a confirmation email to the lead</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-[#5A4C33]/30 disabled:cursor-not-allowed text-[#ffffff] rounded-lg font-medium transition-colors duration-200"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Converting...
              </div>
            ) : (
              "Convert Lead"
            )}
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[#5A4C33] hover:bg-[#4A3F2A] disabled:bg-[#5A4C33]/50 text-[#ffffff] rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default AmaConversionConfirmationModal
