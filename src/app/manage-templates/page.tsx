"use client"

import React, { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { toast } from 'react-hot-toast'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import { FaPlus, FaEdit, FaTrash, FaWhatsapp, FaSave, FaTimes, FaFilter, FaSearch, FaCheckSquare, FaSquare } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

type RoleType = 'advocate' | 'sales' | 'overlord'

interface WhatsAppTemplate {
  id: string
  name: string
  templateName: string
  description: string
  type: RoleType | RoleType[]
  isActive: boolean
  createdAt: any
  updatedAt: any
}

const ManageTemplatesPage = () => {
  const router = useRouter()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null)
  const [filterType, setFilterType] = useState<'all' | RoleType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    templateName: '',
    description: '',
    type: [] as RoleType[],
    isActive: true
  })

  // Check if user is overlord
  useEffect(() => {
    const userRole = localStorage.getItem('userRole')
    if (userRole !== 'overlord') {
      toast.error('Access denied. Overlord privileges required.')
      router.push('/dashboard')
      return
    }
    fetchTemplates()
  }, [router])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const templatesRef = collection(db, 'whatsappTemplates')
      const q = query(templatesRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WhatsAppTemplate[]
      
      setTemplates(templatesData)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.templateName.trim() || !formData.description.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    if (formData.type.length === 0) {
      toast.error('Please select at least one template type')
      return
    }

    try {
      const templatesRef = collection(db, 'whatsappTemplates')
      
      if (editingTemplate) {
        // Update existing template
        const templateDoc = doc(db, 'whatsappTemplates', editingTemplate.id)
        await updateDoc(templateDoc, {
          ...formData,
          updatedAt: serverTimestamp()
        })
        toast.success('Template updated successfully')
      } else {
        // Create new template
        await addDoc(templatesRef, {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        toast.success('Template created successfully')
      }
      
      await fetchTemplates()
      resetForm()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template)
    
    // Normalize type to array for the form
    const types = Array.isArray(template.type) 
      ? template.type 
      : [template.type as RoleType]

    setFormData({
      name: template.name,
      templateName: template.templateName,
      description: template.description,
      type: types,
      isActive: template.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await deleteDoc(doc(db, 'whatsappTemplates', templateId))
      toast.success('Template deleted successfully')
      await fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      templateName: '',
      description: '',
      type: [],
      isActive: true
    })
    setEditingTemplate(null)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const toggleRole = (role: RoleType) => {
    setFormData(prev => {
      const isSelected = prev.type.includes(role)
      if (isSelected) {
        return { ...prev, type: prev.type.filter(r => r !== role) }
      } else {
        return { ...prev, type: [...prev.type, role] }
      }
    })
  }

  const filteredTemplates = templates.filter(template => {
    const templateTypes = Array.isArray(template.type) ? template.type : [template.type as RoleType]
    const matchesFilter = filterType === 'all' || templateTypes.includes(filterType)
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <OverlordSidebar>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </OverlordSidebar>
    )
  }

  return (
    <OverlordSidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl">
                  <FaWhatsapp className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">WhatsApp Template Manager</h1>
                  <p className="text-gray-600 mt-1">Manage WhatsApp message templates for advocates, sales, and overlords</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FaPlus className="w-4 h-4" />
                <span className="font-medium">Create Template</span>
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <FaSearch className="text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-black flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-400 w-5 h-5" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | RoleType)}
                  className="text-black px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="sales">Sales Templates</option>
                  <option value="advocate">Advocate Templates</option>
                  <option value="overlord">Overlord Templates</option>
                </select>
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const types = Array.isArray(template.type) ? template.type : [template.type as RoleType]
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex flex-wrap gap-2">
                        {types.map(type => (
                          <span key={type} className={`px-2 py-1 text-xs font-medium rounded-full ${
                            type === 'advocate'
                              ? 'bg-purple-100 text-purple-800'
                              : type === 'sales'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </span>
                        ))}
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        template.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`} title={template.isActive ? 'Active' : 'Inactive'} />
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-2 line-clamp-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-black mb-3 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="text-xs text-black mb-4 bg-gray-50 rounded-lg p-2">
                      <span className="font-medium">Template ID:</span> {template.templateName}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                      >
                        <FaEdit className="w-4 h-4" />
                        <span className="text-sm font-medium">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
                      >
                        <FaTrash className="w-4 h-4" />
                        <span className="text-sm font-medium">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <FaWhatsapp className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || filterType !== 'all' 
                    ? 'No templates match your current search or filter criteria.'
                    : 'Start by creating your first WhatsApp template.'
                  }
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  Create First Template
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 my-8">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingTemplate ? 'Edit Template' : 'Create Template'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="text-black w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., CIBIL Report"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template ID
                  </label>
                  <input
                    type="text"
                    value={formData.templateName}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                    className="text-black w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., ama_dashboard_credit_report"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="text-black w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe what this template is used for..."
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Type (Select all that apply)
                  </label>
                  <div className="grid grid-cols-1 gap-2 p-3 border border-gray-300 rounded-lg">
                    {(['sales', 'advocate', 'overlord'] as RoleType[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          formData.type.includes(role)
                            ? 'bg-blue-50 text-blue-700 border-blue-200 border'
                            : 'hover:bg-gray-50 text-gray-600 border-transparent border'
                        }`}
                      >
                        {formData.type.includes(role) ? (
                          <FaCheckSquare className="w-5 h-5" />
                        ) : (
                          <FaSquare className="w-5 h-5 text-gray-300" />
                        )}
                        <span className="font-medium capitalize">{role}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Template is active
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    <FaSave className="w-4 h-4" />
                    <span>{editingTemplate ? 'Update' : 'Create'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OverlordSidebar>
  )
}

export default ManageTemplatesPage

