import { Timestamp } from 'firebase/firestore'

// Define possible user roles
export type UserRole = 'admin' | 'sales' | 'advocate'

// Define interfaces for lead data
export interface Lead {
  id?: string
  name: string
  email: string
  phone: string
  status: string
  assignedTo: string
  remarks: string
  lastModified: Timestamp | Date
  // Financial details
  personalLoanDues?: string
  creditCardDues?: string
  monthlyIncome?: string | number
  // Metadata
  original_id: string
  original_collection: string
  source_database: string
  synced_at: Timestamp
  // Additional properties from different sources
  city?: string
  City?: string
  message?: string
  queries?: string
  Queries?: string
  banks?: any[]
  // Additional client fields
  occupation?: string
  aadharNumber?: string
  tenure?: string | number
  monthlyFees?: string | number
  startDate?: string
  salesNotes?: string
  // BillCut specific fields
  address?: string
  debt_range?: string
  category?: string
  sales_notes?: string
  // AMA specific fields
  date?: number
  synced_date?: number
  // String index signature for other dynamically accessed properties
  [key: string]: any
}