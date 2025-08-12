"use client";

import React from "react";

type Props = {
  isLoading: boolean;
  userRole: string;
  currentUser?: any;
  exportToCSV: () => void;
  loadAllLeads: () => void;
  isLoadAllLoading: boolean;
};

const AmaLeadsHeader: React.FC<Props> = ({ isLoading, userRole, currentUser, exportToCSV, loadAllLeads, isLoadAllLoading }) => {
  return (
    <div className="flex items-center justify-between py-3">
      <h1 className="text-lg font-semibold">AMA Leads</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={loadAllLeads}
          disabled={isLoading || isLoadAllLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-xs"
        >
          {isLoadAllLoading ? "Loading All..." : "Load All"}
        </button>
        {(userRole === "admin" || userRole === "overlord") && (
          <button
            onClick={exportToCSV}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-xs"
          >
            Export CSV
          </button>
        )}
      </div>
    </div>
  );
};

export default AmaLeadsHeader; 