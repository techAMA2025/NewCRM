import { User as FirebaseUser } from 'firebase/auth';
import { FiDownload, FiRefreshCw, FiMenu } from 'react-icons/fi';

interface BillcutLeadsHeaderProps {
  isLoading: boolean;
  userRole: string;
  currentUser: FirebaseUser | null;
  exportToCSV: () => void;
  loadAllLeads: () => void;
  isLoadAllLoading: boolean;
  onMenuToggle?: () => void;
}

const BillcutLeadsHeader = ({ isLoading, userRole, currentUser, exportToCSV, loadAllLeads, isLoadAllLoading, onMenuToggle }: BillcutLeadsHeaderProps) => {
  return (
    <div className="mb-4 md:mb-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              aria-label="Toggle menu"
            >
              <FiMenu className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl md:text-2xl font-bold text-gray-100 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Bill Cut <span className="hidden sm:inline">Leads Management</span>
            <span className="sm:hidden">Leads</span>
          </h1>
        </div>
        <div className="flex gap-2">
          {(userRole === 'overlord' || userRole === 'billcut' || userRole === 'admin') && (
            <button
              onClick={loadAllLeads}
              disabled={isLoading || isLoadAllLoading}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-blue-500/80 hover:bg-blue-600/80 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/20 text-xs md:text-sm shadow-lg shadow-blue-500/10"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isLoadAllLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoadAllLoading ? 'Loading All...' : 'Load All Leads'}</span>
              <span className="sm:hidden">Sync</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'overlord' || userRole === 'billcut') && (
            <button
              onClick={exportToCSV}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-emerald-500/80 hover:bg-emerald-600/80 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/20 text-xs md:text-sm shadow-lg shadow-emerald-500/10"
            >
              <FiDownload className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Export To CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
          )}
        </div>
      </div>
      <p className="text-gray-500 mt-2 text-xs md:text-sm truncate opacity-80">
        {currentUser?.email ? `Session: ${currentUser.email}` : 'Signed out'}
      </p>
    </div>
  );
};

export default BillcutLeadsHeader;