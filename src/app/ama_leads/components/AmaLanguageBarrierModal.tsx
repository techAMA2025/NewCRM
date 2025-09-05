"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "react-toastify"

type AmaLanguageBarrierModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (language: string) => Promise<void>
  leadId: string
  leadName: string
  existingLanguage?: string
}

// List of Indian languages
const indianLanguages = [
  "Hindi",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Assamese",
  "Maithili",
  "Santali",
  "Kashmiri",
  "Nepali",
  "Sindhi",
  "Dogri",
  "Konkani",
  "Manipuri",
  "Bodo",
  "Sanskrit",
  "Urdu",
  "English",
  "Other",
]

const AmaLanguageBarrierModal: React.FC<AmaLanguageBarrierModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  leadId,
  leadName,
  existingLanguage,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(existingLanguage || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!selectedLanguage) {
      toast.error("Please select a language")
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(selectedLanguage)
      onClose()
    } catch (error) {
      console.error("Error updating language barrier:", error)
      toast.error("Failed to update language barrier")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedLanguage(existingLanguage || "")
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-[#5A4C33]/50 flex items-center justify-center z-50">
      <div className="bg-[#ffffff] border border-[#5A4C33]/20 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#5A4C33] flex items-center">
            <span className="mr-2">🌐</span>
            Language Barrier
          </h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors duration-200 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[#5A4C33]/70 text-sm mb-2">
            Select the language barrier for: <span className="font-medium text-[#D2A02A]">{leadName}</span>
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="language-select" className="block text-sm font-medium text-[#5A4C33] mb-2">
            Preferred Language *
          </label>
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-[#F8F5EC] border border-[#5A4C33]/20 rounded-lg text-[#5A4C33] focus:outline-none focus:border-[#D2A02A] focus:ring-1 focus:ring-[#D2A02A] disabled:opacity-50"
          >
            <option value="">Select a language</option>
            {indianLanguages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-[#5A4C33] bg-[#ffffff] border border-[#5A4C33]/20 rounded-lg hover:bg-[#F8F5EC] focus:outline-none focus:border-[#D2A02A] disabled:opacity-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedLanguage}
            className="px-4 py-2 text-sm font-medium text-[#ffffff] bg-[#D2A02A] border border-[#D2A02A] rounded-lg hover:bg-[#B8911E] focus:outline-none focus:ring-2 focus:ring-[#D2A02A] disabled:bg-[#5A4C33]/30 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ffffff] mr-2"></div>
                Saving...
              </div>
            ) : (
              "Save Language"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AmaLanguageBarrierModal
