"use client"

import React, { useState } from "react"
import { FaUniversity, FaUser, FaHistory, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaMoneyBillWave, FaPaperPlane } from "react-icons/fa"
import { RemarkInput, SettlementAmountInput } from "./SettlementInputs" // Adjusted import path

interface Settlement {
  id: string
  clientId: string
  clientName: string
  clientMobile?: string
  clientEmail?: string
  bankId: string
  bankName: string
  accountNumber: string
  loanAmount: string
  loanType: string
  status: string
  remarks: string
  createdAt: any
  createdBy: string
  latestRemark?: {
    remark: string
    advocateName: string
    timestamp: any
  }
  successFeeStatus?: 'Paid' | 'Not Paid' | 'Partially Paid' | 'Not Required'
  successFeeAmount?: string
  settlementAmount?: string
  letterAmount?: string
  source?: string
}

interface SettlementMobileCardProps {
  settlement: Settlement
  isDarkMode: boolean
  getStatusColor: (status: string) => string
  getSuccessFeeColor: (status: string) => string
  getStatusDisplay: (status: string) => string
  formatLoanAmount: (amount: string) => string
  onStatusUpdate: (id: string, status: string) => void
  onSuccessFeeStatusChange: (id: string, status: string) => void
  onSourceUpdate: (id: string, source: string) => void
  onSettlementAmountSave: (id: string, amount: string) => void
  onLetterAmountSave: (id: string, amount: string) => void
  onSaveRemark: (id: string, remark: string) => void
  onViewHistory: (id: string) => void
  onEditClick: (settlement: Settlement) => void
  onDeleteClick: (settlement: Settlement) => void
  statusOptions: string[]
  sourceOptions: string[]
  settlementRemarks: Record<string, string>
}

export default function SettlementMobileCard({
  settlement,
  isDarkMode,
  getStatusColor,
  getSuccessFeeColor,
  getStatusDisplay,
  formatLoanAmount,
  onStatusUpdate,
  onSuccessFeeStatusChange,
  onSourceUpdate,
  onSettlementAmountSave,
  onLetterAmountSave,
  onSaveRemark,
  onViewHistory,
  onEditClick,
  onDeleteClick,
  statusOptions,
  sourceOptions,
  settlementRemarks
}: SettlementMobileCardProps) {
  
  const dateStr = settlement.createdAt?.toDate ? settlement.createdAt.toDate().toLocaleDateString() : 'N/A'

  return (
    <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl overflow-hidden shadow-md mb-4 animate-fadeIn`}>
      {/* Header */}
      <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-100 bg-gray-50/50'}`}>
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1">
            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase truncate`}>
              {settlement.clientName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{dateStr}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusColor(settlement.status)}`}>
                {getStatusDisplay(settlement.status)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onEditClick(settlement)}
              className="p-2 bg-blue-600/10 text-blue-500 rounded-lg active:scale-95 transition-all"
            >
              <FaEdit className="text-xs" />
            </button>
            <button 
              onClick={() => onDeleteClick(settlement)}
              className="p-2 bg-red-600/10 text-red-500 rounded-lg active:scale-95 transition-all"
            >
              <FaTrash className="text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 grid grid-cols-2 gap-3">
        <div className="flex items-start gap-2">
          <div className={`mt-1 p-1.5 rounded-lg ${isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
             <FaUniversity className="text-[10px]" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] text-gray-500 font-bold uppercase leading-tight">Bank</p>
            <p className={`text-[11px] font-medium truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} title={settlement.bankName}>
              {settlement.bankName}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className={`mt-1 p-1.5 rounded-lg ${isDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
             <FaMoneyBillWave className="text-[10px]" />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase leading-tight">Amount</p>
            <p className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              ₹{formatLoanAmount(settlement.loanAmount)}
            </p>
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-3 pt-2 border-t border-gray-700/30">
           <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Settlement Amt</p>
              <SettlementAmountInput 
                settlementId={settlement.id}
                initialValue={settlement.settlementAmount || ''}
                isDarkMode={isDarkMode}
                onSave={onSettlementAmountSave}
              />
           </div>
           <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Letter Balance</p>
              <SettlementAmountInput 
                settlementId={settlement.id}
                initialValue={settlement.letterAmount || ''}
                isDarkMode={isDarkMode}
                onSave={onLetterAmountSave}
                buttonColor="bg-blue-600 hover:bg-blue-500"
              />
           </div>
        </div>
      </div>

      {/* Control Section */}
      <div className={`p-3 border-t ${isDarkMode ? 'bg-black/20 border-gray-700/50' : 'bg-gray-50 border-gray-100'}`}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Source</p>
            <select 
              value={settlement.source || ''} 
              onChange={(e) => onSourceUpdate(settlement.id, e.target.value)}
              className={`w-full h-8 text-[10px] rounded-lg focus:ring-1 focus:ring-green-500 outline-none px-2 transition-all ${
                isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900 border'
              }`}
            >
              <option value="">Source</option>
              {sourceOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Success Fee</p>
            <select 
              value={settlement.successFeeStatus || 'Not Paid'} 
              onChange={(e) => onSuccessFeeStatusChange(settlement.id, e.target.value)}
              className={`w-full h-8 text-[10px] rounded-lg outline-none px-2 transition-all border ${
                getSuccessFeeColor(settlement.successFeeStatus || 'Not Paid')
              }`}
            >
              <option value="Paid">Paid</option>
              <option value="Not Paid">Not Paid</option>
              <option value="Partially Paid">Partial</option>
              <option value="Not Required">None</option>
            </select>
          </div>
        </div>

        {/* Remark Section */}
        <div className="mt-2">
           <p className="text-[9px] text-gray-500 font-bold uppercase mb-1.5 flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
             Remark
           </p>
           <RemarkInput
              settlementId={settlement.id}
              initialValue={settlementRemarks[settlement.id] || ""}
              isDarkMode={isDarkMode}
              onSave={onSaveRemark}
              onHistory={onViewHistory}
            />
        </div>
      </div>

      {/* Created By Footer */}
      <div className={`px-3 py-1.5 flex justify-between items-center ${isDarkMode ? 'bg-gray-900/60' : 'bg-gray-100/50'}`}>
         <div className="flex items-center gap-1.5">
            <FaUser className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-[9px] font-medium uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {settlement.createdBy}
            </span>
         </div>
         <p className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
           ID: {settlement.id.slice(-6).toUpperCase()}
         </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
