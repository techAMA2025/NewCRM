'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FaTimes } from 'react-icons/fa'
import { ArbitrationCaseData } from './NewArbitrationCaseModel'
import { db } from '@/firebase/firebase' 
import { doc, updateDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'

interface EditArbitrationCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, caseData: ArbitrationCaseData) => void
  caseData: any 
}

// Normalize time value to HH:mm format
const normalizeTimeForStorage = (timeValue: string | undefined | null): string => {
  if (!timeValue) return '';
  const time = String(timeValue).trim();
  const invalidPatterns = ['invalid', 'invaliddate', 'nan', 'invalid date', 'invalid time', 'null', 'undefined'];
  if (invalidPatterns.some(pattern => time.toLowerCase() === pattern)) {
    return '';
  }
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (timeRegex.test(time)) return time;
  
  try {
    const parts = time.split(':');
    if (parts.length >= 2) {
      const hoursStr = parts[0].trim();
      const minutesStr = parts[1].split('.')[0].trim();
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  } catch (e) {}
  const match = time.match(/([0-1][0-9]|2[0-3]):[0-5][0-9]/);
  return match ? match[0] : '';
}

const formatTimeForInput = (timeValue: string | undefined | null): string => {
  if (!timeValue) return '';
  const time = String(timeValue).trim();
  const invalidPatterns = ['invalid', 'invaliddate', 'nan', 'invalid date', 'invalid time', 'null', 'undefined'];
  if (invalidPatterns.some(pattern => time.toLowerCase() === pattern)) return '';
  const strictTimeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (strictTimeRegex.test(time)) return time;
  try {
    const parts = time.split(':');
    if (parts.length >= 2) {
      const hoursStr = parts[0].trim();
      const minutesStr = parts[1].split('.')[0].trim();
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  } catch (e) {}
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
    clientId: '',
    type: 'Arbitration',
    startDate: '',
    time: '',
    status: 'In progress',
    bankName: '',
    bankId: '',
    meetLink: '',
    vakalatnama: false,
    sod: false
  })
  
  const [meetLinkType, setMeetLinkType] = useState<'url' | 'other'>('url')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const timeInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    if (caseData && isOpen) {
      setEditData({
        clientName: caseData.clientName || '',
        clientId: caseData.clientId || '',
        type: caseData.type || 'Arbitration',
        startDate: caseData.startDate || '',
        time: formatTimeForInput(caseData.time),
        status: caseData.status || 'In progress',
        bankName: caseData.bankName || '',
        bankId: caseData.bankId || '',
        meetLink: caseData.meetLink || '',
        vakalatnama: caseData.vakalatnama || false,
        sod: caseData.sod || false
      })

      // Determine initial meetLinkType
      const isUrl = (url: string) => {
        try {
          new URL(url);
          return true;
        } catch (_) {
          return url.startsWith('http://') || url.startsWith('https://');
        }
      }
      setMeetLinkType(isUrl(caseData.meetLink || '') ? 'url' : 'other');
    }
  }, [caseData, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'time') {
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    toast.loading('Updating case...')
    
    let hasChanges = false;
    let dateTimeChanged = false;
    const updates: any = {
      lastedit_by: localStorage.getItem('userName') || 'Unknown user'
    };
    
    Object.keys(editData).forEach(key => {
      const field = key as keyof ArbitrationCaseData;
      if (editData[field] !== caseData[field]) {
        hasChanges = true;
        if (field === 'startDate' || field === 'time') {
          dateTimeChanged = true;
        }
        
        if (field === 'time') {
          updates[field] = normalizeTimeForStorage(editData[field]);
        } else {
          updates[field] = editData[field];
        }
      }
    });

    if (dateTimeChanged) {
      const currentCount = caseData.hearingCount || 1;
      updates.hearingCount = currentCount + 1;
    }
    
    if (!hasChanges) {
      toast.dismiss();
      toast.error('No changes detected');
      return;
    }
    
    setIsSubmitting(true)
    try {
      const documentId = caseData.firestoreId || caseData.id
      if (!documentId) throw new Error('Firestore document ID is missing')
      
      const arbitrationRef = doc(db, 'arbitration', documentId)
      await updateDoc(arbitrationRef, updates)
      onUpdate(documentId, { ...caseData, ...updates })
      
      toast.dismiss()
      toast.success('Case updated successfully')
      onClose()
    } catch (error) {
      console.error('Error updating case:', error)
      toast.dismiss()
      toast.error('Failed to update case')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Arbitration Case</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name*</label>
              <input
                type="text"
                name="clientName"
                required
                value={editData.clientName}
                onChange={handleChange}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name*</label>
              <input
                type="text"
                name="bankName"
                required
                value={editData.bankName}
                onChange={handleChange}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type*</label>
              <select
                name="type"
                required
                value={editData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="Arbitration">Arbitration</option>
                <option value="Mediation">Mediation</option>
                <option value="Conciliation">Conciliation</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date*</label>
              <input
                type="date"
                name="startDate"
                required
                value={editData.startDate}
                onChange={handleChange}
                className="text-black dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time*</label>
              <input
                ref={timeInputRef}
                type="time"
                name="time"
                required
                value={editData.time || ''}
                onChange={handleChange}
                className="text-black dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status*</label>
              <select
                name="status"
                required
                value={editData.status}
                onChange={handleChange}
                className="text-black dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
              >
                <option value="In progress">In Progress</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Pending Decision">Pending Decision</option>
                <option value="New Filing">New Filing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meet Link</label>
              <div className="flex gap-2">
                <select
                  value={meetLinkType}
                  onChange={(e) => setMeetLinkType(e.target.value as 'url' | 'other')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black dark:text-white bg-white dark:bg-gray-700 w-32"
                >
                  <option value="url">URL</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type={meetLinkType === 'url' ? 'url' : 'text'}
                  name="meetLink"
                  value={editData.meetLink}
                  onChange={handleChange}
                  className="text-black dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  placeholder={meetLinkType === 'url' ? 'https://' : 'Enter meeting details'}
                />
              </div>
            </div>
            
            <div className="flex space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vakalatnama"
                  name="vakalatnama"
                  checked={editData.vakalatnama}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="vakalatnama" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Vakalatnama</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sod"
                  name="sod"
                  checked={editData.sod}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="sod" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">SOD (Statement Of Defense)</label>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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