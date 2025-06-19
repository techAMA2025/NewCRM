// Define all your type interfaces for consistent use across components

export interface User {
  id: string;
  role: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

export interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  City?: string;
  status?: string;
  source_database?: string;
  assignedTo?: string;
  assignedToId?: string;
  salesNotes?: string;
  lastModified?: any;
  message?: string;
  original_collection?: string;
  original_id?: string;
  convertedAt?: any;
  convertedToClient?: boolean;
  synced_at?: any;
  timestamp?: any;
  callbackInfo?: {
    id: string;
    scheduled_dt: Date;
    scheduled_by: string;
    created_at: any;
  } | null;
  [key: string]: any; // For other dynamic properties
}

export interface HistoryItem {
  content: string;
  createdAt: string | Date;
  createdBy: string;
  createdById: string;
  displayDate?: string; // Optional to match usage pattern
  leadId: string;
  assignedById: string;
}

export type SortDirection = 'ascending' | 'descending';

export interface EditingLeadsState {
  [key: string]: Lead; 
} 