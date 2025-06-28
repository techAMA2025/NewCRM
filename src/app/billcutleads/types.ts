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
  assignedToId?: string;
  monthlyIncome: string;
  salesNotes: string;
  lastModified: Date;
  date: number;
  debtRange: string;
  language_barrier?: string;
  convertedAt?: any;
  callbackInfo?: {
    id: string;
    scheduled_dt: Date;
    scheduled_by: string;
    created_at: any;
  } | null;
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