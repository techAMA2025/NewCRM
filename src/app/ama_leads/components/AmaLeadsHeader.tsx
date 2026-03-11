"use client";

import { User as FirebaseUser } from 'firebase/auth';
import { FiDownload, FiRefreshCw, FiMenu } from 'react-icons/fi';

type Props = {
  isLoading: boolean;
  userRole: string;
  currentUser: FirebaseUser | null;
  exportToCSV: () => void;
  loadAllLeads: () => void;
  isLoadAllLoading: boolean;
  onMenuToggle?: () => void;
};

const LeadsHeader = ({ isLoading, userRole, currentUser, exportToCSV, loadAllLeads, isLoadAllLoading, onMenuToggle }: Props) => {
  return (
    <div className="mb-4 md:mb-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 text-[#5A4C33] hover:bg-[#D2A02A]/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <FiMenu className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-lg md:text-2xl font-semibold text-[#5A4C33] bg-gradient-to-r from-[#D2A02A] to-[#5A4C33] bg-clip-text text-transparent">
            AMA Leads<span className="hidden sm:inline"> Management</span>
          </h1>
        </div>
        <div className="flex gap-2 md:gap-4">
          {(userRole === 'overlord' || userRole === 'admin') && (
            <button
              onClick={loadAllLeads}
              disabled={isLoading || isLoadAllLoading}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-[#D2A02A] hover:bg-[#B8911E] text-[#ffffff] rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[#D2A02A]/20 text-xs md:text-sm"
            >
              <FiRefreshCw className={`w-4 h-4 ${isLoadAllLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoadAllLoading ? 'Loading All...' : 'Load All'}</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'overlord') && (
            <button
              onClick={exportToCSV}
              disabled={isLoading}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[#5A4C33]/20 text-xs md:text-sm"
            >
              <FiDownload className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>
      <p className="text-[#5A4C33]/70 mt-1 md:mt-2 text-xs md:text-base truncate">
        {currentUser?.email ? `Logged in as: ${currentUser.email}` : 'Not logged in'}
      </p>
    </div>
  );
};

export default LeadsHeader;