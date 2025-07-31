"use client"

import { useEffect, useState, Suspense } from "react"
import { collection, getDocs, query, where, orderBy, serverTimestamp, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { Spinner } from "@/components/ui/spinner"
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar"
import AssistantSidebar from "@/components/navigation/AssistantSidebar"
import toast, { Toaster } from "react-hot-toast"
import ComplaintTable from "@/app/advocate/complaints/components/ComplaintTable"
import ComplaintFilters from "@/app/advocate/complaints/components/ComplaintFilters"
import AddComplaintModal from "@/app/advocate/complaints/components/AddComplaintModal"
import EditComplaintModal from "@/app/advocate/complaints/components/EditComplaintModal"
import ComplaintHistoryModal from "@/app/advocate/complaints/components/ComplaintHistoryModal"

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

interface Advocate {
  uid: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  status: string
}

function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [advocates, setAdvocates] = useState<Advocate[]>([])
  const [loading, setLoading] = useState(true)
  const [advocateName, setAdvocateName] = useState<string>("")
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all")
  const [issueFilter, setIssueFilter] = useState<string>("all")
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null)
  
  // History modal states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedComplaintHistory, setSelectedComplaintHistory] = useState<ComplaintHistory[]>([])
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>("")

  useEffect(() => {
    // Get the advocate name from localStorage
    if (typeof window !== "undefined") {
      const userName = localStorage.getItem("userName")
      setAdvocateName(userName || "")
    }
  }, [])

  useEffect(() => {
    if (advocateName) {
      fetchComplaints()
      fetchAdvocates()
    }
  }, [advocateName])

  const fetchComplaints = async () => {
    try {
      setLoading(true)
      const complaintsRef = collection(db, "complaints")
      const q = query(complaintsRef, orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)
      
      const complaintsList: Complaint[] = []
      snapshot.forEach((doc) => {
        complaintsList.push({
          id: doc.id,
          ...doc.data()
        } as Complaint)
      })
      
      setComplaints(complaintsList)
    } catch (error) {
      console.error("Error fetching complaints:", error)
      toast.error("Failed to fetch complaints")
    } finally {
      setLoading(false)
    }
  }

  const fetchAdvocates = async () => {
    try {
      const usersRef = collection(db, "users")
      const q = query(
        usersRef, 
        where("role", "==", "advocate"),
        where("status", "==", "active")
      )
      const snapshot = await getDocs(q)
      
      const advocatesList: Advocate[] = []
      snapshot.forEach((doc) => {
        advocatesList.push({
          uid: doc.id,
          ...doc.data()
        } as Advocate)
      })
      
      setAdvocates(advocatesList)
    } catch (error) {
      console.error("Error fetching advocates:", error)
    }
  }

  const handleAddComplaint = async (complaintData: Omit<Complaint, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const complaintsRef = collection(db, "complaints")
      await addDoc(complaintsRef, {
        ...complaintData,
        createdAt: serverTimestamp(),
        createdBy: advocateName
      })
      
      toast.success("Complaint added successfully")
      setIsAddModalOpen(false)
      fetchComplaints() // Refresh the list
    } catch (error) {
      console.error("Error adding complaint:", error)
      toast.error("Failed to add complaint")
    }
  }

  const handleEditComplaint = async (complaintData: Complaint) => {
    try {
      const complaintRef = doc(db, "complaints", complaintData.id)
      await updateDoc(complaintRef, {
        ...complaintData,
        updatedAt: serverTimestamp(),
        updatedBy: advocateName
      })
      
      toast.success("Complaint updated successfully")
      setIsEditModalOpen(false)
      setEditingComplaint(null)
      fetchComplaints() // Refresh the list
    } catch (error) {
      console.error("Error updating complaint:", error)
      toast.error("Failed to update complaint")
    }
  }

  const handleDeleteComplaint = async (complaintId: string) => {
    if (!confirm("Are you sure you want to delete this complaint?")) {
      return
    }

    try {
      const complaintRef = doc(db, "complaints", complaintId)
      await deleteDoc(complaintRef)
      
      toast.success("Complaint deleted successfully")
      fetchComplaints() // Refresh the list
    } catch (error) {
      console.error("Error deleting complaint:", error)
      toast.error("Failed to delete complaint")
    }
  }

  const handleStatusChange = (complaintId: string, newStatus: string) => {
    // Immediately update the local state
    setComplaints(prevComplaints => 
      prevComplaints.map(complaint => 
        complaint.id === complaintId 
          ? { ...complaint, status: newStatus }
          : complaint
      )
    )
  }

  const handleViewHistory = async (complaintId: string) => {
    try {
      const historyRef = collection(db, "complaints", complaintId, "history")
      const q = query(historyRef, orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)

      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        complaintId: complaintId,
        ...doc.data()
      })) as ComplaintHistory[]

      setSelectedComplaintHistory(history)
      setSelectedComplaintId(complaintId)
      setIsHistoryModalOpen(true)
    } catch (error) {
      console.error("Error fetching history:", error)
      toast.error("Failed to fetch history")
    }
  }

  const getFilteredComplaints = () => {
    return complaints.filter((complaint) => {
      const matchesSearch =
        searchQuery === "" ||
        complaint.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.clientPhone.includes(searchQuery) ||
        complaint.issue.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || complaint.status === statusFilter
      const matchesAssignedTo = assignedToFilter === "all" || complaint.assignedTo === assignedToFilter
      const matchesIssue = issueFilter === "all" || complaint.issue === issueFilter

      // Date filter logic
      let matchesDate = true
      if (dateFilter !== "all") {
        const complaintDate = complaint.createdAt?.toDate?.() || new Date(complaint.createdAt)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)

        switch (dateFilter) {
          case "today":
            matchesDate = complaintDate.toDateString() === today.toDateString()
            break
          case "yesterday":
            matchesDate = complaintDate.toDateString() === yesterday.toDateString()
            break
          case "lastWeek":
            matchesDate = complaintDate >= lastWeek
            break
          case "lastMonth":
            matchesDate = complaintDate >= lastMonth
            break
        }
      }

      return matchesSearch && matchesStatus && matchesAssignedTo && matchesIssue && matchesDate
    })
  }

  const openEditModal = (complaint: Complaint) => {
    setEditingComplaint(complaint)
    setIsEditModalOpen(true)
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      )
    }

    const filteredComplaints = getFilteredComplaints()

    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Complaints Management</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors duration-200 flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
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

        <ComplaintFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          assignedToFilter={assignedToFilter}
          setAssignedToFilter={setAssignedToFilter}
          issueFilter={issueFilter}
          setIssueFilter={setIssueFilter}
          advocates={advocates}
          totalComplaints={complaints.length}
          filteredCount={filteredComplaints.length}
          onClearFilters={() => {
            setSearchQuery("")
            setDateFilter("all")
            setStatusFilter("all")
            setAssignedToFilter("all")
            setIssueFilter("all")
          }}
        />

        <ComplaintTable
          complaints={filteredComplaints}
          onEdit={openEditModal}
          onDelete={handleDeleteComplaint}
          onViewHistory={handleViewHistory}
          onStatusChange={handleStatusChange}
        />
      </div>
    )
  }

  return (
    <div className="flex-1">
      {renderContent()}
      
      <AddComplaintModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddComplaint}
      />
      
      <EditComplaintModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingComplaint(null)
        }}
        onEdit={handleEditComplaint}
        complaint={editingComplaint}
      />

      <ComplaintHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false)
          setSelectedComplaintHistory([])
          setSelectedComplaintId("")
        }}
        history={selectedComplaintHistory}
        complaintId={selectedComplaintId}
      />
      
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#333",
            color: "#fff",
          },
          success: {
            duration: 3000,
            style: {
              background: "rgba(47, 133, 90, 0.9)",
            },
          },
          error: {
            duration: 3000,
            style: {
              background: "rgba(175, 45, 45, 0.9)",
            },
          },
        }}
      />
    </div>
  )
}

export default function AdvocateComplaintsPage() {
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole')
      setUserRole(role || '')
    }
  }, [])

  return (
    <div className="flex bg-gray-900 min-h-screen">
      {userRole === 'assistant' ? <AssistantSidebar /> : <AdvocateSidebar />}
      <Suspense
        fallback={
          <div className="flex-1 flex justify-center items-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <ComplaintsPage />
      </Suspense>
    </div>
  )
}
