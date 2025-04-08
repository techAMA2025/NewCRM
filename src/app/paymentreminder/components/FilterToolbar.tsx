import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SearchBar from './SearchBar';
import StatusFilter from './StatusFilter';
import PaymentFilter from './PaymentFilter';
import SortOptions from './SortOptions';
import ViewToggle from './ViewToggle';
import ItemsPerPage from './ItemsPerPage';

interface FilterToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string | null;
  setStatusFilter: (status: string | null) => void;
  filterPaid: string | null;
  setFilterPaid: (status: string | null) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: string) => void;
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
  clientsPerPage: number;
  setClientsPerPage: (count: number) => void;
  setCurrentPage: (page: number) => void;
}

const FilterToolbar = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  filterPaid,
  setFilterPaid,
  sortField,
  sortDirection,
  handleSort,
  viewMode,
  setViewMode,
  clientsPerPage,
  setClientsPerPage,
  setCurrentPage
}: FilterToolbarProps) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <SearchBar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          setCurrentPage={setCurrentPage}
        />
        
        <StatusFilter 
          statusFilter={statusFilter} 
          setStatusFilter={setStatusFilter} 
          setCurrentPage={setCurrentPage}
        />
        
        {/* <PaymentFilter 
          filterPaid={filterPaid} 
          setFilterPaid={setFilterPaid} 
          setCurrentPage={setCurrentPage}
        /> */}
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <SortOptions 
          sortField={sortField} 
          sortDirection={sortDirection} 
          handleSort={handleSort}
        />
        
        <div className="flex items-center gap-4">
          <ViewToggle 
            viewMode={viewMode} 
            setViewMode={setViewMode}
          />
          
          <ItemsPerPage 
            clientsPerPage={clientsPerPage} 
            setClientsPerPage={setClientsPerPage} 
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default FilterToolbar; 