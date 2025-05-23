import { FaFilter, FaUserTie } from 'react-icons/fa';
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { debounce } from 'lodash';
import { toast } from 'react-hot-toast';
import { getSourceColor } from './utils/colorUtils';

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
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  totalLeadsCount: number;
  filteredTotalCount: number;
};

type SourceOption = {
  value: string;
  label?: string;
  bg?: string;
  text?: string;
  display?: string;
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
  setConvertedFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  totalLeadsCount,
  filteredTotalCount
}: LeadsFiltersProps) => {
  const [searchInput, setSearchInput] = useState(searchQuery);
  
  // Create a debounced search function
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

  // Format date for input max attribute
  const today = new Date().toISOString().split('T')[0];

  // Prepare source options
  const sourceOptions: SourceOption[] = [
    { value: 'all', label: 'All Sources' },
    { value: 'ama', ...getSourceColor('ama') },
    { value: 'credsettlee', ...getSourceColor('credsettlee') },
    { value: 'settleloans', ...getSourceColor('settleloans') }
  ];

  return (
    <div className="bg-gray-900 px-6 py-4 rounded-xl border border-gray-700 shadow-lg mb-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
        <div className="w-full md:w-1/3 relative">
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchInputChange}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-4 pr-10 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-400" />
            <span className="text-sm text-gray-400">Filters</span>
          </div>
          <div className="ml-auto">
            <p className="text-sm text-gray-400">
              Showing <span className="text-blue-400 font-medium">{filteredTotalCount}</span> of <span className="text-blue-400 font-medium">{totalLeadsCount}</span> leads
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Source Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Source</label>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              {sourceOptions.map(option => (
                <option 
                  key={option.value} 
                  value={option.value}
                  className={option.value !== 'all' && option.bg && option.text ? `${option.bg} ${option.text}` : ''}
                >
                  {option.value === 'all' ? option.label : option.display}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="">No Status</option>
              {statusOptions
                .filter(status => status !== 'No Status')
                .map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
            </select>
          </div>
          
          {/* Salesperson Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Salesperson</label>
            <div className="relative">
              <select
                value={salesPersonFilter}
                onChange={e => setSalesPersonFilter(e.target.value)}
                className={`block w-full pl-3 pr-10 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md ${userRole !== 'admin' && userRole !== 'overlord' ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={userRole !== 'admin' && userRole !== 'overlord'}
              >
                <option value="all">All Salespersons</option>
                <option value="">Unassigned</option>
                {teamMembers
                  .filter(member => member.role === 'sales')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(member => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FaUserTie className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          
          {/* From Date Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || today}
              className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            />
          </div>
          
          {/* To Date Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              max={today}
              className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            />
          </div>
          
          {/* Conversion Status Filter */}
          {/* <div className="space-y-1">
            <label className="block text-xs text-gray-400">Conversion Status</label>
            <select
              value={convertedFilter === null ? 'all' : convertedFilter ? 'converted' : 'not-converted'}
              onChange={e => {
                if (e.target.value === 'all') setConvertedFilter(null);
                else if (e.target.value === 'converted') setConvertedFilter(true);
                else setConvertedFilter(false);
              }}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="all">All Leads</option>
              <option value="converted">Converted</option>
              <option value="not-converted">Not Converted</option>
            </select>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default LeadsFilters;