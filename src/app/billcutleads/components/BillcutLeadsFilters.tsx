import { FiSearch, FiFilter } from 'react-icons/fi';

interface BillcutLeadsFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  statusOptions: string[];
}

const BillcutLeadsFilters = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  statusOptions,
}: BillcutLeadsFiltersProps) => {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-6">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 text-gray-100 rounded-xl border border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all duration-200 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex items-center gap-4 bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <FiFilter className="w-5 h-5" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700/50 text-gray-100 rounded-lg border border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all duration-200"
            >
              <option value="all">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillcutLeadsFilters; 