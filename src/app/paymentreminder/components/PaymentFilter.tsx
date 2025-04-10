import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IndianRupee, Calendar, ArrowUpDown, Filter } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PaymentFilterProps {
  filterPaid: string | null;
  setFilterPaid: (paid: string | null) => void;
  setCurrentPage: (page: number) => void;
  
  // New filters
  amountFilter: string | null;
  setAmountFilter: (amount: string | null) => void;
  dueFilter: string | null;
  setDueFilter: (due: string | null) => void;
  sortBy: string | null;
  setSortBy: (sort: string | null) => void;
}

export default function PaymentFilter({ 
  filterPaid, 
  setFilterPaid, 
  setCurrentPage,
  amountFilter,
  setAmountFilter,
  dueFilter,
  setDueFilter,
  sortBy,
  setSortBy
}: PaymentFilterProps) {
  
  // Get combined filter display text
  const getFilterDisplayText = () => {
    const filters = [];
    if (filterPaid) filters.push(getPaymentStatusText(filterPaid));
    if (amountFilter) filters.push(getAmountFilterText(amountFilter));
    if (dueFilter) filters.push(getDueFilterText(dueFilter));
    if (sortBy) filters.push(`Sort: ${getSortText(sortBy)}`);
    
    if (filters.length === 0) return "Filter Payments";
    if (filters.length === 1) return filters[0];
    return `${filters.length} filters active`;
  };
  
  // Helper functions to get display text
  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'fullypaid': return 'Fully Paid';
      case 'partiallypaid': return 'Partially Paid';
      case 'notpaid': return 'Not Paid';
      default: return 'All Payments';
    }
  };
  
  const getAmountFilterText = (filter: string) => {
    switch (filter) {
      case 'high': return 'High Amount';
      case 'medium': return 'Medium Amount';
      case 'low': return 'Low Amount';
      default: return 'All Amounts';
    }
  };
  
  const getDueFilterText = (filter: string) => {
    switch (filter) {
      case 'overdue': return 'Overdue';
      case 'thisweek': return 'Due This Week';
      case 'nextweek': return 'Due Next Week';
      case 'thismonth': return 'Due This Month';
      default: return 'All Due Dates';
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
      default: return 'Default';
    }
  };
  
  const resetAllFilters = () => {
    setFilterPaid(null);
    setAmountFilter(null);
    setDueFilter(null);
    setSortBy(null);
    setCurrentPage(1);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-gray-700 border-gray-600 text-white">
          <Filter className="mr-2 h-4 w-4" />
          {getFilterDisplayText()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white w-56">
        {/* Payment Status Filter */}
        <div className="px-2 py-1.5 text-xs font-medium">Payment Status</div>
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
        
        <Separator className="my-1 bg-gray-600" />
        
        {/* Amount Filter */}
        <div className="px-2 py-1.5 text-xs font-medium">Amount Range</div>
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
          High ({'>'}₹10,000)
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
          Low ({'<'}₹5,000)
        </DropdownMenuItem>
        
        <Separator className="my-1 bg-gray-600" />
        
        {/* Due Date Filter */}
        <div className="px-2 py-1.5 text-xs font-medium">Due Date</div>
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
        
        <Separator className="my-1 bg-gray-600" />
        
        {/* Sort Options */}
        <div className="px-2 py-1.5 text-xs font-medium">Sort By</div>
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
        
        <Separator className="my-1 bg-gray-600" />
        
        {/* Reset All Filters */}
        <DropdownMenuItem onClick={resetAllFilters} className="hover:bg-gray-700 text-red-400">
          Reset All Filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 