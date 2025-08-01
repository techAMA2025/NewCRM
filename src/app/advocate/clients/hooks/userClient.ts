"use client"

import { useState, useEffect } from "react"
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  orderBy,
  serverTimestamp,
  limit,
} from "firebase/firestore"
import { db } from "@/firebase/firebase"
import toast from "react-hot-toast"
import type { RemarkHistory } from "../types/client"

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
}

export function useClients(advocateName: string) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [requestLetterStates, setRequestLetterStates] = useState<{ [key: string]: boolean }>({})
  const [latestRemarks, setLatestRemarks] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    async function fetchClients() {
      if (!advocateName) return

      setLoading(true)
      try {
        const clientsRef = collection(db, "clients")
        const primaryQuery = query(clientsRef, where("alloc_adv", "==", advocateName))
        const secondaryQuery = query(clientsRef, where("alloc_adv_secondary", "==", advocateName))

        const [primarySnapshot, secondarySnapshot] = await Promise.all([getDocs(primaryQuery), getDocs(secondaryQuery)])

        const clientsList: Client[] = []

        primarySnapshot.forEach((doc) => {
          const clientData = doc.data()
          const transformedClient: Client = {
            ...clientData,
            id: doc.id,
            altPhone: clientData.altPhone || "",
            banks: (clientData.banks || []).map((bank: any) => ({
              ...bank,
              settled: bank.settled ?? false
            })),
            isPrimary: true,
            isSecondary: false,
          } as Client
          clientsList.push(transformedClient)

          setRequestLetterStates((prev) => ({
            ...prev,
            [doc.id]: clientData.request_letter || false,
          }))
        })

        secondarySnapshot.forEach((doc) => {
          const clientData = doc.data()
          const existingIndex = clientsList.findIndex((c) => c.id === doc.id)

          if (existingIndex >= 0) {
            clientsList[existingIndex].isSecondary = true
            setRequestLetterStates((prev) => ({
              ...prev,
              [doc.id]: clientData.request_letter || false,
            }))
          } else {
            const transformedClient: Client = {
              ...clientData,
              id: doc.id,
              altPhone: clientData.altPhone || "",
              banks: (clientData.banks || []).map((bank: any) => ({
                ...bank,
                settled: bank.settled ?? false
              })),
              isPrimary: false,
              isSecondary: true,
            } as Client
            clientsList.push(transformedClient)

            setRequestLetterStates((prev) => ({
              ...prev,
              [doc.id]: clientData.request_letter || false,
            }))
          }
        })

        setClients(clientsList)
        await Promise.all(clientsList.map((client) => fetchLatestRemark(client.id)))
      } catch (error) {
        console.error("Error fetching clients:", error)
        toast.error("Failed to fetch clients")
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [advocateName])

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

      if (newStatus === "Inactive") {
        await updateDoc(clientRef, { adv_status: null })
      } else {
        await updateDoc(clientRef, { adv_status: newStatus })
      }

      setClients((prevClients) =>
        prevClients.map((client) =>
          client.id === clientId ? { ...client, adv_status: newStatus === "Inactive" ? undefined : newStatus } : client,
        ),
      )

      toast.success(`Client status updated to ${newStatus}`)
    } catch (error) {
      console.error("Error updating client status:", error)
      toast.error("Failed to update client status")
    }
  }

  const updateRequestLetterStatus = async (clientId: string, checked: boolean) => {
    try {
      setRequestLetterStates((prev) => ({ ...prev, [clientId]: checked }))

      const clientRef = doc(db, "clients", clientId)
      await updateDoc(clientRef, { request_letter: checked })

      toast.success(`Request letter status ${checked ? "enabled" : "disabled"}`)
    } catch (error) {
      console.error("Error updating request letter status:", error)
      setRequestLetterStates((prev) => ({ ...prev, [clientId]: !checked }))
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
    requestLetterStates,
    latestRemarks,
    updateClientStatus,
    updateRequestLetterStatus,
    saveRemark,
    fetchClientHistory,
    setClients,
  }
}
