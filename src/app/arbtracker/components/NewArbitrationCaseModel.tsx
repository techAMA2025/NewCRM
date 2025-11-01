'use client'

import React, { useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { db } from '@/firebase/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'

interface NewArbitrationCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (caseData: ArbitrationCaseData) => void
}

export interface ArbitrationCaseData {
  clientName: string
  type: string
  startDate: string
  time: string
  status: string
  bankName: string
  password: string
  meetLink: string
  vakalatnama: boolean
  onlineLinkLetter: boolean
  teamEmails: string | string[]
  emailSent?: boolean
  emailSentBy?: string
  adv_name?: string
  lastedit_by?: string
}

const defaultEmails = [
  'shreyarora.amalegal@gmail.com',
  'shrutiamalegal@gmail.com',
  'ishaan.amalegal@gmail.com',
  'Kirtima.amalegal@gmail.com',
  'tech.ama123@gmail.com'
]

// Format time for HTML5 time input - ensures it's always in HH:mm format
// Safari is very strict about time input format - must be exactly HH:mm
const formatTimeForInput = (timeValue: string | undefined | null): string => {
  if (!timeValue) return '';
  
  const time = String(timeValue).trim();
  
  // Check for invalid patterns first
  const invalidPatterns = ['invalid', 'invaliddate', 'nan', 'invalid date', 'invalid time', 'null', 'undefined'];
  if (invalidPatterns.some(pattern => time.toLowerCase() === pattern)) {
    return '';
  }
  
  // Safari requires exactly HH:mm format - validate strictly
  const strictTimeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (strictTimeRegex.test(time)) {
    return time; // Already in correct format
  }
  
  // Try to parse and reformat
  try {
    const parts = time.split(':');
    if (parts.length >= 2) {
      const hoursStr = parts[0].trim();
      const minutesStr = parts[1].split('.')[0].trim(); // Remove seconds/milliseconds
      
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      // Strict validation for Safari - must be valid hours (0-23) and minutes (0-59)
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        // Format with leading zeros as Safari requires exact format
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${formattedHours}:${formattedMinutes}`;
      }
    }
  } catch (e) {
    // Continue to return empty string
  }
  
  // Last attempt: extract valid HH:mm pattern
  const match = time.match(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);
  return match ? match[0] : '';
}

const initialCaseData: ArbitrationCaseData = {
  clientName: '',
  type: 'Arbitration',
  startDate: '',
  time: '',
  status: 'In progress',
  bankName: '',
  password: '',
  meetLink: '',
  vakalatnama: false,
  onlineLinkLetter: false,
  teamEmails: [...defaultEmails],
  adv_name: ''
}

export default function NewArbitrationCaseModal({
  isOpen,
  onClose,
  onSubmit
}: NewArbitrationCaseModalProps) {
  const [caseData, setCaseData] = useState<ArbitrationCaseData>(initialCaseData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    // Normalize time field to ensure it's always in HH:mm format for HTML5 input
    if (name === 'time') {
      // HTML5 time input already provides HH:mm format, but normalize to be safe
      const normalizedTime = formatTimeForInput(value) || value;
      setCaseData(prev => ({ ...prev, [name]: normalizedTime }))
    } else {
      setCaseData(prev => ({ ...prev, [name]: value }))
    }
  }
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setCaseData(prev => ({ ...prev, [name]: checked }))
  }
  
  const handleEmailChange = (index: number, value: string) => {
    const updatedEmails = [...caseData.teamEmails]
    updatedEmails[index] = value
    setCaseData(prev => ({ ...prev, teamEmails: updatedEmails }))
  }
  
  const addEmail = () => {
    setCaseData(prev => ({ 
      ...prev, 
      teamEmails: [...prev.teamEmails, ''] 
    }))
  }
  
  const removeEmail = (index: number) => {
    const updatedEmails = [...caseData.teamEmails]
    updatedEmails.splice(index, 1)
    setCaseData(prev => ({ ...prev, teamEmails: updatedEmails }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    // Show loading toast when submitting
    toast.loading('Creating new case...')
    
    // Get advocate name from localStorage
    const advocateName = localStorage.getItem('userName') || ''
    
    const filteredData = {
      ...caseData,
      adv_name: advocateName,
      teamEmails: Array.isArray(caseData.teamEmails)
        ? caseData.teamEmails.filter(email => email.trim() !== '')
        : typeof caseData.teamEmails === 'string' 
          ? [caseData.teamEmails].filter(email => email.trim() !== '')
          : [],
      createdAt: new Date()
    }
    
    try {
      // Remove the direct Firestore save from here
      // Let the parent component handle the Firestore operation
      
      // Just call the onSubmit callback with the filtered data
      onSubmit(filteredData)
      
      // Show success toast
      toast.dismiss() // Dismiss the loading toast
      toast.success('Case created successfully')
      
      // Reset form and close modal
      setCaseData(initialCaseData)
      onClose()
    } catch (err) {
      console.error("Error adding document: ", err)
      
      // Show error toast
      toast.dismiss() // Dismiss the loading toast
      toast.error("Failed to save case. Please try again.")
      
      setError("Failed to save case. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Add New Arbitration Case</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name*
              </label>
              <input
                type="text"
                name="clientName"
                required
                value={caseData.clientName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
              />
            </div>
            
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type*
              </label>
              <select
                name="type"
                required
                value={caseData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
              >
                <option value="Arbitration">Arbitration</option>
                <option value="Mediation">Mediation</option>
                <option value="Conciliation">Conciliation</option>
              </select>
            </div>
            
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date*
              </label>
              <input
                type="date"
                name="startDate"
                required
                value={caseData.startDate}
                onChange={handleChange}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time*
              </label>
              <input
                type="time"
                name="time"
                required
                value={caseData.time || ''}
                onChange={handleChange}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                // Safari-specific: ensure value is always in correct format
                onBlur={(e) => {
                  // Re-validate and format on blur for Safari compatibility
                  const formatted = formatTimeForInput(e.target.value);
                  if (formatted && formatted !== e.target.value) {
                    e.target.value = formatted;
                    handleChange({ target: { name: 'time', value: formatted } } as React.ChangeEvent<HTMLInputElement>);
                  }
                }}
              />
            </div>
            
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status*
              </label>
              <select
                name="status"
                required
                value={caseData.status}
                onChange={handleChange}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="In progress">In Progress</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Pending Decision">Pending Decision</option>
                <option value="New Filing">New Filing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name*
              </label>
              <input
                type="text"
                name="bankName"
                required
                value={caseData.bankName}
                onChange={handleChange}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="text"
                name="password"
                value={caseData.password}
                onChange={handleChange}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {/* Meet Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meet Link
              </label>
              <input
                type="url"
                name="meetLink"
                value={caseData.meetLink}
                onChange={handleChange}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://"
              />
            </div>
            
            {/* Team Emails - replaced with dynamic inputs */}
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Team Emails
                </label>
                <button
                  type="button"
                  onClick={addEmail}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                  + Add Email
                </button>
              </div>
              
              <div className="space-y-2">
                {Array.isArray(caseData.teamEmails) ? (
                  caseData.teamEmails.map((email, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="email@example.com"
                      />
                      <button
                        type="button"
                        onClick={() => removeEmail(index)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove email"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">Invalid email format</p>
                )}
                {Array.isArray(caseData.teamEmails) && caseData.teamEmails.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No emails added. Click "Add Email" to add team members.</p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-6">
              {/* Vakalatnama */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vakalatnama"
                  name="vakalatnama"
                  checked={caseData.vakalatnama}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="vakalatnama" className="ml-2 block text-sm text-gray-700">
                  Vakalatnama
                </label>
              </div>
              
              {/* Online Link Letter */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="onlineLinkLetter"
                  name="onlineLinkLetter"
                  checked={caseData.onlineLinkLetter}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="onlineLinkLetter" className="ml-2 block text-sm text-gray-700">
                  Online Link Letter
                </label>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}