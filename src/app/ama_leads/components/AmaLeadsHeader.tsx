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
  // Tab props
  activeTab: "all" | "callback";
  onTabChange: (tab: "all" | "callback") => void;
  callbackCount: number;
  allLeadsCount: number;
};

const LeadsHeader = ({ isLoading, userRole, currentUser, exportToCSV, loadAllLeads, isLoadAllLoading, onMenuToggle, activeTab, onTabChange, callbackCount, allLeadsCount }: Props) => {
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
            <h1 className="text-lg md:text-xl font-bold text-[#5A4C33] bg-gradient-to-r from-[#D2A02A] to-[#5A4C33] bg-clip-text text-transparent">
              AMA Leads<span className="hidden sm:inline"> Management</span>
            </h1>
          </div>

          {/* Integrated Tabs */}
          <div className="flex items-center bg-[#5A4C33]/5 p-1 rounded-xl border border-[#5A4C33]/10">
            <button
              onClick={() => onTabChange("all")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "all"
                  ? "bg-white text-[#D2A02A] shadow-sm ring-1 ring-[#D2A02A]/10"
                  : "text-[#5A4C33]/60 hover:text-[#5A4C33] hover:bg-[#5A4C33]/5"
              }`}
            >
              All Leads
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "all" ? "bg-[#D2A02A]/10 text-[#D2A02A]" : "bg-[#5A4C33]/10 text-[#5A4C33]/60"
              }`}>
                {allLeadsCount}
              </span>
            </button>
            <button
              onClick={() => onTabChange("callback")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "callback"
                  ? "bg-white text-[#D2A02A] shadow-sm ring-1 ring-[#D2A02A]/10"
                  : "text-[#5A4C33]/60 hover:text-[#5A4C33] hover:bg-[#5A4C33]/5"
              }`}
            >
              Callbacks
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "callback" ? "bg-[#D2A02A]/10 text-[#D2A02A]" : "bg-[#5A4C33]/10 text-[#5A4C33]/60"
              }`}>
                {callbackCount}
              </span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {(userRole === 'overlord' || userRole === 'admin') && (
            <button
              onClick={loadAllLeads}
              disabled={isLoading || isLoadAllLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D2A02A] hover:bg-[#B8911E] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed border border-[#D2A02A]/20 text-xs font-medium"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${isLoadAllLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoadAllLoading ? 'Loading...' : 'Load All'}</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'overlord') && (
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
        <p className="text-[#5A4C33]/60 text-xs truncate">
          {currentUser?.email ? `Logged in as: ${currentUser.email}` : 'Not logged in'}
        </p>
      </div>
    </div>
  );
};

export default LeadsHeader;