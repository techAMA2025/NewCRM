"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { db as crmDb, auth } from "@/firebase/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase/firebase";


import LeadsHeader from "./components/AmaLeadsHeader";
import LeadsFilters from "./components/AmaLeadsFilters";
// Keep our AMA-specific table for now
import AmaLeadsTable from "./components/AmaLeadsTable";
import AmaLeadsTabs from "./components/AmaLeadsTabs";
import AdminSidebar from "@/components/navigation/AdminSidebar";
import SalesSidebar from "@/components/navigation/SalesSidebar";
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import AmaHistoryModal from "./components/AmaHistoryModal";
import AmaStatusChangeConfirmationModal from "./components/AmaStatusChangeConfirmationModal";
import AmaCallbackSchedulingModal from "./components/AmaCallbackSchedulingModal";
import AmaLanguageBarrierModal from "./components/AmaLanguageBarrierModal";
import AmaBulkWhatsAppModal from "./components/AmaBulkWhatsAppModal";

// Types
import type { Lead, User } from "./types";

const LEADS_PER_PAGE = 50;

const statusOptions = [
  "No Status",
  "Interested",
  "Not Interested",
  "Not Answering",
  "Callback",
  "Future Potential",
  "Converted",
  "Language Barrier",
  "Closed Lead",
  "Loan Required",
  "Short Loan",
  "Cibil Issue",
  "Retargeting",
];

const AmaLeadsPage = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadAllLoading, setIsLoadAllLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [hasMoreLeads, setHasMoreLeads] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);

  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allLeadsCount, setAllLeadsCount] = useState(0);
  const [databaseFilteredCount, setDatabaseFilteredCount] = useState(0);
  const [searchResultsCount, setSearchResultsCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesPersonFilter, setSalesPersonFilter] = useState("all");
  const [convertedFilter, setConvertedFilter] = useState<boolean | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "callback">("all");

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  // User / team
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState("");
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [salesTeamMembers, setSalesTeamMembers] = useState<User[]>([]);
  const [editingLeads, setEditingLeads] = useState<{[key:string]: any}>({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentHistory, setCurrentHistory] = useState<any[]>([]);

  // Lead selection and bulk assignment (from billcutleads)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [bulkAssignTarget, setBulkAssignTarget] = useState("");

  // Status confirmation modal state
  const [statusConfirmLeadId, setStatusConfirmLeadId] = useState("");
  const [statusConfirmLeadName, setStatusConfirmLeadName] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Callback modal state
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [callbackLeadId, setCallbackLeadId] = useState("");
  const [callbackLeadName, setCallbackLeadName] = useState("");
  const [isEditingCallback, setIsEditingCallback] = useState(false);
  const [editingCallbackInfo, setEditingCallbackInfo] = useState<any>(null);

  // Language barrier modal state
  const [showLanguageBarrierModal, setShowLanguageBarrierModal] = useState(false);
  const [languageBarrierLeadId, setLanguageBarrierLeadId] = useState("");
  const [languageBarrierLeadName, setLanguageBarrierLeadName] = useState("");
  const [isEditingLanguageBarrier, setIsEditingLanguageBarrier] = useState(false);
  const [editingLanguageBarrierInfo, setEditingLanguageBarrierInfo] = useState("");

  // Bulk WhatsApp modal state
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);

  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Helper function to get callback priority for sorting
  const getCallbackPriority = (lead: any): number => {
    if (!lead.callbackInfo || !lead.callbackInfo.scheduled_dt) {
      return 4; // Blank/no callback info - lowest priority
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    const scheduledDate = new Date(lead.callbackInfo.scheduled_dt);
    const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const dayAfterTomorrowOnly = new Date(
      dayAfterTomorrow.getFullYear(),
      dayAfterTomorrow.getMonth(),
      dayAfterTomorrow.getDate(),
    );

    let priority = 4;
    if (scheduledDateOnly.getTime() === todayOnly.getTime()) {
      priority = 1; // Red strap - today (highest priority)
    } else if (scheduledDateOnly.getTime() === tomorrowOnly.getTime()) {
      priority = 2; // Yellow strap - tomorrow
    } else if (scheduledDateOnly.getTime() >= dayAfterTomorrowOnly.getTime()) {
      priority = 3; // Green strap - day after tomorrow or later
    } else {
      priority = 4; // Gray/other dates - lowest priority
    }

    return priority;
  };

  // Fetch callback information
  const fetchCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfoRef = collection(crmDb, "ama_leads", leadId, "callback_info");
      const callbackSnapshot = await getDocs(callbackInfoRef);

      if (!callbackSnapshot.empty) {
        const callbackData = callbackSnapshot.docs[0].data();
        return {
          id: callbackData.id || "attempt_1",
          scheduled_dt: callbackData.scheduled_dt?.toDate
            ? callbackData.scheduled_dt.toDate()
            : new Date(callbackData.scheduled_dt),
          scheduled_by: callbackData.scheduled_by || "",
          created_at: callbackData.created_at,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  // Auth effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const localStorageRole = localStorage.getItem("userRole");
        if (localStorageRole) setUserRole(localStorageRole);
      } else {
        setCurrentUser(null);
        setUserRole("");
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const usersCollectionRef = collection(crmDb, "users");
        const userSnapshot = await getDocs(usersCollectionRef);
        const usersData = userSnapshot.docs
          .map((doc) => {
            const data = doc.data() as any;
            const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || data.email || 'Unknown';
            return { 
              id: doc.id, 
              ...data,
              name // Ensure name is always set consistently
            };
          })
          .filter((user: any) => user.role === "salesperson" || user.role === "sales" || user.role === "admin" || user.role === "overlord") as User[];
        // Sort by name
        (usersData as any).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
        setTeamMembers(usersData);
        const salesPersonnel = usersData.filter((u: any) => u.role === 'salesperson' || u.role === 'sales');
        setSalesTeamMembers(salesPersonnel as any);
      } catch (error) {
        console.error("Error fetching team members: ", error);
        toast.error("Failed to load team members");
      }
    };
    fetchTeamMembers();
  }, []);

  // Build query based on filters
  const buildQuery = (isLoadMore = false, lastDocument: DocumentSnapshot | null = null) => {
    const baseQuery = collection(crmDb, "ama_leads");
    const constraints: any[] = [];

    // Date range uses 'date' epoch ms from normalized doc
    if (fromDate) {
      // Create date in local timezone, not UTC
      const fromDateStart = new Date(fromDate + 'T00:00:00');
      const fromTimestamp = fromDateStart.getTime();
      console.log("🔍 Server-side FROM date filter:", {
        fromDate,
        fromDateStart: fromDateStart.toISOString(),
        fromDateLocal: fromDateStart.toLocaleDateString(),
        fromTimestamp
      });
      constraints.push(where("date", ">=", fromTimestamp));
    }
    if (toDate) {
      // Create date in local timezone, not UTC
      const toDateEnd = new Date(toDate + 'T23:59:59.999');
      const toTimestamp = toDateEnd.getTime();
      console.log("📅 Adding TO date constraint:", toTimestamp);
      constraints.push(where("date", "<=", toTimestamp));
    }

    // Source filter - this was missing!
    if (sourceFilter !== "all") {
      // Map filter values to database values
      const sourceMap = {
        'ama': 'AMA',
        'credsettlee': 'CREDSETTLE', 
        'settleloans': 'SETTLELOANS'
      };
      const dbSourceValue = sourceMap[sourceFilter as keyof typeof sourceMap] || sourceFilter.toUpperCase();
      console.log("🔧 Adding source constraint:", sourceFilter, "→", dbSourceValue);
      constraints.push(where("source", "==", dbSourceValue));
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "No Status") {
        constraints.push(where("status", "in", ["", "-", "–", "No Status"] as any));
      } else {
        constraints.push(where("status", "==", statusFilter));
      }
    }

    // Salesperson filter
    if (salesPersonFilter !== "all") {
      if (salesPersonFilter === "") {
        constraints.push(where("assigned_to", "in", ["", "-", "–"] as any));
      } else {
        constraints.push(where("assigned_to", "==", salesPersonFilter));
      }
    }

    // Converted filter
    if (convertedFilter !== null) {
      constraints.push(where("convertedToClient", "==", convertedFilter));
    }

    // Tab-based filtering - Callback tab
    if (activeTab === "callback") {
      constraints.push(where("status", "==", "Callback"));
    }

    // Sorting and pagination
    constraints.push(orderBy("date", sortConfig.direction === 'ascending' ? 'asc' : 'desc'));
    constraints.push(limit(LEADS_PER_PAGE));
    if (isLoadMore && lastDocument) constraints.push(startAfter(lastDocument));

    console.log("🔍 Query constraints:", constraints.length);
    return query(baseQuery, ...constraints);
  };

  // Fetch total count for display
  const fetchTotalCount = async () => {
    try {
      const countQuery = query(collection(crmDb, "ama_leads"));
      const snapshot = await getDocs(countQuery);
      const count = snapshot.size;
      setTotalLeadsCount(count);
      setAllLeadsCount(count); // Also set for search functionality
    } catch (e) {
      setTotalLeadsCount(0);
      setAllLeadsCount(0);
    }
  };

  // Fetch filtered count from database based on current filters
  const fetchFilteredCount = async (excludePagination = false) => {
    try {
      console.log("🔍 Fetching filtered count with filters:", {
        sourceFilter,
        statusFilter,
        salesPersonFilter,
        convertedFilter,
        fromDate,
        toDate,
        activeTab
      });

      const baseQuery = collection(crmDb, "ama_leads");
      const constraints: any[] = [];

      // Date range uses 'date' epoch ms from normalized doc
      if (fromDate) {
        const fromDateStart = new Date(fromDate + 'T00:00:00');
        const fromTimestamp = fromDateStart.getTime();
        console.log("📅 Adding FROM date constraint:", fromTimestamp);
        constraints.push(where("date", ">=", fromTimestamp));
      }
      if (toDate) {
        const toDateEnd = new Date(toDate + 'T23:59:59.999');
        const toTimestamp = toDateEnd.getTime();
        console.log("📅 Adding TO date constraint:", toTimestamp);
        constraints.push(where("date", "<=", toTimestamp));
      }

      // Source filter - this was missing!
      if (sourceFilter !== "all") {
        // Map filter values to database values
        const sourceMap = { 'ama': 'AMA', 'credsettlee': 'CREDSETTLE', 'settleloans': 'SETTLELOANS' };
        const dbSourceValue = sourceMap[sourceFilter as keyof typeof sourceMap] || sourceFilter.toUpperCase();
        console.log("🔧 Adding source constraint:", sourceFilter, "→", dbSourceValue);
        constraints.push(where("source", "==", dbSourceValue));
      }

      // Status filter
      if (statusFilter !== "all") {
        console.log("🏷️ Adding status constraint:", statusFilter);
        if (statusFilter === "No Status") {
          constraints.push(where("status", "in", ["", "-", "–", "No Status"] as any));
        } else {
          constraints.push(where("status", "==", statusFilter));
        }
      }

      // Salesperson filter
      if (salesPersonFilter !== "all") {
        console.log("👤 Adding salesperson constraint:", salesPersonFilter);
        if (salesPersonFilter === "") {
          constraints.push(where("assigned_to", "in", ["", "-", "–"] as any));
        } else {
          constraints.push(where("assigned_to", "==", salesPersonFilter));
        }
      }

      // Converted filter
      if (convertedFilter !== null) {
        console.log("✅ Adding converted constraint:", convertedFilter);
        constraints.push(where("convertedToClient", "==", convertedFilter));
      }

      // Tab-based filtering - Callback tab
      if (activeTab === "callback") {
        console.log("📞 Adding callback tab constraint");
        constraints.push(where("status", "==", "Callback"));
      }

      console.log("🔧 Total constraints built:", constraints.length);

      // Build query with constraints (no pagination for counting)
      const countQuery = constraints.length > 0 
        ? query(baseQuery, ...constraints)
        : query(baseQuery);
      
      console.log("🔍 Executing count query...");
      const countSnapshot = await getDocs(countQuery);
      const count = countSnapshot.size;
      
      console.log("📊 Count query result:", count);
      return count;
    } catch (error) {
      console.error("❌ Error fetching filtered count:", error);
      return 0;
    }
  };

  // Handle search results from database search
  const handleSearchResults = (results: any[]) => {
    setSearchResults(results);
    setSearchResultsCount(results.length);
  };

  // Handle when search is cleared - reset to first page
  const handleSearchCleared = () => {
    setSearchResultsCount(0);
    if (leads.length > 50) {
      console.log("🔄 Search cleared, resetting to first 50 leads");
      setLeads(leads.slice(0, 50));
      setLastDoc(null);
      setHasMoreLeads(true);
    }
  };

  // Modified applyFilters to accept leads parameter
  const applyFiltersToLeads = (leadsArray: any[]) => {
    if (!leadsArray || leadsArray.length === 0) return [] as any[];

    let result = [...leadsArray];

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(lead => lead.source_database === sourceFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'No Status') {
        result = result.filter(lead => {
          const status = lead.status;
          return !status || 
                 status === '' || 
                 status === '-' || 
                 status === '–' ||
                 status === 'No Status' ||
                 (typeof status === 'string' && status.trim() === '') ||
                 (typeof status === 'string' && status.trim() === '-');
        });
      } else {
        result = result.filter(lead => lead.status === statusFilter);
      }
    }

    // Salesperson filter - Enhanced to handle all unassigned cases
    if (salesPersonFilter !== 'all') {
      if (salesPersonFilter === '') {
        // Check for truly unassigned leads - including null, undefined, empty string, dash, and em-dash
        result = result.filter(lead => {
          const assignedTo = lead.assignedTo;
          return !assignedTo || 
                 assignedTo === '' || 
                 assignedTo === '-' || 
                 assignedTo === '–' ||
                 assignedTo === null ||
                 assignedTo === undefined ||
                 (typeof assignedTo === 'string' && assignedTo.trim() === '') ||
                 (typeof assignedTo === 'string' && assignedTo.trim() === '-');
        });
      } else {
        result = result.filter(lead => lead.assignedTo === salesPersonFilter);
      }
    }

    // Converted filter
    if (convertedFilter !== null) {
      result = result.filter(lead => (lead.convertedToClient === convertedFilter));
    }

    // Date range filter (using mapped synced_at or date)
    if (fromDate || toDate) {
      console.log("🔍 Date filtering applied:", { fromDate, toDate, totalLeads: result.length });
      
      const originalResultLength = result.length;
      
      result = result.filter(lead => {
        // Handle date properly - lead.date is epoch milliseconds, synced_at is already a Date object
        let leadDate: Date;
        
        if (lead.synced_at && lead.synced_at instanceof Date) {
          leadDate = lead.synced_at;
        } else if (lead.date) {
          // If date is epoch milliseconds, convert to Date
          leadDate = typeof lead.date === 'number' ? new Date(lead.date) : new Date(lead.date);
        } else {
          // Fallback to current date if no date available
          leadDate = new Date();
        }
        
        // Debug first few leads
        if (result.indexOf(lead) < 5) {
          console.log("📅 Lead date debug:", {
            leadName: lead.name,
            rawDate: lead.date,
            rawSyncedAt: lead.synced_at,
            processedDate: leadDate.toISOString(),
            processedDateLocal: leadDate.toLocaleDateString(),
            fromDate,
            toDate
          });
        }
        
        if (fromDate && toDate) {
          // Create dates in local timezone, not UTC
          const from = new Date(fromDate + 'T00:00:00');
          const to = new Date(toDate + 'T23:59:59.999');
          
          // Check if lead date falls within the range
          const matches = leadDate >= from && leadDate <= to;
          
          if (result.indexOf(lead) < 5) {
            console.log("📅 Date range check:", {
              leadName: lead.name,
              leadDate: leadDate.toISOString(),
              leadDateLocal: leadDate.toLocaleDateString(),
              from: from.toISOString(),
              fromLocal: from.toLocaleDateString(),
              to: to.toISOString(),
              toLocal: to.toLocaleDateString(),
              isAfterFrom: leadDate >= from,
              isBeforeTo: leadDate <= to,
              matches
            });
          }
          
          return matches;
        } else if (fromDate) {
          // Create date in local timezone, not UTC
          const from = new Date(fromDate + 'T00:00:00');
          return leadDate >= from;
        } else if (toDate) {
          // Create date in local timezone, not UTC
          const to = new Date(toDate + 'T23:59:59.999');
          return leadDate <= to;
        }
        
        return true;
      });
      
      console.log("🔍 After date filtering:", { 
        originalCount: originalResultLength,
        filteredCount: result.length,
        filtered: originalResultLength - result.length 
      });
    }

    // Apply sorting
    if (sortConfig?.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (sortConfig.direction === 'ascending') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return result;
  };

  // Update the original applyFilters to use the new function
  const applyFilters = () => {
    return applyFiltersToLeads(leads);
  };

  // Apply filters with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery) {
        // Use search results when searching
        console.log("🔍 Using search results for filtering:", {
          searchQuery,
          searchResultsCount: searchResults.length,
          hasDateFilters: !!(fromDate || toDate)
        });
        setFilteredLeads(applyFiltersToLeads(searchResults));
      } else {
        // When not searching, use regular leads (up to current pagination)
        console.log("🔍 Using regular leads for filtering:", {
          leadsCount: leads.length,
          hasDateFilters: !!(fromDate || toDate)
        });
        setFilteredLeads(applyFiltersToLeads(leads));
      }
    }, 100);
    return () => clearTimeout(t);
  }, [leads, searchResults, searchQuery, sourceFilter, statusFilter, salesPersonFilter, convertedFilter, fromDate, toDate, sortConfig]);

  // Fetch leads
  const fetchAmaLeads = async (isLoadMore = false) => {
    if (isLoadMore) setIsLoadingMore(true); else setIsLoading(true);
    try {
      if (!isLoadMore) await fetchTotalCount();

      const leadsQuery = buildQuery(isLoadMore, lastDoc);
      const querySnapshot = await getDocs(leadsQuery);

      if (querySnapshot.empty) {
        setHasMoreLeads(false);
        if (!isLoadMore) setLeads([]);
        return;
      }

      const fetchedLeads: any[] = querySnapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        
        // Debug first few leads to see their date data
        if (querySnapshot.docs.indexOf(docSnap) < 5) {
          const debugDate = d.date ? new Date(d.date) : null;
          console.log("📅 Raw lead data:", {
            id: docSnap.id,
            name: d.name,
            rawDate: d.date,
            rawSyncedDate: d.synced_date,
            convertedDate: debugDate ? debugDate.toISOString() : 'No date',
            convertedDateLocal: debugDate ? debugDate.toLocaleDateString() : 'No date',
            convertedDateString: debugDate ? debugDate.toString() : 'No date'
          });
        }
        
        return {
          id: docSnap.id,
          name: d.name || "",
          email: d.email || "",
          phone: String(d.mobile || d.phone || ""),
          address: d.address || "",
          city: d.city || "",
          status: d.status || "No Status",
          source: d.source || "",
          source_database: d.source_database || d.source || "",
          assignedTo: d.assigned_to || d.assignedTo || "",
          assignedToId: d.assignedToId,
          // Prefer latest note field when present
          salesNotes: d.lastNote || d.salesNotes || "",
          lastNote: d.lastNote || "",
          query: d.query || "",
          language_barrier: d.language_barrier,
          convertedAt: d.convertedAt,
          lastModified: d.lastModified,
          // Debt fields (support multiple casings/variants)
          debt_Range: d.debt_Range,
          debt_range: d.debt_range,
          debtRange: d.debtRange,
          // Provide a synced_at-like field for shared filters/sort (map from date)
          synced_at: d.date ? new Date(d.date) : undefined,
          date: d.date || Date.now(),
          callbackInfo: null, // Initialize callback info
        } as any;
      });

      // Fetch callback info for callback leads
      const leadsWithCallbackInfo = await Promise.all(
        fetchedLeads.map(async (lead) => {
          if (lead.status === "Callback") {
            const callbackInfo = await fetchCallbackInfo(lead.id);
            lead.callbackInfo = callbackInfo;
          }
          return lead;
        })
      );

      setLeads((prev) => {
        const newLeads = isLoadMore ? [...prev, ...leadsWithCallbackInfo] : leadsWithCallbackInfo;
        
        // Apply callback sorting to the entire list when on callback tab
        if (activeTab === "callback") {
          return [...newLeads].sort((a, b) => {
            const priorityA = getCallbackPriority(a);
            const priorityB = getCallbackPriority(b);
            
            // If priorities are the same, sort by scheduled time (earliest first)
            if (priorityA === priorityB && a.callbackInfo && b.callbackInfo && 
                a.callbackInfo.scheduled_dt && b.callbackInfo.scheduled_dt) {
              const timeA = new Date(a.callbackInfo.scheduled_dt).getTime();
              const timeB = new Date(b.callbackInfo.scheduled_dt).getTime();
              return timeA - timeB;
            }
            
            return priorityA - priorityB;
          });
        }
        
        return newLeads;
      });

      const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastDoc(lastDocument);
      setHasMoreLeads(querySnapshot.docs.length === LEADS_PER_PAGE);

      // Initialize editing state for notes
      const initialEditingState: {[key:string]: any} = {};
      (isLoadMore ? leadsWithCallbackInfo : leadsWithCallbackInfo).forEach((lead) => {
        initialEditingState[lead.id] = {
          ...(initialEditingState[lead.id] || {}),
          salesNotes: lead.salesNotes || ''
        };
      });
      setEditingLeads((prev) => isLoadMore ? ({ ...prev, ...initialEditingState }) : initialEditingState);

      // Prefill from history for leads without lastNote/salesNotes
      const leadsNeedingHistory = leadsWithCallbackInfo.filter((l) => !(l.lastNote && l.lastNote.trim()) && !(l.salesNotes && l.salesNotes.trim()));
      for (const l of leadsNeedingHistory) {
        try {
          // Try indexed queries first
          let latestSnap = await getDocs(
            query(collection(crmDb, 'ama_leads', l.id, 'history'), orderBy('timestamp', 'desc'), limit(1))
          );
          if (latestSnap.empty) {
            latestSnap = await getDocs(
              query(collection(crmDb, 'ama_leads', l.id, 'history'), orderBy('createdAt', 'desc'), limit(1))
            );
          }
          if (!latestSnap.empty) {
            const data: any = latestSnap.docs[0].data();
            const content: string = typeof data.content === 'string' ? data.content : '';
            if (content && content.trim() !== '') {
              setEditingLeads((prev) => ({
                ...prev,
                [l.id]: { ...(prev[l.id] || {}), salesNotes: content }
              }));
              continue;
            }
          }
          // Fallback: fetch all and compute latest by timestamp/createdAt/created_at
          const allSnap = await getDocs(collection(crmDb, 'ama_leads', l.id, 'history'));
          if (!allSnap.empty) {
            const items = allSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            const toMs = (v: any): number => {
              try {
                if (!v) return 0;
                if (v instanceof Date) return v.getTime();
                if (typeof v === 'object' && 'toDate' in v) return (v as any).toDate().getTime();
                if (typeof v === 'object' && 'seconds' in v) return (v as any).seconds * 1000;
                return new Date(v).getTime() || 0;
              } catch { return 0; }
            };
            items.sort((a: any, b: any) => {
              const aMs = Math.max(toMs(a.timestamp), toMs(a.createdAt), toMs(a.created_at));
              const bMs = Math.max(toMs(b.timestamp), toMs(b.createdAt), toMs(b.created_at));
              return bMs - aMs;
            });
            const top = items[0];
            const content: string = top && typeof top.content === 'string' ? top.content : '';
            if (content && content.trim() !== '') {
              setEditingLeads((prev) => ({
                ...prev,
                [l.id]: { ...(prev[l.id] || {}), salesNotes: content }
              }));
            }
          }
        } catch {
          // ignore per-lead history fetch failures
        }
      }

    } catch (error) {
      console.error("Error fetching AMA leads: ", error);
      toast.error("Failed to load AMA leads");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Setup infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMoreLeads && !isLoadingMore && !isLoading && !isLoadAllLoading) {
        fetchAmaLeads(true);
      }
    }, { threshold: 0.1 });
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMoreLeads, isLoadingMore, isLoading, fetchAmaLeads, isLoadAllLoading]);

  // Fetch when filters change
  useEffect(() => {
    const t = setTimeout(() => {
      setLastDoc(null);
      setHasMoreLeads(true);
      fetchAmaLeads(false);
    }, 300);
    return () => clearTimeout(t);
  }, [fromDate, toDate, statusFilter, salesPersonFilter, sortConfig, activeTab]);

  // Calculate counts for tabs
  const callbackCount = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const currentUserName = localStorage.getItem("userName");
    const currentUserRole = localStorage.getItem("userRole");

    return leads.filter((lead) => {
      if (lead.status === "Callback") {
        if (currentUserRole === "admin" || currentUserRole === "overlord") {
          return true;
        } else {
          return lead.assignedTo === currentUserName;
        }
      }
      return false;
    }).length;
  }, [leads]);

  const allLeadsDisplayCount = useMemo(() => {
    return filteredLeads.length;
  }, [filteredLeads]);

  // Fetch callback count from database
  const fetchCallbackCount = async () => {
    try {
      const currentUserRole = localStorage.getItem("userRole");
      const currentUserName = localStorage.getItem("userName");
      
      const baseQuery = collection(crmDb, "ama_leads");
      const constraints: any[] = [where("status", "==", "Callback")];
      
      // Role-based filtering for callback count
      if (currentUserRole !== "admin" && currentUserRole !== "overlord") {
        constraints.push(where("assigned_to", "==", currentUserName));
      }
      
      const callbackQuery = query(baseQuery, ...constraints);
      const callbackSnapshot = await getDocs(callbackQuery);
      return callbackSnapshot.size;
    } catch (error) {
      console.error("Error fetching callback count:", error);
      return 0;
    }
  };

  // State for database counts
  const [databaseCallbackCount, setDatabaseCallbackCount] = useState(0);

  // Initialize databaseFilteredCount with totalLeadsCount when available
  useEffect(() => {
    if (totalLeadsCount > 0 && databaseFilteredCount === 0) {
      setDatabaseFilteredCount(totalLeadsCount);
    }
  }, [totalLeadsCount, databaseFilteredCount]);

  // Fetch database counts when relevant filters change
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch callback count
        const callbackCount = await fetchCallbackCount();
        setDatabaseCallbackCount(callbackCount);
        
        // Determine if any filters are active (excluding search since it's handled separately)
        const hasActiveFilters = sourceFilter !== "all" || statusFilter !== "all" || 
                                salesPersonFilter !== "all" || convertedFilter !== null || 
                                fromDate || toDate || activeTab === "callback";
        
        if (hasActiveFilters) {
          // Fetch filtered count for specific filters
          const filteredCount = await fetchFilteredCount();
          setDatabaseFilteredCount(filteredCount);
          
          console.log("📊 Database counts updated:", {
            callbackCount,
            filteredCount: filteredCount,
            hasActiveFilters,
            activeTab,
            currentDatabaseFilteredCount: databaseFilteredCount,
            totalLeadsCount
          });
        } else {
          // If no filters active, use total count
          setDatabaseFilteredCount(totalLeadsCount);
          
          console.log("📊 Database counts updated:", {
            callbackCount,
            filteredCount: totalLeadsCount,
            hasActiveFilters,
            activeTab,
            currentDatabaseFilteredCount: databaseFilteredCount,
            totalLeadsCount
          });
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    if (totalLeadsCount > 0) {
      fetchCounts();
    }
  }, [sourceFilter, statusFilter, salesPersonFilter, convertedFilter, fromDate, toDate, activeTab, totalLeadsCount]);

  // Handle tab change
  const handleTabChange = (tab: "all" | "callback") => {
    setActiveTab(tab);
    // Reset other filters when switching to callback tab
    if (tab === "callback") {
      setStatusFilter("all");
      setSearchQuery("");
    }
  };

  // Update single lead's sales notes state in lists
  const updateLeadsState = (leadId: string, newValue: string) => {
    const updateFn = (arr: any[]) => arr.map((l) => l.id === leadId ? { ...l, salesNotes: newValue, lastModified: new Date() } : l);
    setLeads((prev) => updateFn(prev));
    setFilteredLeads((prev) => updateFn(prev));
  };

  // Assign lead to salesperson (updates assigned_to and assignedTo)
  const assignLeadToSalesperson = async (leadId: string, salesPersonName: string, salesPersonId: string) => {
    try {
      const leadRef = doc(crmDb, 'ama_leads', leadId);
      // Add history entry
      const historyRef = collection(crmDb, 'ama_leads', leadId, 'history');
      await addDoc(historyRef as any, {
        assignmentChange: true,
        previousAssignee: leads.find((l) => l.id === leadId)?.assignedTo || 'Unassigned',
        newAssignee: salesPersonName,
        timestamp: serverTimestamp(),
        assignedById: (typeof window !== 'undefined' ? localStorage.getItem('userName') : '') || '',
        editor: { id: currentUser?.uid || 'unknown' }
      } as any);

      await updateDoc(leadRef, {
        assigned_to: salesPersonName,
        assignedToId: salesPersonId,
        lastModified: serverTimestamp()
      } as any);

      const updateFn = (arr: any[]) => arr.map((l) => l.id === leadId ? { ...l, assignedTo: salesPersonName, assignedToId: salesPersonId, lastModified: new Date() } : l);
      setLeads(updateFn);
      setFilteredLeads(updateFn);

      toast.success('Lead assigned');
    } catch (e) {
      toast.error('Failed to assign lead');
    }
  };

  // Unassign lead function
  const unassignLead = async (leadId: string) => {
    try {
      const leadRef = doc(crmDb, 'ama_leads', leadId);
      const previousAssignee = leads.find((l) => l.id === leadId)?.assignedTo || 'Unassigned';
      
      // Add history entry
      const historyRef = collection(crmDb, 'ama_leads', leadId, 'history');
      await addDoc(historyRef as any, {
        assignmentChange: true,
        previousAssignee: previousAssignee,
        newAssignee: 'Unassigned',
        timestamp: serverTimestamp(),
        assignedById: (typeof window !== 'undefined' ? localStorage.getItem('userName') : '') || '',
        editor: { id: currentUser?.uid || 'unknown' }
      } as any);

      await updateDoc(leadRef, {
        assigned_to: '-',
        assignedToId: '',
        lastModified: serverTimestamp()
      } as any);

      const updateFn = (arr: any[]) => arr.map((l) => l.id === leadId ? { ...l, assignedTo: '-', assignedToId: '', lastModified: new Date() } : l);
      setLeads(updateFn);
      setFilteredLeads(updateFn);

      toast.success('Lead unassigned');
    } catch (e) {
      toast.error('Failed to unassign lead');
    }
  };

  // Bulk assignment function (from billcutleads)
  const bulkAssignLeads = async (leadIds: string[], salesPersonName: string, salesPersonId: string) => {
    try {
      // Apply optimistic updates
      leadIds.forEach((leadId) => {
        const updateFn = (arr: any[]) => 
          arr.map((l) => 
            l.id === leadId ? { ...l, assignedTo: salesPersonName, assignedToId: salesPersonId, lastModified: new Date() } : l
          );
        setLeads(updateFn);
        setFilteredLeads(updateFn);
      });

      const updatePromises = leadIds.map(async (leadId) => {
        const leadRef = doc(crmDb, "ama_leads", leadId);

        // Add history entry
        const historyRef = collection(crmDb, "ama_leads", leadId, "history");
        await addDoc(historyRef as any, {
          assignmentChange: true,
          previousAssignee: leads.find((l) => l.id === leadId)?.assignedTo || "Unassigned",
          newAssignee: salesPersonName,
          timestamp: serverTimestamp(),
          assignedById: typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "",
          editor: {
            id: currentUser?.uid || "unknown",
          },
        });

        // Update lead
        await updateDoc(leadRef, {
          assigned_to: salesPersonName,
          assignedToId: salesPersonId,
          lastModified: serverTimestamp(),
        });
      });

      await Promise.all(updatePromises);

      setSelectedLeads([]);
      setShowBulkAssignment(false);
      setBulkAssignTarget("");

      toast.success(
        <div>
          <p className="font-medium">Bulk Assignment Complete</p>
          <p className="text-sm">
            {leadIds.length} leads assigned to {salesPersonName}
          </p>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
        },
      );
    } catch (error) {
      console.error("Error bulk assigning leads: ", error);
      // Revert optimistic updates on error
      leadIds.forEach((leadId) => {
        const originalLead = leads.find((l) => l.id === leadId);
        if (originalLead) {
          const updateFn = (arr: any[]) => 
            arr.map((l) => 
              l.id === leadId ? { ...l, assignedTo: originalLead.assignedTo, assignedToId: originalLead.assignedToId } : l
            );
          setLeads(updateFn);
          setFilteredLeads(updateFn);
        }
      });

      toast.error("Failed to assign leads", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Bulk unassign function
  const bulkUnassignLeads = async (leadIds: string[]) => {
    try {
      // Apply optimistic updates
      leadIds.forEach((leadId) => {
        const updateFn = (arr: any[]) => 
          arr.map((l) => 
            l.id === leadId ? { ...l, assignedTo: '-', assignedToId: '', lastModified: new Date() } : l
          );
        setLeads(updateFn);
        setFilteredLeads(updateFn);
      });

      const updatePromises = leadIds.map(async (leadId) => {
        const leadRef = doc(crmDb, "ama_leads", leadId);
        const previousAssignee = leads.find((l) => l.id === leadId)?.assignedTo || "Unassigned";

        // Add history entry
        const historyRef = collection(crmDb, "ama_leads", leadId, "history");
        await addDoc(historyRef as any, {
          assignmentChange: true,
          previousAssignee: previousAssignee,
          newAssignee: "Unassigned",
          timestamp: serverTimestamp(),
          assignedById: typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "",
          editor: {
            id: currentUser?.uid || "unknown",
          },
        });

        // Update lead
        await updateDoc(leadRef, {
          assigned_to: '-',
          assignedToId: '',
          lastModified: serverTimestamp(),
        });
      });

      await Promise.all(updatePromises);

      setSelectedLeads([]);

      toast.success(
        <div>
          <p className="font-medium">Bulk Unassignment Complete</p>
          <p className="text-sm">
            {leadIds.length} leads unassigned
          </p>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
        },
      );
    } catch (error) {
      console.error("Error bulk unassigning leads: ", error);
      // Revert optimistic updates on error
      leadIds.forEach((leadId) => {
        const originalLead = leads.find((l) => l.id === leadId);
        if (originalLead) {
          const updateFn = (arr: any[]) => 
            arr.map((l) => 
              l.id === leadId ? { ...l, assignedTo: originalLead.assignedTo, assignedToId: originalLead.assignedToId } : l
            );
          setLeads(updateFn);
          setFilteredLeads(updateFn);
        }
      });

      toast.error("Failed to unassign leads", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Update lead
  const updateLead = async (id: string, data: any) => {
    try {
      const leadRef = doc(crmDb, 'ama_leads', id);
      const updateData: any = { ...data, lastModified: serverTimestamp() };

      // If updating salesNotes, also reflect in lastNote and meta for quick access
      if (Object.prototype.hasOwnProperty.call(data, 'salesNotes')) {
        updateData.lastNote = data.salesNotes;
        updateData.lastNoteDate = serverTimestamp();
        try {
          const userString = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          const userObj = userString ? JSON.parse(userString) : {};
          updateData.lastNoteBy = userObj?.userName || userObj?.name || userObj?.email || 'Unknown User';
        } catch {
          updateData.lastNoteBy = 'Unknown User';
        }
      }

      await updateDoc(leadRef, updateData);
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data, lastModified: new Date(), lastNote: updateData.lastNote ?? l.lastNote } : l)));
      setFilteredLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data, lastModified: new Date(), lastNote: updateData.lastNote ?? l.lastNote } : l)));
      return true;
    } catch (error) {
      console.error("Error updating AMA lead: ", error);
      toast.error("Failed to update lead");
      return false;
    }
  };

  // Status confirmation handlers
  const handleStatusConfirmation = async () => {
    if (!statusConfirmLeadId || !pendingStatusChange) return;

    setIsUpdatingStatus(true);
    try {
      const currentLead = leads.find((l) => l.id === statusConfirmLeadId);
      const currentStatus = currentLead?.status || 'Select Status';
      
      // Check if changing from "Converted" to another status
      if (currentStatus === 'Converted' && pendingStatusChange !== 'Converted') {
        // Show a toast notification about the conversion being removed
        toast.info(
          <div className="min-w-0 flex-1">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⚠️</span>
                  <p className="text-sm font-bold text-white">
                    Conversion Removed
                  </p>
                </div>
                <p className="mt-2 text-sm text-orange-100 font-medium">
                  {currentLead?.name || 'Unknown Lead'}
                </p>
                <p className="mt-1 text-sm text-orange-200">
                  Lead status changed from "Converted" to "{pendingStatusChange}". Conversion timestamp has been removed and targets count will be updated.
                </p>
              </div>
            </div>
          </div>,
          {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className: "bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-600 border-2 border-orange-400 shadow-xl",
          }
        );
      }

      const dbData: any = { status: pendingStatusChange };
      
      // If changing to "Converted", add conversion timestamp
      if (pendingStatusChange === 'Converted') {
        dbData.convertedAt = serverTimestamp();
        dbData.convertedToClient = true;
      }
      
      // If changing to "Callback", add callback timestamp
      if (pendingStatusChange === 'Callback') {
        dbData.callbackScheduled = serverTimestamp();
        dbData.callbackStatus = 'pending';
      }
      
      // If changing to "Language Barrier", add language barrier timestamp
      if (pendingStatusChange === 'Language Barrier') {
        dbData.languageBarrierMarked = serverTimestamp();
        dbData.language_barrier = true;
      }
      
      // If changing from "Converted" to another status, remove conversion data
      if (currentStatus === 'Converted' && pendingStatusChange !== 'Converted') {
        dbData.convertedAt = null;
        dbData.convertedToClient = null;
      }

      const success = await updateLead(statusConfirmLeadId, dbData);
      
      if (success) {
        // Update local state
        const updateFn = (arr: any[]) => arr.map((l) => 
          l.id === statusConfirmLeadId 
            ? { 
                ...l, 
                status: pendingStatusChange,
                convertedAt: dbData.convertedAt ? new Date() : l.convertedAt,
                convertedToClient: dbData.convertedToClient ?? l.convertedToClient,
                callbackScheduled: dbData.callbackScheduled ? new Date() : l.callbackScheduled,
                callbackStatus: dbData.callbackStatus ?? l.callbackStatus,
                languageBarrierMarked: dbData.languageBarrierMarked ? new Date() : l.languageBarrierMarked,
                language_barrier: dbData.language_barrier ?? l.language_barrier,
                lastModified: new Date()
              } 
            : l
        );
        setLeads(updateFn);
        setFilteredLeads(updateFn);

        // Send email message after successful status update
        try {
          console.log("🔍 Starting email send process...", {
            hasEmail: !!currentLead?.email,
            email: currentLead?.email,
            status: pendingStatusChange,
            leadName: currentLead?.name,
            fullLeadData: currentLead
          });
          
          if (currentLead?.email && (pendingStatusChange === "Interested" || pendingStatusChange === "Not Answering")) {
            console.log("📧 Preparing to send email...");
            const functions = getFunctions(app);
            const sendStatusChangeMessage = httpsCallable(functions, 'sendStatusChangeMessage');
            
            console.log("📤 Calling cloud function...");
            const emailResult = await sendStatusChangeMessage({
              leadName: currentLead.name || 'Dear Sir/Ma\'am',
              leadEmail: currentLead.email,
              leadId: statusConfirmLeadId,
              newStatus: pendingStatusChange
            });
            
            console.log("✅ Email function result:", emailResult);
            
            // Show success message with email confirmation
            toast.success(
              <div>
                <p className="font-medium">Status Updated & Message Sent!</p>
                <p className="text-sm">Status changed to "{pendingStatusChange}" and email sent to {currentLead.name}</p>
              </div>,
              {
                position: "top-right",
                autoClose: 4000,
              }
            );
          } else {
            console.log("📧 No email conditions met:", {
              hasEmail: !!currentLead?.email,
              validStatus: pendingStatusChange === "Interested" || pendingStatusChange === "Not Answering",
              status: pendingStatusChange,
              emailValidation: currentLead?.email && (pendingStatusChange === "Interested" || pendingStatusChange === "Not Answering")
            });

            // Show appropriate success message based on status
            let successMessage = "Status Updated Successfully";
            let successDetail = `${statusConfirmLeadName} status changed to "${pendingStatusChange}"`;

            if (pendingStatusChange === 'Callback') {
              successMessage = "Callback Scheduled";
              successDetail = `${statusConfirmLeadName} has been marked for callback`;
            } else if (pendingStatusChange === 'Language Barrier') {
              successMessage = "Language Barrier Marked";
              successDetail = `${statusConfirmLeadName} has been marked with language barrier`;
            } else if (pendingStatusChange === 'Converted') {
              successMessage = "Lead Converted";
              successDetail = `${statusConfirmLeadName} has been marked as converted`;
            }

            toast.success(
              <div>
                <p className="font-medium">{successMessage}</p>
                <p className="text-sm">{successDetail}</p>
              </div>,
              {
                position: "top-right",
                autoClose: 3000,
              }
            );
          }
        } catch (emailError) {
          console.error("❌ Error sending email:", emailError);
          // Still show success for status update, but mention email failure
          toast.success(
            <div>
              <p className="font-medium">Status Updated</p>
              <p className="text-sm">Status changed to "{pendingStatusChange}" but email could not be sent</p>
            </div>,
            {
              position: "top-right",
              autoClose: 4000,
            }
          );
        }

      }
    } catch (error) {
      console.error("Error updating status: ", error);
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
      setStatusConfirmLeadId("");
      setStatusConfirmLeadName("");
      setPendingStatusChange("");
    }
  };

  const handleStatusConfirmationClose = () => {
    setStatusConfirmLeadId("");
    setStatusConfirmLeadName("");
    setPendingStatusChange("");
  };

  const handleStatusChangeConfirmation = (leadId: string, leadName: string, newStatus: string) => {
    setStatusConfirmLeadId(leadId);
    setStatusConfirmLeadName(leadName);
    setPendingStatusChange(newStatus);
  };

  // Refresh callback information for a specific lead
  const refreshLeadCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfo = await fetchCallbackInfo(leadId);
      // Update lead state with callback info
      const updateFn = (arr: any[]) => arr.map((l) => 
        l.id === leadId ? { ...l, callbackInfo } : l
      );
      setLeads(updateFn);
      setFilteredLeads(updateFn);
    } catch (error) {
      // Handle error silently
    }
  };

  // Handle status change to callback
  const handleStatusChangeToCallback = (leadId: string, leadName: string) => {
    setCallbackLeadId(leadId);
    setCallbackLeadName(leadName);
    
    // Check if lead already has callback info
    const lead = leads.find((l) => l.id === leadId);
    if (lead?.callbackInfo) {
      setIsEditingCallback(true);
      setEditingCallbackInfo(lead.callbackInfo);
    } else {
      setIsEditingCallback(false);
      setEditingCallbackInfo(null);
    }
    setShowCallbackModal(true);
  };

  // Handle callback modal confirmation
  const handleCallbackConfirm = async () => {
    if (isEditingCallback) {
      await refreshLeadCallbackInfo(callbackLeadId);
    } else {
      const dbData = { status: "Callback" };
      const success = await updateLead(callbackLeadId, dbData);
      if (success) {
        await refreshLeadCallbackInfo(callbackLeadId);
      }
    }

    setShowCallbackModal(false);
    setCallbackLeadId("");
    setCallbackLeadName("");
    setIsEditingCallback(false);
    setEditingCallbackInfo(null);
  };

  // Handle callback modal close
  const handleCallbackClose = () => {
    setShowCallbackModal(false);
    setCallbackLeadId("");
    setCallbackLeadName("");
    setIsEditingCallback(false);
    setEditingCallbackInfo(null);
  };

  // Handle status change to language barrier
  const handleStatusChangeToLanguageBarrier = (leadId: string, leadName: string) => {
    setLanguageBarrierLeadId(leadId);
    setLanguageBarrierLeadName(leadName);
    setIsEditingLanguageBarrier(false);
    setEditingLanguageBarrierInfo("");
    setShowLanguageBarrierModal(true);
  };

  // Handle language barrier modal confirmation
  const handleLanguageBarrierConfirm = async (language: string) => {
    if (isEditingLanguageBarrier) {
      const success = await updateLead(languageBarrierLeadId, { language_barrier: language });
      if (success) {
        toast.success('Language barrier updated successfully!');
      }
    } else {
      const dbData = { status: "Language Barrier", language_barrier: language };
      const success = await updateLead(languageBarrierLeadId, dbData);
      if (success) {
        toast.success('Language barrier status set successfully!');
      }
    }

    setShowLanguageBarrierModal(false);
    setLanguageBarrierLeadId("");
    setLanguageBarrierLeadName("");
    setIsEditingLanguageBarrier(false);
    setEditingLanguageBarrierInfo("");
  };

  // Handle language barrier modal close
  const handleLanguageBarrierClose = () => {
    setShowLanguageBarrierModal(false);
    setLanguageBarrierLeadId("");
    setLanguageBarrierLeadName("");
    setIsEditingLanguageBarrier(false);
    setEditingLanguageBarrierInfo("");
  };

  // Bulk WhatsApp function
  const sendBulkWhatsApp = async (templateName: string, leadIds: string[]) => {
    if (leadIds.length === 0) {
      toast.error("No leads selected for WhatsApp messaging");
      return;
    }

    const functions = getFunctions(app);
    const sendWhatsappMessageFn = httpsCallable(functions, 'sendWhatsappMessage');
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Show initial toast
    const toastId = toast.loading(`Sending WhatsApp messages to ${leadIds.length} leads...`, {
      position: "top-right",
    });

    try {
      // Process leads in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (leadId) => {
          const lead = leads.find(l => l.id === leadId);
          if (!lead || !lead.phone) {
            errorCount++;
            errors.push(`${lead?.name || 'Unknown'}: No phone number`);
            return;
          }

          try {
            // Format phone number
            let formattedPhone = lead.phone.replace(/\s+/g, "").replace(/[()-]/g, "");
            if (formattedPhone.startsWith("+91")) {
              formattedPhone = formattedPhone.substring(3);
            }
            if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
              formattedPhone = "91" + formattedPhone;
            }

            const messageData = {
              phoneNumber: formattedPhone,
              templateName: templateName,
              leadId: lead.id,
              userId: localStorage.getItem('userName') || 'Unknown',
              userName: localStorage.getItem('userName') || 'Unknown',
              message: `Template message: ${templateName}`,
              customParams: [
                { name: "name", value: lead.name || "Customer" },
                { name: "Channel", value: "AMA Legal Solutions" },
                { name: "agent_name", value: localStorage.getItem('userName') || "Agent" },
                { name: "customer_mobile", value: formattedPhone }
              ],
              channelNumber: "919289622596",
              broadcastName: `${templateName}_bulk_${Date.now()}`
            };

            const result = await sendWhatsappMessageFn(messageData);
            
            if (result.data && (result.data as any).success) {
              successCount++;
            } else {
              errorCount++;
              errors.push(`${lead.name}: Failed to send`);
            }
          } catch (error: any) {
            errorCount++;
            const errorMessage = error.message || error.details || 'Unknown error';
            errors.push(`${lead.name}: ${errorMessage}`);
          }
        });

        await Promise.all(batchPromises);
        
        // Update progress toast
        const progress = Math.min(((i + batchSize) / leadIds.length) * 100, 100);
        toast.update(toastId, {
          render: `Sending WhatsApp messages... ${Math.round(progress)}% complete`,
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < leadIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Show final results
      toast.dismiss(toastId);
      
      if (successCount > 0) {
        toast.success(
          <div>
            <p className="font-medium">Bulk WhatsApp Complete</p>
            <p className="text-sm">
              {successCount} message{successCount !== 1 ? "s" : ""} sent successfully
              {errorCount > 0 && `, ${errorCount} failed`}
            </p>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          }
        );
      } else {
        toast.error(
          <div>
            <p className="font-medium">Bulk WhatsApp Failed</p>
            <p className="text-sm">No messages were sent successfully</p>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          }
        );
      }

      // Log detailed errors if any
      if (errors.length > 0) {
        console.log("WhatsApp sending errors:", errors);
      }

    } catch (error) {
      toast.dismiss(toastId);
      console.error("Error in bulk WhatsApp sending:", error);
      toast.error("Failed to send bulk WhatsApp messages");
    }
  };

  // Selection handlers (from billcutleads)
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) => (prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]));
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    }
  };

  const handleBulkAssign = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to assign");
      return;
    }

    // Check role-based permissions
    const canBulkAssign = userRole === "admin" || userRole === "overlord" || userRole === "salesperson" || userRole === "sales";

    if (!canBulkAssign) {
      toast.error("You don't have permission to bulk assign leads");
      return;
    }

    // For sales users, check if they can only assign unassigned leads or leads assigned to them
    if (userRole === "sales" || userRole === "salesperson") {
      const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';
      const invalidLeads = selectedLeads.filter(leadId => {
        const lead = filteredLeads.find(l => l.id === leadId);
        // Lead is invalid if it's assigned to someone else (not unassigned and not assigned to current user)
        return lead?.assignedTo && 
               lead.assignedTo !== '' && 
               lead.assignedTo !== '-' && 
               lead.assignedTo !== '–' &&
               lead.assignedTo !== currentUserName;
      });

      if (invalidLeads.length > 0) {
        toast.error("You can only assign unassigned leads or leads assigned to you");
        return;
      }
    }

    setShowBulkAssignment(true);
  };

  const handleBulkUnassign = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to unassign");
      return;
    }

    // Check role-based permissions
    const canBulkUnassign = userRole === "admin" || userRole === "overlord" || userRole === "salesperson" || userRole === "sales";

    if (!canBulkUnassign) {
      toast.error("You don't have permission to bulk unassign leads");
      return;
    }

    // For sales users, check if they can only unassign leads assigned to them
    if (userRole === "sales" || userRole === "salesperson") {
      const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';
      const invalidLeads = selectedLeads.filter(leadId => {
        const lead = filteredLeads.find(l => l.id === leadId);
        // Lead is invalid if it's assigned to someone else (not current user)
        return lead?.assignedTo && 
               lead.assignedTo !== '' && 
               lead.assignedTo !== '-' && 
               lead.assignedTo !== '–' &&
               lead.assignedTo !== currentUserName;
      });

      if (invalidLeads.length > 0) {
        toast.error("You can only unassign leads assigned to you");
        return;
      }
    }

    // Confirm unassignment
    if (window.confirm(`Are you sure you want to unassign ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}?`)) {
      bulkUnassignLeads(selectedLeads);
    }
  };

  const handleBulkWhatsApp = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to send WhatsApp messages");
      return;
    }

    // Check role-based permissions
    const canSendWhatsApp = userRole === "admin" || userRole === "overlord" || userRole === "salesperson" || userRole === "sales";

    if (!canSendWhatsApp) {
      toast.error("You don't have permission to send bulk WhatsApp messages");
      return;
    }

    setShowBulkWhatsAppModal(true);
  };

  const executeBulkAssign = () => {
    if (!bulkAssignTarget) {
      toast.error("Please select a salesperson");
      return;
    }

    // Parse the value like in AmaSalespersonCell (id|name format)
    const selected = bulkAssignTarget.split('|');
    const salesPersonId = selected[0];
    const salesPersonName = selected[1];

    if (!salesPersonId || !salesPersonName) {
      toast.error("Invalid salesperson selection");
      return;
    }

    // Find the selected person to validate (check both salesTeamMembers and teamMembers for compatibility)
    let selectedPerson = salesTeamMembers.find((member: any) => 
      (member.id === salesPersonId || (member as any).uid === salesPersonId) && 
      member.name === salesPersonName
    );

    // Fallback to teamMembers if not found in salesTeamMembers
    if (!selectedPerson) {
      selectedPerson = teamMembers.find((member: any) => {
        return (member.id === salesPersonId || (member as any).uid === salesPersonId) && 
               member.name === salesPersonName &&
               (member.role === "salesperson" || member.role === "sales");
      });
    }

    if (!selectedPerson) {
      toast.error("Selected salesperson not found or invalid");
      return;
    }

    bulkAssignLeads(selectedLeads, salesPersonName, salesPersonId);
  };

  // Fetch notes history for AMA leads
  const fetchNotesHistory = async (leadId: string) => {
    try {
      setShowHistoryModal(true);
      const historyCollectionRef = collection(crmDb, 'ama_leads', leadId, 'history');
      const historySnapshot = await getDocs(historyCollectionRef);
      if (historySnapshot.empty) {
        setCurrentHistory([]);
        // Fallback to lastNote/salesNotes when no history
        const fallbackLead = leads.find(l => l.id === leadId);
        const latest = fallbackLead?.lastNote || fallbackLead?.salesNotes || '';
        if (latest) {
          setEditingLeads(prev => ({
            ...prev,
            [leadId]: { ...(prev[leadId] || {}), salesNotes: latest }
          }));
        }
        return;
      }
      const historyData = historySnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        let timestamp = data.timestamp;
        if (timestamp && typeof (timestamp as any).toDate === 'function') timestamp = timestamp.toDate();
        else if (timestamp) timestamp = new Date(timestamp);
        else timestamp = new Date();
        return {
          id: docSnap.id,
          ...data,
          timestamp
        };
      });
      historyData.sort((a, b) => b.timestamp - a.timestamp);
      setCurrentHistory(historyData);

      // Set latest content from history into the sales notes textarea
      const latestNoteEntry = historyData.find((item: any) => typeof item.content === 'string' && item.content.trim() !== '');
      const latestContent = latestNoteEntry?.content || '';
      const fallbackLead = leads.find(l => l.id === leadId);
      const contentToUse = latestContent || fallbackLead?.lastNote || fallbackLead?.salesNotes || '';
      setEditingLeads(prev => ({
        ...prev,
        [leadId]: { ...(prev[leadId] || {}), salesNotes: contentToUse }
      }));
    } catch (e) {
      toast.error('Failed to load history');
      setCurrentHistory([]);
      // Fallback to lastNote/salesNotes on error
      const fallbackLead = leads.find(l => l.id === leadId);
      const latest = fallbackLead?.lastNote || fallbackLead?.salesNotes || '';
      if (latest) {
        setEditingLeads(prev => ({
          ...prev,
          [leadId]: { ...(prev[leadId] || {}), salesNotes: latest }
        }));
      }
    }
  };

  // Sorting request handler
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  // Delete lead
  const deleteLead = async (leadId: string) => {
    try {
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      await deleteDoc(doc(crmDb, 'ama_leads', leadId));
      toast.success('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting AMA lead:', error);
      fetchAmaLeads(false);
      toast.error('Failed to delete lead');
    }
  };

  // Load all leads (fetch in pages)
  const loadAllLeads = async () => {
    if (isLoadAllLoading) return;
    setIsLoadAllLoading(true);
    try {
      let all: any[] = [];
      let last: DocumentSnapshot | null = null;
      let more = true;
      while (more) {
        const q = buildQuery(true, last);
        const snap = await getDocs(q);
        if (snap.empty) { more = false; break; }
        const chunk = snap.docs.map((docSnap) => {
          const d = docSnap.data() as any;
          return {
            id: docSnap.id,
            name: d.name || "",
            email: d.email || "",
            phone: String(d.mobile || d.phone || ""),
            address: d.address || "",
            city: d.city || "",
            status: d.status || "No Status",
            source: d.source || "",
            source_database: d.source_database || d.source || "",
            assignedTo: d.assigned_to || d.assignedTo || "",
            assignedToId: d.assignedToId,
            salesNotes: d.lastNote || d.salesNotes || "",
            lastNote: d.lastNote || "",
            query: d.query || "",
            language_barrier: d.language_barrier,
            convertedAt: d.convertedAt,
            lastModified: d.lastModified,
            synced_at: d.date ? new Date(d.date) : undefined,
            // Debt fields
            debt_Range: d.debt_Range,
            debt_range: d.debt_range,
            debtRange: d.debtRange,
            date: d.date || Date.now(),
          } as any;
        });
        all = [...all, ...chunk];
        last = snap.docs[snap.docs.length - 1];
        more = snap.docs.length === LEADS_PER_PAGE;
      }
      setLeads(all);
      toast.success(`Loaded all ${all.length} leads successfully`);
    } catch (e) {
      toast.error('Failed to load all leads');
    } finally {
      setIsLoadAllLoading(false);
    }
  };

  // Sidebar
  const SidebarComponent = () => {
    if (userRole === 'admin') return AdminSidebar;
    if (userRole === 'overlord') return OverlordSidebar;
    return SalesSidebar;
  };

  // Export CSV
  const exportToCSV = () => {
    try {
      if (userRole !== 'admin' && userRole !== 'overlord') {
        toast.error("You don't have permission to export data");
        return;
      }
      const csvData = filteredLeads.map((l) => ({
        Name: l.name || '',
        Email: l.email || '',
        Phone: l.phone || '',
        City: l.city || '',
        Status: l.status || '',
        Source: l.source_database || '',
        'Assigned To': l.assignedTo || 'Unassigned',
        'Remarks': l.query || '',
        'Sales Notes': l.salesNotes || '',
        'Last Modified': l.lastModified instanceof Date ? l.lastModified.toLocaleString() : '',
      }));

      if (csvData.length === 0) {
        toast.info('No data to export');
        return;
      }

      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map((obj) => Object.values(obj).map((v) => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `ama-leads-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      toast.success('Export completed successfully');
    } catch (e) {
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="flex h-screen bg-[#F8F5EC] text-[#5A4C33] w-full text-sm">
      {(() => {
        const Component = SidebarComponent();
        return Component ? <Component /> : null;
      })()}
      <div className="flex-1 overflow-auto px-3">
        <div className="w-full max-w-none mx-auto">
          <LeadsHeader
            isLoading={isLoading}
            userRole={userRole}
            currentUser={currentUser}
            exportToCSV={exportToCSV}
            loadAllLeads={loadAllLeads}
            isLoadAllLoading={isLoadAllLoading}
          />
          
          <AmaLeadsTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            callbackCount={databaseCallbackCount}
            allLeadsCount={searchQuery ? searchResultsCount : (databaseFilteredCount || totalLeadsCount)}
          />
          
          {(() => {
            const countToShow = searchQuery ? searchResultsCount : databaseFilteredCount;
            console.log("🔢 Count being passed to AmaLeadsFilters:", {
              searchQuery,
              searchResultsCount,
              databaseFilteredCount,
              countToShow,
              hasSearchQuery: !!searchQuery
            });
            return null;
          })()}
          
          <LeadsFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            salesPersonFilter={salesPersonFilter}
            setSalesPersonFilter={setSalesPersonFilter}
            statusOptions={statusOptions}
            teamMembers={teamMembers as any}
            userRole={userRole}
            filteredLeads={filteredLeads as any}
            leads={leads as any}
            totalLeadsCount={totalLeadsCount}
            convertedFilter={convertedFilter}
            setConvertedFilter={setConvertedFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            onSearchResults={handleSearchResults}
            isSearching={isSearching}
            setIsSearching={setIsSearching}
            allLeadsCount={searchQuery ? searchResultsCount : (databaseFilteredCount || totalLeadsCount)}
            onSearchCleared={handleSearchCleared}
          />
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D2A02A]"></div>
            </div>
          ) : (
            <>
              <AmaLeadsTable
                filteredLeads={filteredLeads as any}
                editingLeads={editingLeads}
                setEditingLeads={setEditingLeads}
                updateLead={updateLead}
                fetchNotesHistory={fetchNotesHistory}
                requestSort={requestSort}
                sortConfig={sortConfig}
                statusOptions={statusOptions}
                userRole={userRole}
                salesTeamMembers={salesTeamMembers}
                assignLeadToSalesperson={assignLeadToSalesperson}
                unassignLead={unassignLead}
                updateLeadsState={updateLeadsState}
                crmDb={crmDb}
                user={currentUser}
                deleteLead={deleteLead}
                activeTab={activeTab}
                selectedLeads={selectedLeads}
                handleSelectLead={handleSelectLead}
                handleSelectAll={handleSelectAll}
                handleBulkAssign={handleBulkAssign}
                executeBulkAssign={executeBulkAssign}
                showBulkAssignment={showBulkAssignment}
                bulkAssignTarget={bulkAssignTarget}
                setBulkAssignTarget={setBulkAssignTarget}
                setShowBulkAssignment={setShowBulkAssignment}
                bulkUnassignLeads={bulkUnassignLeads}
                handleBulkUnassign={handleBulkUnassign}
                onStatusChangeConfirmation={handleStatusChangeConfirmation}
                onStatusChangeToCallback={handleStatusChangeToCallback}
                onStatusChangeToLanguageBarrier={handleStatusChangeToLanguageBarrier}
                refreshLeadCallbackInfo={refreshLeadCallbackInfo}
                handleBulkWhatsApp={handleBulkWhatsApp}
              />
              <div ref={loadMoreRef} className="h-6"></div>
            </>
          )}
          <AmaHistoryModal 
            showHistoryModal={showHistoryModal}
            setShowHistoryModal={setShowHistoryModal}
            currentHistory={currentHistory}
          />
          <AmaStatusChangeConfirmationModal
            isOpen={!!statusConfirmLeadId}
            onClose={handleStatusConfirmationClose}
            onConfirm={handleStatusConfirmation}
            leadName={statusConfirmLeadName}
            newStatus={pendingStatusChange}
            isLoading={isUpdatingStatus}
          />
          <AmaCallbackSchedulingModal
            isOpen={showCallbackModal}
            onClose={handleCallbackClose}
            onConfirm={handleCallbackConfirm}
            leadId={callbackLeadId}
            leadName={callbackLeadName}
            crmDb={crmDb}
            isEditing={isEditingCallback}
            existingCallbackInfo={editingCallbackInfo}
          />
          <AmaLanguageBarrierModal
            isOpen={showLanguageBarrierModal}
            onClose={handleLanguageBarrierClose}
            onConfirm={handleLanguageBarrierConfirm}
            leadId={languageBarrierLeadId}
            leadName={languageBarrierLeadName}
            existingLanguage={editingLanguageBarrierInfo}
          />
          <AmaBulkWhatsAppModal
            isOpen={showBulkWhatsAppModal}
            onClose={() => setShowBulkWhatsAppModal(false)}
            selectedLeads={selectedLeads.map(id => filteredLeads.find(lead => lead.id === id)).filter(Boolean)}
            onSendBulkWhatsApp={sendBulkWhatsApp}
          />
        </div>
      </div>
    </div>
  );
};

export default AmaLeadsPage; 