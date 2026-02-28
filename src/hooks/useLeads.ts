import { useState, useCallback, useEffect } from "react"
import { toast } from "react-toastify"
import { useAuth } from "@/context/AuthContext"

export interface Lead {
    id: string
    name: string
    email: string
    phone: string
    mobile: string
    status: string
    source: string
    assignedTo?: string
    assignedToId?: string
    salesNotes?: string
    customerQuery?: string
    date: string | number
    synced_at?: string
    convertedAt?: string
    [key: string]: any
}

interface FetchParams {
    page?: number
    limit?: number
    search?: string
    status?: string
    source?: string
    salespersonId?: string
    tab?: string
    sort?: string
    order?: "asc" | "desc"
    startDate?: string
    endDate?: string
    convertedStartDate?: string
    convertedEndDate?: string
    lastModifiedStartDate?: string
    lastModifiedEndDate?: string
    debtRangeSort?: string
}

interface LeadsMeta {
    total: number
    page: number
    limit: number
    totalPages: number
}

interface Stats {
    total: number
    callback: number
    today: number
}

export const useLeads = () => {
    const { user } = useAuth()
    const [leads, setLeads] = useState<Lead[]>([])
    const [meta, setMeta] = useState<LeadsMeta>({ total: 0, page: 1, limit: 50, totalPages: 0 })
    const [stats, setStats] = useState<Stats>({ total: 0, callback: 0, today: 0 })
    const [isLoading, setIsLoading] = useState(false)
    const [isStatsLoading, setIsStatsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchLeads = useCallback(async (params: FetchParams, append: boolean = false) => {
        if (!user) return; // Don't fetch if not logged in

        setIsLoading(true)
        setError(null)
        try {
            const token = await user.getIdToken()
            const queryParams = new URLSearchParams()
            if (params.page) queryParams.set("page", params.page.toString())
            if (params.limit) queryParams.set("limit", params.limit.toString())
            if (params.search) queryParams.set("search", params.search)
            if (params.status && params.status !== "all") queryParams.set("status", params.status)
            if (params.source && params.source !== "all") queryParams.set("source", params.source)
            if (params.salespersonId && params.salespersonId !== "all") queryParams.set("salespersonId", params.salespersonId)
            if (params.tab) queryParams.set("tab", params.tab)
            if (params.sort) queryParams.set("sort", params.sort)
            if (params.order) queryParams.set("order", params.order)
            if (params.startDate) queryParams.set("startDate", params.startDate)
            if (params.endDate) queryParams.set("endDate", params.endDate)
            if (params.convertedStartDate) queryParams.set("convertedStartDate", params.convertedStartDate)
            if (params.convertedEndDate) queryParams.set("convertedEndDate", params.convertedEndDate)
            if (params.lastModifiedStartDate) queryParams.set("lastModifiedStartDate", params.lastModifiedStartDate)
            if (params.lastModifiedEndDate) queryParams.set("lastModifiedEndDate", params.lastModifiedEndDate)
            if (params.debtRangeSort) queryParams.set("debtRangeSort", params.debtRangeSort)

            const response = await fetch(`/api/leads?${queryParams.toString()}`, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'Authorization': `Bearer ${token}`
                }
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || "Failed to fetch leads")
            }

            const data = await response.json()

            if (append) {
                setLeads(prev => [...prev, ...data.leads])
            } else {
                setLeads(data.leads)
            }
            setMeta(data.meta)
            console.log(`[DEBUG] useLeads: Received ${data.leads.length} leads, Total available: ${data.meta.total}`)
        } catch (err) {
            console.error(err)
            const errorMessage = err instanceof Error ? err.message : "An error occurred"
            setError(errorMessage)

            if (errorMessage.toLowerCase().includes("index")) {
                toast.error("Database index missing. Check console for creation link.", { autoClose: 10000 })
            } else {
                toast.error("Failed to load leads: " + errorMessage)
            }

            if (!append) {
                setLeads([])
                setMeta({ total: 0, page: 1, limit: 50, totalPages: 0 })
            }
        } finally {
            setIsLoading(false)
        }
    }, [user])

    const fetchStats = useCallback(async (params: FetchParams) => {
        if (!user) return;
        setIsStatsLoading(true)
        try {
            const token = await user.getIdToken()
            const queryParams = new URLSearchParams()
            if (params.status && params.status !== "all") queryParams.set("status", params.status)
            if (params.source && params.source !== "all") queryParams.set("source", params.source)
            if (params.salespersonId && params.salespersonId !== "all") queryParams.set("salespersonId", params.salespersonId)
            if (params.tab) queryParams.set("tab", params.tab || "all")

            const response = await fetch(`/api/leads/stats?${queryParams.toString()}`, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'Authorization': `Bearer ${token}`
                }
            })
            if (!response.ok) throw new Error("Failed to fetch stats")

            const data = await response.json()
            setStats(data)
        } catch (err) {
            console.error(err)
            // Don't toast for stats error to avoid spamming
        } finally {
            setIsStatsLoading(false)
        }
    }, [user])

    const performAction = useCallback(async (action: string, leadIds: string[], payload: any = {}) => {
        if (!user) return false;
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/leads/actions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action, leadIds, payload }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Action failed")
            }

            return true
        } catch (err) {
            console.error(err)
            toast.error(err instanceof Error ? err.message : "Action failed")
            return false
        }
    }, [user])

    const [salespersons, setSalespersons] = useState<any[]>([])

    const fetchSalespersons = useCallback(async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/users/salespersons", {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'Authorization': `Bearer ${token}`
                }
            })
            if (!response.ok) throw new Error("Failed to fetch salespersons")
            const data = await response.json()
            setSalespersons(data)
        } catch (err) {
            console.error(err)
        }
    }, [user])

    return {
        leads,
        meta,
        stats,
        salespersons,
        isLoading,
        isStatsLoading,
        error,
        fetchLeads,
        fetchStats,
        fetchSalespersons,
        performAction,
        setLeads, // Expose setter for optimistic updates if needed
    }
}
