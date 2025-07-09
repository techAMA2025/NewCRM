export interface Client {
  id: string
  name: string
  phone: string
  email: string
  status: string
  city: string
  occupation: string
  aadharNumber: string
  panNumber?: string
  assignedTo: string
  alloc_adv?: string
  alloc_adv_at?: any
  alloc_adv_secondary?: string
  convertedAt?: any
  convertedFromLead?: boolean
  creditCardDues?: string
  lastModified?: any
  leadId: string
  monthlyFees?: string
  monthlyIncome?: string
  personalLoanDues?: string
  remarks?: string
  salesNotes?: string
  source_database?: string
  startDate: string
  tenure?: string
  banks?: Array<{
    id: string;
    accountNumber: string;
    bankName: string;
    loanAmount: string;
    loanType: string;
  }>
  adv_status?: string
  documentUrl?: string
  documentName?: string
  documentUploadedAt?: any
  dob?: string
  message: string
  latestRemark?: {
    remark: string;
    advocateName: string;
    timestamp: any;
  }
} 