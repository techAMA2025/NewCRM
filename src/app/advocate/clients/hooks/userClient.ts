"use client"

import { useState, useEffect } from "react"
import {
  doc,
  updateDoc,
  addDoc,
  orderBy,
  serverTimestamp,
  limit,
  getDocs,
  query,
  where,
  collection,
  onSnapshot, // Import onSnapshot
} from "firebase/firestore"
// import { fetchClients as fetchClientsAction } from "../actions" // Comment out server action
import { db } from "@/firebase/firebase"
import toast from "react-hot-toast"
import type { RemarkHistory, FilterState } from "../types/client"

// Use compatible Client type that matches ClientEditModal
interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
  settled: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  altPhone: string;
  assignedTo: string;
  email: string;
  city: string;
  alloc_adv: string;
  status: string;
  personalLoanDues: string;
  creditCardDues: string;
  banks: Bank[];
  monthlyIncome?: string;
  monthlyFees?: string;
  occupation?: string;
  startDate?: string;
  tenure?: string;
  remarks?: string;
  salesNotes?: string;
  queries?: string;
  isPrimary: boolean;
  isSecondary: boolean;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: Date;
  // Additional fields from local type
  alloc_adv_secondary?: string;
  alloc_adv_secondary_at?: any;
  alloc_adv_at?: any;
  convertedAt?: any;
  adv_status?: string;
  source_database?: string;
  request_letter?: boolean;
  sentAgreement?: boolean;
  convertedFromLead?: boolean;
  leadId?: string;
  dob?: string;
  panNumber?: string;
  aadharNumber?: string;
  documents?: {
    type: string;
    bankName?: string;
    accountType?: string;
    createdAt?: string;
    url?: string;
    name?: string;
    lastEdited?: string;
    htmlUrl?: string;
  }[];
  client_app_status?: {
    index: string;
    remarks: string;
    createdAt: number;
    createdBy: string;
  }[];
}

export function useClients(advocateName: string) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [latestRemarks, setLatestRemarks] = useState<{ [key: string]: string }>({})
  const [facets, setFacets] = useState<{ cities: string[], sources: string[] }>({ cities: [], sources: [] })

  const setupListeners = () => {
    if (!advocateName) return () => { } // Return an empty cleanup function if no advocateName

    setLoading(true)
    const clientsRef = collection(db, "clients")
    const primaryQuery = query(clientsRef, where("alloc_adv", "==", advocateName))
    const secondaryQuery = query(clientsRef, where("alloc_adv_secondary", "==", advocateName))

    let primaryClients: Client[] = []
    let secondaryClients: Client[] = []
    const remarkUnsubscribes = new Map<string, () => void>()

    const updateClients = () => {
      const mergedClientsMap = new Map<string, Client>()

      primaryClients.forEach(c => mergedClientsMap.set(c.id, { ...c }))
      secondaryClients.forEach(c => {
        if (mergedClientsMap.has(c.id)) {
          const existing = mergedClientsMap.get(c.id)!
          existing.isSecondary = true
        } else {
          mergedClientsMap.set(c.id, { ...c })
        }
      })

      const mergedClients = Array.from(mergedClientsMap.values())
      setClients(mergedClients)

      // Calculate facets
      const cities = Array.from(new Set(mergedClients.map(c => c.city).filter((city): city is string => Boolean(city)))).sort()
      const sources = Array.from(new Set(mergedClients.map(c => c.source_database).filter((source): source is string => Boolean(source)))).sort()
      setFacets({ cities, sources })

      // Setup remark listeners for new clients
      // Remove listeners for clients no longer in the list
      const currentIds = new Set(mergedClients.map(c => c.id))
      remarkUnsubscribes.forEach((unsub, id) => {
        if (!currentIds.has(id)) {
          unsub()
          remarkUnsubscribes.delete(id)
        }
      })

      // Add listeners for new clients
      mergedClients.forEach(client => {
        if (!remarkUnsubscribes.has(client.id)) {
          const historyRef = collection(db, "clients", client.id, "history")
          const q = query(historyRef, orderBy("timestamp", "desc"), limit(1))

          const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
              const latestRemark = snapshot.docs[0].data().remark
              setLatestRemarks(prev => ({ ...prev, [client.id]: latestRemark }))
            }
          }, (error) => {
            console.error(`Error listening to remarks for ${client.id}:`, error)
          })
          remarkUnsubscribes.set(client.id, unsub)
        }
      })
    }

    const unsubPrimary = onSnapshot(primaryQuery, (snapshot) => {
      primaryClients = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          altPhone: data.altPhone || "",
          banks: (data.banks || []).map((bank: any) => ({ ...bank, settled: bank.settled ?? false })),
          isPrimary: true,
          isSecondary: false,
        } as Client
      })

      updateClients()
      setLoading(false)
    }, (error) => {
      console.error("Error in primary query listener:", error)
      setLoading(false)
    })

    const unsubSecondary = onSnapshot(secondaryQuery, (snapshot) => {
      secondaryClients = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          altPhone: data.altPhone || "",
          banks: (data.banks || []).map((bank: any) => ({ ...bank, settled: bank.settled ?? false })),
          isPrimary: false,
          isSecondary: true,
        } as Client
      })

      updateClients()
      setLoading(false)
    }, (error) => {
      console.error("Error in secondary query listener:", error)
      setLoading(false)
    })

    return () => {
      unsubPrimary()
      unsubSecondary()
      remarkUnsubscribes.forEach(unsub => unsub())
    }
  }

  useEffect(() => {
    const cleanup = setupListeners()
    return () => {
      if (cleanup) cleanup()
    }
  }, [advocateName]) // Removed filters from dependency as we filter client-side now

  const fetchLatestRemark = async (clientId: string) => {
    try {
      const historyRef = collection(db, "clients", clientId, "history")
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(1))
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const latestRemark = snapshot.docs[0].data().remark
        setLatestRemarks((prev) => ({ ...prev, [clientId]: latestRemark }))
      }
    } catch (error) {
      console.error("Error fetching latest remark:", error)
    }
  }

  const updateClientStatus = async (clientId: string, newStatus: string) => {
    try {
      const clientRef = doc(db, "clients", clientId)

      let updateData: any = { adv_status: newStatus === "Inactive" ? null : newStatus }

      // Custom app status messages based on the new status
      let appStatusRemark = ""
      if (newStatus === "Not Responding") {
        appStatusRemark = "Awaiting Client Response"
      } else if (newStatus === "Dropped") {
        appStatusRemark = "Case File Dropped"
      } else if (newStatus === "On Hold") {
        appStatusRemark = "Process On Hold"
      }

      if (appStatusRemark) {
        const confirmed = window.confirm(`Changing status to "${newStatus}" will also update the client's App Status to: "${appStatusRemark}". Proceed?`)
        if (!confirmed) return

        const client = clients.find(c => c.id === clientId)
        const currentAppStatus = client?.client_app_status || []
        const advocateName = localStorage.getItem("userName") || "System"

        const newAppStatus = {
          index: currentAppStatus.length.toString(),
          remarks: appStatusRemark,
          createdAt: Math.floor(Date.now() / 1000),
          createdBy: advocateName
        }

        const { arrayUnion } = await import("firebase/firestore")
        updateData.client_app_status = arrayUnion(newAppStatus)
      }

      await updateDoc(clientRef, updateData)

      toast.success(`Client status updated to ${newStatus}`)
    } catch (error) {
      console.error("Error updating client status:", error)
      toast.error("Failed to update client status")
    }
  }

  const updateRequestLetterStatus = async (clientId: string, checked: boolean) => {
    try {
      const clientRef = doc(db, "clients", clientId)
      await updateDoc(clientRef, { request_letter: checked })
      toast.success(`Request letter status ${checked ? "enabled" : "disabled"}`)
    } catch (error) {
      console.error("Error updating request letter status:", error)
      toast.error("Failed to update request letter status")
    }
  }

  const saveRemark = async (clientId: string, remarkText: string) => {
    try {
      const advocateName = localStorage.getItem("userName") || "Unknown Advocate"

      if (!remarkText.trim()) {
        toast.error("Please enter a remark before saving")
        return
      }

      const historyRef = collection(db, "clients", clientId, "history")
      await addDoc(historyRef, {
        remark: remarkText,
        timestamp: serverTimestamp(),
        advocateName,
      })

      setLatestRemarks((prev) => ({ ...prev, [clientId]: remarkText }))
      toast.success("Remark saved successfully")
    } catch (error) {
      console.error("Error saving remark:", error)
      toast.error("Failed to save remark")
    }
  }


  const saveAppStatus = async (clientId: string, statusText: string, currentStatusArray: any[]) => {
    try {
      const advocateName = localStorage.getItem("userName") || "Unknown Advocate"

      if (!statusText.trim()) {
        toast.error("Please enter a status before saving")
        return
      }

      const newStatus = {
        index: (currentStatusArray?.length || 0).toString(),
        remarks: statusText,
        createdAt: Math.floor(Date.now() / 1000), // Unix timestamp in seconds as per example
        createdBy: advocateName,
      }

      const clientRef = doc(db, "clients", clientId)
      // We use updateDoc to append to the array. 
      // Note: arrayUnion checks for uniqueness. Since we have a timestamp/index, it should be unique.
      // However, to be safe and simple, we can just read the current array and append, 
      // but arrayUnion is better for concurrency if we construct the object correctly.
      // Since we need the index, we rely on the passed currentStatusArray. 
      // This might have race conditions but for this app it seems acceptable.

      // Better approach: just use arrayUnion with the new object.
      // But we need to import arrayUnion.
      const { arrayUnion } = await import("firebase/firestore")

      await updateDoc(clientRef, {
        client_app_status: arrayUnion(newStatus)
      })

      toast.success("App Status saved successfully")
    } catch (error) {
      console.error("Error saving app status:", error)
      toast.error("Failed to save app status")
    }
  }

  const deleteAppStatus = async (clientId: string, statusItem: any) => {
    try {
      const clientRef = doc(db, "clients", clientId)
      const { arrayRemove } = await import("firebase/firestore")

      await updateDoc(clientRef, {
        client_app_status: arrayRemove(statusItem)
      })

      toast.success("Status deleted successfully")
    } catch (error) {
      console.error("Error deleting app status:", error)
      toast.error("Failed to delete status")
    }
  }

  const fetchClientHistory = async (clientId: string): Promise<RemarkHistory[]> => {
    try {
      const historyRef = collection(db, "clients", clientId, "history")
      const q = query(historyRef, orderBy("timestamp", "desc"))
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => ({ ...doc.data() }) as RemarkHistory)
    } catch (error) {
      console.error("Error fetching history:", error)
      toast.error("Failed to fetch history")
      return []
    }
  }

  return {
    clients,
    loading,
    latestRemarks,
    updateClientStatus,
    updateRequestLetterStatus,
    saveRemark,
    saveAppStatus,
    deleteAppStatus,
    fetchClientHistory,
    setClients,
    facets,
  }
}
