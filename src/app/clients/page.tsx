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
  or,
  deleteDoc,
  limit,
  addDoc,
  startAfter,
  startAt,
  endAt,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { authFetch } from '@/lib/authFetch'
import { Button } from "@/components/ui/button"
import { 
  Download, 
  Filter, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  MessageSquare, 
  MoreHorizontal,
  Trash2,
  RefreshCw
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

const createSearchVariants = (value: string): string[] => {
  const normalized = value.trim()
  if (!normalized) return []

  const lower = normalized.toLowerCase()
  const upper = normalized.toUpperCase()
  const titleCase = lower.replace(/\b\w/g, (char) => char.toUpperCase())

  return Array.from(new Set([normalized, lower, upper, titleCase])).filter((variant) => variant.length > 0)
}

const generateSearchKeywords = (name: string): string[] => {
  if (!name) return []
  const keywords = new Set<string>()
  const normalizedName = name.toLowerCase().trim()
  
  // Add full name variants
  keywords.add(normalizedName)
  
  // Split into words
  const words = normalizedName.split(/\s+/).filter(w => w.length > 0)
  
  words.forEach(word => {
    // Add exact word
    keywords.add(word)
    
    // Add prefixes of length >= 2
    for (let i = 2; i <= word.length; i++) {
      keywords.add(word.substring(0, i))
    }
  })

  return Array.from(keywords)
}

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
  const [isReindexing, setIsReindexing] = useState(false)
  const [reindexProgress, setReindexProgress] = useState("")

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [primaryAdvocateFilter, setPrimaryAdvocateFilter] = useState<string>("all")
  const [secondaryAdvocateFilter, setSecondaryAdvocateFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [documentFilter, setDocumentFilter] = useState<string>("all")
  const [bankNameFilter, setBankNameFilter] = useState<string>("all")
  const [agreementFilter, setAgreementFilter] = useState<string>("all")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

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
  // Add new state for theme
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)

  // Load theme from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
      if (savedTheme) {
        setTheme(savedTheme)
      }
      setIsThemeLoaded(true)
    }
  }, [])

  // Save theme to local storage when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && isThemeLoaded) {
      localStorage.setItem("theme", theme)
    }
  }, [theme, isThemeLoaded])

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
  const [showFilters, setShowFilters] = useState(false)
  const [isLoadingAll, setIsLoadingAll] = useState(false)

  // App Status states
  const [appStatuses, setAppStatuses] = useState<{ [key: string]: string }>({})
  const [isAppStatusHistoryModalOpen, setIsAppStatusHistoryModalOpen] = useState(false)
  const [selectedAppStatusHistory, setSelectedAppStatusHistory] = useState<
    Array<{
      index: string
      remarks: string
      createdAt: number
      createdBy: string
    }>
  >([])


  // Add URL parameter handling
  const searchParams = useSearchParams()

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

  const mergeAndSortClients = useCallback((existing: Client[], incoming: Client[]) => {
    const mergedMap = new Map<string, Client>()
    existing.forEach((client) => mergedMap.set(client.id, client))
    incoming.forEach((client) => mergedMap.set(client.id, client))

    const mergedClients = Array.from(mergedMap.values())

        const clientsWithStartDate: Client[] = []
    const clientsWithoutStartDate: Client[] = []

    mergedClients.forEach((client) => {
      const startDateValue = typeof client.startDate === "string" ? client.startDate.trim() : ""
      if (startDateValue) {
            clientsWithStartDate.push(client)
      } else {
        clientsWithoutStartDate.push(client)
          }
        })

        clientsWithStartDate.sort((a, b) => {
      const dateA = new Date(a.startDate ?? "")
      const dateB = new Date(b.startDate ?? "")
          return dateB.getTime() - dateA.getTime()
        })

    return [...clientsWithStartDate, ...clientsWithoutStartDate]
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

  const executeSearchQueries = useCallback(
    async (term: string, baseConstraints: QueryConstraint[]) => {
      const normalizedTerm = term.trim()
      if (!normalizedTerm) return []

      const searchVariants = createSearchVariants(normalizedTerm)
      const normalizedLowerTerm = normalizedTerm.toLowerCase()
      const collectionRef = collection(db, "clients")
      const queries: Array<ReturnType<typeof query>> = []
      const limitClause = limit(1000)

      // Split term into words for fallback search
      const words = normalizedTerm.split(/\s+/)
      const firstWord = words[0]
      
      // If we have multiple words, we'll also search by the first word to be safe
      // (e.g. User searches "Archisman Das", DB has "Archisman  Das" or "Archisman Kumar Das")
      const searchTerms = new Set(searchVariants)
      if (words.length > 1 && firstWord.length > 2) {
        const firstWordVariants = createSearchVariants(firstWord)
        firstWordVariants.forEach(v => searchTerms.add(v))
      }

      // Add variants with leading space to handle dirty data (e.g. " Archisman")
      // The user specifically requested handling for records with leading spaces
      const originalTerms = Array.from(searchTerms)
      originalTerms.forEach(term => {
        searchTerms.add(` ${term}`)
      })

      // Name Search (Prefix on Name field)
      searchTerms.forEach((variant) => {
        try {
          queries.push(
            query(
              collectionRef,
              ...baseConstraints,
              orderBy("name"),
              startAt(variant),
              endAt(`${variant}\uf8ff`),
              limitClause,
            ),
          )
        } catch (error) {
          console.warn("Skipping name search query:", error)
        }
      })

      // Keyword Search (Partial/Middle name match)
      // We only use the lowercase normalized term for array-contains
      if (normalizedLowerTerm.length >= 2) {
        try {
          queries.push(
            query(
              collectionRef,
              ...baseConstraints,
              where("searchKeywords", "array-contains", normalizedLowerTerm),
              limitClause
            )
          )
        } catch (error) {
          console.warn("Skipping keyword search query:", error)
        }
      }

      // Phone Search (Exact)
      try {
        queries.push(query(collectionRef, ...baseConstraints, where("phone", "==", normalizedTerm), limitClause))
      } catch (error) {
        console.warn("Skipping phone search query:", error)
      }

      if (queries.length === 0) {
        return []
      }

      const snapshots = await Promise.all(
        queries.map(async (q) => {
          try {
            const snap = await getDocs(q)
            console.log(`[DEBUG] Search Query Fetched: ${snap.size} docs`)
            return snap
          } catch (error) {
            console.error("Search query failed:", error)
            return null
          }
        }),
      )

      const uniqueClients = new Map<string, Client>()

      snapshots.forEach((snapshot) => {
        if (!snapshot) return
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data()
          const client = {
            id: docSnap.id,
            ...(data ?? {}),
          } as Client
          uniqueClients.set(docSnap.id, client)
        })
      })

      const enhanced = await Promise.all(
        Array.from(uniqueClients.values()).map(async (client) => {
          const enhancedClient = await enhanceClientData(client)
          return enhancedClient
        }),
      )

      const searchKeywords = normalizedLowerTerm.split(/\s+/).filter(k => k.length > 0)

      const caseInsensitiveFiltered = enhanced.filter((client) => {
        const valuesToCheck = [
          client.name,
          client.phone,
          client.altPhone,
        ].filter((v): v is string => typeof v === "string").map(v => v.toLowerCase())

        // Check if ALL keywords are present in ANY of the fields
        // This allows "Archisman Das" to match "Archisman Kumar Das"
        // or "Archisman" in name and "98765" in phone
        return searchKeywords.every(keyword => 
          valuesToCheck.some(value => value.includes(keyword))
        )
      })

      return caseInsensitiveFiltered.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase()
        const nameB = (b.name || "").toLowerCase()
        return nameA.localeCompare(nameB)
      })
    },
    [enhanceClientData],
  )

  const buildBaseFilterConstraints = useCallback((): QueryConstraint[] => {
    const constraints: QueryConstraint[] = []

    if (statusFilter !== "all") {
      if (statusFilter === "Inactive" || statusFilter === "inactive") {
        constraints.push(
          or(
            where("status", "==", ""),
            where("adv_status", "==", null),
            where("adv_status", "==", "(null)")
          ) as unknown as QueryConstraint
        )
      } else {
        constraints.push(where("adv_status", "==", statusFilter))
      }
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

    if (fromDate) {
      constraints.push(where("startDate", ">=", fromDate))
    }

    if (toDate) {
      constraints.push(where("startDate", "<=", toDate))
    }

    if (agreementFilter === "sent") {
      constraints.push(where("sentAgreement", "==", true))
    } else if (agreementFilter === "not_sent") {
      constraints.push(where("sentAgreement", "==", false))
    }

    return constraints
  }, [statusFilter, primaryAdvocateFilter, secondaryAdvocateFilter, sourceFilter, agreementFilter, fromDate, toDate])

  const fetchFilteredCount = useCallback(async () => {
    try {
      const constraints = buildBaseFilterConstraints()
      const countQuery = query(collection(db, "clients"), ...constraints)
      const totalSnapshot = await getCountFromServer(countQuery)
      const count = totalSnapshot.data().count
      console.log(`[DEBUG] Count Fetched: ${count} (Cost: ~${Math.ceil(count / 1000)} read)`)
      setFilteredTotalCount(count)
      if (constraints.length === 0) {
        setTotalClientCount(count)
      }
    } catch (error) {
      console.error("Error fetching filtered clients count:", error)
      setFilteredTotalCount(0)
      if (buildBaseFilterConstraints().length === 0) {
        setTotalClientCount(0)
      }
    }
  }, [buildBaseFilterConstraints])

  const fetchClientsBatch = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      const trimmedSearch = debouncedSearchTerm

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
        if (!trimmedSearch) {
          await fetchFilteredCount()
        } else {
          setFilteredTotalCount(0)
        }
      } else {
        if (!hasMoreRef.current || isFetchingMoreRef.current || trimmedSearch) {
          return
        }
        setIsFetchingMore(true)
        isFetchingMoreRef.current = true
      }

      try {
        const baseConstraints = buildBaseFilterConstraints()
        const collectionRef = collection(db, "clients")

        if (trimmedSearch) {
          // For search, we want to ignore most filters to ensure we find the client "no matter what".
          // However, we must respect the "billcut" role restriction.
          const searchConstraints: QueryConstraint[] = []
          if (userRole === "billcut") {
            searchConstraints.push(where("source_database", "==", "billcut"))
          }

          const searchResults = await executeSearchQueries(trimmedSearch, searchConstraints)
          setClients(searchResults)
          setFilteredClients(searchResults)
          setHasMore(false)
          hasMoreRef.current = false
          setFilteredTotalCount(searchResults.length)
          setLoading(false)
          return
        }

        const paginationConstraints: QueryConstraint[] = [
          ...baseConstraints,
          orderBy("startDate", "desc"),
          ...(lastDocRef.current ? [startAfter(lastDocRef.current)] : []),
          limit(ITEMS_PER_PAGE),
        ]

        const clientsQuery = query(collectionRef, ...paginationConstraints)
        const querySnapshot = await getDocs(clientsQuery)
        console.log(`[DEBUG] Main Batch Fetched: ${querySnapshot.size} docs`)

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
    [debouncedSearchTerm, executeSearchQueries, enhanceClientData, mergeAndSortClients, buildBaseFilterConstraints, fetchFilteredCount, userRole],
  )

  // Function to load ALL clients at once
  const loadAllClients = useCallback(async () => {
    setIsLoadingAll(true)
    setError(null)
    try {
      const baseConstraints = buildBaseFilterConstraints()
      const collectionRef = collection(db, "clients")
      const allClientsQuery = query(collectionRef, ...baseConstraints, orderBy("startDate", "desc"))
      const querySnapshot = await getDocs(allClientsQuery)

      const allClientsData = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const client = { id: docSnap.id, ...docSnap.data() } as Client
          return enhanceClientData(client)
        })
      )

      const sorted = mergeAndSortClients([], allClientsData)
      setClients(sorted)
      setFilteredClients(sorted)
      setHasMore(false)
      hasMoreRef.current = false
      lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1] || null
      setFilteredTotalCount(sorted.length)
      setTotalClientCount(sorted.length)
      showToast("All Clients Loaded", `Successfully loaded ${sorted.length} clients.`, "success")
    } catch (err) {
      console.error("Error loading all clients:", err)
      if (err instanceof Error) {
        setError(`Failed to load all clients: ${err.message}`)
      } else {
        setError("Failed to load all clients: Unknown error")
      }
      showToast("Error", "Failed to load all clients.", "error")
    } finally {
      setIsLoadingAll(false)
    }
  }, [buildBaseFilterConstraints, enhanceClientData, mergeAndSortClients])

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

    const initialAppStatuses: { [key: string]: string } = {}
    clients.forEach((client) => {
      if (client.client_app_status && client.client_app_status.length > 0) {
        initialAppStatuses[client.id] = client.client_app_status[client.client_app_status.length - 1].remarks
      }
    })
    setAppStatuses(initialAppStatuses)
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
      setDebouncedSearchTerm(searchFromUrl.trim())
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

  const handleSelectChange = (name: string, value: string | boolean) => {
    if (editingClient) {
      setEditingClient({
        ...editingClient,
        [name]: value,
      })
    }
  }

  // Function to generate agreement document
  const generateAgreementDocument = async (clientData: Client): Promise<{documentName: string, documentUrl: string, documentUploadedAt: string} | null> => {
    try {
      // Determine which API endpoint to use based on source and loan amount
      let apiEndpoint = '/api/agreement';
      let requestData: any = clientData;
      
    // Helper to format date reliably
    const getFormattedDate = (dateVal: any): string => {
      if (!dateVal) return new Date().toISOString().split('T')[0];
      
      // Handle Firestore Timestamp
      if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {
        try {
          return dateVal.toDate().toISOString().split('T')[0];
        } catch (e) {
          console.error("Error converting timestamp:", e);
          return new Date().toISOString().split('T')[0];
        }
      }
      
      // Handle string or Date object
      try {
        return new Date(dateVal).toISOString().split('T')[0];
      } catch (e) {
        return new Date().toISOString().split('T')[0];
      }
    };

    const formattedDate = getFormattedDate(clientData.startDate);

      if (clientData.source_database === 'billcut' && clientData.banks) {
        // Calculate total loan amount
        const totalLoanAmount = clientData.banks.reduce((total: number, bank: any) => {
          const amountStr = String(bank.loanAmount || '0').replace(/,/g, '');
          return total + (parseFloat(amountStr) || 0);
        }, 0);
        
        // Fee percentage is now passed from the client data (entered in UI)
        const feePercentage = parseFloat(clientData.feePercentage || '0');
        
        // If total loan amount is <= 400000, use billcut agreement
        if (totalLoanAmount <= 400000) {
          apiEndpoint = '/api/billcut-agreement';
          
          // Prepare data for billcut agreement
          requestData = {
            name: clientData.name,
            email: clientData.email,
            panNumber: clientData.panNumber,
            feePercentage: feePercentage,
            date: formattedDate,
            banks: clientData.banks.map((bank: any) => ({
              bankName: bank.bankName,
              loanAmount: bank.loanAmount,
              loanType: bank.loanType
            }))
          };
        } else {
          // If total loan amount is > 400000, use billcut PAS agreement with adjusted fee
          apiEndpoint = '/api/billcut-agreement-pas';
          
          // Calculate adjusted fee percentage (2% less than entered)
          const adjustedPercentage = Math.max(0, feePercentage - 2); // Ensure it doesn't go negative
          
          // Prepare data for billcut PAS agreement with adjusted fee
          requestData = {
            name: clientData.name,
            email: clientData.email,
            panNumber: clientData.panNumber,
            feePercentage: adjustedPercentage, // Pass the adjusted percentage
            date: formattedDate,
            banks: clientData.banks.map((bank: any) => ({
              bankName: bank.bankName,
              loanAmount: bank.loanAmount,
              loanType: bank.loanType
            }))
          };
        }
      }
      
      const response = await authFetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Failed to generate agreement. Status:', response.status, 'Body:', errorBody);
        throw new Error('Failed to generate agreement');
      }
      
      const data = await response.json();
      return data;
      
    } catch (error: any) {
      console.error('Error in generateAgreementDocument function:', error);
      throw error;
    }
  };

  const handleSaveChanges = async () => {
    if (!editingClient) return

    setIsSaving(true)
    try {
      const clientRef = doc(db, "clients", editingClient.id)

      // Start with the current editing client data
      let finalClientData = { ...editingClient };

      // Check if we need to regenerate agreement
      if (editingClient.shouldGenerateAgreement) {
        if (editingClient.source_database === 'billcut') {
           const missingFields = [];
           if (!editingClient.name) missingFields.push('Name');
           if (!editingClient.email) missingFields.push('Email');
           if (!editingClient.panNumber) missingFields.push('PAN Number');
           if (!editingClient.feePercentage) missingFields.push('Fee Percentage');
           if (!editingClient.banks || editingClient.banks.length === 0) missingFields.push('Banks');

           if (missingFields.length > 0) {
             showToast("Missing Required Fields", `Please fill the following fields to generate agreement: ${missingFields.join(', ')}`, "error");
             setIsSaving(false);
             return;
           }
        }

        showToast("Generating Agreement", "Please wait while the agreement is being generated...", "info");
        
        try {
          const documentData = await generateAgreementDocument(editingClient);
          
          if (documentData) {
            finalClientData.documentUrl = documentData.documentUrl;
            finalClientData.documentName = documentData.documentName;
            finalClientData.documentUploadedAt = new Date(documentData.documentUploadedAt);
            
            showToast("Agreement Generated", "New agreement has been generated successfully.", "success");
          }
        } catch (genError) {
          console.error("Agreement generation failed:", genError);
          showToast("Agreement Failed", "Failed to generate agreement, but other changes will be saved.", "error");
          // We continue saving other changes even if agreement fails, or we could return here.
          // Let's decide to continue saving other data but warn the user.
        }
      }

      // Remove temporary UI fields and id from the data to be updated
      const { id, shouldGenerateAgreement, feePercentage, ...clientDataToSave } = finalClientData;

      // Update last modified timestamp and search keywords
      const updatedData: any = {
        ...clientDataToSave,
        searchKeywords: generateSearchKeywords(clientDataToSave.name),
        lastModified: new Date(),
      }

      // Check if status changed to something that requires an app status update
      const originalClient = clients.find(c => c.id === editingClient.id)
      const oldStatus = originalClient?.adv_status
      const newStatus = clientDataToSave.adv_status

      if (newStatus !== oldStatus) {
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
          if (!confirmed) {
            setIsSaving(false)
            return
          }

          const currentAppStatus = originalClient?.client_app_status || []
          const advocateName = localStorage.getItem("userName") || "System Admin"
          
          const newAppStatus = {
            index: currentAppStatus.length.toString(),
            remarks: appStatusRemark,
            createdAt: Math.floor(Date.now() / 1000),
            createdBy: advocateName
          }
          
          updatedData.client_app_status = arrayUnion(newAppStatus)
          // Also update local finalClientData for state update
          finalClientData.client_app_status = [...currentAppStatus, newAppStatus]
        }
      }

      await updateDoc(clientRef, updatedData)

      // Update the local state
      setClients(clients.map((client) => (client.id === editingClient.id ? finalClientData : client)))

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

  const handleReindex = async () => {
    if (!confirm("This will update all clients with search keywords. This may take a while. Continue?")) return

    setIsReindexing(true)
    setReindexProgress("Starting...")
    
    try {
      let processed = 0
      let updated = 0
      let lastDoc = null
      
      while (true) {
        let q = query(collection(db, "clients"), orderBy("startDate", "desc"), limit(100))
        if (lastDoc) {
          q = query(collection(db, "clients"), orderBy("startDate", "desc"), startAfter(lastDoc), limit(100))
        }

        const snapshot = await getDocs(q)
        if (snapshot.empty) break

        const batchPromises = snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as Client
          if (!data.searchKeywords || data.searchKeywords.length === 0) {
            const keywords = generateSearchKeywords(data.name || "")
            await updateDoc(doc(db, "clients", docSnap.id), {
              searchKeywords: keywords
            })
            updated++
          }
        })

        await Promise.all(batchPromises)
        
        processed += snapshot.size
        setReindexProgress(`Processed ${processed} clients (${updated} updated)...`)
        lastDoc = snapshot.docs[snapshot.docs.length - 1]
      }
      
      showToast("Reindex Complete", `Successfully processed ${processed} clients. Updated ${updated} records.`, "success")
    } catch (error) {
      console.error("Reindexing failed:", error)
      showToast("Reindex Failed", "An error occurred during reindexing.", "error")
    } finally {
      setIsReindexing(false)
      setReindexProgress("")
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
      let updateData: any = {
        adv_status: newStatus,
        lastModified: new Date(),
      }

      // Automatically add app status for specific statuses
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
        if (!confirmed) {
          setIsSaving(false)
          return
        }

        const client = clients.find(c => c.id === clientId)
        const currentAppStatus = client?.client_app_status || []
        const advocateName = localStorage.getItem("userName") || "System Admin"
        
        const newAppStatus = {
          index: currentAppStatus.length.toString(),
          remarks: appStatusRemark,
          createdAt: Math.floor(Date.now() / 1000),
          createdBy: advocateName
        }
        
        updateData.client_app_status = arrayUnion(newAppStatus)
      }

      await updateDoc(clientRef, updateData)

      // Update local state
      setClients((prevClients) =>
        prevClients.map((client) => {
          if (client.id === clientId) {
            const updatedClient = { ...client, adv_status: newStatus, lastModified: new Date() }
            if (appStatusRemark) {
              const newStatusObj = {
                index: (client.client_app_status?.length || 0).toString(),
                remarks: appStatusRemark,
                createdAt: Math.floor(Date.now() / 1000),
                createdBy: localStorage.getItem("userName") || "System Admin"
              }
              updatedClient.client_app_status = [...(client.client_app_status || []), newStatusObj]
            }
            return updatedClient
          }
          return client
        }),
      )

      showToast("Status Updated", `Client status changed to ${newStatus}`, "success")
    } catch (error) {
      console.error("Error updating advocate status:", error)
      showToast("Update Failed", "Failed to update client status", "error")
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
    if (debouncedSearchTerm.trim() !== "") {
      const searchLower = debouncedSearchTerm.toLowerCase()
      results = results.filter((client) => {
        const valuesToCheck = [
          client.name,
          client.email,
          client.phone,
          client.altPhone,
          client.aadharNumber,
          client.panNumber,
        ]

        return valuesToCheck.some(
          (value) => typeof value === "string" && value.toLowerCase().includes(searchLower),
        )
      })
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

    // Apply date filter
    if (fromDate) {
      results = results.filter((client) => {
        const clientDate = typeof client.startDate === 'string' ? client.startDate : ''
        return clientDate >= fromDate
      })
    }

    if (toDate) {
      results = results.filter((client) => {
        const clientDate = typeof client.startDate === 'string' ? client.startDate : ''
        return clientDate <= toDate
      })
    }
    setFilteredClients(results)
  }, [
    clients,
    debouncedSearchTerm,
    primaryAdvocateFilter,
    secondaryAdvocateFilter,
    statusFilter,
    sourceFilter,
    documentFilter,
    bankNameFilter,
    agreementFilter,
    fromDate,
    toDate,
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
    setBankNameFilter("all")
    setAgreementFilter("all")
    setFromDate("")
    setToDate("")
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
          where("status", "==", "active"),
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
                // Numbered params for templates using {{1}}, {{2}}, etc.
                { name: "1", value: client.name || "Customer" },
                { name: "2", value: "AMA Legal Solutions" },
                { name: "3", value: localStorage.getItem("userName") || "Agent" },
                { name: "4", value: formattedPhone },
                // Named params for templates using {{name}}, {{Channel}}, etc.
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

  // App Status Handlers
  const handleAppStatusChange = (clientId: string, value: string) => {
    setAppStatuses((prev) => ({ ...prev, [clientId]: value }))
  }

  const handleSaveAppStatus = async (clientId: string) => {
    try {
      const advocateName = localStorage.getItem("userName") || "Unknown User"
      const statusText = appStatuses[clientId]?.trim()

      if (!statusText) {
        showToast("Error", "Please enter a status before saving", "error")
        return
      }

      const client = clients.find((c) => c.id === clientId)
      const currentStatusArray = client?.client_app_status || []

      const newStatus = {
        index: (currentStatusArray.length || 0).toString(),
        remarks: statusText,
        createdAt: Math.floor(Date.now() / 1000),
        createdBy: advocateName,
      }

      const clientRef = doc(db, "clients", clientId)
      await updateDoc(clientRef, {
        client_app_status: arrayUnion(newStatus),
        lastModified: new Date(),
      })

      // Update local state
      setClients(
        clients.map((c) => {
          if (c.id === clientId) {
            const updatedStatus = [...(c.client_app_status || []), newStatus]
            return { ...c, client_app_status: updatedStatus, lastModified: new Date() }
          }
          return c
        })
      )

      showToast("Success", "App Status saved successfully", "success")
    } catch (error) {
      console.error("Error saving app status:", error)
      showToast("Error", "Failed to save app status", "error")
    }
  }

  const handleViewAppStatusHistory = (client: Client) => {
    setSelectedAppStatusHistory(client.client_app_status || [])
    setSelectedClientId(client.id)
    setIsAppStatusHistoryModalOpen(true)
  }

  const handleDeleteAppStatus = async (statusItem: any) => {
    if (!selectedClientId) return

    if (confirm("Are you sure you want to delete this status?")) {
      try {
        const clientRef = doc(db, "clients", selectedClientId)
        await updateDoc(clientRef, {
          client_app_status: arrayRemove(statusItem),
          lastModified: new Date(),
        })

        // Update local state
        setClients(
          clients.map((c) => {
            if (c.id === selectedClientId) {
              const updatedStatus = (c.client_app_status || []).filter(
                (item) => item.index !== statusItem.index || item.createdAt !== statusItem.createdAt
              )
              return { ...c, client_app_status: updatedStatus, lastModified: new Date() }
            }
            return c
          })
        )

        // Update modal state
        setSelectedAppStatusHistory((prev) =>
          prev.filter((item) => item.index !== statusItem.index || item.createdAt !== statusItem.createdAt)
        )

        showToast("Success", "Status deleted successfully", "success")
      } catch (error) {
        console.error("Error deleting app status:", error)
        showToast("Error", "Failed to delete status", "error")
      }
    }
  }

  const requiresClientSideRefinement = documentFilter !== "all" || bankNameFilter !== "all"

  const baseTotalCount = filteredTotalCount || totalClientCount || filteredClients.length
  const displayedTotalCount = requiresClientSideRefinement ? filteredClients.length : baseTotalCount



  return (
    <div className={`flex min-h-screen ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
      {renderSidebar()}

      <div className={`flex-1 p-3 ${theme === "dark" ? "bg-gray-900 text-gray-200" : "bg-white text-gray-800"}`}>
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Clients Management
              </h1>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Manage your clients, track status, and assign advocates.
              </p>
            </div>
            <div className="flex items-center gap-2">
               <Button
                 onClick={loadAllClients}
                 disabled={isLoadingAll}
                 variant="outline"
                 className={`${
                   theme === "dark" 
                     ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700" 
                     : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                 } h-9 text-xs font-medium`}
               >
                 <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoadingAll ? "animate-spin" : ""}`} />
                 {isLoadingAll ? "Loading..." : "Load All Clients"}
               </Button>
               {userRole !== "billcut" && userRole !== "assistant" && (
                  <Button
                    onClick={downloadCSV}
                    variant="outline"
                    className={`${
                      theme === "dark" 
                        ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700" 
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    } h-9 text-xs font-medium`}
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Export CSV
                  </Button>
               )}
            </div>
          </div>

          {/* Bulk Actions Bar - Only visible when selection > 0 */}
          {selectedClients.size > 0 && (
            <div className={`p-2 rounded-lg border ${
              theme === "dark" 
                ? "bg-blue-900/20 border-blue-800" 
                : "bg-blue-50 border-blue-100"
            } flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2`}>
              <Badge variant="secondary" className={`px-2 py-1 ${theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"}`}>
                {selectedClients.size} selected
              </Badge>
              <div className="h-4 w-px bg-blue-200 dark:bg-blue-800 mx-1" />
              
              {userRole !== "billcut" && userRole !== "assistant" && (
                <>
                  <Button
                    onClick={() => setIsBulkAssignModalOpen(true)}
                    size="sm"
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Assign Primary
                  </Button>
                  <Button
                    onClick={() => setIsBulkSecondaryAssignModalOpen(true)}
                    size="sm"
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Assign Secondary
                  </Button>
                  <Button
                    onClick={() => setIsBulkWhatsAppModalOpen(true)}
                    size="sm"
                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white border-0"
                  >
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                </>
              )}
              
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClients(new Set())}
                className="h-8 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Clear Selection
              </Button>
            </div>
          )}

          {/* Filters Card */}
          <Card className={`border shadow-sm ${
            theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}>
            <div className="p-4 space-y-4">
              {/* Top Row: Search + Primary Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`} />
                  <Input
                    placeholder="Search by name, email, phone, PAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-9 h-9 text-sm ${
                      theme === "dark" 
                        ? "bg-gray-900 border-gray-700 text-gray-200 placeholder:text-gray-500" 
                        : "bg-white border-gray-200 text-gray-900"
                    }`}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                   {/* Status Filter - Always Visible */}
                   <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className={`w-[140px] h-9 text-sm ${
                      theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"
                    }`}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {allStatuses.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Primary Advocate - Always Visible */}
                  <Select value={primaryAdvocateFilter} onValueChange={setPrimaryAdvocateFilter}>
                    <SelectTrigger className={`w-[160px] h-9 text-sm ${
                      theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"
                    }`}>
                      <SelectValue placeholder="Primary Advocate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Primary Adv.</SelectItem>
                      {allAdvocates.map((adv) => (
                        <SelectItem key={adv} value={adv}>{adv}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`h-9 px-3 text-sm ${
                      showFilters 
                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300" 
                        : theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-700"
                    }`}
                  >
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    Filters
                    {showFilters ? <ChevronUp className="ml-2 h-3.5 w-3.5" /> : <ChevronDown className="ml-2 h-3.5 w-3.5" />}
                  </Button>

                  {userRole === "overlord" && (
                    <Button
                      variant="outline"
                      onClick={handleReindex}
                      disabled={isReindexing}
                      className={`h-9 px-3 text-sm ${
                        theme === "dark" 
                          ? "bg-purple-900/20 border-purple-800 text-purple-300 hover:bg-purple-900/40" 
                          : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                      }`}
                    >
                      {isReindexing ? reindexProgress : "Reindex Search"}
                    </Button>
                  )}

                  {(statusFilter !== "all" || primaryAdvocateFilter !== "all" || secondaryAdvocateFilter !== "all" || sourceFilter !== "all" || documentFilter !== "all" || bankNameFilter !== "all" || agreementFilter !== "all" || searchTerm || fromDate || toDate) && (
                    <Button
                      variant="ghost"
                      onClick={resetFilters}
                      className="h-9 px-2 text-gray-500 hover:text-red-500"
                      title="Reset all filters"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Secondary Advocate</label>
                    <Select value={secondaryAdvocateFilter} onValueChange={setSecondaryAdvocateFilter}>
                      <SelectTrigger className={`w-full h-9 text-sm ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}>
                        <SelectValue placeholder="Select Advocate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Secondary Adv.</SelectItem>
                        {allAdvocates.map((adv) => (
                          <SelectItem key={adv} value={adv}>{adv}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Source</label>
                    <Select value={sourceFilter} onValueChange={setSourceFilter} disabled={userRole === "billcut"}>
                      <SelectTrigger className={`w-full h-9 text-sm ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"} ${userRole === "billcut" ? "opacity-50" : ""}`}>
                        <SelectValue placeholder="Select Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        {allSources.map((source) => (
                          <SelectItem key={source} value={source}>{formatSourceName(source)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Document Status</label>
                    <Select value={documentFilter} onValueChange={setDocumentFilter}>
                      <SelectTrigger className={`w-full h-9 text-sm ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Documents</SelectItem>
                        <SelectItem value="with_document">With Document</SelectItem>
                        <SelectItem value="no_document">No Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Bank Name</label>
                    <Select value={bankNameFilter} onValueChange={setBankNameFilter}>
                      <SelectTrigger className={`w-full h-9 text-sm ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}>
                        <SelectValue placeholder="Select Bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Banks</SelectItem>
                        {allBankNames.map((bank) => (
                          <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Agreement Status</label>
                    <Select value={agreementFilter} onValueChange={setAgreementFilter}>
                      <SelectTrigger className={`w-full h-9 text-sm ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agreements</SelectItem>
                        <SelectItem value="sent">Agreement Sent</SelectItem>
                        <SelectItem value="not_sent">Agreement Not Sent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>From Date</label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      max={toDate}
                      className={`h-9 text-sm ${
                        theme === "dark" 
                          ? "bg-gray-900 border-gray-700 text-gray-200" 
                          : "bg-white border-gray-200 text-gray-900"
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>To Date</label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      min={fromDate}
                      className={`h-9 text-sm ${
                        theme === "dark" 
                          ? "bg-gray-900 border-gray-700 text-gray-200" 
                          : "bg-white border-gray-200 text-gray-900"
                      }`}
                    />
                  </div>
                  
                  {/* Bulk Select by Number Input */}
                  {userRole !== "billcut" && userRole !== "assistant" && (
                    <div className="space-y-1.5">
                       <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Bulk Select Top N</label>
                       <div className="flex gap-2">
                         <Input
                           placeholder="Count"
                           value={bulkSelectNumber}
                           onChange={(e) => setBulkSelectNumber(e.target.value)}
                           onKeyPress={handleBulkSelectKeyPress}
                           className={`h-9 text-sm ${theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}
                           type="number"
                           min="1"
                         />
                         <Button 
                           onClick={handleBulkSelectByNumber}
                           disabled={!bulkSelectNumber.trim()}
                           className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
                         >
                           Select
                         </Button>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Content Area */}
        {loading ? (
             <div className="flex-1 flex justify-center items-center h-[50vh]">
               <div className="flex flex-col items-center">
                 <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
                 <p className={`mt-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Loading clients...</p>
               </div>
             </div>
        ) : error ? (
             <div className="flex-1 flex justify-center items-center h-[50vh]">
               <div className="text-red-500 text-center">{error}</div>
             </div>
        ) : (
          <>
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
              appStatuses={appStatuses}
              onAppStatusChange={handleAppStatusChange}
              onSaveAppStatus={handleSaveAppStatus}
              onViewAppStatusHistory={handleViewAppStatusHistory}
            />
            <div ref={loadMoreRef} className="flex h-8 items-center justify-center">
              {isFetchingMore ? (
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
          </>
        )}

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
                  <div className={`text-center py-8 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                    No remarks history available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* App Status History Modal */}
        {isAppStatusHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div
              className={`${theme === "dark" ? "bg-gray-900" : "bg-white"} rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-300"} p-4 w-full max-w-2xl animate-fade-in shadow-xl`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-bold ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                  App Status History
                </h2>
                <button
                  onClick={() => setIsAppStatusHistoryModalOpen(false)}
                  className={`rounded-full h-8 w-8 flex items-center justify-center ${theme === "dark" ? "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800"} transition-colors`}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {[...selectedAppStatusHistory].reverse().map((history, index) => (
                  <div
                    key={index}
                    className={`${theme === "dark" ? "bg-gray-800" : "bg-gray-50"} rounded p-3 relative group`}
                  >
                    <div className="flex justify-between items-start mb-1 pr-8">
                      <span className={`font-medium text-xs ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                        {history.createdBy}
                      </span>
                      <span className={`text-[10px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                        {new Date(history.createdAt * 1000).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      {history.remarks}
                    </p>
                    <button
                      onClick={() => handleDeleteAppStatus(history)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="Delete Status"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {selectedAppStatusHistory.length === 0 && (
                  <div className={`text-center py-8 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                    No app status history available
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
