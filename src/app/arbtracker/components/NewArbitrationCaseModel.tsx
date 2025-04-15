'use client'

import React, { useState } from 'react'
import { FaTimes } from 'react-icons/fa'

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
  teamEmails: string
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
  teamEmails: ''
}

export default function NewArbitrationCaseModal({
  isOpen,
  onClose,
  onSubmit
}: NewArbitrationCaseModalProps) {
  const [caseData, setCaseData] = useState<ArbitrationCaseData>(initialCaseData)
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCaseData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setCaseData(prev => ({ ...prev, [name]: checked }))
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(caseData)
    setCaseData(initialCaseData) // Reset form
    onClose()
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                value={caseData.time}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://"
              />
            </div>
            
            {/* Team Emails */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Emails
              </label>
              <textarea
                name="teamEmails"
                value={caseData.teamEmails}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter email addresses separated by commas"
              />
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
          
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}