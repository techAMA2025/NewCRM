import { FaFilter, FaUserTie } from 'react-icons/fa';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { debounce } from 'lodash';

type LeadsFiltersProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  salesPersonFilter: string;
  setSalesPersonFilter: (salesperson: string) => void;
  statusOptions: string[];
  teamMembers: any[];
  userRole: string;
  filteredLeads: any[];
  leads: any[];
  convertedFilter: boolean | null;
  setConvertedFilter: (converted: boolean | null) => void;
};

const LeadsFilters = ({
  searchQuery,
  setSearchQuery,
  sourceFilter,
  setSourceFilter,
  statusFilter,
  setStatusFilter,
  salesPersonFilter,
  setSalesPersonFilter,
  statusOptions,
  teamMembers,
  userRole,
  filteredLeads,
  leads,
  convertedFilter,
  setConvertedFilter
}: LeadsFiltersProps) => {
  const [salesUsers, setSalesUsers] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New search implementation
  const [searchInput, setSearchInput] = useState(searchQuery);
  
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

  // Debug the search functionality
  useEffect(() => {
    console.log('Search query updated:', searchQuery);
  }, [searchQuery]);

  // Fetch sales users
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        setIsLoading(true);
        const salesQuery = query(collection(db, 'users'), where('role', '==', 'sales'));
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

  return (
    <>
      {/* New search bar implementation */}
      <div className="mt-6 mb-4">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border border-gray-700 bg-gray-800 text-gray-200 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
      
      <div className="mt-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="flex items-center">
              <FaFilter className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-300 mr-2">Filters:</span>
            </div>
            
            {/* Source Filter */}
            <div className="relative w-full sm:w-40">
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="all">All Sources</option>
                <option value="ama">AMA</option>
                <option value="credsettlee">CredSettle</option>
                <option value="settleloans">SettleLoans</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="relative w-full sm:w-40">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            {/* Salesperson Filter - Updated to fetch sales users */}
            <div className="relative w-full sm:w-40">
              <select
                value={salesPersonFilter}
                onChange={e => setSalesPersonFilter(e.target.value)}
                className={`block w-full pl-3 pr-10 py-2 text-sm border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md ${userRole !== 'admin' ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={userRole !== 'admin'}
              >
                {userRole === 'admin' && <option value="all">All Salespersons</option>}
                {userRole === 'admin' && <option value="">Unassigned</option>}
                {isLoading ? (
                  <option value="" disabled>Loading...</option>
                ) : (
                  salesUsers.map(user => (
                    <option key={user.id} value={user.name}>{user.name}</option>
                  ))
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FaUserTie className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="ml-auto">
            <p className="text-sm text-gray-400">
              Showing <span className="text-blue-400 font-medium">{filteredLeads.length}</span> of <span className="text-blue-400 font-medium">{leads.length}</span> leads
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeadsFilters;