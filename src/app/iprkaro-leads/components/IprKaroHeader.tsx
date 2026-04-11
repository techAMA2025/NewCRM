"use client"

import React from "react"
import { FiDownload, FiMenu } from "react-icons/fi"

interface IprKaroHeaderProps {
  totalCount: number
  showingCount: number
  userRole: string
  currentUserEmail: string | null
  exportToCSV: () => void
  onMenuToggle?: () => void
}

const IprKaroHeader: React.FC<IprKaroHeaderProps> = ({
  totalCount,
  showingCount,
  userRole,
  currentUserEmail,
  exportToCSV,
  onMenuToggle,
}) => {
  return (
    <div className="bg-white/50 backdrop-blur-md border-b border-[#5A4C33]/10 px-3 md:px-5 py-3 sticky top-0 z-30">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="md:hidden p-1.5 rounded-xl bg-[#F8F5EC] text-[#5A4C33] hover:bg-[#F0EAD6] transition-colors"
              aria-label="Toggle menu"
            >
              <FiMenu className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-lg md:text-xl font-bold text-[#5A4C33] flex items-center gap-1.5 bg-gradient-to-r from-[#D2A02A] to-[#5A4C33] bg-clip-text text-transparent italic tracking-tight">
              <span className="text-xl not-italic">⚖️</span> IPRKaro Leads
            </h1>
            <p className="text-[#5A4C33]/50 text-[8.5px] mt-0.5 uppercase tracking-[0.1em] font-black">
              The Future of Brand Protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="bg-white rounded-lg px-2.5 py-1.5 shadow-sm border border-[#5A4C33]/10 text-[#5A4C33] font-bold text-[13px] leading-none flex items-center gap-1.5">
            <span className="text-[#5A4C33]/50 text-[11px] font-medium">Total: </span>
            <span className="text-[#D2A02A]">{totalCount}</span>
          </div>
          <div className="bg-white rounded-lg px-2.5 py-1.5 shadow-sm border border-[#5A4C33]/10 text-[#5A4C33] font-bold text-[13px] leading-none flex items-center gap-1.5">
            <span className="text-[#5A4C33]/50 text-[11px] font-medium">Showing: </span>
            <span className="text-[#D2A02A]">{showingCount}</span>
          </div>
          
          {(userRole === "admin" || userRole === "overlord") && (
            <button
              onClick={exportToCSV}
              className="bg-[#5A4C33] hover:bg-[#4A3F2A] text-white px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 tracking-tight border border-[#5A4C33]/20 h-[34px]"
            >
              <FiDownload className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-[#5A4C33]/40 text-[10px]">
        {currentUserEmail ? `Logged in as: ${currentUserEmail}` : "Not logged in"}
      </div>
    </div>
  )
}

export default IprKaroHeader
