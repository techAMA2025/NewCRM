export type HistoryItem = {
  content: string;
  createdAt: any; // Firestore Timestamp
  createdBy: string;
  createdById: string;
  displayDate?: string; // Optional to match usage pattern
  leadId: string;
  assignedById: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  source_database: string;
  assignedTo: string;
  personalLoanDues: string;
  creditCardDues: string;
  monthlyIncome: string;
  remarks: string;
  salesNotes: string;
  lastModified: Date;
  date: number;
  convertedToClient: boolean;
  bankNames: string[];
  totalEmi: string;
  occupation: string;
  loanTypes: string[];
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  name: string; // Required for compatibility
};

export type EditingLeadsState = {
  [key: string]: Partial<Lead>;
};

export type SortDirection = 'ascending' | 'descending'; 