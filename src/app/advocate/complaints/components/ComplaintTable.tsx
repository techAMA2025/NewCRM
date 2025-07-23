import React, { useState, useEffect } from "react"
import { collection, getDocs, query, where, updateDoc, doc, addDoc, orderBy, serverTimestamp, limit } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import toast from "react-hot-toast"

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
  completedAt?: any
}

interface ComplaintHistory {
  id: string
  complaintId: string
  content: string
  createdAt: any
  createdBy: string
  displayDate?: string
}

interface ComplaintTableProps {
  complaints: Complaint[]
  onEdit: (complaint: Complaint) => void
  onDelete: (complaintId: string) => void
  onViewHistory: (complaintId: string) => void
  onStatusChange: (complaintId: string, newStatus: string) => void
}

// Issue types with colors
const ISSUE_TYPES = {
  "NCH": { label: "NCH", color: "bg-red-800 text-red-200" },
  "Harrasement Notice": { label: "Harrasement Notice", color: "bg-orange-800 text-orange-200" },
  "Excessive Flow": { label: "Excessive Flow", color: "bg-yellow-800 text-yellow-200" },
  "RBI/CYBER/NCW": { label: "RBI/CYBER/NCW", color: "bg-purple-800 text-purple-200" }
}

function formatIndianDate(date: any): string {
  if (!date) return "Not specified"

  if (date.toDate && typeof date.toDate === "function") {
    const dateObj = date.toDate()
    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
  }

  if (typeof date === "string") {
    const dateObj = new Date(date)
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    }
    return date
  }

  return "Not specified"
}

function formatIndianPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "")

  if (digits.length === 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits.substring(0, 2)} ${digits.substring(2, 7)} ${digits.substring(7)}`
  }

  return phone
}

const ComplaintTable: React.FC<ComplaintTableProps> = ({ complaints, onEdit, onDelete, onViewHistory, onStatusChange }) => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const [savingRemarks, setSavingRemarks] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    // Fetch latest remarks for all complaints
    complaints.forEach(complaint => {
      fetchLatestRemark(complaint.id)
    })
  }, [complaints])

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
      toast.error("Failed to fetch clients")
    } finally {
      setLoading(false)
    }
  }

  const fetchLatestRemark = async (complaintId: string) => {
    try {
      const historyRef = collection(db, "complaints", complaintId, "history")
      const q = query(historyRef, orderBy("createdAt", "desc"), limit(1))
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const latestRemark = snapshot.docs[0].data().content
        setRemarks(prev => ({ ...prev, [complaintId]: latestRemark }))
      }
    } catch (error) {
      console.error("Error fetching latest remark:", error)
    }
  }

  const handleStatusChange = async (complaintId: string, newStatus: string) => {
    try {
      setStatusUpdating(complaintId)
      const advocateName = localStorage.getItem("userName") || "Unknown"
      
      const complaintRef = doc(db, "complaints", complaintId)
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: advocateName
      }

      // Add completedAt timestamp when status is changed to "completed"
      if (newStatus === "completed") {
        updateData.completedAt = serverTimestamp()
      }

      await updateDoc(complaintRef, updateData)
      
      // Immediately update the parent component's state
      onStatusChange(complaintId, newStatus)
      
      toast.success("Status updated successfully")
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    } finally {
      setStatusUpdating(null)
    }
  }

  const handleRemarkChange = (complaintId: string, value: string) => {
    setRemarks(prev => ({ ...prev, [complaintId]: value }))
  }

  const handleSaveRemark = async (complaintId: string) => {
    try {
      const advocateName = localStorage.getItem("userName") || "Unknown"
      const remarkText = remarks[complaintId]?.trim()

      if (!remarkText) {
        toast.error("Please enter a remark before saving")
        return
      }

      setSavingRemarks(prev => ({ ...prev, [complaintId]: true }))

      const historyRef = collection(db, "complaints", complaintId, "history")
      await addDoc(historyRef, {
        content: remarkText,
        createdAt: serverTimestamp(),
        createdBy: advocateName,
        displayDate: new Date().toLocaleString()
      })

      // Keep the remark in the textarea after saving (don't clear it)
      toast.success("Remark saved successfully")
    } catch (error) {
      console.error("Error saving remark:", error)
      toast.error("Failed to save remark")
    } finally {
      setSavingRemarks(prev => ({ ...prev, [complaintId]: false }))
    }
  }

  const getIssueColor = (issue: string) => {
    return ISSUE_TYPES[issue as keyof typeof ISSUE_TYPES]?.color || "bg-gray-800 text-gray-200"
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (complaints.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-lg">
        <p className="text-gray-300 text-sm">No complaints found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-gray-800 shadow-md rounded-lg text-sm">
        <thead>
          <tr className="bg-gray-700">
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Date & Time
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Client Details
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Issue
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Assigned To
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Remarks
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {complaints.map((complaint) => (
            <tr key={complaint.id} className="hover:bg-gray-700 transition-colors duration-150">
              <td className="px-3 py-3 whitespace-nowrap text-gray-200 text-xs">
                {formatIndianDate(complaint.createdAt)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <div className="text-gray-200 text-sm font-medium">{complaint.clientName}</div>
                <div className="text-gray-400 text-xs">{formatIndianPhoneNumber(complaint.clientPhone)}</div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIssueColor(complaint.issue)}`}>
                  {complaint.issue}
                </span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span className="px-2 py-1 bg-blue-800 text-blue-200 rounded-full text-xs font-medium">
                  {complaint.assignedTo}
                </span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                {statusUpdating === complaint.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                ) : (
                  <select
                    value={complaint.status}
                    onChange={(e) => handleStatusChange(complaint.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-0 focus:ring-1 focus:ring-opacity-50 ${
                      complaint.status === "pending"
                        ? "bg-yellow-800 text-yellow-200 focus:ring-yellow-500"
                        : "bg-green-800 text-green-200 focus:ring-green-500"
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                )}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-col space-y-2">
                  <textarea
                    value={remarks[complaint.id] || ""}
                    onChange={(e) => handleRemarkChange(complaint.id, e.target.value)}
                    placeholder="Add remark..."
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                    rows={2}
                  />
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleSaveRemark(complaint.id)}
                      disabled={savingRemarks[complaint.id] || !remarks[complaint.id]?.trim()}
                      className="px-2 py-0.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white text-xs rounded transition-colors duration-200 flex items-center"
                    >
                      {savingRemarks[complaint.id] ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                      ) : (
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {savingRemarks[complaint.id] ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => onViewHistory(complaint.id)}
                      className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      History
                    </button>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(complaint)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors duration-200 flex items-center"
                  >
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(complaint.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors duration-200 flex items-center"
                  >
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ComplaintTable 