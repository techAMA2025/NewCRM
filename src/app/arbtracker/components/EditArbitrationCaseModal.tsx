'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FaTimes } from 'react-icons/fa'
import { ArbitrationCaseData } from './NewArbitrationCaseModel'
import { db } from '@/firebase/firebase' // Import your firebase configuration
import { doc, updateDoc } from 'firebase/firestore' // Import Firestore methods
import { toast } from 'react-hot-toast' // For notifications

interface EditArbitrationCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, caseData: ArbitrationCaseData) => void
  caseData: any // The case to edit
}

const defaultEmails = [
  'shreyarora.amalegal@gmail.com',
  'shrutiamalegal@gmail.com',
  'sourav.amalegal@gmail.com',
  'latika.amalegal@gmail.com',
  'sanchaita.amalegal@gmail.com',
]

// Normalize time value to HH:mm format for Safari compatibility and HTML5 time input
const normalizeTimeForStorage = (timeValue: string | undefined | null): string => {
  if (!timeValue) return '';
  
  const time = String(timeValue).trim();
  
  // Check for invalid patterns
  const invalidPatterns = ['invalid', 'invaliddate', 'nan', 'invalid date', 'invalid time', 'null', 'undefined'];
  if (invalidPatterns.some(pattern => time.toLowerCase() === pattern)) {
    return '';
  }
  
  // Check if it's in valid HH:mm format (required for HTML5 time input)
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (timeRegex.test(time)) {
    return time;
  }
  
  // Check if it's in HH:mm:ss format - extract just HH:mm
  const timeWithSecondsRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/;
  if (timeWithSecondsRegex.test(time)) {
    return time.substring(0, 5);
  }
  
  // Safari might include milliseconds - handle HH:mm:ss.SSS
  const timeWithMsRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.\d+/;
  if (timeWithMsRegex.test(time)) {
    return time.substring(0, 5);
  }
  
  // Try to parse manually and format for HTML5 input
  try {
    const parts = time.split(':');
    if (parts.length >= 2) {
      const hoursStr = parts[0].trim();
      const minutesStr = parts[1].split('.')[0].trim(); // Remove milliseconds if present
      
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      // Validate and format for HTML5 time input (HH:mm)
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  } catch (e) {
    console.error('Error normalizing time:', time, e);
  }
  
  // Extract HH:mm pattern from any string
  const match = time.match(/([0-1][0-9]|2[0-3]):[0-5][0-9]/);
  return match ? match[0] : '';
}

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

export default function EditArbitrationCaseModal({
  isOpen,
  onClose,
  onUpdate,
  caseData
}: EditArbitrationCaseModalProps) {
  const [editData, setEditData] = useState<ArbitrationCaseData>({
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
    teamEmails: [...defaultEmails]
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false) // Add loading state
  const timeInputRef = useRef<HTMLInputElement>(null) // Ref for Safari compatibility
  
  // Initialize form with case data when modal opens
  useEffect(() => {
    if (caseData && isOpen) {
      // Format time properly for HTML5 time input
      const formattedTime = formatTimeForInput(caseData.time);
      
      setEditData({
        clientName: caseData.clientName || '',
        type: caseData.type || 'Arbitration',
        startDate: caseData.startDate || '',
        // Format time for HTML5 time input compatibility
        time: formattedTime,
        status: caseData.status || 'In progress',
        bankName: caseData.bankName || '',
        password: caseData.password || '',
        meetLink: caseData.meetLink || '',
        vakalatnama: caseData.vakalatnama || false,
        onlineLinkLetter: caseData.onlineLinkLetter || false,
        // Convert string to array if necessary
        teamEmails: Array.isArray(caseData.teamEmails) 
          ? caseData.teamEmails 
          : caseData.teamEmails?.split(',').map((email: string) => email.trim()) || [...defaultEmails]
      })
    }
  }, [caseData, isOpen])
  
  // Add this debug log at the beginning of the component to see what's being received
  useEffect(() => {
    if (isOpen) {
      console.log('Edit modal opened with case data:', caseData);
    }
  }, [isOpen, caseData]);

  // Safari-specific: Directly set time value on DOM element to avoid "invalid value" error
  useEffect(() => {
    if (timeInputRef.current && editData.time) {
      const formattedTime = formatTimeForInput(editData.time);
      if (formattedTime && timeInputRef.current.value !== formattedTime) {
        // Use setTimeout to ensure DOM is ready (Safari requirement)
        setTimeout(() => {
          if (timeInputRef.current && formattedTime) {
            timeInputRef.current.value = formattedTime;
            // Force Safari to recognize the value by triggering input event
            const event = new Event('input', { bubbles: true });
            timeInputRef.current.dispatchEvent(event);
          }
        }, 0);
      }
    }
  }, [editData.time, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    // Normalize time field to ensure it's always in HH:mm format for HTML5 input
    if (name === 'time') {
      // HTML5 time input already provides HH:mm format, but normalize to be safe
      const normalizedTime = formatTimeForInput(value) || value;
      setEditData(prev => ({ ...prev, [name]: normalizedTime }))
    } else {
      setEditData(prev => ({ ...prev, [name]: value }))
    }
  }
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setEditData(prev => ({ ...prev, [name]: checked }))
  }
  
  const handleEmailChange = (index: number, value: string) => {
    const updatedEmails = [...editData.teamEmails]
    updatedEmails[index] = value
    setEditData(prev => ({ ...prev, teamEmails: updatedEmails }))
  }
  
  const addEmail = () => {
    setEditData(prev => ({ 
      ...prev, 
      teamEmails: [...prev.teamEmails, ''] 
    }))
  }
  
  const removeEmail = (index: number) => {
    const updatedEmails = [...editData.teamEmails]
    updatedEmails.splice(index, 1)
    setEditData(prev => ({ ...prev, teamEmails: updatedEmails }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Show a loading toast when update button is clicked
    toast.loading('Updating case...')
    
    // Filter out empty emails before submitting
    const filteredEmails = Array.isArray(editData.teamEmails)
      ? editData.teamEmails.filter(email => email.trim() !== '')
      : [];
    
    // Check if there are any changes by comparing with original data
    let hasChanges = false;
    let resetEmailStatus = false;
    
    // All field changes should trigger email status reset
    
    // Check each field for changes
    const updates: any = {
      lastedit_by: localStorage.getItem('userName') || 'Unknown user'
    };
    
    // Compare each field to detect changes
    Object.keys(editData).forEach(key => {
      const field = key as keyof ArbitrationCaseData;
      
      // Special handling for teamEmails array
      if (field === 'teamEmails') {
        const originalEmails = Array.isArray(caseData.teamEmails) 
          ? caseData.teamEmails 
          : caseData.teamEmails?.split(',').map((email: string) => email.trim()) || [];
          
        const haveEmailsChanged = JSON.stringify(filteredEmails.sort()) !== JSON.stringify(originalEmails.sort());
        
        if (haveEmailsChanged) {
          hasChanges = true;
          updates[field] = filteredEmails;
          resetEmailStatus = true; // Any change should reset email status
        }
      } 
      // Handle boolean fields
      else if (typeof editData[field] === 'boolean') {
        if (editData[field] !== caseData[field]) {
          hasChanges = true;
          updates[field] = editData[field];
          resetEmailStatus = true; // Any change should reset email status
        }
      } 
      // Handle regular fields
      else if (editData[field] !== caseData[field]) {
        hasChanges = true;
        // Normalize time field for Safari compatibility
        if (field === 'time') {
          updates[field] = normalizeTimeForStorage(editData[field]);
        } else {
          updates[field] = editData[field];
        }
        resetEmailStatus = true; // Any change should reset email status
      }
    });
    
    // If any field has changed, reset email status
    if (resetEmailStatus && caseData.emailSent) {
      updates.emailSent = false;
      updates.emailSentBy = null;
      updates.emailSentAt = null;
    }
    
    // Only proceed if there are changes
    if (!hasChanges) {
      toast.dismiss();
      toast.error('No changes detected');
      return;
    }
    
    setIsSubmitting(true)
    
    try {
      // First check if we have data at all
      if (!caseData || Object.keys(caseData).length === 0) {
        throw new Error('No case data provided to modal')
      }
      
      // Log the entire case data for debugging
      console.log('Full case data object:', caseData)
      
      // Try to find the document ID from various possible properties
      const documentId = caseData.firestoreId || caseData.docId || caseData._id || caseData.id
      
      if (!documentId) {
        throw new Error('Firestore document ID is missing. Cannot update document.')
      }
      
      console.log('Using Firestore document ID for update:', documentId)
      
      // Use the actual Firestore document ID
      const arbitrationRef = doc(db, 'arbitration', documentId)
      
      // Only update fields that have changed
      await updateDoc(arbitrationRef, updates)
      
      // Call onUpdate to keep parent component in sync
      onUpdate(documentId, { ...caseData, ...updates })
      
      toast.dismiss() // Dismiss the loading toast
      toast.success('Case updated successfully')
      onClose()
    } catch (error) {
      console.error('Error updating case:', error)
      
      toast.dismiss() // Dismiss the loading toast
      toast.error('Failed to update case: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Edit Arbitration Case</h2>
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
                value={editData.clientName}
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
                value={editData.type}
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
                value={editData.startDate}
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
                ref={timeInputRef}
                type="time"
                name="time"
                required
                value={editData.time || ''}
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
                value={editData.status}
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
                value={editData.bankName}
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
                value={editData.password}
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
                value={editData.meetLink}
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
                {Array.isArray(editData.teamEmails) ? (
                  editData.teamEmails.map((email, index) => (
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
              </div>
            </div>
            
            <div className="flex space-x-6">
              {/* Vakalatnama */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vakalatnama"
                  name="vakalatnama"
                  checked={editData.vakalatnama}
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
                  checked={editData.onlineLinkLetter}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="onlineLinkLetter" className="ml-2 block text-sm text-gray-700">
                  Online Link Letter
                </label>
              </div>
            </div>
          </div>
          
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 