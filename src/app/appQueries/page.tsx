'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppQuery } from './types';
import AppQueriesList from './components/AppQueriesList';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import { FiSearch } from 'react-icons/fi';
import { authFetch } from '@/lib/authFetch';

export default function AppQueriesPage() {
  const [queries, setQueries] = useState<AppQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchQueries = useCallback(async (isLoadMore = false, query = '', status = 'all') => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '20' });
      
      // Add a random timestamp to bust cache
      params.append('_t', Date.now().toString());
      
      if (query) params.append('search', query);
      if (status && status !== 'all') params.append('status', status);

      const hasComplexFilters = (status !== 'all');

      if (isLoadMore && lastSubmittedAt && lastId && !hasComplexFilters) {
        params.append('lastSubmittedAt', lastSubmittedAt.toString());
        params.append('lastId', lastId);
      }

      // Fetch with no-store to ensure we always get fresh data from our dynamic API
      const response = await authFetch(`/api/app-queries?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTotal(data.total);
      
      if (isLoadMore) {
        setQueries(prev => [...prev, ...data.queries]);
      } else {
        setQueries(data.queries);
      }

      setHasMore(data.hasMore);

      if (data.queries.length > 0) {
        const lastQuery = data.queries[data.queries.length - 1];
        setLastSubmittedAt(lastQuery.submitted_at);
        setLastId(lastQuery.id);
      }
    } catch (err) {
      console.error('Failed to fetch queries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load queries');
    } finally {
      setLoading(false);
    }
  }, [lastSubmittedAt, lastId]);

  useEffect(() => {
    fetchQueries(false, searchQuery, statusFilter);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLastSubmittedAt(null);
    setLastId(null);
    fetchQueries(false, searchQuery, statusFilter);
  };

  const handleFilterChange = (value: string) => {
      setLastSubmittedAt(null);
      setLastId(null);
      setStatusFilter(value);
      fetchQueries(false, searchQuery, value);
  };

  const handleLoadMore = () => {
    if (statusFilter !== 'all') return; 
    fetchQueries(true, searchQuery, statusFilter);
  };

  return (
    <OverlordSidebar>
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">App Queries</h1>
                <div className="bg-[#D2A02A] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                Total Queries: {total.toLocaleString()}
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <form onSubmit={handleSearch} className="relative flex-grow max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                    type="text"
                    className="text-black block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
                    placeholder="Search by query content or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>

                <div className="w-full sm:w-auto">
                     <select 
                        value={statusFilter}
                        onChange={(e) => handleFilterChange(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm rounded-md"
                     >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                     </select>
                </div>
            </div>
        </header>
        
        <main className="flex-1 p-6 bg-gray-50">
          <div className="space-y-6 w-full">
             {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
             )}
             
             <AppQueriesList 
                queries={queries} 
                hasMore={hasMore} 
                loading={loading} 
                loadMore={handleLoadMore}
             />
          </div>
        </main>
      </div>
    </OverlordSidebar>
  );
}
