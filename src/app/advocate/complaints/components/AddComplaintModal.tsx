import React, { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/firebase/firebase"

interface Client {
  id: string
  name: string
  phone: string
}

interface Advocate {
  uid: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  status: string
}

interface ComplaintData {
  clientName: string
  clientPhone: string
  issue: string
  assignedTo: string
  status: string
  remarks: string
}

interface AddComplaintModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (complaintData: ComplaintData) => void
}

// Issue types with colors
const ISSUE_TYPES = {
  "NCH": { label: "NCH", color: "bg-red-800 text-red-200" },
  "Harrasement Notice": { label: "Harrasement Notice", color: "bg-orange-800 text-orange-200" },
  "Excessive Flow": { label: "Excessive Flow", color: "bg-yellow-800 text-yellow-200" },
  "RBI/CYBER/NCW": { label: "RBI/CYBER/NCW", color: "bg-purple-800 text-purple-200" }
}

const AddComplaintModal: React.FC<AddComplaintModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ComplaintData>({
    clientName: "",
    clientPhone: "",
    issue: "",
    assignedTo: "",
    status: "pending",
    remarks: ""
  })

  const [errors, setErrors] = useState<Partial<ComplaintData>>({})
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      // Auto-assign to current advocate
      const currentAdvocate = localStorage.getItem("userName")
      if (currentAdvocate) {
        setFormData(prev => ({ ...prev, assignedTo: currentAdvocate }))
      }
    }
  }, [isOpen])

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

  if (!isOpen) return null

  const validateForm = (): boolean => {
    const newErrors: Partial<ComplaintData> = {}

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
      // Auto-set values before submitting
      const currentAdvocate = localStorage.getItem("userName") || "Unknown"
      const finalData = {
        ...formData,
        assignedTo: currentAdvocate,
        status: "pending",
        remarks: ""
      }
      
      onAdd(finalData)
      // Reset form
      setFormData({
        clientName: "",
        clientPhone: "",
        issue: "",
        assignedTo: currentAdvocate,
        status: "pending",
        remarks: ""
      })
      setErrors({})
      setClientSearchQuery("")
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
      setClientSearchQuery(selectedClient.name)
      setShowClientDropdown(false)
    }
    // Clear error when user selects a client
    if (errors.clientName) {
      setErrors(prev => ({ ...prev, clientName: undefined }))
    }
  }

  const handleInputChange = (field: keyof ComplaintData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleClientSearchChange = (value: string) => {
    setClientSearchQuery(value)
    setShowClientDropdown(true)
    
    // If user clears the search, also clear the selected client
    if (!value.trim()) {
      setFormData(prev => ({
        ...prev,
        clientName: "",
        clientPhone: ""
      }))
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    client.phone.includes(clientSearchQuery)
  )

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      clientName: client.name,
      clientPhone: client.phone
    }))
    setClientSearchQuery(client.name)
    setShowClientDropdown(false)
    
    // Clear error when user selects a client
    if (errors.clientName) {
      setErrors(prev => ({ ...prev, clientName: undefined }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-2xl w-full animate-fadeIn shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h2 className="text-2xl font-bold text-white">Add New Complaint</h2>
          <button
            onClick={onClose}
            className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection with Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Client *
            </label>
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => handleClientSearchChange(e.target.value)}
                  placeholder="Search by name or phone number..."
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.clientName ? "border-red-500" : "border-gray-600"
                  }`}
                  onFocus={() => setShowClientDropdown(true)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              
              {/* Dropdown */}
              {showClientDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="px-3 py-2 text-gray-400 text-sm">
                      {clientSearchQuery ? "No clients found" : "Start typing to search clients"}
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleClientSelect(client)}
                        className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
                      >
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-gray-400">{client.phone}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
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

          {/* Auto-assignment Info */}
          <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
            <div className="flex items-center text-sm text-blue-300">
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                This complaint will be automatically assigned to <strong>{localStorage.getItem("userName") || "you"}</strong> with status <strong>Pending</strong>
              </span>
            </div>
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
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors duration-200 flex items-center"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Complaint
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

export default AddComplaintModal 