import React from 'react';
import SearchBar from './SearchBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, IndianRupee, Filter, Clock, ArrowUpDown, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface FilterBarProps {
  // Search filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Week filter
  weekFilter: number | null;
  setWeekFilter: (week: number | null) => void;
  
  // Payment status filter
  filterPaid: string | null;
  setFilterPaid: (paid: string | null) => void;
  
  // Amount filter
  amountFilter: string | null;
  setAmountFilter: (amount: string | null) => void;
  
  // Due date filter
  dueFilter: string | null;
  setDueFilter: (due: string | null) => void;
  
  // Date range filter
  startDate: Date | null;
  endDate: Date | null;
  setDateRange: (start: Date | null, end: Date | null) => void;
  
  // Sorting
  sortBy: string | null;
  setSortBy: (sort: string | null) => void;
  
  // Pagination
  setCurrentPage: (page: number) => void;
  
  // Allocation filter
  allocFilter: string | null;
  setAllocFilter: (alloc: string | null) => void;
}

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  weekFilter,
  setWeekFilter,
  filterPaid,
  setFilterPaid,
  amountFilter,
  setAmountFilter,
  dueFilter,
  setDueFilter,
  startDate,
  endDate,
  setDateRange,
  sortBy,
  setSortBy,
  setCurrentPage,
  allocFilter,
  setAllocFilter
}: FilterBarProps) {
  // Helper functions for display texts
  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'fullypaid': return 'Fully Paid';
      case 'partiallypaid': return 'Partially Paid';
      case 'notpaid': return 'Not Paid';
      default: return 'Payment Status';
    }
  };
  
  const getAmountFilterText = (filter: string) => {
    switch (filter) {
      case 'high': return 'High Amount';
      case 'medium': return 'Medium Amount';
      case 'low': return 'Low Amount';
      default: return 'Amount Range';
    }
  };
  
  const getDueFilterText = (filter: string) => {
    switch (filter) {
      case 'overdue': return 'Overdue';
      case 'thisweek': return 'Due This Week';
      case 'nextweek': return 'Due Next Week';
      case 'thismonth': return 'Due This Month';
      default: return 'Due Date';
    }
  };
  
  const getSortText = (sort: string) => {
    switch (sort) {
      case 'name-asc': return 'Name A-Z';
      case 'name-desc': return 'Name Z-A';
      case 'amount-asc': return 'Amount ↑';
      case 'amount-desc': return 'Amount ↓';
      case 'due-asc': return 'Due Date ↑';
      case 'due-desc': return 'Due Date ↓';
      default: return 'Sort By';
    }
  };
  
  const getAllocationText = (filter: string) => {
    switch (filter) {
      case 'primary': return 'Primary Allocation';
      case 'secondary': return 'Secondary Allocation';
      default: return 'Allocation Type';
    }
  };
  
  const getDateRangeText = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'dd/MM/yy')} - ${format(endDate, 'dd/MM/yy')}`;
    }
    if (startDate) {
      return `From ${format(startDate, 'dd/MM/yy')}`;
    }
    if (endDate) {
      return `Until ${format(endDate, 'dd/MM/yy')}`;
    }
    return 'Date Range';
  };

  // Preset date ranges
  const setLastWeek = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setDateRange(start, end);
    setCurrentPage(1);
  };

  const setLastMonth = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    setDateRange(start, end);
    setCurrentPage(1);
  };

  const setLast3Months = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    setDateRange(start, end);
    setCurrentPage(1);
  };

  const clearDateRange = () => {
    setDateRange(null, null);
    setCurrentPage(1);
  };

  // Function to reset all filters
  const resetAllFilters = () => {
    setFilterPaid(null);
    setAmountFilter(null);
    setDueFilter(null);
    setDateRange(null, null);
    setSortBy(null);
    setWeekFilter(null);
    setSearchQuery('');
    setAllocFilter(null);
    setCurrentPage(1);
  };

  // Count active filters
  const activeFilterCount = [
    filterPaid, 
    amountFilter, 
    dueFilter, 
    startDate || endDate ? 'dateRange' : null,
    weekFilter,
    sortBy,
    allocFilter
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        <SearchBar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          setCurrentPage={setCurrentPage} 
        />
        
        {/* Week Filter */}
        <Select 
          value={weekFilter?.toString() || 'all'} 
          onValueChange={(value) => {
            setWeekFilter(value === 'all' ? null : parseInt(value));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-[180px] bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Filter by week" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700 text-white">
            <SelectItem value="all">All weeks</SelectItem>
            <SelectItem value="1">Week 1</SelectItem>
            <SelectItem value="2">Week 2</SelectItem>
            <SelectItem value="3">Week 3</SelectItem>
            <SelectItem value="4">Week 4</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {/* Payment Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`bg-gray-700 border-gray-600 text-white ${filterPaid ? 'ring-2 ring-blue-500' : ''}`}>
              <Filter className="mr-2 h-4 w-4" />
              {filterPaid ? getPaymentStatusText(filterPaid) : 'Payment Status'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
            <DropdownMenuItem onClick={() => {
              setFilterPaid(null);
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${!filterPaid ? 'bg-gray-700' : ''}`}>
              All Payments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setFilterPaid('fullypaid');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${filterPaid === 'fullypaid' ? 'bg-gray-700' : ''}`}>
              Fully Paid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setFilterPaid('partiallypaid');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${filterPaid === 'partiallypaid' ? 'bg-gray-700' : ''}`}>
              Partially Paid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setFilterPaid('notpaid');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${filterPaid === 'notpaid' ? 'bg-gray-700' : ''}`}>
              Not Paid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setFilterPaid('currentpaid');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${filterPaid === 'currentpaid' ? 'bg-gray-700' : ''}`}>
              Current Month Paid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setFilterPaid('currentunpaid');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${filterPaid === 'currentunpaid' ? 'bg-gray-700' : ''}`}>
              Current Month Unpaid
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Allocation Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`bg-gray-700 border-gray-600 text-white ${allocFilter ? 'ring-2 ring-blue-500' : ''}`}>
              <Users className="mr-2 h-4 w-4" />
              {allocFilter ? getAllocationText(allocFilter) : 'Allocation Type'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
            <DropdownMenuItem onClick={() => {
              setAllocFilter(null);
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${!allocFilter ? 'bg-gray-700' : ''}`}>
              All Allocations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setAllocFilter('primary');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${allocFilter === 'primary' ? 'bg-gray-700' : ''}`}>
              Primary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setAllocFilter('secondary');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${allocFilter === 'secondary' ? 'bg-gray-700' : ''}`}>
              Secondary
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Amount Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`bg-gray-700 border-gray-600 text-white ${amountFilter ? 'ring-2 ring-blue-500' : ''}`}>
              <IndianRupee className="mr-2 h-4 w-4" />
              {amountFilter ? getAmountFilterText(amountFilter) : 'Amount Range'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
            <DropdownMenuItem onClick={() => {
              setAmountFilter(null);
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${!amountFilter ? 'bg-gray-700' : ''}`}>
              All Amounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setAmountFilter('high');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${amountFilter === 'high' ? 'bg-gray-700' : ''}`}>
              High (&gt;₹10,000)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setAmountFilter('medium');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${amountFilter === 'medium' ? 'bg-gray-700' : ''}`}>
              Medium (₹5,000-₹10,000)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setAmountFilter('low');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${amountFilter === 'low' ? 'bg-gray-700' : ''}`}>
              Low (&lt;₹5,000)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Due Date Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`bg-gray-700 border-gray-600 text-white ${dueFilter ? 'ring-2 ring-blue-500' : ''}`}>
              <Clock className="mr-2 h-4 w-4" />
              {dueFilter ? getDueFilterText(dueFilter) : 'Due Date'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
            <DropdownMenuItem onClick={() => {
              setDueFilter(null);
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${!dueFilter ? 'bg-gray-700' : ''}`}>
              All Due Dates
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setDueFilter('overdue');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${dueFilter === 'overdue' ? 'bg-gray-700' : ''}`}>
              Overdue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setDueFilter('thisweek');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${dueFilter === 'thisweek' ? 'bg-gray-700' : ''}`}>
              Due This Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setDueFilter('nextweek');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${dueFilter === 'nextweek' ? 'bg-gray-700' : ''}`}>
              Due Next Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setDueFilter('thismonth');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${dueFilter === 'thismonth' ? 'bg-gray-700' : ''}`}>
              Due This Month
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Date Range Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`bg-gray-700 border-gray-600 text-white ${(startDate || endDate) ? 'ring-2 ring-blue-500' : ''}`}>
              <Calendar className="mr-2 h-4 w-4" />
              {getDateRangeText()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
            <DropdownMenuItem onClick={setLastWeek} className="hover:bg-gray-700">
              Last 7 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={setLastMonth} className="hover:bg-gray-700">
              Last 30 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={setLast3Months} className="hover:bg-gray-700">
              Last 3 months
            </DropdownMenuItem>
            <DropdownMenuItem onClick={clearDateRange} className="hover:bg-gray-700 text-red-400">
              Clear date filter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Sort Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`bg-gray-700 border-gray-600 text-white ${sortBy ? 'ring-2 ring-blue-500' : ''}`}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortBy ? getSortText(sortBy) : 'Sort By'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
            <DropdownMenuItem onClick={() => {
              setSortBy(null);
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${!sortBy ? 'bg-gray-700' : ''}`}>
              Default Order
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSortBy('name-asc');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${sortBy === 'name-asc' ? 'bg-gray-700' : ''}`}>
              Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSortBy('name-desc');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${sortBy === 'name-desc' ? 'bg-gray-700' : ''}`}>
              Name (Z-A)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSortBy('amount-asc');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${sortBy === 'amount-asc' ? 'bg-gray-700' : ''}`}>
              Amount (Low to High)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSortBy('amount-desc');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${sortBy === 'amount-desc' ? 'bg-gray-700' : ''}`}>
              Amount (High to Low)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSortBy('due-asc');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${sortBy === 'due-asc' ? 'bg-gray-700' : ''}`}>
              Due Date (Earliest First)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSortBy('due-desc');
              setCurrentPage(1);
            }} className={`hover:bg-gray-700 ${sortBy === 'due-desc' ? 'bg-gray-700' : ''}`}>
              Due Date (Latest First)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Clear All Filters Button - only show if there are active filters */}
        {activeFilterCount > 0 && (
          <Button 
            variant="outline" 
            className="bg-red-700 border-red-600 text-white hover:bg-red-800"
            onClick={resetAllFilters}
          >
            Clear Filters
            {activeFilterCount > 1 && (
              <Badge variant="secondary" className="ml-2 bg-red-500 text-white">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </div>
    </div>
  );
} 