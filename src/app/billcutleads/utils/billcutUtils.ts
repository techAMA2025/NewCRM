import { Lead } from "../types"

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
