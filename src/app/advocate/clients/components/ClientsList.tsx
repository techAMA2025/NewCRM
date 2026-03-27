"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import { Spinner } from "@/components/ui/spinner"
import ClientEditModal from "@/components/clients/ClientEditModal"
import RequestLetterForm from "../requestletter"
import DemandNoticeForm from "../demandnotice"
import ComplaintForHarassmentForm from "../cfhab"
import VakalatnamaPDFForm from "../../documents/VakalatnamaPDFForm"
import DocumentEditor from "../DocumentEditor"
import { useClients } from "../hooks/userClient"
import { getWeekFromStartDate } from "../utils/formatters"
import type { FilterState, RemarkHistory } from "../types/client"
import FiltersSection from "../components/FiltersSection"
import ClientsTable from "../components/ClientsTable"
import ClientMobileCard from "../components/ClientMobileCard"
import ClientViewModal from "../components/ClientViewModal"
import DocumentViewer from "../components/DocumentViewer"

// Import Client type from ClientEditModal to ensure compatibility
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

export default function ClientsList() {
  const [advocateName, setAdvocateName] = useState<string>("")
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    statusFilter: "all",
    sourceFilter: "all",
    assignmentFilter: "primary",
    cityFilter: "all",
    weekFilter: "all",
  })

  // Modal states
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false)
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState("")
  const [viewingDocumentName, setViewingDocumentName] = useState("")

  // Document generation modals
  const [isRequestLetterModalOpen, setIsRequestLetterModalOpen] = useState(false)
  const [isLegalNoticeModalOpen, setIsLegalNoticeModalOpen] = useState(false)
  const [isDemandNoticeModalOpen, setIsDemandNoticeModalOpen] = useState(false)
  const [isHarassmentComplaintModalOpen, setIsHarassmentComplaintModalOpen] = useState(false)
  const [isVakalatnamaModalOpen, setIsVakalatnamaModalOpen] = useState(false)
  const [selectedClientForDoc, setSelectedClientForDoc] = useState<Client | null>(null)

  // History modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedClientHistory, setSelectedClientHistory] = useState<RemarkHistory[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>("")

  // App Status History modal
  const [isAppStatusHistoryModalOpen, setIsAppStatusHistoryModalOpen] = useState(false)
  const [selectedAppStatusHistory, setSelectedAppStatusHistory] = useState<{
    index: string;
    remarks: string;
    createdAt: number;
    createdBy: string;
  }[]>([])

  // Document editor
  const [editingDocument, setEditingDocument] = useState<{
    url: string
    name: string
    index: number
    clientId?: string
  } | null>(null)

  // WATI Phone Selection Modal
  const [showPhoneSelectionModal, setShowPhoneSelectionModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedClientForWATI, setSelectedClientForWATI] = useState<Client | null>(null)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)

  const searchParams = useSearchParams()

  const {
    clients,
    loading,
    latestRemarks,
    updateClientStatus,
    updateRequestLetterStatus,
    updateAgreementStatus,
    saveRemark,
    saveAppStatus,
    deleteAppStatus,
    fetchClientHistory,
    setClients,
    facets,
  } = useClients(advocateName)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userName = localStorage.getItem("userName")
      setAdvocateName(userName || "")

      const status = searchParams.get("status")
      if (status && ["Active", "Dropped", "Not Responding", "On Hold"].includes(status)) {
        setFilters((prev) => ({ ...prev, statusFilter: status }))
      }
    }
  }, [searchParams])

  // Client-side filtering restored for real-time updates
  const getFilteredClients = () => {
    return clients
      .filter((client: Client) => {
        const matchesSearch =
          filters.searchQuery === "" ||
          client.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
          client.phone.includes(filters.searchQuery) ||
          client.email.toLowerCase().includes(filters.searchQuery.toLowerCase())

        const matchesStatus =
          filters.statusFilter === "all" ||
          (filters.statusFilter === "Inactive" && !client.adv_status) ||
          client.adv_status === filters.statusFilter

        const matchesSource = filters.sourceFilter === "all" || client.source_database === filters.sourceFilter

        const matchesAssignment =
          filters.assignmentFilter === "all" ||
          (filters.assignmentFilter === "primary" && client.isPrimary) ||
          (filters.assignmentFilter === "secondary" && client.isSecondary) ||
          (filters.assignmentFilter === "both" && client.isPrimary && client.isSecondary)

        const matchesCity = filters.cityFilter === "all" || client.city === filters.cityFilter

        const matchesWeek =
          filters.weekFilter === "all" ||
          (() => {
            const clientWeek = getWeekFromStartDate(client.startDate)
            return clientWeek.toString() === filters.weekFilter
          })()

        return matchesSearch && matchesStatus && matchesSource && matchesAssignment && matchesCity && matchesWeek
      })
      .sort((a: Client, b: Client) => {
        const dateA = typeof a.startDate === "string" ? new Date(a.startDate).getTime() : 0
        const dateB = typeof b.startDate === "string" ? new Date(b.startDate).getTime() : 0
        return dateB - dateA
      })
  }

  const filteredClients = getFilteredClients()

  const uniqueCities = facets.cities
  const uniqueSources = facets.sources

  const getWeekStats = () => {
    // Use clients directly as it is already filtered
    const stats = { week1: 0, week2: 0, week3: 0, week4: 0, unknown: 0 }
    
    clients.forEach((client) => {
      const week = getWeekFromStartDate(client.startDate)
      switch (week) {
        case 1:
          stats.week1++
          break
        case 2:
          stats.week2++
          break
        case 3:
          stats.week3++
          break
        case 4:
          stats.week4++
          break
        default:
          stats.unknown++
      }
    })

    return stats
  }

  // Event handlers
  const handleViewDetails = (client: Client) => {
    setViewClient(client)
    setIsViewModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setEditClient(client)
    setIsEditModalOpen(true)
  }

  const handleClientUpdated = (updatedClient: Client) => {
    setClients((prevClients) => prevClients.map((client) => (client.id === updatedClient.id ? updatedClient : client)))

    if (viewClient?.id === updatedClient.id) {
      setViewClient(updatedClient)
    }
  }

  const openDocumentViewer = (url?: string, name?: string) => {
    if (!url) return
    setViewingDocumentUrl(url)
    setViewingDocumentName(name || "Document")
    setIsDocViewerOpen(true)
  }

  const openRequestLetterModal = (client: Client) => {
    setSelectedClientForDoc(client)
    setIsRequestLetterModalOpen(true)
  }

  const openLegalNoticeModal = (client: Client) => {
    setSelectedClientForDoc(client)
    setIsLegalNoticeModalOpen(true)
  }

  const openDemandNoticeModal = (client: Client) => {
    setSelectedClientForDoc(client)
    setIsDemandNoticeModalOpen(true)
  }

  const openHarassmentComplaintModal = (client: Client) => {
    setSelectedClientForDoc(client)
    setIsHarassmentComplaintModalOpen(true)
  }

  const openVakalatnamaModal = (client: Client) => {
    setSelectedClientForDoc(client)
    setIsVakalatnamaModalOpen(true)
  }

  const openDocumentEditor = (url: string, name: string, index: number, clientId: string) => {
    setEditingDocument({ url, name, index, clientId })
  }

  const openBillCutDocument = (client: Client) => {
    const cleanName = encodeURIComponent(client.name.replace(/[^a-zA-Z0-9\s]/g, "").trim())
    const billCutUrl = `https://firebasestorage.googleapis.com/v0/b/amacrm-76fd1.firebasestorage.app/o/clients%2Fbillcut%2Fdocuments%2F${cleanName}_billcut_agreement.docx?alt=media&token=fdc2eb03-04e9-4343-b8a6-6129f460823b`
    const documentName = `${client.name} - BillCut Agreement`

    fetch(billCutUrl, { method: "HEAD" })
      .then((response) => {
        if (response.ok) {
          openDocumentViewer(billCutUrl, documentName)
        } else {
          toast.error("BillCut agreement document not found for this client")
        }
      })
      .catch(() => {
        toast.error("Unable to access BillCut agreement document")
      })
  }

  const handleViewHistory = async (clientId: string) => {
    const history = await fetchClientHistory(clientId)
    setSelectedClientHistory(history)
    setSelectedClientId(clientId)
    setIsHistoryModalOpen(true)
  }

  const handleViewAppStatusHistory = (client: Client) => {
    setSelectedAppStatusHistory(client.client_app_status || [])
    // We need to store the client ID to know which client to update
    setSelectedClientId(client.id) 
    setIsAppStatusHistoryModalOpen(true)
  }

  const handleDeleteAppStatus = async (statusItem: any) => {
    if (!selectedClientId) return
    
    if (confirm("Are you sure you want to delete this status?")) {
      await deleteAppStatus(selectedClientId, statusItem)
      // Update the modal's local state to reflect deletion immediately
      setSelectedAppStatusHistory((prev) => 
        prev.filter((item) => item.index !== statusItem.index || item.createdAt !== statusItem.createdAt)
      )
    }
  }

  // WATI Functions
  const handleTemplateSelect = (templateName: string, client: Client) => {
    setSelectedTemplate(templateName)
    setSelectedClientForWATI(client)
    setShowPhoneSelectionModal(true)
  }

  const sendWhatsAppMessage = async (templateName: string, phoneNumber: string) => {
    if (!phoneNumber || !selectedClientForWATI) {
      toast.error("No phone number available")
      return
    }

    setIsSendingWhatsApp(true)
    setShowPhoneSelectionModal(false)

    try {
      const { httpsCallable } = await import("firebase/functions")
      const { functions } = await import("@/firebase/firebase")
      const sendClientWhatsappMessageFn = httpsCallable(functions, "sendClientWhatsappMessage")

      // Format phone number to ensure it's in the correct format
      let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/[()-]/g, "")
      if (formattedPhone.startsWith("+91")) {
        formattedPhone = formattedPhone.substring(3)
      }
      if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
        formattedPhone = "91" + formattedPhone
      }

      const messageData = {
        phoneNumber: formattedPhone,
        templateName: templateName,
        clientId: selectedClientForWATI.id,
        userId: localStorage.getItem("userName") || "Unknown",
        userName: localStorage.getItem("userName") || "Unknown",
        message: `Template message: ${templateName}`,
        customParams: [
          { name: "name", value: selectedClientForWATI.name || "Customer" },
          { name: "Channel", value: "AMA Legal Solutions" },
          { name: "agent_name", value: localStorage.getItem("userName") || "Agent" },
          { name: "customer_mobile", value: formattedPhone }
        ],
        channelNumber: "919289622596",
        broadcastName: `${templateName}_${Date.now()}`
      }

      const result = await sendClientWhatsappMessageFn(messageData)

      if (result.data && (result.data as any).success) {
        toast.success(`WhatsApp message sent successfully using "Send Feedback Message" template`)
      } else {
        console.log("Success check failed. Result data:", result.data)
        toast.error("Failed to send WhatsApp message")
      }
    } catch (error: any) {
      console.error("Error sending WhatsApp message:", error)
      const errorMessage = error.message || error.details || "Unknown error"
      toast.error(`Failed to send WhatsApp message: ${errorMessage}`)
    } finally {
      setIsSendingWhatsApp(false)
      setSelectedClientForWATI(null)
    }
  }

  const handlePhoneSelection = (phoneNumber: string) => {
    sendWhatsAppMessage(selectedTemplate, phoneNumber)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  // filteredClients is now just clients (filtered from server)
  // uniqueCities and uniqueSources come from facets
  // weekStats needs to be calculated on the client based on the filtered list (or server could do it, but client is fine for now)
  const weekStats = getWeekStats()

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-gray-900">
      <div className="p-3 md:p-6 overflow-y-auto flex-1">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            MY CLIENTS <span className="ml-2 text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-lg text-sm">{clients.length}</span>
          </h1>
        </div>

        <FiltersSection
          filters={filters}
          onFiltersChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
          uniqueCities={uniqueCities}
          uniqueSources={uniqueSources}
          weekStats={weekStats}
          totalClients={clients.length}
          filteredCount={filteredClients.length}
        />

        <div className="mt-4 hidden md:block overflow-x-auto">
          <ClientsTable
            clients={filteredClients}
            latestRemarks={latestRemarks}
            onStatusChange={updateClientStatus}
            onRequestLetterChange={updateRequestLetterStatus}
            onAgreementToggle={updateAgreementStatus}
            onRemarkSave={saveRemark}
            onAppStatusSave={saveAppStatus}
            onViewHistory={handleViewHistory}
            onViewAppStatusHistory={handleViewAppStatusHistory}
            onViewDetails={handleViewDetails}
            onEditClient={handleEditClient}
            onTemplateSelect={handleTemplateSelect}
            openDocumentViewer={openDocumentViewer}
            isSendingWhatsApp={isSendingWhatsApp}
          />
        </div>

        {/* Mobile View */}
        <div className="mt-4 md:hidden space-y-4">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <ClientMobileCard
                key={client.id}
                client={client}
                requestLetterState={client.request_letter || false}
                latestRemark={latestRemarks[client.id] || ""}
                onStatusChange={updateClientStatus}
                onRequestLetterChange={updateRequestLetterStatus}
                onRemarkSave={saveRemark}
                onAppStatusSave={saveAppStatus}
                onViewHistory={handleViewHistory}
                onViewAppStatusHistory={handleViewAppStatusHistory}
                onViewDetails={handleViewDetails}
                onEditClient={handleEditClient}
                onTemplateSelect={handleTemplateSelect}
                isSendingWhatsApp={isSendingWhatsApp}
              />
            ))
          ) : (
            <div className="text-center p-6 bg-gray-800 rounded-lg">
              <p className="text-gray-300 text-sm">No clients match your search criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClientViewModal
        client={viewClient}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        openDocumentViewer={openDocumentViewer}
        openRequestLetterModal={openRequestLetterModal}
        openLegalNoticeModal={openLegalNoticeModal}
        openDemandNoticeModal={openDemandNoticeModal}
        openHarassmentComplaintModal={openHarassmentComplaintModal}
        openDocumentEditor={openDocumentEditor}
        openBillCutDocument={openBillCutDocument}
        openVakalatnamaModal={openVakalatnamaModal}
      />

      <ClientEditModal
        client={editClient}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onClientUpdated={handleClientUpdated}
      />

      <DocumentViewer
        isOpen={isDocViewerOpen}
        documentUrl={viewingDocumentUrl}
        documentName={viewingDocumentName}
        onClose={() => setIsDocViewerOpen(false)}
      />

      {/* WATI Phone Selection Modal */}
      {showPhoneSelectionModal && selectedClientForWATI && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Select Phone Number</h2>
              <button
                onClick={() => {
                  setShowPhoneSelectionModal(false)
                  setSelectedClientForWATI(null)
                }}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300 text-sm mb-4">
                Choose which phone number to send the WhatsApp message to:
              </p>
              
              <div className="space-y-3">
                {selectedClientForWATI.phone && (
                  <button
                    onClick={() => handlePhoneSelection(selectedClientForWATI.phone)}
                    disabled={isSendingWhatsApp}
                    className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-left">
                      <div className="text-white font-medium">Primary Phone</div>
                      <div className="text-gray-400 text-sm">{selectedClientForWATI.phone}</div>
                    </div>
                  </button>
                )}
                
                {selectedClientForWATI.altPhone && (
                  <button
                    onClick={() => handlePhoneSelection(selectedClientForWATI.altPhone)}
                    disabled={isSendingWhatsApp}
                    className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-left">
                      <div className="text-white font-medium">Alternate Phone</div>
                      <div className="text-gray-400 text-sm">{selectedClientForWATI.altPhone}</div>
                    </div>
                  </button>
                )}
              </div>
              
              {!selectedClientForWATI.phone && !selectedClientForWATI.altPhone && (
                <div className="text-center text-gray-400 py-8">
                  No phone numbers available for this client
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Generation Modals */}
      {isRequestLetterModalOpen && selectedClientForDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white">Generate Request Letter</h2>
              <button
                onClick={() => setIsRequestLetterModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <RequestLetterForm client={selectedClientForDoc} onClose={() => setIsRequestLetterModalOpen(false)} />
          </div>
        </div>
      )}

      {isDemandNoticeModalOpen && selectedClientForDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white">Generate Demand Notice</h2>
              <button
                onClick={() => setIsDemandNoticeModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <DemandNoticeForm client={selectedClientForDoc} onClose={() => setIsDemandNoticeModalOpen(false)} />
          </div>
        </div>
      )}

      {isHarassmentComplaintModalOpen && selectedClientForDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white">Complaint For Harassment Against Banks</h2>
              <button
                onClick={() => setIsHarassmentComplaintModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <ComplaintForHarassmentForm
              client={selectedClientForDoc}
              onClose={() => setIsHarassmentComplaintModalOpen(false)}
            />
          </div>
        </div>
      )}

      {isVakalatnamaModalOpen && selectedClientForDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white">Generate Vakalatnama</h2>
              <button
                onClick={() => setIsVakalatnamaModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <VakalatnamaPDFForm 
                initialClient={selectedClientForDoc} 
                onClose={() => setIsVakalatnamaModalOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-2xl animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Remark History</h2>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedClientHistory.map((history, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-purple-400 font-medium">{history.advocateName}</span>
                    <span className="text-gray-400 text-sm">
                      {history.timestamp?.toDate?.()?.toLocaleString("en-IN") || "Unknown date"}
                    </span>
                  </div>
                  <p className="text-white">{history.remark}</p>
                </div>
              ))}
              {selectedClientHistory.length === 0 && (
                <div className="text-center text-gray-400 py-8">No remarks history available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* App Status History Modal */}
      {isAppStatusHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-2xl animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">App Status History</h2>
              <button
                onClick={() => setIsAppStatusHistoryModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {[...selectedAppStatusHistory].reverse().map((history, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700 relative group">
                  <div className="flex justify-between items-start mb-2 pr-8">
                    <span className="text-blue-400 font-medium">{history.createdBy}</span>
                    <span className="text-gray-400 text-sm">
                      {new Date(history.createdAt * 1000).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-white">{history.remarks}</p>
                  <button
                    onClick={() => handleDeleteAppStatus(history)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Delete Status"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {selectedAppStatusHistory.length === 0 && (
                <div className="text-center text-gray-400 py-8">No app status history available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Editor Modal */}
      {editingDocument && (
        <DocumentEditor
          documentUrl={editingDocument.url}
          documentName={editingDocument.name}
          documentIndex={editingDocument.index}
          clientId={editingDocument.clientId || viewClient?.id || ""}
          onClose={() => setEditingDocument(null)}
          onDocumentUpdated={() => {
            if (viewClient) {
              setViewClient({ ...viewClient })
            }
          }}
        />
      )}

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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
