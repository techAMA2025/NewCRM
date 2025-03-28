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
  [key: string]: any; // For other dynamic properties
}

export interface HistoryItem {
  id: string;
  timestamp: Date;
  previousValue?: string;
  newValue?: string;
  assignmentChange?: boolean;
  previousAssignee?: string;
  newAssignee?: string;
  editor?: {
    id: string;
    salesperson?: string;
  };
  salesNotes?: string;
  [key: string]: any;
}

export type SortDirection = 'ascending' | 'descending';

export interface EditingLeadsState {
  [key: string]: Lead;
} 