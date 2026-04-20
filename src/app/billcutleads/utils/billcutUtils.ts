import { Lead } from "../types"
import { resolveLeadState } from "./location"

// Helper to handle Firestore timestamps and other date types
const convertToIsoString = (dateVal: any): string => {
  if (!dateVal) return new Date().toISOString()
  if (typeof dateVal.toDate === "function") return dateVal.toDate().toISOString()
  if (dateVal instanceof Date) return dateVal.toISOString()
  if (typeof dateVal === "number") return new Date(dateVal).toISOString()
  if (typeof dateVal === "string") return new Date(dateVal).toISOString()
  return new Date().toISOString()
}

const convertToDate = (dateVal: any): Date => {
  if (!dateVal) return new Date()
  if (typeof dateVal.toDate === "function") return dateVal.toDate()
  if (dateVal instanceof Date) return dateVal
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? new Date() : d
}

export const processBillcutLead = (docId: string, data: any): Lead => {
  const getValidNote = (...notes: (string | undefined)[]) => {
    for (const note of notes) {
      if (note && note !== "-" && note !== "–" && note.trim() !== "") {
        return note
      }
    }
    return ""
  }

  const finalNote = getValidNote(data.latestRemark, data.salesNotes, data.sales_notes)

  return {
    id: docId,
    name: String(data.name || ""),
    email: String(data.email || ""),
    phone: String(data.mobile || data.phone || ""),
    city: resolveLeadState(data),
    status: String(data.category || "No Status"),
    source_database: "Bill Cut",
    assignedTo: String(data.assigned_to || ""),
    monthlyIncome: String(data.income || ""),
    salesNotes: finalNote,
    latestRemark: finalNote,
    lastModified: convertToDate(data.lastModified),
    date: Number(data.date || data.synced_date?.toDate?.()?.getTime() || Date.now()),
    debtRange: String(data.debt_range || "0"),
    maxDpd: Number(data.max_dpd || 0),
    convertedAt: data.convertedAt ? convertToDate(data.convertedAt) : null,
    callbackInfo: data.callbackInfo ? {
      ...data.callbackInfo,
      id: String(data.callbackInfo.id || ""),
      scheduled_dt: convertToDate(data.callbackInfo.scheduled_dt),
      scheduled_by: String(data.callbackInfo.scheduled_by || ""),
      created_at: data.callbackInfo.created_at
    } : null,
    statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
  }
}

// Constants
export const LEADS_PER_PAGE = 50
export const SEARCH_LEADS_LIMIT = 100

export const statusOptions = [
  "No Status",
  "Interested",
  "Not Interested",
  "Not Answering",
  "Callback",
  "Future Potential",
  "Converted",
  "Loan Required",
  "Short Loan",
  "Cibil Issue",
  "Language Barrier",
  "Retargeting",
  "Closed Lead",
]

// Date Utils
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const getDefaultFromDate = () => {
  const now = new Date()
  const fourDaysAgo = new Date(now)
  fourDaysAgo.setDate(now.getDate() - 4)
  return formatDateForInput(fourDaysAgo)
}

export const getDefaultToDate = () => {
  const now = new Date()
  return formatDateForInput(now)
}

// Normalization Utils
export const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-$$$$\+]/g, "")
}

export const normalizeUserName = (name: string): string => {
  return (name || "").trim().toLowerCase()
}

// Search Utils
export const createSearchTerms = (text: string): string[] => {
  if (!text) return []
  const normalized = text.toLowerCase().trim()
  const words = normalized.split(/\s+/)
  const terms = [normalized]
  
  words.forEach(word => {
    if (word.length > 1) {
      terms.push(word)
    }
  })
  
  return [...new Set(terms)]
}

// Logic Utils
export const getCallbackPriority = (lead: Lead): number => {
  if (!lead.callbackInfo || !lead.callbackInfo.scheduled_dt) {
    return 4 
  }

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(today.getDate() + 2)

  const scheduledDate = new Date(lead.callbackInfo.scheduled_dt)
  const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  const dayAfterTomorrowOnly = new Date(
    dayAfterTomorrow.getFullYear(),
    dayAfterTomorrow.getMonth(),
    dayAfterTomorrow.getDate(),
  )

  if (scheduledDateOnly.getTime() === todayOnly.getTime()) return 1
  if (scheduledDateOnly.getTime() === tomorrowOnly.getTime()) return 2
  if (scheduledDateOnly.getTime() >= dayAfterTomorrowOnly.getTime()) return 3
  return 4
}
/**
 * Helper to parse debt range string into a comparable numeric value (in Lakhs)
 */
export const parseDebtRangeToNumber = (range: any): number => {
  if (!range) return 0;
  const rangeStr = String(range).toLowerCase();
  const cleanRange = rangeStr.replace(/[₹,]/g, '').toLowerCase();
  
  // Example: "43 lakhs - 44 lakhs" -> take the start "43"
  const match = cleanRange.match(/(\d+\.?\d*)\s*(lakh|crore|cr)/);
  if (match) {
    let value = parseFloat(match[1]);
    const unit = match[2];
    if (unit.includes('crore') || unit === 'cr') value *= 100;
    return value;
  }
  
  const numMatch = cleanRange.match(/(\d+\.?\d*)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 0;
};
