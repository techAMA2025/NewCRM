export interface Bank {
    id: string
    bankName: string
    accountNumber: string
    loanType: string
    loanAmount: string
    settled?: boolean
  }
  
  export interface Client {
    id: string
    name: string
    phone: string
    altPhone?: string
    email: string
    city: string
    alloc_adv: string
    alloc_adv_secondary?: string
    alloc_adv_secondary_at?: any
    assignedTo: string
    status: string
    personalLoanDues: string
    creditCardDues: string
    banks: Bank[]
    monthlyIncome?: string
    monthlyFees?: string
    occupation?: string
    startDate?: any
    tenure?: string
    remarks?: string
    salesNotes?: string
    queries?: string
    alloc_adv_at?: any
    convertedAt?: any
    createdAt?: any
    lastModified?: any
    lastUpdated?: any
    adv_status?: string
    isPrimary: boolean
    isSecondary: boolean
    documentUrl?: string
    documentName?: string
    documentUploadedAt?: any
    source_database?: string
    request_letter?: boolean
    sentAgreement?: boolean
    convertedFromLead?: boolean
    leadId?: string
    dob?: string
    panNumber?: string
    aadharNumber?: string
    documents?: {
      type: string
      bankName?: string
      accountType?: string
      createdAt?: string
      url?: string
      name?: string
      lastEdited?: string
      htmlUrl?: string
    }[]
  }
  
  export interface RemarkHistory {
    remark: string
    timestamp: any
    advocateName: string
  }
  
  export interface FilterState {
    searchQuery: string
    statusFilter: string
    sourceFilter: string
    assignmentFilter: string
    cityFilter: string
    weekFilter: string
  }
  