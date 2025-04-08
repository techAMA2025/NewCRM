// Client payment data structure
export interface ClientPayment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startDate: Date;
  tenure: number;
  monthlyFees: number;
  paidAmount: number;
  pendingAmount: number;
  paymentsCompleted: number;
  paymentsPending: number;
  advanceBalance: number;
  createdAt: Date;
  updatedAt: Date;
  weekOfMonth: number;
}

// Monthly payment record
export interface MonthlyPayment {
  id?: string;
  monthNumber: number;
  dueDate: Date;
  dueAmount: number;
  paidAmount?: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  paymentMethod?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment history record
export interface PaymentHistory {
  id: string;
  amount: number;
  date: Date;
  paymentMethod: string;
  transactionId: string;
  notes: string;
  type: 'full' | 'partial' | 'advance';
  monthNumber: number;
  createdAt: Date;
}

// New payment form data
export interface NewPaymentFormData {
  amount: number;
  paymentMethod: string;
  transactionId: string;
  notes: string;
  type: 'full' | 'partial' | 'advance';
  monthNumber: number;
  date: Date;
}

// Toast message structure
export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
} 