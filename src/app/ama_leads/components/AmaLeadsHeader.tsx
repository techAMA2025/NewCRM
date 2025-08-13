"use client";

import { User as FirebaseUser } from 'firebase/auth';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';

type Props = {
  isLoading: boolean;
  userRole: string;
  currentUser: FirebaseUser | null;
  exportToCSV: () => void;
  loadAllLeads: () => void;
  isLoadAllLoading: boolean;
};

const LeadsHeader = ({ isLoading, userRole, currentUser, exportToCSV, loadAllLeads, isLoadAllLoading }: Props) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-[#5A4C33] bg-gradient-to-r from-[#D2A02A] to-[#5A4C33] bg-clip-text text-transparent">
          AMA Leads Management
        </h1>
        <div className="flex gap-4">
          {(userRole === 'overlord' || userRole === 'admin') && (
            <button
              onClick={loadAllLeads}
              disabled={isLoading || isLoadAllLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#D2A02A] hover:bg-[#B8911E] text-[#ffffff] rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[#D2A02A]/20"
            >
              <FiRefreshCw className={`w-4 h-4 ${isLoadAllLoading ? 'animate-spin' : ''}`} />
              {isLoadAllLoading ? 'Loading All Leads...' : 'Load All Leads'}
            </button>
          )}
          {(userRole === 'admin' || userRole === 'overlord') && (
            <button
              onClick={exportToCSV}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[#5A4C33]/20"
            >
              <FiDownload className="w-4 h-4" />
              Export to CSV 
            </button>
          )}
        </div>
      </div>
      <p className="text-[#5A4C33]/70 mt-2">
        {currentUser?.email ? `Logged in as: ${currentUser.email}` : 'Not logged in'}
      </p>
    </div>
  );
};

export default LeadsHeader; 