'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppLead } from './types';
import AppLeadsTable from './components/AppLeadsTable';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import AdminSidebar from "@/components/navigation/AdminSidebar";
import SalesSidebar from "@/components/navigation/SalesSidebar";
import AppLeadsHistoryModal from './components/AppLeadsHistoryModal';
import { FiSearch, FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { authFetch } from '@/lib/authFetch';

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

export default function AppLeadsPage() {
  const { userRole, user, userName, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<AppLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastCreatedAt, setLastCreatedAt] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLeadId, setHistoryLeadId] = useState<string | null>(null);
  const [historyLeadName, setHistoryLeadName] = useState<string | null>(null);

  // Export to CSV function
  const exportToCSV = async () => {
    try {
      setExporting(true);
      setExportProgress('Starting...');
      
      let allLeads: any[] = [];
      let hasMore = true;
      let lastCreatedAtVal = null;
      let lastIdVal = null;
      const CHUNK_SIZE = 1000;

      // For search, we can't paginate efficiently with current backend implementation,
      // so we'll just try to fetch a reasonable max amount to avoid timeouts.
      // If no search, we paginate until done.
      const isSearch = !!searchQuery;
      const effectiveLimit = isSearch ? '5000' : String(CHUNK_SIZE);

      while (hasMore) {
        setExportProgress(`Fetched ${allLeads.length} records...`);
        const params = new URLSearchParams({ limit: effectiveLimit });
        
        if (searchQuery) {
          params.append('search', searchQuery);
        } else if (lastCreatedAtVal && lastIdVal) {
           params.append('lastCreatedAt', lastCreatedAtVal);
           params.append('lastId', lastIdVal);
        }

        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const response = await authFetch(`/api/app-leads?${params.toString()}`, { cache: 'no-store' });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const newLeads = data.leads;
        allLeads = [...allLeads, ...newLeads];
        
        if (newLeads.length > 0) {
            const lastLead = newLeads[newLeads.length - 1];
            lastCreatedAtVal = lastLead.created_at;
            lastIdVal = lastLead.id;
        }

        // If it's search, we stop after one batch because backend doesn't support search pagination yet
        if (isSearch || !data.hasMore || newLeads.length === 0) {
            hasMore = false;
        }
      }

      setExportProgress('Generating CSV...');

      const csvData = allLeads.map((lead: any) => ({
        "ID": lead.id || "",
        "Created At": lead.created_at ? new Date(lead.created_at).toLocaleString() : "",
        "Name": lead.name || "",
        "Phone": lead.phone || "",
        "Email": lead.email || "",
        "State": lead.state || "",
        "Status": lead.status || "",
        "Remarks": lead.remarks || "",
        "Source": lead.source || "",
        "Query": lead.query || "",
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
      a.setAttribute("download", `app-leads-export-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setExportProgress('');

    } catch (err) {
      console.error('Failed to export leads:', err);
      alert('Failed to export leads. Please try again.');
    } finally {
      setExporting(false);
      setExportProgress('');
    }
  };

  const handleUpdateLead = async (id: string, updates: Partial<AppLead>) => {
    try {
      const response = await authFetch('/api/app-leads', {
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
        throw new Error('Failed to update lead');
      }

      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
      );
      toast.success('Lead updated successfully');
    } catch (err) {
      console.error('Error updating lead:', err);
      toast.error('Failed to update lead');
    }
  };

  const fetchLeads = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '50' });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      } else if (isLoadMore && lastCreatedAt && lastId) {
        params.append('lastCreatedAt', lastCreatedAt.toString());
        params.append('lastId', lastId);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await authFetch(`/api/app-leads?${params.toString()}`, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTotal(data.total);
      
      if (isLoadMore) {
        setLeads(prev => [...prev, ...data.leads]);
      } else {
        setLeads(data.leads);
      }

      setHasMore(data.hasMore);

      if (data.leads.length > 0) {
        const lastLead = data.leads[data.leads.length - 1];
        setLastCreatedAt(lastLead.created_at);
        setLastId(lastLead.id);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [lastCreatedAt, lastId, searchQuery, statusFilter]);

  useEffect(() => {
    if (!authLoading && userRole !== 'admin' && userRole !== 'overlord' && userRole !== 'sales' && userRole !== 'salesperson') {
      router.push('/login');
    }
  }, [userRole, authLoading, router]);

  useEffect(() => {
    // Initial load or filter change
    setLastCreatedAt(null);
    setLastId(null);
    fetchLeads(false);
  }, [searchQuery, statusFilter]);

  const handleLoadMore = () => {
    fetchLeads(true);
  };

  const handleViewHistory = (leadId: string, leadName: string) => {
    setHistoryLeadId(leadId);
    setHistoryLeadName(leadName);
    setShowHistoryModal(true);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const content = (
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">App Leads</h1>
                <div className="flex items-center space-x-3">
                  <div className="bg-[#D2A02A] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                  Total Leads: {total.toLocaleString()}
                  </div>
                  <button
                    onClick={exportToCSV}
                    disabled={exporting}
                    className={`flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A] ${
                      exporting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <FiDownload className={`mr-2 h-4 w-4 ${exporting ? 'animate-bounce' : ''}`} />
                    {exporting ? (exportProgress || 'Exporting...') : 'Export CSV'}
                  </button>
                </div>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="text-black block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
                      placeholder="Search by name or phone number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">Status:</label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
                  >
                    <option value="all">All Status</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="text-xs text-[#D2A02A] hover:underline"
                >
                  Clear Filters
                </button>
            </div>
        </header>
        
        <main className="flex-1 p-6">
          <div className="space-y-6">
             {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
             )}
             
             <AppLeadsTable 
                leads={leads} 
                hasMore={hasMore} 
                loading={loading} 
                loadMore={handleLoadMore}
                statusOptions={statusOptions}
                onUpdateLead={handleUpdateLead}
                onViewHistory={handleViewHistory}
             />
          </div>
        </main>

        <AppLeadsHistoryModal 
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          leadId={historyLeadId || ""}
          leadName={historyLeadName || ""}
        />
      </div>
  );

  if (userRole === 'admin') {
    return (
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
             {content}
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'sales' || userRole === 'salesperson') {
    return (
      <div className="flex h-screen bg-gray-100">
        <SalesSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
             {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <OverlordSidebar>
      {content}
    </OverlordSidebar>
  );
}
