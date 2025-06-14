import { FaFilter, FaUserTie } from 'react-icons/fa';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as crmDb } from '@/firebase/firebase';
import { debounce } from 'lodash';

type BillcutLeadsFiltersProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  statusOptions: string[];
  showMyLeads: boolean;
  setShowMyLeads: (show: boolean) => void;
  convertedFilter: boolean | null;
  setConvertedFilter: (converted: boolean | null) => void;
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  filteredLeads: any[];
  leads: any[];
  userRole: string;
  salesPersonFilter?: string;
  setSalesPersonFilter?: (salesperson: string) => void;
  salesTeamMembers: any[];
};

const BillcutLeadsFilters = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  statusOptions,
  showMyLeads,
  setShowMyLeads,
  convertedFilter,
  setConvertedFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  filteredLeads,
  leads,
  userRole,
  salesPersonFilter = '',
  setSalesPersonFilter = () => {},
  salesTeamMembers
}: BillcutLeadsFiltersProps) => {
  const [salesUsers, setSalesUsers] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New search implementation
  const [searchInput, setSearchInput] = useState(searchQuery);
  
  // Set default date values on component mount
  useEffect(() => {
    const today = new Date();
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 4);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    // Only set default values if dates are empty
    if (!fromDate) {
      setFromDate(formatDate(fourDaysAgo));
    }
    if (!toDate) {
      setToDate(formatDate(today));
    }
  }, []);
  
  // Create a more efficient debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    []
  );
  
  // Update local search state when parent state changes
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);
  
  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };
  
  // Clear search function
  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  // Fetch sales users
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        setIsLoading(true);
        const salesQuery = query(collection(crmDb, 'users'), where('role', '==', 'salesperson'));
        const querySnapshot = await getDocs(salesQuery);
        
        const users = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const fullName = data.firstName && data.lastName 
            ? `${data.firstName} ${data.lastName}`
            : data.firstName || data.lastName || 'Unknown';
          
          return {
            id: doc.id,
            name: fullName,
          };
        });
        
        setSalesUsers(users);
      } catch (error) {
        console.error('Error fetching sales users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesUsers();
  }, []);

  // Format date for input max attribute
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }, []);

  // Clear date filters
  const clearDateFilters = () => {
    setFromDate('');
    setToDate('');
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('all');
    setConvertedFilter(null);
    setFromDate('');
    setToDate('');
    setShowMyLeads(false);
    if (setSalesPersonFilter) {
      setSalesPersonFilter('all');
    }
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || convertedFilter !== null || fromDate || toDate || showMyLeads || (salesPersonFilter && salesPersonFilter !== 'all');

  return (
    <div className="space-y-4 mb-8">
      {/* Search bar implementation */}
      <div className="">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border border-gray-600/50 bg-gray-800/50 text-gray-100 rounded-xl focus:outline-none focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 placeholder-gray-500"
            placeholder="Search by name, email, or phone number..."
            value={searchInput}
            onChange={handleSearchInputChange}
          />
          {searchInput && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-300 focus:outline-none"
                aria-label="Clear search"
                type="button"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Search results summary */}
        {searchQuery && (
          <div className="mt-2 flex items-center">
            <span className="text-sm text-gray-400">
              Found <span className="text-blue-400 font-medium">{filteredLeads.length}</span> results for "{searchQuery}"
            </span>
            <button 
              onClick={clearSearch}
              className="ml-2 text-xs text-blue-400 hover:text-blue-300 focus:outline-none"
              type="button"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
      
      {/* Filters section with improved layout */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FaFilter className="text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-300">Filters</span>
          </div>
          
          {/* Results counter and clear filters */}
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-400">
              Showing <span className="text-blue-400 font-medium">{filteredLeads.length}</span> of <span className="text-blue-400 font-medium">{leads.length}</span> leads
            </p>
            {hasActiveFilters && (
              <button 
                onClick={clearAllFilters}
                className="text-xs text-blue-400 hover:text-blue-300 focus:outline-none border border-blue-400/30 px-2 py-1 rounded-md hover:border-blue-300/50 transition-colors"
                type="button"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="">No Status</option>
              {statusOptions
                .filter(status => status !== 'No Status')
                .map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
            </select>
          </div>
          
          {/* Salesperson Filter */}
          {(userRole === 'admin' || userRole === 'overlord') && (
            <div className="space-y-1">
              <label className="block text-xs text-gray-400">Assigned To</label>
              <div className="relative">
                <select
                  value={salesPersonFilter}
                  onChange={e => setSalesPersonFilter && setSalesPersonFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
                >
                  <option value="all">All Assigned</option>
                  <option value="">Unassigned</option>
                  {isLoading ? (
                    <option value="" disabled>Loading...</option>
                  ) : (
                    salesTeamMembers.map(user => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))
                  )}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <FaUserTie className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          )}
          
          {/* Converted Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Conversion</label>
            <select
              value={convertedFilter === null ? 'all' : convertedFilter ? 'converted' : 'not-converted'}
              onChange={e => {
                if (e.target.value === 'all') setConvertedFilter(null);
                else if (e.target.value === 'converted') setConvertedFilter(true);
                else setConvertedFilter(false);
              }}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            >
              <option value="all">All Leads</option>
              <option value="converted">Converted</option>
              <option value="not-converted">Not Converted</option>
            </select>
          </div>
          
          {/* From Date */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || today}
              className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            />
          </div>
          
          {/* To Date */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              max={today}
              className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            />
          </div>
          
          {/* My Leads Toggle */}
          <div className="space-y-1 flex flex-col justify-end">
            <button
              onClick={() => setShowMyLeads(!showMyLeads)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                showMyLeads
                  ? 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-400'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
              }`}
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Leads
            </button>
          </div>
        </div>
        
        {/* Date range clear button */}
        {(fromDate || toDate) && (
          <div className="mt-4 flex justify-start">
            <button 
              onClick={clearDateFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-600/50 text-sm leading-4 font-medium rounded-lg text-gray-300 bg-gray-700/50 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              type="button"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear date filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillcutLeadsFilters; 