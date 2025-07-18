import { User as FirebaseUser } from 'firebase/auth';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';

interface BillcutLeadsHeaderProps {
  isLoading: boolean;
  userRole: string;
  currentUser: FirebaseUser | null;
  exportToCSV: () => void;
  loadAllLeads: () => void;
  isLoadAllLoading: boolean;
}

const BillcutLeadsHeader = ({ isLoading, userRole, currentUser, exportToCSV, loadAllLeads, isLoadAllLoading }: BillcutLeadsHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-100 bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">Bill Cut Leads Management</h1>
        <div className="flex gap-4">
          {(userRole === 'overlord' || userRole === 'billcut') && (
            <button
              onClick={loadAllLeads}
              disabled={isLoading || isLoadAllLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/80 hover:bg-blue-600/80 text-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/20"
            >
              <FiRefreshCw className={`w-4 h-4 ${isLoadAllLoading ? 'animate-spin' : ''}`} />
              {isLoadAllLoading ? 'Loading All Leads...' : 'Load All Leads'}
            </button>
          )}
          {(userRole === 'admin' || userRole === 'overlord' || userRole === 'billcut') && (
            <button
              onClick={exportToCSV}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/80 hover:bg-green-600/80 text-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-green-400/20"
            >
              <FiDownload className="w-4 h-4" />
              Export to CSV
            </button>
          )}
        </div>
      </div>
      <p className="text-gray-400 mt-2">
        {currentUser?.email ? `Logged in as: ${currentUser.email}` : 'Not logged in'}
      </p>
    </div>
  );
};

export default BillcutLeadsHeader; 