import { useCallback } from "react"
import { authFetch } from "@/lib/authFetch"
import { toast } from "react-toastify"
import { Lead } from "../types"
import { type User as FirebaseUser } from "firebase/auth"
import { normalizeUserName } from "../utils/billcutUtils"

export const useBillcutLeadActions = (
  leads: Lead[],
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>,
  searchResults: Lead[],
  setSearchResults: React.Dispatch<React.SetStateAction<Lead[]>>,
  statusFilter: string,
  setTotalFilteredCount: React.Dispatch<React.SetStateAction<number>>,
  currentUser: FirebaseUser | null,
  stickyLeadsRef: React.MutableRefObject<Set<string>>
) => {

  const updateLeadOptimistic = useCallback((id: string, updates: Partial<Lead>) => {
    stickyLeadsRef.current.add(id)

    const lead = leads.find((l: Lead) => l.id === id) || searchResults.find((l: Lead) => l.id === id)
    
    if (lead) {
      if (updates.status && updates.status !== lead.status) {
        const oldStatusMatches = statusFilter === "all" || lead.status === statusFilter
        const newStatusMatches = statusFilter === "all" || updates.status === statusFilter

        if (oldStatusMatches && !newStatusMatches) {
          setTotalFilteredCount((prev: number) => Math.max(0, prev - 1))
        }
        else if (!oldStatusMatches && newStatusMatches) {
          setTotalFilteredCount((prev: number) => prev + 1)
        }
      }
    }

    const updateFunction = (prev: Lead[]) => 
      prev.map((lead) => {
        if (lead.id === id) {
          const updatedLead = { ...lead, ...updates, lastModified: new Date() }
          if (lead.status === 'Converted' && updates.status && updates.status !== 'Converted') {
            updatedLead.convertedAt = null
          }
          return updatedLead
        }
        return lead
      })
    
    setLeads(updateFunction)
    setSearchResults(updateFunction)
  }, [leads, searchResults, statusFilter, setLeads, setSearchResults, setTotalFilteredCount, stickyLeadsRef])

  const sendAssignmentNotification = async (leadIds: string[], salespersonId: string) => {
    try {
      const token = await currentUser?.getIdToken()
      if (!token) return

      fetch("/api/leads/send-assignment-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadIds, salespersonId, collectionName: "billcutLeads" }),
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.attempted > 0) {
          console.log(`[WATI] Assignment notification sent to ${data.attempted} lead(s)`)
        }
      })
      .catch((err) => console.error("[WATI] Assignment notification error:", err))
    } catch (err) {
      console.error("[WATI] Failed to initiate assignment notification:", err)
    }
  }

  const updateLead = async (id: string, data: any) => {
    const originalLeads = [...leads];
    const originalSearchResults = [...searchResults];
    updateLeadOptimistic(id, data);

    try {
      const response = await authFetch("/api/bill-cut-leads/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id,
          data: data,
          userName: localStorage.getItem("userName")
        }),
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      toast.success("Lead updated successfully")
      return true
    } catch (error) {
      setLeads(originalLeads);
      setSearchResults(originalSearchResults);
      console.error("Error updating lead:", error)
      toast.error("Failed to update lead")
      return false
    }
  }

  const bulkAssignLeads = async (leadIds: string[], salesPersonName: string, salesPersonId: string) => {
    try {
      const response = await authFetch("/api/bill-cut-leads/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds,
          salesPersonName,
          salesPersonId,
          assignedBy: localStorage.getItem("userName") || "Admin"
        }),
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      toast.success(`Successfully assigned ${leadIds.length} leads`)
      return true
    } catch (error) {
      console.error("Error bulk assigning leads:", error)
      toast.error("Failed to assign leads")
      return false
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) return

    try {
      const response = await authFetch(`/api/bill-cut-leads/delete?leadId=${leadId}`, {
        method: "DELETE",
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setLeads((prev) => prev.filter((l) => l.id !== leadId))
      setSearchResults((prev) => prev.filter((l) => l.id !== leadId))
      toast.success("Lead deleted successfully")
      return true
    } catch (error) {
      console.error("Error deleting lead:", error)
      toast.error("Failed to delete lead")
      return false
    }
  }

  const sendBulkWhatsApp = async (templateName: string, leadIds: string[], receivers: any[]) => {
    const toastId = toast.loading(`Initiating bulk WhatsApp for ${leadIds.length} leads...`)

    try {
      const payload = {
        templateName,
        broadcastName: `${templateName}_billcut_bulk_${Date.now()}`,
        receivers,
        userId: currentUser?.uid || "Unknown",
        userName: currentUser?.displayName || localStorage.getItem("userName") || "Unknown",
        channelNumber: "919289622596"
      }

      const response = await authFetch("/api/bill-cut-leads/bulk-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      
      // Handle standard Callable response format (result wraps the actual return value)
      // or direct response if not using Callable wrapper
      const responseData = result.result || result
      const isSuccess = responseData.success === true

      if (isSuccess) {
        toast.update(toastId, {
          render: `Successfully initiated broadcast to ${receivers.length} leads.`,
          type: "success",
          isLoading: false,
          autoClose: 5000
        })
        return true
      } else {
        // Extract error message potentially hidden in objects
        const rawError = responseData.error || responseData.message || result.error || "Unknown error"
        const errorMessage = typeof rawError === 'object' ? JSON.stringify(rawError) : String(rawError)
        
        console.error("Bulk WhatsApp API Failure:", { result, responseData })
        
        toast.update(toastId, {
          render: `Failed: ${errorMessage}`,
          type: "error",
          isLoading: false,
          autoClose: 5000
        })
        return false
      }
    } catch (error: any) {
      console.error("Bulk WhatsApp error:", error)
      toast.update(toastId, {
        render: `Error: ${error.message || "Internal error"}`,
        type: "error",
        isLoading: false,
        autoClose: 5000
      })
      return false
    }
  }

  return {
    updateLead,
    updateLeadOptimistic,
    deleteLead,
    bulkAssignLeads,
    sendBulkWhatsApp,
    sendAssignmentNotification
  }
}
