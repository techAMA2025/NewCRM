export function formatIndianCurrency(amount: string | number | undefined): string {
    if (!amount) return "—"
  
    const amountStr = typeof amount === "string" ? amount : String(amount)
  
    if (amountStr.includes("-")) {
      const parts = amountStr.split("-")
      if (parts.length === 2) {
        const firstAmount = parts[0].trim().replace(/[^\d.]/g, "")
        const secondAmount = parts[1].trim().replace(/[^\d.]/g, "")
  
        if (firstAmount && secondAmount) {
          const formatter = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })
          const formattedFirst = formatter.format(Number(firstAmount))
          const formattedSecond = formatter.format(Number(secondAmount))
          return `${formattedFirst} - ${formattedSecond}`
        }
      }
    }
  
    const numericValue = amountStr.replace(/[^\d.]/g, "")
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    return formatter.format(Number(numericValue))
  }
  
  export function formatIndianPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, "")
  
    if (digits.length === 10) {
      return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`
    }
  
    if (digits.length === 12 && digits.startsWith("91")) {
      return `+${digits.substring(0, 2)} ${digits.substring(2, 7)} ${digits.substring(7)}`
    }
  
    return phone
  }
  
  export function formatIndianDate(date: any): string {
    if (!date) return "Not specified"
  
    if (date.toDate && typeof date.toDate === "function") {
      const dateObj = date.toDate()
      return dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }
  
    if (typeof date === "string") {
      const dateObj = new Date(date)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      }
      return date
    }
  
    return "Not specified"
  }
  
  export function getWeekFromStartDate(startDate: any): number {
    if (!startDate) return 0
  
    let dateObj: Date
    if (startDate.toDate && typeof startDate.toDate === "function") {
      dateObj = startDate.toDate()
    } else if (typeof startDate === "string") {
      dateObj = new Date(startDate)
    } else if (startDate instanceof Date) {
      dateObj = startDate
    } else {
      return 0
    }
  
    if (isNaN(dateObj.getTime())) return 0
  
    const dayOfMonth = dateObj.getDate()
    if (dayOfMonth >= 1 && dayOfMonth <= 7) return 1
    if (dayOfMonth >= 8 && dayOfMonth <= 14) return 2
    if (dayOfMonth >= 15 && dayOfMonth <= 21) return 3
    if (dayOfMonth >= 22 && dayOfMonth <= 31) return 4
    return 0
  }
  
  export function getWeekLabel(weekNumber: number): string {
    switch (weekNumber) {
      case 1:
        return "Week 1 (1-7)"
      case 2:
        return "Week 2 (8-14)"
      case 3:
        return "Week 3 (15-21)"
      case 4:
        return "Week 4 (22-31)"
      default:
        return "Unknown Week"
    }
  }
  
  export function isNewClient(startDate: any): boolean {
    if (!startDate) return false
  
    let dateObj: Date
    if (startDate.toDate && typeof startDate.toDate === "function") {
      dateObj = startDate.toDate()
    } else if (typeof startDate === "string") {
      dateObj = new Date(startDate)
    } else if (startDate instanceof Date) {
      dateObj = startDate
    } else {
      return false
    }
  
    if (isNaN(dateObj.getTime())) return false
  
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return dateObj >= oneWeekAgo
  }
  