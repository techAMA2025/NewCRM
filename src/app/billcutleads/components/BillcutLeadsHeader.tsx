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
    <div className="mb-2 md:mb-4 bg-white/50 backdrop-blur-md border-b border-[#5A4C33]/10">
      <div className="flex justify-between items-center flex-wrap gap-4 px-4 md:px-6 py-2 md:py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="md:hidden p-2 text-[#5A4C33] hover:bg-[#D2A02A]/10 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                <FiMenu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-[14px] md:text-[16px] font-bold text-[#5A4C33] bg-gradient-to-r from-[#D2A02A] to-[#5A4C33] bg-clip-text text-transparent uppercase tracking-tight italic">
              Bill Cut<span className="hidden sm:inline"> Leads Management</span>
            </h1>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {(userRole === 'overlord' || userRole === 'billcut' || userRole === 'admin') && (
            <button
              onClick={loadAllLeads}
              disabled={isLoading || isLoadAllLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D2A02A] hover:bg-[#B8911E] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed border border-[#D2A02A]/20 text-xs font-medium"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${isLoadAllLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoadAllLoading ? 'Loading...' : 'Load All'}</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'overlord' || userRole === 'billcut') && (
            <button
              onClick={exportToCSV}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5A4C33] hover:bg-[#4A3F2A] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed border border-[#5A4C33]/20 text-xs font-medium"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>
      <div className="px-4 md:px-6 pb-2">
        <p className="text-[#5A4C33]/60 text-[10px] truncate font-medium">
          {currentUser?.email ? `Session: ${currentUser.email}` : 'Signed out'}
        </p>
      </div>
    </div>
  );
};

export default BillcutLeadsHeader;