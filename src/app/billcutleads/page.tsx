"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { toast } from "react-toastify"

// Import Components
import BillcutLeadsHeader from "./components/BillcutLeadsHeader"
import BillcutLeadsFilters from "./components/BillcutLeadsFilters"
import BillcutLeadsTable from "./components/BillcutLeadsTable"
import BillcutLeadsTabs from "./components/BillcutLeadsTabs"
import BillcutSalespersonCards from "./components/BillcutSalespersonCards"
import BillcutModalsContainer from "./components/BillcutModalsContainer"
import AdminSidebar from "@/components/navigation/AdminSidebar"
import SalesSidebar from "@/components/navigation/SalesSidebar"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import BillcutSidebar from "@/components/navigation/BillcutSidebar"

// Import hooks & utils
import { useBillcutAuthTeam } from "./hooks/useBillcutAuthTeam"
import { useBillcutLeads } from "./hooks/useBillcutLeads"
import { useBillcutLeadActions } from "./hooks/useBillcutLeadActions"
import { statusOptions, normalizeUserName } from "./utils/billcutUtils"
import { Lead } from "./types"

const BillCutLeadsPage = () => {
  // 1. Auth & Team State
  const { currentUser, userRole, teamMembers, salesTeamMembers } = useBillcutAuthTeam()

  // 2. Leads & Filter State
  const leadsState = useBillcutLeads(userRole)
  const {
    leads, setLeads,
    searchResults, setSearchResults,
    isLoading, isLoadingMore, isSearching, isLoadAllLoading,
    hasMoreLeads, totalFilteredCount, setTotalFilteredCount,
    statusFilter, setStatusFilter,
    salesPersonFilter, setSalesPersonFilter,
    showMyLeads, setShowMyLeads,
    fromDate, setFromDate,
    toDate, setToDate,
    activeTab, setActiveTab,
    debtRangeSort, setDebtRangeSort,
    convertedFromDate, setConvertedFromDate,
    convertedToDate, setConvertedToDate,
    lastModifiedFromDate, setLastModifiedFromDate,
    lastModifiedToDate, setLastModifiedToDate,
    searchQuery, setSearchQuery,
    fetchBillcutLeads, loadAllLeads
  } = leadsState

  // 3. Modals State
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedHistoryLeadId, setSelectedHistoryLeadId] = useState<string | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  
  const [showLanguageBarrierModal, setShowLanguageBarrierModal] = useState(false)
  const [languageBarrierLeadId, setLanguageBarrierLeadId] = useState("")
  const [languageBarrierLeadName, setLanguageBarrierLeadName] = useState("")
  const [isEditingLanguageBarrier, setIsEditingLanguageBarrier] = useState(false)
  const [editingLanguageBarrierInfo, setEditingLanguageBarrierInfo] = useState("")
  
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [conversionLeadId, setConversionLeadId] = useState("")
  const [conversionLeadName, setConversionLeadName] = useState("")
  const [isConvertingLead, setIsConvertingLead] = useState(false)
  
  const [showBulkAssignment, setShowBulkAssignment] = useState(false)
  const [bulkAssignTarget, setBulkAssignTarget] = useState("")
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)
  
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // 4. Refs & Real-time Listeners (minimal)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const stickyLeadsRef = useRef<Set<string>>(new Set())

  // 5. Actions Hook
  const {
    updateLead,
    deleteLead,
    bulkAssignLeads,
    sendBulkWhatsApp,
    updateLeadOptimistic
  } = useBillcutLeadActions(
    leads, setLeads,
    searchResults, setSearchResults,
    statusFilter, setTotalFilteredCount,
    currentUser, stickyLeadsRef
  )

  // --- Handlers ---

  const handleSearchResults = (results: Lead[]) => {
    setSearchResults(results)
  }

  const fetchNotesHistory = async (leadId: string) => {
    setSelectedHistoryLeadId(leadId)
    setShowHistoryModal(true)
  }

  const handleStatusChangeToLanguageBarrier = (leadId: string, leadName: string) => {
    setLanguageBarrierLeadId(leadId)
    setLanguageBarrierLeadName(leadName)
    setIsEditingLanguageBarrier(false)
    setEditingLanguageBarrierInfo("")
    setShowLanguageBarrierModal(true)
  }

  const handleLanguageBarrierConfirm = async (language: string) => {
    const success = await updateLead(languageBarrierLeadId, {
      status: isEditingLanguageBarrier ? undefined : "Language Barrier",
      language_barrier: language
    })
    
    if (success) {
      toast.success(isEditingLanguageBarrier ? "Language Updated" : "Language Barrier Set")
    }
    setShowLanguageBarrierModal(false)
  }

  const handleEditLanguageBarrier = (lead: Lead) => {
    setLanguageBarrierLeadId(lead.id)
    setLanguageBarrierLeadName(lead.name || "Unknown Lead")
    setIsEditingLanguageBarrier(true)
    setEditingLanguageBarrierInfo(lead.language_barrier || "")
    setShowLanguageBarrierModal(true)
  }

  const handleStatusChangeToConverted = (leadId: string, leadName: string) => {
    setConversionLeadId(leadId)
    setConversionLeadName(leadName)
    setShowConversionModal(true)
  }

  const handleConversionConfirm = async () => {
    setIsConvertingLead(true)
    const success = await updateLead(conversionLeadId, { status: "Converted" })
    if (success) toast.success("Lead Converted Successfully")
    setIsConvertingLead(false)
    setShowConversionModal(false)
  }

  const handleBulkAssign = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to assign")
      return
    }
    setShowBulkAssignment(true)
  }

  const executeBulkAssign = async () => {
    if (!bulkAssignTarget) {
      toast.error("Please select a salesperson")
      return
    }
    const person = teamMembers.find(m => m.name === bulkAssignTarget)
    if (!person) return

    setIsBulkAssigning(true)
    const success = await bulkAssignLeads(selectedLeads, bulkAssignTarget, person.id)
    if (success) {
      setSelectedLeads([])
      setShowBulkAssignment(false)
      fetchBillcutLeads(false)
    }
    setIsBulkAssigning(false)
  }

  const handleExportToCSV = () => {
    const csvData = leads.map((lead) => ({
      Name: lead.name || "",
      Email: lead.email || "",
      Phone: lead.phone || "",
      City: lead.city || "",
      Status: lead.status || "",
      Source: lead.source_database || "",
      "Assigned To": lead.assignedTo || "Unassigned",
      "Monthly Income": lead.monthlyIncome || "",
      "Sales Notes": lead.salesNotes || "",
      "Last Modified": lead.lastModified?.toLocaleString() || "",
    }))

    if (csvData.length === 0) return toast.info("No data to export")

    const headers = Object.keys(csvData[0]).join(",")
    const rows = csvData.map((obj) =>
      Object.values(obj).map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
    )
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `billcut-leads-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  // --- Infinite Scroll Setup ---
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreLeads && !isLoadingMore && !isLoading && !searchQuery.trim() && !isLoadAllLoading) {
          fetchBillcutLeads(true)
        }
      },
      { threshold: 0.1 }
    )
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMoreLeads, isLoadingMore, isLoading, fetchBillcutLeads, searchQuery, isLoadAllLoading])

  const callbackCount = useMemo(() => {
    const curName = typeof window !== "undefined" ? localStorage.getItem("userName") : ""
    return leads.filter(l => l.status === "Callback" && (
      userRole === "admin" || userRole === "overlord" || normalizeUserName(l.assignedTo) === normalizeUserName(curName || "")
    )).length
  }, [leads, userRole])

  const SidebarComponent = useMemo(() => {
    if (userRole === "admin") return AdminSidebar
    if (userRole === "overlord") return OverlordSidebar
    if (userRole === "billcut") return BillcutSidebar
    return SalesSidebar
  }, [userRole])

  return (
    <div className="flex h-screen bg-[#0b1437] overflow-hidden">
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        {SidebarComponent && <SidebarComponent />}
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      <div className="flex-1 overflow-auto bg-[#0b1437] relative custom-scrollbar">
        <div className="p-4 md:p-8 max-w-8xl mx-auto">
          <BillcutLeadsHeader
            isLoading={isLoading}
            userRole={userRole}
            currentUser={currentUser}
            exportToCSV={handleExportToCSV}
            loadAllLeads={loadAllLeads}
            isLoadAllLoading={isLoadAllLoading}
            onMenuToggle={() => setIsMobileSidebarOpen(true)}
          />

          {(userRole === "admin" || userRole === "overlord") && (
            <BillcutSalespersonCards
              onSalespersonClick={(name) => setSalesPersonFilter(prev => prev === name ? "all" : name)}
              activeSalesperson={salesPersonFilter !== "all" ? salesPersonFilter : undefined}
            />
          )}

          <BillcutLeadsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            callbackCount={callbackCount}
            allLeadsCount={totalFilteredCount}
          />

          <BillcutLeadsFilters
            {...leadsState}
            filteredLeads={leads}
            allLeadsCount={totalFilteredCount}
            statusOptions={statusOptions}
            userRole={userRole}
            salesTeamMembers={salesTeamMembers}
            selectedLeads={selectedLeads}
            onBulkAssign={handleBulkAssign}
            onBulkWhatsApp={() => setShowBulkWhatsAppModal(true)}
            onClearSelection={() => setSelectedLeads([])}
            onSearchResults={handleSearchResults}
            actualSearchResultsCount={searchResults.length}
          />

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            </div>
          ) : (
            <>
              <BillcutLeadsTable
                leads={searchQuery ? searchResults : leads}
                statusOptions={statusOptions}
                salesTeamMembers={salesTeamMembers}
                updateLead={updateLead}
                fetchNotesHistory={fetchNotesHistory}
                user={currentUser}
                showMyLeads={showMyLeads}
                selectedLeads={selectedLeads}
                onSelectLead={(id) => setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                onSelectAll={() => setSelectedLeads(selectedLeads.length === leads.length ? [] : leads.map(l => l.id))}
                activeTab={activeTab}
                refreshLeadCallbackInfo={async (id) => {
                  const info = await leadsState.fetchCallbackInfo(id)
                  updateLeadOptimistic(id, { callbackInfo: info })
                }}
                onStatusChangeToLanguageBarrier={handleStatusChangeToLanguageBarrier}
                onStatusChangeToConverted={handleStatusChangeToConverted}
                onEditLanguageBarrier={handleEditLanguageBarrier}
              />

              {hasMoreLeads && !searchQuery.trim() && (
                <div ref={loadMoreRef} className="flex justify-center items-center py-8">
                  {isLoadingMore ? <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400" /> : <div className="text-gray-400 text-sm">Scroll down to load more leads...</div>}
                </div>
              )}

              {!hasMoreLeads && !searchQuery.trim() && leads.length > 0 && (
                <div className="flex justify-center items-center py-4 text-gray-400 text-sm">All leads loaded ({leads.length} total)</div>
              )}
            </>
          )}

          <BillcutModalsContainer
            showHistoryModal={showHistoryModal}
            setShowHistoryModal={setShowHistoryModal}
            selectedHistoryLeadId={selectedHistoryLeadId}
            leads={leads}
            searchResults={searchResults}
            showLanguageBarrierModal={showLanguageBarrierModal}
            languageBarrierLeadId={languageBarrierLeadId}
            languageBarrierLeadName={languageBarrierLeadName}
            editingLanguageBarrierInfo={editingLanguageBarrierInfo}
            onLanguageBarrierClose={() => setShowLanguageBarrierModal(false)}
            onLanguageBarrierConfirm={handleLanguageBarrierConfirm}
            showConversionModal={showConversionModal}
            conversionLeadName={conversionLeadName}
            isConvertingLead={isConvertingLead}
            onConversionClose={() => setShowConversionModal(false)}
            onConversionConfirm={handleConversionConfirm}
            showBulkWhatsAppModal={showBulkWhatsAppModal}
            setShowBulkWhatsAppModal={setShowBulkWhatsAppModal}
            selectedLeads={selectedLeads}
            onSendBulkWhatsApp={async (template, ids, data) => {
              await sendBulkWhatsApp(template, ids, data || [])
            }}
            showBulkAssignment={showBulkAssignment}
            userRole={userRole}
            teamMembers={teamMembers}
            bulkAssignTarget={bulkAssignTarget}
            setBulkAssignTarget={setBulkAssignTarget}
            onBulkAssignExecute={executeBulkAssign}
            onBulkAssignCancel={() => setShowBulkAssignment(false)}
          />
        </div>
      </div>
    </div>
  )
}

export default BillCutLeadsPage