export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  assignedTo: string;
  monthlyIncome: string;
  remarks: string;
  salesNotes: string;
  lastModified: Date;
  source_database: string;
  personalLoanDues: string;
  creditCardDues: string;
  convertedToClient: boolean;
  bankNames: string[];
  totalEmi: string;
  occupation: string;
  loanTypes: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface EditingLeadsState {
  [key: string]: Lead;
}

export interface HistoryItem {
  id: string;
  timestamp: Date;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  };
  userId: string;
}

export type SortDirection = 'ascending' | 'descending'; 