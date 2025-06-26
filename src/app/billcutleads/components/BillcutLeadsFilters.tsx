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
  // Bulk assignment props
  selectedLeads: string[];
  onBulkAssign: () => void;
  onClearSelection: () => void;
  // Debt range filter props
  debtRangeSort: 'none' | 'low-to-high' | 'high-to-low';
  setDebtRangeSort: (sort: 'none' | 'low-to-high' | 'high-to-low') => void;
  // Search state prop
  allLeadsLoaded?: boolean;
  isSearching?: boolean;
  // Search results info
  searchResultsCount?: number;
  searchCoverageInfo?: string;
};

const BillcutLeadsFilters = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  statusOptions,
  showMyLeads,
  setShowMyLeads,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  filteredLeads,
  leads,
  userRole,
  salesPersonFilter = '',
  setSalesPersonFilter = () => {},
  salesTeamMembers,
  // Bulk assignment props
  selectedLeads,
  onBulkAssign,
  onClearSelection,
  // Debt range filter props
  debtRangeSort,
  setDebtRangeSort,
  // Search state prop
  allLeadsLoaded = false,
  isSearching = false,
  // Search results info
  searchResultsCount,
  searchCoverageInfo
}: BillcutLeadsFiltersProps) => {
  const [salesUsers, setSalesUsers] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New search implementation
  const [searchInput, setSearchInput] = useState(searchQuery);
  
  // State to force re-render of date inputs when date changes
  const [dateKey, setDateKey] = useState(new Date().toDateString());
  
  // Set default date values on component mount
  useEffect(() => {
    const today = new Date();
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 4);

    // Format dates as YYYY-MM-DD using consistent formatting
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Only set default values if dates are empty
    if (!fromDate) {
      setFromDate(formatDate(fourDaysAgo));
    }
    if (!toDate) {
      setToDate(formatDate(today));
    }
  }, []);
  
  // Force refresh of date inputs at midnight to prevent cache issues
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timer = setTimeout(() => {
      // Force a re-render by updating a state that affects the date inputs
      // This will refresh the max date attributes without reloading the page
      const dateInputs = document.querySelectorAll('input[type="date"]');
      dateInputs.forEach((input) => {
        const dateInput = input as HTMLInputElement;
        if (dateInput.max) {
          const currentDate = new Date();
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          dateInput.max = `${year}-${month}-${day}`;
        }
      });
      
      // Update the dateKey to force re-render of date inputs
      setDateKey(new Date().toDateString());
    }, timeUntilMidnight);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Update dateKey daily to ensure date inputs stay current
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = new Date().toDateString();
      if (currentDate !== dateKey) {
        setDateKey(currentDate);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [dateKey]);
  
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

  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  // Handle salesperson filter change
  const handleSalesPersonFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSalesPersonFilter && setSalesPersonFilter(e.target.value);
  };

  // Handle date filter changes
  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
  };

  // Handle debt range sort change
  const handleDebtRangeSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDebtRangeSort(e.target.value as 'none' | 'low-to-high' | 'high-to-low');
  };

  // Handle "My Leads" toggle
  const handleMyLeadsToggle = () => {
    setShowMyLeads(!showMyLeads);
  };

  // Fetch sales users
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        setIsLoading(true);
        const salesQuery = query(collection(crmDb, 'users'), where('role', '==', 'sales'));
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

  // Get current date for max attribute - calculate fresh each time
  const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get current date string for key prop (updates daily)
  const currentDateKey = getCurrentDate();

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
    setFromDate('');
    setToDate('');
    setShowMyLeads(false);
    setDebtRangeSort('none');
    if (setSalesPersonFilter) {
      setSalesPersonFilter('all');
    }
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || fromDate || toDate || showMyLeads || debtRangeSort !== 'none' || (salesPersonFilter && salesPersonFilter !== 'all');

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
            placeholder="Search by name, email, or phone (min 2 characters)..."
            value={searchInput}
            onChange={handleSearchInputChange}
            minLength={2}
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
              {searchQuery.length < 2 ? (
                <span className="text-yellow-400">Type at least 2 characters to search</span>
              ) : isSearching ? (
                <span className="text-blue-400 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                  Searching...
                </span>
              ) : (
                <>
                  {searchCoverageInfo ? (
                    <span className="text-blue-400">{searchCoverageInfo}</span>
                  ) : (
                    <>
                      Found <span className="text-blue-400 font-medium">{filteredLeads.length}</span> results for "{searchQuery}"
                      {allLeadsLoaded && (
                        <span className="ml-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-md">
                          🔍 Searching entire database
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
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
              {searchQuery && searchQuery.length >= 2 ? (
                <>
                  Search results: <span className="text-blue-400 font-medium">{filteredLeads.length}</span> found
                  {allLeadsLoaded && (
                    <span className="ml-2 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-md">
                      📊 From entire database
                    </span>
                  )}
                </>
              ) : (
                <>
                  Showing <span className="text-blue-400 font-medium">{filteredLeads.length}</span> of <span className="text-blue-400 font-medium">{leads.length}</span> leads
                  {allLeadsLoaded && !searchQuery && (
                    <span className="ml-2 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-md">
                      📊 All data loaded
                    </span>
                  )}
                </>
              )}
            </p>
            
            {/* Bulk Assignment Button */}
            {selectedLeads.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-300 font-medium">
                  {selectedLeads.length} selected
                </span>
                <button
                  onClick={onBulkAssign}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium transition-colors duration-200"
                >
                  Bulk Assign
                </button>
                <button
                  onClick={onClearSelection}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg font-medium transition-colors duration-200"
                >
                  Clear
                </button>
              </div>
            )}
            
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
              onChange={handleStatusFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="No Status">No Status</option>
              {statusOptions
                .filter(status => status !== 'No Status')
                .map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
            </select>
          </div>
          
          {/* Salesperson Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Salesperson</label>
            <div className="relative">
              <select
                value={salesPersonFilter}
                onChange={handleSalesPersonFilterChange}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
              >
                <option value="all">All Salesperson</option>
                <option value="-">Unassigned</option>
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
          
          {/* From Date */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">From Date</label>
            <input
              key={`from-date-${dateKey}`}
              type="date"
              value={fromDate}
              onChange={handleFromDateChange}
              max={toDate || getCurrentDate()}
              className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            />
          </div>
          
          {/* To Date */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">To Date</label>
            <input
              key={`to-date-${dateKey}`}
              type="date"
              value={toDate}
              onChange={handleToDateChange}
              min={fromDate}
              max={getCurrentDate()}
              className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            />
          </div>
          
          {/* Debt Range Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Debt Range</label>
            <select
              value={debtRangeSort}
              onChange={handleDebtRangeSortChange}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            >
              <option value="none">No Sort</option>
              <option value="low-to-high">Low to High</option>
              <option value="high-to-low">High to Low</option>
            </select>
          </div>
          
          {/* My Leads Toggle */}
          <div className="space-y-1 flex flex-col justify-end">
            <button
              onClick={handleMyLeadsToggle}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                showMyLeads
                  ? 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-400'
                  : 'bg-green-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
              }`}
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {showMyLeads ? 'All Leads' : 'My Leads'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillcutLeadsFilters; 