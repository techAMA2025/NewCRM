import React, { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/firebase/firebase"

interface Client {
  id: string
  name: string
  phone: string
}

interface Complaint {
  id: string
  clientName: string
  clientPhone: string
  issue: string
  assignedTo: string
  status: string
  remarks: string
  createdAt: any
  createdBy: string
  updatedAt?: any
  updatedBy?: string
}

interface EditComplaintModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (complaintData: Complaint) => void
  complaint: Complaint | null
}

// Issue types with colors
const ISSUE_TYPES = {
  "NCH": { label: "NCH", color: "bg-red-800 text-red-200" },
  "Harrasement Notice": { label: "Harrasement Notice", color: "bg-orange-800 text-orange-200" },
  "Excessive Flow": { label: "Excessive Flow", color: "bg-yellow-800 text-yellow-200" },
  "RBI/CYBER/NCW": { label: "RBI/CYBER/NCW", color: "bg-purple-800 text-purple-200" }
}

const EditComplaintModal: React.FC<EditComplaintModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  complaint
}) => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Complaint>({
    id: "",
    clientName: "",
    clientPhone: "",
    issue: "",
    assignedTo: "",
    status: "pending",
    remarks: "",
    createdAt: null,
    createdBy: ""
  })

  const [errors, setErrors] = useState<Partial<Complaint>>({})

  useEffect(() => {
    if (isOpen) {
      fetchClients()
    }
  }, [isOpen])

  useEffect(() => {
    if (complaint) {
      setFormData(complaint)
      setErrors({})
    }
  }, [complaint])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const clientsRef = collection(db, "clients")
      const snapshot = await getDocs(clientsRef)
      
      const clientsList: Client[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        clientsList.push({
          id: doc.id,
          name: data.name || "",
          phone: data.phone || ""
        })
      })
      
      setClients(clientsList)
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !complaint) return null

  const validateForm = (): boolean => {
    const newErrors: Partial<Complaint> = {}

    if (!formData.clientName.trim()) {
      newErrors.clientName = "Please select a client"
    }

    if (!formData.issue.trim()) {
      newErrors.issue = "Please select an issue type"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onEdit(formData)
    }
  }

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(client => client.id === clientId)
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone
      }))
    }
    // Clear error when user selects a client
    if (errors.clientName) {
      setErrors(prev => ({ ...prev, clientName: undefined }))
    }
  }

  const handleInputChange = (field: keyof Complaint, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-2xl w-full animate-fadeIn shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h2 className="text-2xl font-bold text-white">Edit Complaint</h2>
          <button
            onClick={onClose}
            className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Client *
            </label>
            <select
              value={clients.find(c => c.name === formData.clientName)?.id || ""}
              onChange={(e) => handleClientChange(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.clientName ? "border-red-500" : "border-gray-600"
              }`}
              disabled={loading}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.clientName && (
              <p className="mt-1 text-sm text-red-400">{errors.clientName}</p>
            )}
            {formData.clientPhone && (
              <p className="mt-1 text-sm text-gray-400">
                Phone: {formData.clientPhone}
              </p>
            )}
          </div>

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Issue Type *
            </label>
            <select
              value={formData.issue}
              onChange={(e) => handleInputChange("issue", e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.issue ? "border-red-500" : "border-gray-600"
              }`}
            >
              <option value="">Select issue type</option>
              {Object.entries(ISSUE_TYPES).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
            {errors.issue && (
              <p className="mt-1 text-sm text-red-400">{errors.issue}</p>
            )}
            {formData.issue && (
              <div className="mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${ISSUE_TYPES[formData.issue as keyof typeof ISSUE_TYPES]?.color}`}>
                  {formData.issue}
                </span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors duration-200 flex items-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Update Complaint
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default EditComplaintModal 