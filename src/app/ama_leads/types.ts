export type HistoryItem = {
  content: string;
  createdAt: any; // Firestore Timestamp or Date
  createdBy: string;
  createdById: string;
  displayDate?: string;
  leadId: string;
  assignedById: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string; // derived from mobile
  address?: string;
  city?: string;
  status: string;
  source: string;
  assignedTo: string;
  assignedToId?: string;
  income?: number | string;
  debtRange?: number | string;
  salesNotes?: string;
  query?: string; // remarks/query from source
  language_barrier?: string;
  convertedAt?: any;
  lastModified?: any;
  date: number; // epoch ms
  callbackInfo?: {
    id: string;
    scheduled_dt: Date;
    scheduled_by: string;
    created_at: any;
  } | null;
};

export type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: string;
  name: string; // Required for compatibility
};

export type EditingLeadsState = {
  [key: string]: Partial<Lead>;
};

export type SortDirection = 'ascending' | 'descending'; 