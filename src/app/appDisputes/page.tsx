'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Dispute } from './types';
import DisputesTable from './components/DisputesTable';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import AdminSidebar from "@/components/navigation/AdminSidebar";
import SalesSidebar from "@/components/navigation/SalesSidebar";
import AppLeadsHistoryModal from '../appLeads/components/AppLeadsHistoryModal';
import AmaBulkWhatsAppModal from '../ama_leads/components/AmaBulkWhatsAppModal';
import { FiSearch, FiDownload } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/firebase';
import { authFetch } from '@/lib/authFetch';
import QueryViewModal from './components/QueryViewModal';

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
]

export default function DisputesPage() {
  const { userRole, user, userName, loading: authLoading } = useAuth();
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDisputeId, setHistoryDisputeId] = useState<string | null>(null);
  const [historyDisputeName, setHistoryDisputeName] = useState<string | null>(null);

  // Selection & Bulk WhatsApp State
  const [selectedDisputes, setSelectedDisputes] = useState<string[]>([]);
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Query Modal State
  const [selectedQuery, setSelectedQuery] = useState<{ text: string; name: string } | null>(null);

  // Export to CSV function
  const exportToCSV = async () => {
    try {
      setExporting(true);
      setExportProgress('Starting...');
      
      let allDisputes: any[] = [];
      let hasMore = true;
      let lastSubmittedAtVal = null;
      let lastIdVal = null;
      const CHUNK_SIZE = 1000;

      const isSearch = !!searchQuery;
      const effectiveLimit = isSearch ? '5000' : String(CHUNK_SIZE);

      while (hasMore) {
        setExportProgress(`Fetched ${allDisputes.length} records...`);
        const params = new URLSearchParams({ limit: effectiveLimit });
        
        if (searchQuery) {
          params.append('search', searchQuery);
        } else if (lastSubmittedAtVal && lastIdVal) {
           params.append('lastSubmittedAt', lastSubmittedAtVal);
           params.append('lastId', lastIdVal);
        }

        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const response = await authFetch(`/api/disputes?${params.toString()}`, { cache: 'no-store' });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const newDisputes = data.disputes;
        allDisputes = [...allDisputes, ...newDisputes];
        
        if (newDisputes.length > 0) {
            const lastDispute = newDisputes[newDisputes.length - 1];
            lastSubmittedAtVal = lastDispute.submittedAt;
            lastIdVal = lastDispute.id;
        }

        if (isSearch || !data.hasMore || newDisputes.length === 0) {
            hasMore = false;
        }
      }

      setExportProgress('Generating CSV...');

      const csvData = allDisputes.map((dispute: any) => ({
        "ID": dispute.id || "",
        "Submitted At": dispute.submittedAt ? new Date(dispute.submittedAt).toLocaleString() : "",
        "Name": dispute.name || "",
        "Phone": dispute.phone || "",
        "Registered Email": dispute.userEmail || "",
        "Registered Phone": dispute.userPhone || "",
        "Service": dispute.selected_service || "",
        "Status": dispute.status || "",
        "Remarks": dispute.remarks || "",
        "Query": dispute.query || "",
      }));

      if (csvData.length === 0) {
        alert("No data to export");
        return;
      }

      const headers = Object.keys(csvData[0]).join(",");
      const rows = csvData.map((obj: any) =>
        Object.values(obj)
          .map((value: any) => (typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value))
          .join(",")
      );

      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `disputes-export-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setExportProgress('');

    } catch (err) {
      console.error('Failed to export disputes:', err);
      alert('Failed to export disputes. Please try again.');
    } finally {
      setExporting(false);
      setExportProgress('');
    }
  };

  const handleUpdateDispute = async (id: string, updates: Partial<Dispute>) => {
    try {
      const response = await authFetch('/api/disputes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          ...updates,
          user: {
            uid: user?.uid,
            name: userName
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update dispute');
      }

      setDisputes((prev) =>
        prev.map((dispute) => (dispute.id === id ? { ...dispute, ...updates } : dispute))
      );
      toast.success('Dispute updated successfully');
    } catch (err) {
      console.error('Error updating dispute:', err);
      toast.error('Failed to update dispute');
    }
  };

  const fetchDisputes = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '50' });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      } else if (isLoadMore && lastSubmittedAt && lastId) {
        params.append('lastSubmittedAt', lastSubmittedAt.toString());
        params.append('lastId', lastId);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await authFetch(`/api/disputes?${params.toString()}`, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTotal(data.total);
      
      if (isLoadMore) {
        setDisputes(prev => [...prev, ...data.disputes]);
      } else {
        setDisputes(data.disputes);
      }

      setHasMore(data.hasMore);

      if (data.disputes.length > 0) {
        const lastDispute = data.disputes[data.disputes.length - 1];
        setLastSubmittedAt(lastDispute.submittedAt);
        setLastId(lastDispute.id);
      }
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [lastSubmittedAt, lastId, searchQuery, statusFilter]);

  useEffect(() => {
    if (!authLoading && userRole !== 'admin' && userRole !== 'overlord' && userRole !== 'sales' && userRole !== 'salesperson') {
      router.push('/login');
    }
  }, [userRole, authLoading, router]);

  useEffect(() => {
    setLastSubmittedAt(null);
    setLastId(null);
    fetchDisputes(false);
  }, [searchQuery, statusFilter]);

  const handleLoadMore = () => {
    fetchDisputes(true);
  };

  const handleViewHistory = (disputeId: string, disputeName: string) => {
    setHistoryDisputeId(disputeId);
    setHistoryDisputeName(disputeName);
    setShowHistoryModal(true);
  };

  const handleOpenWhatsApp = (dispute: Dispute) => {
    setSelectedDisputes([dispute.id]);
    setShowBulkWhatsAppModal(true);
  };

  const handleSelectDispute = (id: string) => {
    setSelectedDisputes(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDisputes.length === disputes.length) {
      setSelectedDisputes([]);
    } else {
      setSelectedDisputes(disputes.map(d => d.id));
    }
  };

  const handleViewQuery = (text: string, name: string) => {
    setSelectedQuery({ text, name });
  };

  const handleSendBulkWhatsApp = async (templateName: string, leadIds: string[], leadData?: any[]) => {
    try {
      const sendWhatsappMessageFn = httpsCallable(functions, "sendWhatsappMessage");
      let successCount = 0;
      let failCount = 0;

      const toastId = toast.loading("Sending bulk WhatsApp messages...");
      const leadsToProcess = leadData || [];

      const promises = leadsToProcess.map(async (lead: any) => {
        try {
          const messageData = {
            phoneNumber: lead.phone, // Already formatted by modal
            templateName: templateName,
            leadId: lead.id,
            userId: userName || "Unknown",
            userName: userName || "Unknown",
            message: `Template message: ${templateName}`,
            customParams: [
              { name: "name", value: lead.name || "Customer" },
              { name: "Channel", value: "AMA Legal Solutions" },
              { name: "agent_name", value: userName || "Agent" },
              { name: "customer_mobile", value: lead.phone },
            ],
            channelNumber: "919289622596",
            broadcastName: `${templateName}_${Date.now()}_bulk`,
          };

          const result = await sendWhatsappMessageFn(messageData);
          if (result.data && (result.data as any).success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
          console.error(`Error sending to ${lead.name}:`, err);
        }
      });

      await Promise.all(promises);

      toast.update(toastId, {
        render: `Sent ${successCount} messages. ${failCount > 0 ? `${failCount} failed.` : ""}`,
        type: failCount === 0 ? "success" : "warning",
        isLoading: false,
        autoClose: 4000
      });

      if (successCount > 0) {
        setSelectedDisputes([]);
        setShowBulkWhatsAppModal(false);
      }
    } catch (error) {
      console.error("Bulk send error:", error);
      toast.error("Failed to initiate bulk sending");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F5EC] text-[#5A4C33] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#D2A02A] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[#5A4C33]/70">Loading...</span>
        </div>
      </div>
    );
  }

  const SidebarComponent = () => {
    if (userRole === 'admin') return AdminSidebar;
    if (userRole === 'overlord') return OverlordSidebar;
    return SalesSidebar;
  };
  const Sidebar = SidebarComponent();

  return (
    <div className="flex h-screen bg-[#F8F5EC] overflow-hidden font-sans text-[#5A4C33]">
      {/* Mobile sidebar overlay backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - slides in on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        md:relative md:z-auto md:translate-x-0 md:transform-none
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">

        {/* ── Header ── */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-[#5A4C33]/15 px-4 md:px-6 py-3 md:py-4 shadow-sm space-y-3 sticky top-0 z-30">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 text-[#5A4C33]/60 hover:text-[#5A4C33] hover:bg-[#D2A02A]/10 rounded-lg transition-all"
                aria-label="Toggle menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#5A4C33] tracking-tight leading-tight">App Disputes</h1>
                <p className="text-xs text-[#5A4C33]/50 font-medium hidden sm:block">Manage and track dispute leads</p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* Total badge */}
              <div className="bg-[#D2A02A] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm">
                Total: {total.toLocaleString()}
              </div>

              {/* Export button */}
              <button
                onClick={exportToCSV}
                disabled={exporting}
                className={`flex items-center gap-1.5 px-3 py-1.5 border border-[#D2A02A]/40 rounded-lg text-xs font-medium text-[#5A4C33] bg-white hover:bg-[#D2A02A]/10 focus:outline-none focus:ring-2 focus:ring-[#D2A02A]/40 transition-colors ${
                  exporting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FiDownload className={`h-3.5 w-3.5 ${exporting ? 'animate-bounce' : ''}`} />
                {exporting ? (exportProgress || '...') : 'Export'}
              </button>

              {/* Bulk WhatsApp */}
              {selectedDisputes.length > 0 && (
                <button
                  onClick={() => setShowBulkWhatsAppModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <FaWhatsapp className="h-3.5 w-3.5" />
                  Bulk ({selectedDisputes.length})
                </button>
              )}
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-[#5A4C33]/40" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-2 text-sm border border-[#5A4C33]/20 rounded-lg bg-white text-[#5A4C33] placeholder-[#5A4C33]/40 focus:outline-none focus:ring-2 focus:ring-[#D2A02A]/40 focus:border-[#D2A02A] transition-colors"
                placeholder="Search by name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="statusFilter" className="text-xs font-semibold text-[#5A4C33]/70 whitespace-nowrap">Status:</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-[#5A4C33]/20 bg-white text-[#5A4C33] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D2A02A]/40 focus:border-[#D2A02A] transition-colors"
              >
                <option value="all">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-xs font-semibold text-[#D2A02A] hover:text-[#B8891A] hover:underline transition-colors whitespace-nowrap"
            >
              Clear Filters
            </button>
          </div>
        </header>

        {/* ── Main table area ── */}
        <div className="p-3 md:px-6 md:py-4 flex flex-col gap-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
              <strong className="font-semibold">Error: </strong>
              <span>{error}</span>
            </div>
          )}

          <div className="bg-white/30 backdrop-blur-sm rounded-xl border border-[#5A4C33]/10 shadow-inner overflow-auto">
            <DisputesTable
              disputes={disputes}
              hasMore={hasMore}
              loading={loading}
              loadMore={handleLoadMore}
              statusOptions={statusOptions}
              onUpdateDispute={handleUpdateDispute}
              onViewHistory={handleViewHistory}
              onOpenWhatsApp={handleOpenWhatsApp}
              selectedDisputes={selectedDisputes}
              onSelectDispute={handleSelectDispute}
              onSelectAll={handleSelectAll}
              onViewQuery={handleViewQuery}
            />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AppLeadsHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        leadId={historyDisputeId || ""}
        leadName={historyDisputeName || ""}
        apiPath="/api/disputes"
      />

      <AmaBulkWhatsAppModal
        isOpen={showBulkWhatsAppModal}
        onClose={() => setShowBulkWhatsAppModal(false)}
        selectedLeads={disputes.filter(d => selectedDisputes.includes(d.id))}
        onSendBulkWhatsApp={handleSendBulkWhatsApp}
        onSuccess={() => setSelectedDisputes([])}
      />

      <QueryViewModal
        isOpen={!!selectedQuery}
        onClose={() => setSelectedQuery(null)}
        query={selectedQuery?.text || ''}
        name={selectedQuery?.name || ''}
      />
    </div>
  );
}
