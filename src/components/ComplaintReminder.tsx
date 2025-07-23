"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"

interface Complaint {
  id: string
  clientName: string
  clientPhone: string
  issue: string
  assignedTo: string
  status: string
  createdAt: any
}

const ComplaintReminder = () => {
  const [userRole, setUserRole] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [lastReminderTime, setLastReminderTime] = useState<{ [key: string]: number }>({})
  const router = useRouter()

  useEffect(() => {
    // Get user role and name from localStorage
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("userRole")
      const name = localStorage.getItem("userName")
      setUserRole(role || "")
      setUserName(name || "")
    }
  }, [])

  useEffect(() => {
    // Only run for advocates
    if (userRole !== "advocate" || !userName) return

    // Fetch complaints assigned to this advocate
    const fetchAssignedComplaints = async () => {
      try {
        const complaintsRef = collection(db, "complaints")
        const q = query(
          complaintsRef,
          where("assignedTo", "==", userName),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        )
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
        console.error("Error fetching assigned complaints:", error)
      }
    }

    fetchAssignedComplaints()

    // Set up interval to check for reminders every 45 minutes
    const interval = setInterval(() => {
      fetchAssignedComplaints()
    }, 2700000) // 45 minutes = 2,700,000 milliseconds

    return () => clearInterval(interval)
  }, [userRole, userName])

  useEffect(() => {
    // Show reminders for pending complaints
    if (userRole !== "advocate" || !userName || complaints.length === 0) return

    complaints.forEach((complaint) => {
      const now = Date.now()
      const lastShown = lastReminderTime[complaint.id] || 0
      const timeSinceLastReminder = now - lastShown

      // Show reminder if it hasn't been shown in the last 45 minutes
      if (timeSinceLastReminder >= 2700000) {
        showComplaintReminder(complaint)
        setLastReminderTime(prev => ({ ...prev, [complaint.id]: now }))
      }
    })
  }, [complaints, userRole, userName, lastReminderTime])

  const showComplaintReminder = (complaint: Complaint) => {
    const formatPhone = (phone: string) => {
      const digits = phone.replace(/\D/g, "")
      if (digits.length === 10) {
        return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`
      }
      if (digits.length === 12 && digits.startsWith("91")) {
        return `+${digits.substring(0, 2)} ${digits.substring(2, 7)} ${digits.substring(7)}`
      }
      return phone
    }

    const getIssueColor = (issue: string) => {
      const colors = {
        "NCH": "text-red-400",
        "Harrasement Notice": "text-orange-400",
        "Excessive Flow": "text-yellow-400",
        "RBI/CYBER/NCW": "text-purple-400"
      }
      return colors[issue as keyof typeof colors] || "text-gray-400"
    }

    toast.info(
      <div className="space-y-2">
        <div className="font-semibold text-white">
          📋 Pending Complaint Reminder
        </div>
        <div className="text-sm">
          <div className="text-gray-300">
            <span className="font-medium">Client:</span> {complaint.clientName}
          </div>
          <div className="text-gray-300">
            <span className="font-medium">Phone:</span> {formatPhone(complaint.clientPhone)}
          </div>
          <div className={`font-medium ${getIssueColor(complaint.issue)}`}>
            <span className="text-gray-300">Issue:</span> {complaint.issue}
          </div>
        </div>
        <button
          onClick={() => {
            router.push("/advocate/complaints")
            toast.dismiss()
          }}
          className="w-full mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors duration-200"
        >
          View Complaint
        </button>
      </div>,
      {
        position: "top-right",
        autoClose: 10000, // 10 seconds
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: "#1f2937",
          color: "#ffffff",
          border: "1px solid #374151",
          borderRadius: "8px",
          minWidth: "300px"
        }
      }
    )
  }

  // Don't render anything - this is just for side effects
  return null
}

export default ComplaintReminder 