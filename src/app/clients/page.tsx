"use client"
import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import type React from "react"

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
  deleteDoc,
  limit,
  addDoc,
  startAfter,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import AdminSidebar from "@/components/navigation/AdminSidebar"
import BillcutSidebar from "@/components/navigation/BillcutSidebar"
import AssistantSidebar from "@/components/navigation/AssistantSidebar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/firebase/firebase"
import ViewDetailsModal from "./ViewDetailsModal"
import EditModal from "./EditModal"
import ClientBulkWhatsAppModal from "./ClientBulkWhatsAppModal"
import { format } from "date-fns"
import ClientsTable from "@/components/ClientsTable"
import type { Client } from "./types"
import { serverTimestamp } from "firebase/firestore"
import { useSearchParams } from "next/navigation"
import { getFunctions, httpsCallable } from "firebase/functions"
import { app } from "@/firebase/firebase"
import { Spinner } from "@/components/ui/spinner"

interface User {
  uid: string
  firstName: string
  lastName: string
  email: string
  role: string
  status: string
}

interface ToastMessage {
  id: number
  title: string
  description: string
  type: "success" | "error" | "info"
}

// Enhanced Document Viewer Component
function DocumentViewer({
  isOpen,
  documentUrl,
  documentName,
  onClose,
}: {
  isOpen: boolean
  documentUrl: string
  documentName: string
  onClose: () => void
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [viewerUrl, setViewerUrl] = useState("")

  useEffect(() => {
    if (isOpen && documentUrl) {
      setIsLoading(true)
      setHasError(false)

      // Always use Google Docs viewer for better compatibility
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`
      setViewerUrl(googleDocsUrl)
    }
  }, [isOpen, documentUrl])

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleDownload = () => {
    // Create a temporary link to download the document
    const link = document.createElement("a")
    link.href = documentUrl
    link.download = documentName || "document"
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 w-[95vw] max-w-6xl h-[90vh] shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            {documentName}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="flex flex-col items-center">
                <Spinner size="lg" />
                <p className="mt-2 text-gray-600">Loading document...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-gray-600 mb-4">Unable to display document in viewer</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors duration-200"
                >
                  Download Document Instead
                </button>
              </div>
            </div>
          )}

          {viewerUrl && (
            <iframe
              src={viewerUrl}
              className="w-full h-full border-0"
              title="Document Viewer"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Separate component for URL parameter handling
const ITEMS_PER_PAGE = 50
function ClientsPageWithParams() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [userRole, setUserRole] = useState<string>("")
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [fileUpload, setFileUpload] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false)
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState("")
  const [viewingDocumentName, setViewingDocumentName] = useState("")

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [primaryAdvocateFilter, setPrimaryAdvocateFilter] = useState<string>("all")
  const [secondaryAdvocateFilter, setSecondaryAdvocateFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [documentFilter, setDocumentFilter] = useState<string>("all")
  const [bankNameFilter, setBankNameFilter] = useState<string>("all")
  const [agreementFilter, setAgreementFilter] = useState<string>("all")

  // Lists for filter dropdowns
  const [allAdvocates, setAllAdvocates] = useState<string[]>([])
  const [allSources] = useState<string[]>(["credsettlee", "ama", "settleloans", "billcut", "manual"])
  const [allStatuses, setAllStatuses] = useState<string[]>([
    "Active",
    "Dropped",
    "Not Responding",
    "On Hold",
    "Inactive",
  ])
  const [allBankNames, setAllBankNames] = useState<string[]>([])

  // Filtered clients based on search and filters
  const [filteredClients, setFilteredClients] = useState<Client[]>([])

  // Add new state for advocates list
  const [advocates, setAdvocates] = useState<User[]>([])
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)
  const hasMoreRef = useRef<boolean>(true)
  const isFetchingMoreRef = useRef<boolean>(false)

  // Add these to your existing state declarations
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Add new state for selected clients
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false)
  const [selectedAdvocateForBulk, setSelectedAdvocateForBulk] = useState<string>("")

  // Add new state for secondary bulk assignment
  const [isBulkSecondaryAssignModalOpen, setIsBulkSecondaryAssignModalOpen] = useState(false)
  const [selectedSecondaryAdvocateForBulk, setSelectedSecondaryAdvocateForBulk] = useState<string>("")

  // Add new state for bulk WhatsApp modal
  const [isBulkWhatsAppModalOpen, setIsBulkWhatsAppModalOpen] = useState(false)

  // Add new state for theme
  const [theme, setTheme] = useState<"light" | "dark">("light")

  // Add new state for bulk select by number
  const [bulkSelectNumber, setBulkSelectNumber] = useState<string>("")

  // Add new state for history modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedClientHistory, setSelectedClientHistory] = useState<
    Array<{
      remark: string
      advocateName: string
      timestamp: any
    }>
  >([])
  const [selectedClientId, setSelectedClientId] = useState<string>("")

  // Add new state for remarks management
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const [totalClientCount, setTotalClientCount] = useState<number>(0)
  const [filteredTotalCount, setFilteredTotalCount] = useState<number>(0)

  // Add URL parameter handling
  const searchParams = useSearchParams()

  const mergeAndSortClients = useCallback((existing: Client[], incoming: Client[]) => {
    const mergedMap = new Map<string, Client>()
    existing.forEach((client) => mergedMap.set(client.id, client))
    incoming.forEach((client) => mergedMap.set(client.id, client))

    const mergedClients = Array.from(mergedMap.values())
    const clientsWithoutStartDate: Client[] = []
    const clientsWithStartDate: Client[] = []

    mergedClients.forEach((client) => {
      const startDateValue = typeof client.startDate === "string" ? client.startDate : ""
      if (!startDateValue || startDateValue.trim() === "") {
        clientsWithoutStartDate.push(client)
      } else {
        clientsWithStartDate.push(client)
      }
    })

    clientsWithStartDate.sort((a, b) => {
      const startA = typeof a.startDate === "string" ? a.startDate : ""
      const startB = typeof b.startDate === "string" ? b.startDate : ""
      if (!startA || !startB) return 0

      const dateA = new Date(startA)
      const dateB = new Date(startB)
      return dateB.getTime() - dateA.getTime()
    })

    return [...clientsWithoutStartDate, ...clientsWithStartDate]
  }, [])

  const enhanceClientData = useCallback(
    async (client: Client): Promise<Client> => {
      let enhancedClient = {
        ...client,
        adv_status: client.adv_status || "Inactive",
      }

      if (client.source_database === "billcut" && !client.documentUrl) {
        try {
          const documentName = `${client.name}_billcut_agreement.docx`
          const storagePath = `clients/billcut/documents/${documentName}`
          const docRef = ref(storage, storagePath)
          const url = await getDownloadURL(docRef)
          enhancedClient = { ...enhancedClient, documentUrl: url, documentName }
        } catch (error: any) {
          if (error.code !== "storage/object-not-found") {
            console.error(`Error checking for document for ${client.name}:`, error)
          }
        }
      }

      try {
        const historyQuery = query(
          collection(db, "clients", client.id, "history"),
          orderBy("timestamp", "desc"),
          limit(1),
        )
        const historySnapshot = await getDocs(historyQuery)

        if (!historySnapshot.empty) {
          const latestHistoryDoc = historySnapshot.docs[0]
          const historyData = latestHistoryDoc.data()
          enhancedClient = {
            ...enhancedClient,
            latestRemark: {
              remark: historyData.remark || "",
              advocateName: historyData.advocateName || "",
              timestamp: historyData.timestamp,
            },
          }
        }
      } catch (error) {
        console.error(`Error fetching history for client ${client.name}:`, error)
      }

      return enhancedClient
    },
    [],
  )

  const buildServerConstraints = useCallback((): QueryConstraint[] => {
    const constraints: QueryConstraint[] = []

    if (statusFilter !== "all") {
      constraints.push(where("adv_status", "==", statusFilter))
    }

    if (primaryAdvocateFilter !== "all") {
      constraints.push(where("alloc_adv", "==", primaryAdvocateFilter))
    }

    if (secondaryAdvocateFilter !== "all") {
      constraints.push(where("alloc_adv_secondary", "==", secondaryAdvocateFilter))
    }

    if (sourceFilter !== "all") {
      constraints.push(where("source_database", "==", sourceFilter))
    }

    if (agreementFilter === "sent") {
      constraints.push(where("sentAgreement", "==", true))
    } else if (agreementFilter === "not_sent") {
      constraints.push(where("sentAgreement", "==", false))
    }

    return constraints
  }, [statusFilter, primaryAdvocateFilter, secondaryAdvocateFilter, sourceFilter, agreementFilter])

  const fetchFilteredCount = useCallback(async () => {
    try {
      const constraints = buildServerConstraints()
      const countQuery = query(collection(db, "clients"), ...constraints)
      const totalSnapshot = await getCountFromServer(countQuery)
      const count = totalSnapshot.data().count
      setFilteredTotalCount(count)
      if (constraints.length === 0) {
        setTotalClientCount(count)
      }
    } catch (error) {
      console.error("Error fetching filtered clients count:", error)
      setFilteredTotalCount(0)
      if (buildServerConstraints().length === 0) {
        setTotalClientCount(0)
      }
    }
  }, [buildServerConstraints])

  const fetchClientsBatch = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (reset) {
        setLoading(true)
        setError(null)
        lastDocRef.current = null
        hasMoreRef.current = true
        setHasMore(true)
        setClients([])
        setFilteredClients([])
        setSelectedClients(new Set())
        setIsFetchingMore(false)
        isFetchingMoreRef.current = false
        await fetchFilteredCount()
      } else {
        if (!hasMoreRef.current || isFetchingMoreRef.current) {
          return
        }
        setIsFetchingMore(true)
        isFetchingMoreRef.current = true
      }

      try {
        const constraints = buildServerConstraints()
        const collectionRef = collection(db, "clients")

        const paginationConstraints: QueryConstraint[] = [
          ...constraints,
          ...(lastDocRef.current ? [startAfter(lastDocRef.current)] : []),
          limit(ITEMS_PER_PAGE),
        ]

        const clientsQuery = query(collectionRef, ...paginationConstraints)

        const querySnapshot = await getDocs(clientsQuery)

        if (querySnapshot.empty) {
          hasMoreRef.current = false
          setHasMore(false)
          return
        }

        lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1]

        if (querySnapshot.size < ITEMS_PER_PAGE) {
          hasMoreRef.current = false
          setHasMore(false)
        }

        const batch = await Promise.all(
          querySnapshot.docs.map(async (docSnap) => {
            const client = {
              id: docSnap.id,
              ...docSnap.data(),
            } as Client
            return enhanceClientData(client)
          }),
        )

        setClients((prev) => {
          const base = reset ? [] : prev
          const merged = mergeAndSortClients(base, batch)
          return merged
        })
      } catch (err) {
        console.error("Detailed error fetching clients:", err)
        if (err instanceof Error) {
          setError(`Failed to load clients data: ${err.message}`)
        } else {
          setError("Failed to load clients data: Unknown error")
        }
        hasMoreRef.current = false
        setHasMore(false)
      } finally {
        if (reset) {
          setLoading(false)
        } else {
          setIsFetchingMore(false)
          isFetchingMoreRef.current = false
        }
      }
    },
    [enhanceClientData, mergeAndSortClients, buildServerConstraints, fetchFilteredCount],
  )

  // Toast function to add new toast
  const showToast = (title: string, description: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, title, description, type }])

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 5000)
  }

  // Remove a specific toast
  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  // Initialize remarks with latest remarks from clients
  useEffect(() => {
    const initialRemarks: { [key: string]: string } = {}
    clients.forEach((client) => {
      if (client.latestRemark?.remark) {
        initialRemarks[client.id] = client.latestRemark.remark
      }
    })
    setRemarks(initialRemarks)
  }, [clients])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("userRole") || ""
      setUserRole(role)

      if (role === "billcut") {
        setSourceFilter("billcut")
      }
    }

    fetchClientsBatch({ reset: true })
  }, [fetchClientsBatch])

  // Add URL parameter handling
  useEffect(() => {
    // Apply filters from URL parameters immediately when component mounts
    const statusFromUrl = searchParams.get("status")
    const advocateFromUrl = searchParams.get("advocate")
    const sourceFromUrl = searchParams.get("source")
    const searchFromUrl = searchParams.get("search")
    const documentFromUrl = searchParams.get("document")
    const bankNameFromUrl = searchParams.get("bankName")
    const agreementFromUrl = searchParams.get("agreement")

    if (statusFromUrl) {
      setStatusFilter(statusFromUrl)
    }
    if (advocateFromUrl) {
      setPrimaryAdvocateFilter(advocateFromUrl)
    }
    if (sourceFromUrl && userRole !== "billcut") {
      // Convert display name back to normalized source value
      const normalizedSource = sourceFromUrl.toLowerCase().replace(/\s+/g, "")
      setSourceFilter(normalizedSource)
    }
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl)
    }
    if (documentFromUrl) {
      setDocumentFilter(documentFromUrl)
    }
    if (bankNameFromUrl) {
      setBankNameFilter(bankNameFromUrl)
    }
    if (agreementFromUrl) {
      setAgreementFilter(agreementFromUrl)
    }
  }, [searchParams, userRole]) // Add userRole dependency to prevent overriding billcut filter

  useEffect(() => {}, [])

  // Function to format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "N/A"
    try {
      // Assuming timestamp is a Firestore Timestamp
      const date = timestamp.toDate()
      return format(date, "PPP p")
    } catch (error) {
      return "Invalid date"
    }
  }

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient({ ...client })
    setIsEditModalOpen(true)
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (editingClient) {
      setEditingClient({
        ...editingClient,
        [name]: value,
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    if (editingClient) {
      setEditingClient({
        ...editingClient,
        [name]: value,
      })
    }
  }

  const handleSaveChanges = async () => {
    if (!editingClient) return

    setIsSaving(true)
    try {
      const clientRef = doc(db, "clients", editingClient.id)

      // Remove id from the data to be updated
      const { id, ...clientData } = editingClient

      // Update last modified timestamp
      const updatedData = {
        ...clientData,
        lastModified: new Date(),
      }

      await updateDoc(clientRef, updatedData)

      // Update the local state
      setClients(clients.map((client) => (client.id === editingClient.id ? editingClient : client)))

      // Show success toast
      showToast("Client updated", "Client information has been successfully updated.", "success")

      setIsEditModalOpen(false)
    } catch (err) {
      console.error("Error updating client:", err)
      // Show error toast
      showToast("Update failed", "Failed to update client information. Please try again.", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500/20 text-green-500 border-green-500/50"
      case "dropped":
        return "bg-red-500/20 text-red-500 border-red-500/50"
      case "not responding":
        return "bg-amber-500/20 text-amber-500 border-amber-500/50"
      case "on hold":
        return "bg-blue-500/20 text-blue-500 border-blue-500/50"
      case "inactive":
        return "bg-gray-500/20 text-gray-500 border-gray-500/50"
      default:
        return "bg-blue-500/20 text-blue-500 border-blue-500/50"
    }
  }

  const renderSidebar = () => {
    if (userRole === "overlord") {
      return <OverlordSidebar />
    } else if (userRole === "admin") {
      return <AdminSidebar />
    } else if (userRole === "billcut") {
      return <BillcutSidebar />
    } else if (userRole === "assistant") {
      return <AssistantSidebar />
    } else {
      // Default to AdminSidebar if role is unknown
      return <AdminSidebar />
    }
  }

  // Function to handle bank detail changes
  const handleBankChange = (bankId: string, field: string, value: string) => {
    if (editingClient && editingClient.banks) {
      const updatedBanks = editingClient.banks.map((bank) => (bank.id === bankId ? { ...bank, [field]: value } : bank))

      setEditingClient({
        ...editingClient,
        banks: updatedBanks,
      })
    }
  }

  // Function to add a new bank
  const handleAddBank = () => {
    if (editingClient) {
      const newBank = {
        id: Date.now().toString(), // Generate a temporary ID
        bankName: "",
        accountNumber: "",
        loanAmount: "",
        loanType: "Personal Loan",
      }

      const updatedBanks = editingClient.banks ? [...editingClient.banks, newBank] : [newBank]

      setEditingClient({
        ...editingClient,
        banks: updatedBanks,
      })
    }
  }

  // Function to remove a bank
  const handleRemoveBank = (bankId: string) => {
    if (editingClient && editingClient.banks) {
      const updatedBanks = editingClient.banks.filter((bank) => bank.id !== bankId)

      setEditingClient({
        ...editingClient,
        banks: updatedBanks,
      })
    }
  }

  // Add a function to handle status changes
  const handleAdvocateStatusChange = async (clientId: string, newStatus: string) => {
    setIsSaving(true)
    try {
      const clientRef = doc(db, "clients", clientId)

      await updateDoc(clientRef, {
        adv_status: newStatus,
        lastModified: new Date(),
      })

      // Update the local state
      setClients(clients.map((client) => (client.id === clientId ? { ...client, adv_status: newStatus } : client)))

      // Show success toast
      showToast("Status updated", `Client status has been updated to ${newStatus}.`, "success")
    } catch (err) {
      console.error("Error updating client status:", err)
      // Show error toast
      showToast("Update failed", "Failed to update client status. Please try again.", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Check if file is a Word document
      if (
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        setFileUpload(file)
      } else {
        showToast("Invalid file type", "Please upload a Word document (.doc or .docx).", "error")
        e.target.value = ""
      }
    }
  }

  const handleFileUpload = async () => {
    if (!fileUpload || !editingClient) return

    setUploading(true)
    try {
      const storageRef = ref(storage, `clients/${editingClient.id}/documents/${fileUpload.name}`)
      // Upload the file
      const snapshot = await uploadBytes(storageRef, fileUpload)

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      // Update Firestore
      const clientRef = doc(db, "clients", editingClient.id)
      await updateDoc(clientRef, {
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date(),
        lastModified: new Date(),
      })

      // Update local state
      setEditingClient({
        ...editingClient,
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date(),
      })

      // Show success toast
      showToast("Document uploaded", "The document has been successfully uploaded and linked to the client.", "success")

      // Reset file upload state
      setFileUpload(null)
    } catch (err) {
      // Show more detailed error message
      let errorMessage = "Failed to upload document. "
      if (err instanceof Error) {
        errorMessage += err.message
      }
      showToast("Upload failed", errorMessage, "error")
    } finally {
      setUploading(false)
    }
  }

  const testUpload = async () => {
    // Create a simple test file
    const testBlob = new Blob(["Test content"], { type: "text/plain" })
    const testFile = new File([testBlob], "test-file.txt", { type: "text/plain" })

    try {
      const storageRef = ref(storage, `test/test-file-${Date.now()}.txt`)

      const snapshot = await uploadBytes(storageRef, testFile)

      const downloadURL = await getDownloadURL(storageRef)

      showToast("Test successful", "Upload test completed successfully", "success")
    } catch (err) {
      console.error("Test upload failed:", err)
      showToast("Test failed", `Error: ${err instanceof Error ? err.message : "Unknown error"}`, "error")
    }
  }

  const openDocumentViewer = (url: string, name: string) => {
    if (!url) {
      showToast("Invalid Document URL", "The document URL is missing or invalid.", "error")
      return
    }

    setViewingDocumentUrl(url)
    setViewingDocumentName(name || "Document")
    setIsDocViewerOpen(true)
  }

  // Function to normalize source value
  const normalizeSource = (source: string | undefined): string => {
    if (!source) return ""
    // Remove any numbers and extra spaces
    return source
      .replace(/\s*\d+\s*/g, "")
      .trim()
      .toLowerCase()
  }

  // Apply filters and search
  useEffect(() => {

    let results = [...clients]

    // Apply search term
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase()
      results = results.filter(
        (client) =>
          (client.name && client.name.toLowerCase().includes(searchLower)) ||
          (client.email && client.email.toLowerCase().includes(searchLower)) ||
          (client.phone && client.phone.includes(searchTerm)) ||
          (client.aadharNumber && client.aadharNumber.includes(searchTerm)),
      )
    }

    // Apply primary advocate filter
    if (primaryAdvocateFilter !== "all") {
      results = results.filter((client) => client.alloc_adv === primaryAdvocateFilter)
    }

    // Apply secondary advocate filter
    if (secondaryAdvocateFilter !== "all") {
      results = results.filter((client) => client.alloc_adv_secondary === secondaryAdvocateFilter)
    }

    // Apply status filter
    if (statusFilter !== "all") {
      results = results.filter((client) => client.adv_status === statusFilter)
    }

    // Apply source filter
    if (sourceFilter !== "all") {
      results = results.filter((client) => normalizeSource(client.source_database) === sourceFilter)
    }

    // Apply document filter
    if (documentFilter !== "all") {
      results = results.filter((client) => {
        const hasDocument = !!(client.documentUrl && client.documentUrl.trim() !== "")
        return documentFilter === "with_document" ? hasDocument : !hasDocument
      })
    }

    // Apply bank name filter
    if (bankNameFilter !== "all") {
      results = results.filter((client) => {
        if (!client.banks || !Array.isArray(client.banks)) return false
        return client.banks.some(
          (bank) => bank.bankName && bank.bankName.toLowerCase().includes(bankNameFilter.toLowerCase()),
        )
      })
    }

    // Apply agreement filter
    if (agreementFilter !== "all") {
      results = results.filter((client) => {
        const hasAgreementSent = client.sentAgreement === true
        return agreementFilter === "sent" ? hasAgreementSent : !hasAgreementSent
      })
    }
    setFilteredClients(results)
  }, [
    clients,
    searchTerm,
    primaryAdvocateFilter,
    secondaryAdvocateFilter,
    statusFilter,
    sourceFilter,
    documentFilter,
    bankNameFilter,
    agreementFilter,
  ])

  useEffect(() => {
    if (clients.length === 0) {
      setAllBankNames([])
      return
    }

    const bankNamesSet = new Set<string>()
    clients.forEach((client) => {
      if (client.banks && Array.isArray(client.banks)) {
        client.banks.forEach((bank) => {
          if (bank.bankName && typeof bank.bankName === "string") {
            const trimmedName = bank.bankName.trim()
            if (trimmedName) {
              bankNamesSet.add(trimmedName)
            }
          }
        })
      }
    })

    setAllBankNames(Array.from(bankNamesSet).sort())
  }, [clients])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry?.isIntersecting) return
        if (!hasMoreRef.current || isFetchingMoreRef.current || loading) return

        fetchClientsBatch()
      },
      { root: null, rootMargin: "0px 0px 200px 0px", threshold: 0 },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [fetchClientsBatch, loading])

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setPrimaryAdvocateFilter("all")
    setSecondaryAdvocateFilter("all")
    setSourceFilter("all")
    setDocumentFilter("all")
    setBankNameFilter("all")
    setAgreementFilter("all")
  }

  // Function to format source display name
  const formatSourceName = (source: string): string => {
    const normalizedSource = normalizeSource(source)
    switch (normalizedSource) {
      case "credsettlee":
        return "Cred Settle"
      case "ama":
        return "AMA"
      case "settleloans":
        return "Settle Loans"
      case "billcut":
        return "Bill Cut"
      case "manual":
        return "Manual Entry"
      default:
        return source
    }
  }

  // Function to download CSV
  const downloadCSV = () => {
    if (filteredClients.length === 0) {
      showToast("No data to export", "There are no clients to export to CSV.", "error")
      return
    }

    // Define CSV headers with all fields
    const headers = [
      "Name",
      "Phone",
      "Email",
      "City",
      "Occupation",
      "Aadhar Number",
      "PAN Number",
      "Date of Birth",
      "Primary Advocate",
      "Primary Advocate Assigned At",
      "Secondary Advocate",
      "Secondary Advocate Assigned At",
      "Status",
      "Advocate Status",
      "Source Database",
      "Monthly Income",
      "Personal Loan Dues",
      "Credit Card Dues",
      "Start Date",
      "Tenure",
      "Monthly Fees",
      "Sales By",
      "Lead ID",
      "Converted From Lead",
      "Converted At",
      "Request Letter",
      "Sent Agreement",
      "Last Modified",
      "Last Updated",
      "Latest Remark",
      "Remark By",
      "Bank Details (JSON)",
      "Document Details (JSON)",
    ]

    // Convert clients data to CSV rows
    const csvRows = [headers]
    filteredClients.forEach((client) => {
      // Format bank details as JSON string
      const bankDetails =
        client.banks && Array.isArray(client.banks)
          ? JSON.stringify(
              client.banks.map((bank) => ({
                bankName: bank.bankName || "",
                accountNumber: bank.accountNumber || "",
                loanAmount: bank.loanAmount || "",
                loanType: bank.loanType || "",
                id: bank.id || "",
              })),
            )
          : ""

      // Format document details as JSON string
      const documentDetails =
        client.documents && Array.isArray(client.documents)
          ? JSON.stringify(
              client.documents.map((doc) => ({
                name: doc.name || "",
                type: doc.type || "",
                bankName: doc.bankName || "",
                accountType: doc.accountType || "",
                url: doc.url || "",
                htmlUrl: doc.htmlUrl || "",
                createdAt: doc.createdAt || "",
              })),
            )
          : ""

      const row = [
        client.name || "",
        client.phone || "",
        client.email || "",
        client.city || "",
        client.occupation || "",
        client.aadharNumber || "",
        client.panNumber || "",
        client.dob || "",
        client.alloc_adv || "",
        client.alloc_adv_at ? formatTimestamp(client.alloc_adv_at) : "",
        client.alloc_adv_secondary || "",
        client.alloc_adv_secondary_at ? formatTimestamp(client.alloc_adv_secondary_at) : "",
        client.status || "",
        client.adv_status || "",
        formatSourceName(client.source_database || ""),
        client.monthlyIncome || "",
        client.personalLoanDues || "",
        client.creditCardDues || "",
        client.startDate || "",
        client.tenure || "",
        client.monthlyFees || "",
        client.assignedTo || "",
        client.leadId || "",
        client.convertedFromLead ? "Yes" : "No",
        client.convertedAt ? formatTimestamp(client.convertedAt) : "",
        client.request_letter ? "Yes" : "No",
        client.sentAgreement ? "Yes" : "No",
        client.lastModified ? formatTimestamp(client.lastModified) : "",
        client.lastUpdated ? formatTimestamp(client.lastUpdated) : "",
        client.latestRemark?.remark || "",
        client.latestRemark?.advocateName || "",
        bankDetails,
        documentDetails,
      ]

      // Escape commas and quotes in CSV values
      const escapedRow = row.map((value) => {
        const stringValue = String(value)
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })

      csvRows.push(escapedRow)
    })

    // Convert to CSV string
    const csvContent = csvRows.map((row) => row.join(",")).join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `clients_export_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast(
      "CSV Downloaded",
      `Successfully exported ${filteredClients.length} clients to CSV with all fields.`,
      "success",
    )
  }

  // Add this to your existing useEffect or create a new one
  useEffect(() => {
    const fetchAdvocates = async () => {
      try {
        const advocatesQuery = query(
          collection(db, "users"),
          where("role", "==", "advocate"),
          // Removed status filter to include inactive advocates
        )

        const querySnapshot = await getDocs(advocatesQuery)
        const advocatesData: User[] = querySnapshot.docs.map(
          (doc) =>
            ({
              uid: doc.id,
              ...doc.data(),
            }) as User,
        )

        setAdvocates(advocatesData)

        // Extract unique advocate names for filters (including inactive ones)
        const advocateNames = Array.from(
          new Set(advocatesData.map((advocate) => `${advocate.firstName} ${advocate.lastName}`.trim())),
        )
        setAllAdvocates(advocateNames)
      } catch (err) {
        console.error("Error fetching advocates:", err)
        showToast("Error", "Failed to load advocates list", "error")
      }
    }

    fetchAdvocates()
  }, [])

  // Add this function to handle delete initiation
  const handleDeleteInitiate = (client: Client) => {
    setClientToDelete(client)
    setDeleteConfirmationName("")
    setIsDeleteModalOpen(true)
  }

  // Add this function to handle the actual deletion
  const handleDeleteConfirm = async () => {
    if (!clientToDelete || deleteConfirmationName !== clientToDelete.name) {
      showToast("Error", "The name you entered doesn't match. Please try again.", "error")
      return
    }

    setIsDeleting(true)
    try {
      const clientRef = doc(db, "clients", clientToDelete.id)
      await deleteDoc(clientRef)

      // Update local state
      setClients(clients.filter((client) => client.id !== clientToDelete.id))
      setFilteredClients(filteredClients.filter((client) => client.id !== clientToDelete.id))

      showToast("Client deleted", "The client has been successfully deleted.", "success")

      setIsDeleteModalOpen(false)
      setClientToDelete(null)
    } catch (err) {
      console.error("Error deleting client:", err)
      showToast("Delete failed", "Failed to delete the client. Please try again.", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  // Add function to handle bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedClients)
      filteredClients.forEach((client) => newSelected.add(client.id))
      setSelectedClients(newSelected)
    } else {
      const currentIds = new Set(filteredClients.map((client) => client.id))
      const newSelected = new Set(Array.from(selectedClients).filter((id) => !currentIds.has(id)))
      setSelectedClients(newSelected)
    }
  }

  // Add function to handle individual selection
  const handleSelectClient = (clientId: string, checked: boolean) => {
    const newSelected = new Set(selectedClients)
    if (checked) {
      newSelected.add(clientId)
    } else {
      newSelected.delete(clientId)
    }
    setSelectedClients(newSelected)
  }

  // Add function to handle bulk select by number
  const handleBulkSelectByNumber = () => {
    const number = parseInt(bulkSelectNumber.trim())
    if (isNaN(number) || number <= 0) {
      showToast("Invalid Number", "Please enter a valid positive number", "error")
      return
    }

    if (number > filteredClients.length) {
      showToast("Number Too Large", `Only ${filteredClients.length} clients available in current filter`, "error")
      return
    }

    // Select the first N clients from the filtered list
    const topClients = filteredClients.slice(0, number)
    const topClientIds = new Set(topClients.map(client => client.id))
    setSelectedClients(topClientIds)
    
    showToast("Bulk Selection", `Selected top ${number} clients from current filter`, "success")
    setBulkSelectNumber("") // Clear the input after selection
  }

  // Add function to handle Enter key press in bulk select input
  const handleBulkSelectKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBulkSelectByNumber()
    }
  }

  // Add function to handle bulk advocate assignment
  const handleBulkAdvocateAssignment = async () => {
    if (!selectedAdvocateForBulk || selectedClients.size === 0) return

    setIsSaving(true)
    try {
      const batch = []
      for (const clientId of selectedClients) {
        const clientRef = doc(db, "clients", clientId)
        batch.push(
          updateDoc(clientRef, {
            alloc_adv: selectedAdvocateForBulk,
            lastModified: new Date(),
          }),
        )
      }

      await Promise.all(batch)

      // Update local state
      setClients(
        clients.map((client) =>
          selectedClients.has(client.id) ? { ...client, alloc_adv: selectedAdvocateForBulk } : client,
        ),
      )

      showToast("Bulk update successful", `Updated primary advocate for ${selectedClients.size} clients`, "success")

      // Reset selection state
      setSelectedClients(new Set())
      setIsBulkAssignModalOpen(false)
      setSelectedAdvocateForBulk("")
    } catch (err) {
      console.error("Error in bulk advocate assignment:", err)
      showToast("Bulk update failed", "Failed to update advocates. Please try again.", "error")
    } finally {
      setIsSaving(false)
    }
  }

  // Add function to handle bulk secondary advocate assignment
  const handleBulkSecondaryAdvocateAssignment = async () => {
    if (!selectedSecondaryAdvocateForBulk || selectedClients.size === 0) return

    setIsSaving(true)
    try {
      const batch = []
      for (const clientId of selectedClients) {
        const clientRef = doc(db, "clients", clientId)
        batch.push(
          updateDoc(clientRef, {
            alloc_adv_secondary: selectedSecondaryAdvocateForBulk,
            lastModified: new Date(),
          }),
        )
      }

      await Promise.all(batch)

      // Update local state
      setClients(
        clients.map((client) =>
          selectedClients.has(client.id)
            ? { ...client, alloc_adv_secondary: selectedSecondaryAdvocateForBulk }
            : client,
        ),
      )

      showToast("Bulk update successful", `Updated secondary advocate for ${selectedClients.size} clients`, "success")

      // Reset selection state
      setSelectedClients(new Set())
      setIsBulkSecondaryAssignModalOpen(false)
      setSelectedSecondaryAdvocateForBulk("")
    } catch (err) {
      console.error("Error in bulk secondary advocate assignment:", err)
      showToast("Bulk update failed", "Failed to update secondary advocates. Please try again.", "error")
    } finally {
      setIsSaving(false)
    }
  }

  // Add function to handle bulk WhatsApp messaging
  const sendBulkWhatsApp = async (templateName: string, clientIds: string[], clientData?: any[]) => {
    if (clientIds.length === 0) {
      showToast("Error", "No clients selected for WhatsApp messaging", "error")
      return
    }

    const functions = getFunctions(app)
    const sendWhatsappMessageFn = httpsCallable(functions, "sendClientWhatsappMessage")

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Show initial toast
    const toastId = showToast("Sending WhatsApp messages", `Sending messages to ${clientIds.length} clients...`, "info")

    try {
      // Process clients in batches to avoid overwhelming the system
      const batchSize = 5
      for (let i = 0; i < clientIds.length; i += batchSize) {
        const batch = clientIds.slice(i, i + batchSize)

        // Process batch in parallel
        const batchPromises = batch.map(async (clientId) => {
          // Use clientData if provided, otherwise try to find in clients array
          let client = clientData?.find((c) => c.id === clientId)

          if (!client) {
            // Try to find client in clients array
            client = clients.find((c) => c.id === clientId)
          }

          if (!client || !client.phone) {
            errorCount++
            errors.push(`${client?.name || "Unknown"}: No phone number`)
            return
          }

          try {
            // Format phone number
            let formattedPhone = client.phone.replace(/\s+/g, "").replace(/[()-]/g, "")
            if (formattedPhone.startsWith("+91")) {
              formattedPhone = formattedPhone.substring(3)
            }
            if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
              formattedPhone = "91" + formattedPhone
            }

            const messageData = {
              phoneNumber: formattedPhone,
              templateName: templateName,
              clientId: formattedPhone, // Using phone number as unique identifier
              userId: localStorage.getItem("userName") || "Unknown",
              userName: localStorage.getItem("userName") || "Unknown",
              message: `Template message: ${templateName}`,
              customParams: [
                { name: "name", value: client.name || "Customer" },
                { name: "Channel", value: "AMA Legal Solutions" },
                { name: "agent_name", value: localStorage.getItem("userName") || "Agent" },
                { name: "customer_mobile", value: formattedPhone },
              ],
              channelNumber: "919289622596",
              broadcastName: `${templateName}_bulk_${Date.now()}`,
            }

            const result = await sendWhatsappMessageFn(messageData)

            if (result.data && (result.data as any).success) {
              successCount++
            } else {
              errorCount++
              errors.push(`${client.name}: Failed to send`)
            }
          } catch (error: any) {
            errorCount++
            const errorMessage = error.message || error.details || "Unknown error"
            errors.push(`${client.name}: ${errorMessage}`)
          }
        })

        await Promise.all(batchPromises)

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < clientIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      // Show final results
      if (successCount > 0) {
        showToast(
          "Bulk WhatsApp Complete",
          `${successCount} message${successCount !== 1 ? "s" : ""} sent successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
          "success"
        )
      } else {
        showToast("Bulk WhatsApp Failed", "No messages were sent successfully", "error")
      }

      // Log detailed errors if any
      if (errors.length > 0) {
        // Errors are already handled in the toast messages
      }
    } catch (error) {
      console.error("Error in bulk WhatsApp sending:", error)
      showToast("Error", "Failed to send bulk WhatsApp messages", "error")
    }
  }

  // Add function to handle viewing remark history
  const handleViewHistory = async (clientId: string) => {
    try {
      const historyRef = collection(db, "clients", clientId, "history")
      const q = query(historyRef, orderBy("timestamp", "desc"))
      const snapshot = await getDocs(q)

      const history = snapshot.docs.map((doc) => ({
        remark: doc.data().remark || "",
        advocateName: doc.data().advocateName || "",
        timestamp: doc.data().timestamp,
      }))

      setSelectedClientHistory(history)
      setSelectedClientId(clientId)
      setIsHistoryModalOpen(true)
    } catch (error) {
      console.error("Error fetching history:", error)
      showToast("Error", "Failed to fetch remark history", "error")
    }
  }

  // Add function to handle remark changes
  const handleRemarkChange = (clientId: string, value: string) => {
    setRemarks((prev) => ({ ...prev, [clientId]: value }))
  }

  // Add function to handle saving remarks
  const handleSaveRemark = async (clientId: string) => {
    try {
      const advocateName = localStorage.getItem("userName") || "Unknown Advocate"
      const remarkText = remarks[clientId]?.trim()

      if (!remarkText) {
        showToast("Error", "Please enter a remark before saving", "error")
        return
      }

      const historyRef = collection(db, "clients", clientId, "history")
      await addDoc(historyRef, {
        remark: remarkText,
        timestamp: serverTimestamp(),
        advocateName,
      })

      // Update the client's latest remark in local state
      setClients(
        clients.map((client) =>
          client.id === clientId
            ? {
                ...client,
                latestRemark: {
                  remark: remarkText,
                  advocateName,
                  timestamp: new Date(),
                },
              }
            : client,
        ),
      )

      // Keep the remark in the textarea after saving (don't clear it)
      // setRemarks(prev => ({ ...prev, [clientId]: '' }))

      showToast("Success", "Remark saved successfully", "success")
    } catch (error) {
      console.error("Error saving remark:", error)
      showToast("Error", "Failed to save remark", "error")
    }
  }

  // Add function to handle agreement toggle
  const handleAgreementToggle = async (clientId: string, currentStatus: boolean) => {
    try {
      const clientRef = doc(db, "clients", clientId)
      await updateDoc(clientRef, {
        sentAgreement: !currentStatus,
        lastModified: new Date(),
      })

      // Update local state
      setClients(
        clients.map((client) =>
          client.id === clientId ? { ...client, sentAgreement: !currentStatus, lastModified: new Date() } : client,
        ),
      )

      // Update filtered clients as well
      setFilteredClients(
        filteredClients.map((client) =>
          client.id === clientId ? { ...client, sentAgreement: !currentStatus, lastModified: new Date() } : client,
        ),
      )

      showToast(
        "Agreement status updated",
        `Agreement ${!currentStatus ? "marked as sent" : "marked as not sent"}`,
        "success",
      )
    } catch (error) {
      console.error("Error updating agreement status:", error)
      showToast("Update failed", "Failed to update agreement status. Please try again.", "error")
    }
  }

  const requiresClientSideRefinement =
    searchTerm.trim() !== "" || documentFilter !== "all" || bankNameFilter !== "all"

  const baseTotalCount = filteredTotalCount || totalClientCount || filteredClients.length
  const displayedTotalCount = requiresClientSideRefinement ? filteredClients.length : baseTotalCount

  if (loading)
    return (
      <div className="flex min-h-screen bg-white">
        {renderSidebar()}
        <div className="flex-1 flex justify-center items-center h-screen bg-white text-gray-800">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="flex min-h-screen bg-white">
        {renderSidebar()}
        <div className="flex-1 flex justify-center items-center h-screen bg-white">
          <div className="text-red-500 text-center">{error}</div>
        </div>
      </div>
    )

  return (
    <div className={`flex min-h-screen ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
      {renderSidebar()}

      <div className={`flex-1 p-3 ${theme === "dark" ? "bg-gray-900 text-gray-200" : "bg-white text-gray-800"}`}>
        {/* Header Section */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <h1 className={`text-base font-bold ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
              Clients Management
            </h1>
            {selectedClients.size > 0 && userRole !== "billcut" && userRole !== "assistant" && (
              <div className="flex gap-1">
                <Button
                  onClick={() => setIsBulkAssignModalOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] py-0.5 px-1.5 h-5"
                >
                  Assign Primary ({selectedClients.size} selected)
                </Button>
                <Button
                  onClick={() => setIsBulkSecondaryAssignModalOpen(true)}
                  className="bg-green-500 hover:bg-green-600 text-white text-[10px] py-0.5 px-1.5 h-5"
                >
                  Assign Secondary ({selectedClients.size} selected)
                </Button>
                <Button
                  onClick={() => setIsBulkWhatsAppModalOpen(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white text-[10px] py-0.5 px-1.5 h-5"
                >
                  Bulk WhatsApp ({selectedClients.size} selected)
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            {/* Bulk Select by Number - Only show for authorized roles */}
            {userRole !== "billcut" && userRole !== "assistant" && (
              <div className="flex gap-1 items-center">
                <div className="flex flex-col">
                  <Input
                    placeholder="Select top N"
                    value={bulkSelectNumber}
                    onChange={(e) => setBulkSelectNumber(e.target.value)}
                    onKeyPress={handleBulkSelectKeyPress}
                    className={`w-20 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-800 placeholder-gray-500"
                    } text-[10px] h-5`}
                    type="number"
                    min="1"
                    max={filteredClients.length}
                  />
                  <span className={`text-[8px] ${theme === "dark" ? "text-gray-400" : "text-gray-500"} text-center mt-0.5`}>
                    of {filteredClients.length}
                  </span>
                </div>
                <Button
                  onClick={handleBulkSelectByNumber}
                  disabled={!bulkSelectNumber.trim()}
                  className={`${
                    theme === "dark"
                      ? "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700"
                      : "bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300"
                  } text-[10px] h-5 px-2 disabled:opacity-50`}
                  title="Select top N clients from current filter"
                >
                  Select
                </Button>
              </div>
            )}
            {userRole !== "billcut" && userRole !== "assistant" && (
              <Button
                onClick={downloadCSV}
                className={`${
                  theme === "dark"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                } text-[10px] h-5 px-2 flex items-center gap-1`}
              >
                <Download className="h-2.5 w-2.5" />
                Export CSV
              </Button>
            )}
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-40 ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-800 placeholder-gray-500"
              } text-[10px] h-5`}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className={`w-[100px] ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-300 text-gray-800"
                } text-[10px] h-5`}
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-200 border-gray-700"
                    : "bg-white text-gray-800 border-gray-300"
                } text-[10px]`}
              >
                <SelectItem value="all">All Statuses</SelectItem>
                {allStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={primaryAdvocateFilter} onValueChange={setPrimaryAdvocateFilter}>
              <SelectTrigger
                className={`w-[120px] ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-300 text-gray-800"
                } text-[10px] h-5`}
              >
                <SelectValue placeholder="Primary advocate" />
              </SelectTrigger>
              <SelectContent
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-200 border-gray-700"
                    : "bg-white text-gray-800 border-gray-300"
                } text-[10px]`}
              >
                <SelectItem value="all">All Primary Advocates</SelectItem>
                {allAdvocates.map((advocate) => (
                  <SelectItem key={advocate} value={advocate}>
                    {advocate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={secondaryAdvocateFilter} onValueChange={setSecondaryAdvocateFilter}>
              <SelectTrigger
                className={`w-[120px] ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-300 text-gray-800"
                } text-[10px] h-5`}
              >
                <SelectValue placeholder="Secondary advocate" />
              </SelectTrigger>
              <SelectContent
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-200 border-gray-700"
                    : "bg-white text-gray-800 border-gray-300"
                } text-[10px]`}
              >
                <SelectItem value="all">All Secondary Advocates</SelectItem>
                {allAdvocates.map((advocate) => (
                  <SelectItem key={advocate} value={advocate}>
                    {advocate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter} disabled={userRole === "billcut"}>
              <SelectTrigger
                className={`w-[100px] ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-300 text-gray-800"
                } text-[10px] h-5 ${userRole === "billcut" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-200 border-gray-700"
                    : "bg-white text-gray-800 border-gray-300"
                } text-[10px]`}
              >
                <SelectItem value="all">All Sources</SelectItem>
                {allSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {formatSourceName(source)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={documentFilter} onValueChange={setDocumentFilter}>
              <SelectTrigger
                className={`w-[100px] ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-300 text-gray-800"
                } text-[10px] h-5`}
              >
                <SelectValue placeholder="Filter by document" />
              </SelectTrigger>
              <SelectContent
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-200 border-gray-700"
                    : "bg-white text-gray-800 border-gray-300"
                } text-[10px]`}
              >
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="with_document">With Document</SelectItem>
                <SelectItem value="no_document">No Document</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bankNameFilter} onValueChange={setBankNameFilter}>
              <SelectTrigger
                className={`w-[100px] ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-300 text-gray-800"
                } text-[10px] h-5`}
              >
                <SelectValue placeholder="Filter by bank" />
              </SelectTrigger>
              <SelectContent
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-200 border-gray-700"
                    : "bg-white text-gray-800 border-gray-300"
                } text-[10px]`}
              >
                <SelectItem value="all">All Banks</SelectItem>
                {allBankNames.map((bankName) => (
                  <SelectItem key={bankName} value={bankName}>
                    {bankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agreementFilter} onValueChange={setAgreementFilter}>
              <SelectTrigger
                className={`w-[100px] ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-300 text-gray-800"
                } text-[10px] h-5`}
              >
                <SelectValue placeholder="Filter by agreement" />
              </SelectTrigger>
              <SelectContent
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-200 border-gray-700"
                    : "bg-white text-gray-800 border-gray-300"
                } text-[10px]`}
              >
                <SelectItem value="all">All Agreements</SelectItem>
                <SelectItem value="sent">Agreement Sent</SelectItem>
                <SelectItem value="not_sent">Agreement Not Sent</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={resetFilters}
              variant="outline"
              className={`${
                theme === "dark"
                  ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              } text-[10px] h-5 px-1.5`}
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Clients Table */}
        <ClientsTable
          clients={filteredClients}
          totalCount={displayedTotalCount}
          onViewDetails={handleViewDetails}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteInitiate}
          onAdvocateStatusChange={handleAdvocateStatusChange}
          selectedClients={selectedClients}
          onSelectAll={handleSelectAll}
          onSelectClient={handleSelectClient}
          theme={theme}
          onThemeChange={setTheme}
          openDocumentViewer={openDocumentViewer}
          onViewHistory={handleViewHistory}
          remarks={remarks}
          onRemarkChange={handleRemarkChange}
          onSaveRemark={handleSaveRemark}
          onAgreementToggle={handleAgreementToggle}
          userRole={userRole}
        />
        <div ref={loadMoreRef} className="flex h-8 items-center justify-center">
          {loading ? null : isFetchingMore ? (
            <span className={`text-[10px] ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Loading more clients...
            </span>
          ) : hasMore ? (
            <span className={`text-[10px] ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              Scroll to load more clients
            </span>
          ) : (
            <span className={`text-[10px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
              All clients loaded
            </span>
          )}
        </div>

        {/* Modals */}
        {selectedClient && (
          <ViewDetailsModal
            client={selectedClient}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            openDocumentViewer={openDocumentViewer}
            formatSourceName={formatSourceName}
          />
        )}

        {editingClient && (
          <EditModal
            client={editingClient}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveChanges}
            advocates={advocates}
            allSources={allSources}
            isSaving={isSaving}
            handleEditInputChange={handleEditInputChange}
            handleSelectChange={handleSelectChange}
            handleBankChange={handleBankChange}
            handleAddBank={handleAddBank}
            handleRemoveBank={handleRemoveBank}
            handleFileChange={handleFileChange}
            handleFileUpload={handleFileUpload}
            openDocumentViewer={openDocumentViewer}
            testUpload={testUpload}
            formatSourceName={formatSourceName}
            uploading={uploading}
            fileUpload={fileUpload}
          />
        )}

        {/* Enhanced Document Viewer */}
        <DocumentViewer
          isOpen={isDocViewerOpen}
          documentUrl={viewingDocumentUrl}
          documentName={viewingDocumentName}
          onClose={() => setIsDocViewerOpen(false)}
        />

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && clientToDelete && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg border border-gray-300 p-4 max-w-xs w-full animate-fade-in shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-600"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </div>
                <h3 className="text-base font-bold text-red-600 mb-1.5">Delete Client</h3>
                <p className="text-gray-600 text-xs mb-3">
                  This action cannot be undone. Please type{" "}
                  <span className="font-semibold text-gray-800">{clientToDelete.name}</span> to confirm deletion.
                </p>

                <Input
                  type="text"
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  placeholder={clientToDelete.name}
                  className="bg-white border-gray-300 text-gray-800 text-xs mb-3 h-6"
                />

                <div className="flex gap-1.5 w-full">
                  <Button
                    onClick={() => setIsDeleteModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs h-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteConfirm}
                    disabled={deleteConfirmationName !== clientToDelete.name || isDeleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 text-xs h-6"
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-center">
                        <div className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5"></div>
                        Deleting...
                      </div>
                    ) : (
                      "Delete Client"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Assign Modal */}
        {isBulkAssignModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg border border-gray-300 p-4 max-w-xs w-full animate-fade-in shadow-xl">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-gray-800 mb-2">Bulk Assign Primary Advocate</h3>
                <p className="text-gray-600 text-xs mb-2">
                  Assign a primary advocate to {selectedClients.size} selected clients
                </p>

                <Select value={selectedAdvocateForBulk} onValueChange={setSelectedAdvocateForBulk}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800 text-xs h-6 mb-3">
                    <SelectValue placeholder="Select a primary advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-800 border-gray-300 text-xs">
                    {advocates.map((advocate) => (
                      <SelectItem key={advocate.uid} value={`${advocate.firstName} ${advocate.lastName}`}>
                        {advocate.firstName} {advocate.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-1.5">
                  <Button
                    onClick={() => setIsBulkAssignModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs h-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAdvocateAssignment}
                    disabled={!selectedAdvocateForBulk || isSaving}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 text-xs h-6"
                  >
                    {isSaving ? (
                      <div className="flex items-center justify-center">
                        <div className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5"></div>
                        Assigning...
                      </div>
                    ) : (
                      "Assign Primary"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Secondary Assign Modal */}
        {isBulkSecondaryAssignModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg border border-gray-300 p-4 max-w-xs w-full animate-fade-in shadow-xl">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-gray-800 mb-2">Bulk Assign Secondary Advocate</h3>
                <p className="text-gray-600 text-xs mb-2">
                  Assign a secondary advocate to {selectedClients.size} selected clients
                </p>

                <Select value={selectedSecondaryAdvocateForBulk} onValueChange={setSelectedSecondaryAdvocateForBulk}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800 text-xs h-6 mb-3">
                    <SelectValue placeholder="Select a secondary advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-800 border-gray-300 text-xs">
                    {advocates.map((advocate) => (
                      <SelectItem key={advocate.uid} value={`${advocate.firstName} ${advocate.lastName}`}>
                        {advocate.firstName} {advocate.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-1.5">
                  <Button
                    onClick={() => setIsBulkSecondaryAssignModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs h-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkSecondaryAdvocateAssignment}
                    disabled={!selectedSecondaryAdvocateForBulk || isSaving}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 text-xs h-6"
                  >
                    {isSaving ? (
                      <div className="flex items-center justify-center">
                        <div className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5"></div>
                        Assigning...
                      </div>
                    ) : (
                      "Assign Secondary"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div
              className={`${theme === "dark" ? "bg-gray-900" : "bg-white"} rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-300"} p-4 w-full max-w-2xl animate-fade-in shadow-xl`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-bold ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                  Remark History
                </h2>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className={`rounded-full h-8 w-8 flex items-center justify-center ${theme === "dark" ? "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800"} transition-colors`}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {selectedClientHistory.map((history, index) => (
                  <div
                    key={index}
                    className={`${theme === "dark" ? "bg-gray-800" : "bg-gray-50"} rounded-lg p-3 border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`text-sm font-medium ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}
                      >
                        {history.advocateName}
                      </span>
                      <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {history.timestamp?.toDate?.()?.toLocaleString("en-IN") || "Unknown date"}
                      </span>
                    </div>
                    <p className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                      {history.remark}
                    </p>
                  </div>
                ))}
                {selectedClientHistory.length === 0 && (
                  <div className={`text-center py-8 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    No remarks history available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk WhatsApp Modal */}
        <ClientBulkWhatsAppModal
          isOpen={isBulkWhatsAppModalOpen}
          onClose={() => setIsBulkWhatsAppModalOpen(false)}
          selectedClients={Array.from(selectedClients).map(id => clients.find(c => c.id === id)).filter(Boolean)}
          onSendBulkWhatsApp={sendBulkWhatsApp}
        />

        {/* Toast Container */}
        <div className="fixed bottom-2 right-2 z-50 flex flex-col gap-1.5">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`animate-slide-up rounded-lg border p-2 shadow-md max-w-xs text-xs ${
                toast.type === "success"
                  ? "bg-green-50 border-green-200 text-green-600"
                  : toast.type === "error"
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-white border-gray-300 text-gray-800"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{toast.title}</h4>
                  <p className="text-[10px] opacity-90 mt-0.5">{toast.description}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-[10px] opacity-70 hover:opacity-100 h-3 w-3 flex items-center justify-center rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <style jsx global>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
          
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(1rem); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientsPageWithParams />
    </Suspense>
  )
}
