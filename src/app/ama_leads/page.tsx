"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

// Shared components from sales/leads for consistent design
import LeadsHeader from "./components/AmaLeadsHeader";
import LeadsFilters from "./components/AmaLeadsFilters";
// Keep our AMA-specific table for now
import AmaLeadsTable from "./components/AmaLeadsTable";
import AdminSidebar from "@/components/navigation/AdminSidebar";
import SalesSidebar from "@/components/navigation/SalesSidebar";
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import AmaHistoryModal from "./components/AmaHistoryModal";

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

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesPersonFilter, setSalesPersonFilter] = useState("all");
  const [convertedFilter, setConvertedFilter] = useState<boolean | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
          .map((doc) => ({ id: doc.id, ...doc.data() } as any))
          .filter((user: any) => user.role === "salesperson" || user.role === "admin" || user.role === "overlord") as User[];
        // Sort by name
        (usersData as any).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
        setTeamMembers(usersData);
        const salesPersonnel = usersData.filter((u: any) => u.role === 'salesperson');
        setSalesTeamMembers(salesPersonnel as any);
      } catch (error) {
        console.error("Error fetching team members: ", error);
        toast.error("Failed to load team members");
      }
    };
    fetchTeamMembers();
  }, []);

  // Build query based on filters
  const buildQuery = useCallback(
    (isLoadMore = false, lastDocument: DocumentSnapshot | null = null) => {
      const baseQuery = collection(crmDb, "ama_leads");
      const constraints: any[] = [];

      // Date range uses 'date' epoch ms from normalized doc
      if (fromDate) {
        const fromDateStart = new Date(fromDate);
        fromDateStart.setHours(0, 0, 0, 0);
        constraints.push(where("date", ">=", fromDateStart.getTime()));
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        constraints.push(where("date", "<=", toDateEnd.getTime()));
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "No Status") {
          constraints.push(where("status", "in", ["", "–", "No Status"]));
        } else {
          constraints.push(where("status", "==", statusFilter));
        }
      }

      // Salesperson filter
      if (salesPersonFilter !== "all") {
        if (salesPersonFilter === "") {
          constraints.push(where("assignedTo", "in", ["", null, "-"] as any));
        } else {
          constraints.push(where("assignedTo", "==", salesPersonFilter));
        }
      }

      // Sorting and pagination
      constraints.push(orderBy("date", sortConfig.direction === 'ascending' ? 'asc' : 'desc'));
      constraints.push(limit(LEADS_PER_PAGE));
      if (isLoadMore && lastDocument) constraints.push(startAfter(lastDocument));

      return query(baseQuery, ...constraints);
    }, [fromDate, toDate, statusFilter, salesPersonFilter, sortConfig]
  );

  // Fetch total count for display
  const fetchTotalCount = useCallback(async () => {
    try {
      const countQuery = query(collection(crmDb, "ama_leads"));
      const snapshot = await getDocs(countQuery);
      setTotalLeadsCount(snapshot.size);
    } catch (e) {
      setTotalLeadsCount(0);
    }
  }, []);

  // Fetch leads
  const fetchAmaLeads = useCallback(async (isLoadMore = false) => {
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
        } as any;
      });

      setLeads((prev) => (isLoadMore ? [...prev, ...fetchedLeads] : fetchedLeads));

      const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastDoc(lastDocument);
      setHasMoreLeads(querySnapshot.docs.length === LEADS_PER_PAGE);

      // Initialize editing state for notes
      const initialEditingState: {[key:string]: any} = {};
      (isLoadMore ? fetchedLeads : fetchedLeads).forEach((lead) => {
        initialEditingState[lead.id] = {
          ...(initialEditingState[lead.id] || {}),
          salesNotes: lead.salesNotes || ''
        };
      });
      setEditingLeads((prev) => isLoadMore ? ({ ...prev, ...initialEditingState }) : initialEditingState);

      // Prefill from history for leads without lastNote/salesNotes
      const leadsNeedingHistory = fetchedLeads.filter((l) => !(l.lastNote && l.lastNote.trim()) && !(l.salesNotes && l.salesNotes.trim()));
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
  }, [buildQuery, lastDoc, fetchTotalCount]);

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
  }, [fromDate, toDate, statusFilter, salesPersonFilter, sortConfig]);

  // Filter function to match sales/leads behavior
  const applyFilters = useCallback(() => {
    if (!leads || leads.length === 0) return [] as any[];

    let result = [...leads];

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(lead => lead.source_database === sourceFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'No Status') {
        result = result.filter(lead => !lead.status || lead.status === '' || lead.status === 'No Status');
      } else {
        result = result.filter(lead => lead.status === statusFilter);
      }
    }

    // Salesperson filter
    if (salesPersonFilter !== 'all') {
      if (salesPersonFilter === '') {
        result = result.filter(lead => !lead.assignedTo || lead.assignedTo === '' || lead.assignedTo === '-');
      } else {
        result = result.filter(lead => lead.assignedTo === salesPersonFilter);
      }
    }

    // Converted filter
    if (convertedFilter !== null) {
      result = result.filter(lead => (lead.convertedToClient === convertedFilter));
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(lead => {
        const name = lead.name || '';
        const email = lead.email || '';
        const phone = lead.phone || '';
        return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
      });
    }

    // Date range filter (using mapped synced_at or date)
    if (fromDate || toDate) {
      const fromDateTime = fromDate ? new Date(fromDate) : null;
      if (fromDateTime) fromDateTime.setHours(0, 0, 0, 0);
      const toDateTime = toDate ? new Date(toDate) : null;
      if (toDateTime) toDateTime.setHours(23, 59, 59, 999);

      result = result.filter(lead => {
        const leadDate = lead.synced_at || lead.date || lead.lastModified || lead.createdAt;
        if (!leadDate) return false;
        let dateObj: Date;
        if (leadDate.toDate) dateObj = leadDate.toDate();
        else if (leadDate instanceof Date) dateObj = leadDate;
        else dateObj = new Date(leadDate);
        if (isNaN(dateObj.getTime())) return false;
        if (fromDateTime && toDateTime) return dateObj >= fromDateTime && dateObj <= toDateTime;
        if (fromDateTime) return dateObj >= fromDateTime;
        if (toDateTime) return dateObj <= toDateTime;
        return true;
      });
    }

    // Sorting by date or name
    result.sort((a, b) => {
      if (sortConfig.key === 'name') {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (an > bn) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      }
      // default date-based
      const aDate = a.synced_at || a.date || a.lastModified || a.createdAt;
      const bDate = b.synced_at || b.date || b.lastModified || b.createdAt;
      const aD = aDate instanceof Date ? aDate : new Date(aDate);
      const bD = bDate instanceof Date ? bDate : new Date(bDate);
      return sortConfig.direction === 'ascending' ? aD.getTime() - bD.getTime() : bD.getTime() - aD.getTime();
    });

    return result;
  }, [leads, sourceFilter, statusFilter, salesPersonFilter, convertedFilter, searchQuery, fromDate, toDate, sortConfig]);

  // Apply filters with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setFilteredLeads(applyFilters());
    }, 100);
    return () => clearTimeout(t);
  }, [leads, applyFilters]);

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
        assignedTo: salesPersonName,
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
        assigned_to: '',
        assignedTo: '',
        assignedToId: '',
        lastModified: serverTimestamp()
      } as any);

      const updateFn = (arr: any[]) => arr.map((l) => l.id === leadId ? { ...l, assignedTo: '', assignedToId: '', lastModified: new Date() } : l);
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
          assignedTo: salesPersonName,
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
               lead.assignedTo !== currentUserName;
      });

      if (invalidLeads.length > 0) {
        toast.error("You can only assign unassigned leads or leads assigned to you");
        return;
      }
    }

    setShowBulkAssignment(true);
  };

  const executeBulkAssign = () => {
    if (!bulkAssignTarget) {
      toast.error("Please select a salesperson");
      return;
    }

    // Find the selected person
    let selectedPerson;
    
    if (userRole === "admin" || userRole === "overlord") {
      // Admin/overlord can assign to anyone with sales role
      selectedPerson = teamMembers.find((member) => 
        member.name === bulkAssignTarget && (member.role === "salesperson" || member.role === "sales")
      );
    } else if (userRole === "sales" || userRole === "salesperson") {
      // Sales can only assign to themselves
      const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';
      selectedPerson = teamMembers.find((member) => 
        member.name === bulkAssignTarget && 
        member.name === currentUserName && 
        (member.role === "salesperson" || member.role === "sales")
      );
      
      if (!selectedPerson) {
        toast.error("You can only assign leads to yourself");
        return;
      }
    }

    if (!selectedPerson) {
      toast.error("Selected salesperson not found or invalid");
      return;
    }

    bulkAssignLeads(selectedLeads, bulkAssignTarget, selectedPerson.id);
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
  const SidebarComponent = useMemo(() => {
    if (userRole === 'admin') return AdminSidebar;
    if (userRole === 'overlord') return OverlordSidebar;
    return SalesSidebar;
  }, [userRole]);

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
    <div className="flex h-screen bg-gray-950 text-white w-full text-sm">
      {SidebarComponent && <SidebarComponent />}
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
          />
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
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
                activeTab={'all'}
                selectedLeads={selectedLeads}
                handleSelectLead={handleSelectLead}
                handleSelectAll={handleSelectAll}
                handleBulkAssign={handleBulkAssign}
                executeBulkAssign={executeBulkAssign}
                showBulkAssignment={showBulkAssignment}
                bulkAssignTarget={bulkAssignTarget}
                setBulkAssignTarget={setBulkAssignTarget}
                setShowBulkAssignment={setShowBulkAssignment}
              />
              <div ref={loadMoreRef} className="h-6"></div>
            </>
          )}
          <AmaHistoryModal 
            showHistoryModal={showHistoryModal}
            setShowHistoryModal={setShowHistoryModal}
            currentHistory={currentHistory}
          />
        </div>
      </div>
    </div>
  );
};

export default AmaLeadsPage; 