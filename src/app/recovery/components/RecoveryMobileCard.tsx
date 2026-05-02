"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RecoveryAmountInput, RecoveryRemarkInput } from "./RecoveryInputs"
import { Card, CardContent } from "@/components/ui/card"

export default function RecoveryMobileCard({
  record,
  isDarkMode,
  onUpdateField,
  onSaveRemark,
  onViewHistory,
  onDocPreview,
}: any) {
  const safeFormatDate = (dateVal: any) => {
    if (!dateVal) return '---';
    try {
      if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
        return new Date(dateVal.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }
      if (dateVal && typeof dateVal === 'object' && '_seconds' in dateVal) {
        return new Date(dateVal._seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '---';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch (e) {
      return '---';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800"
      case "Not Paid": return "bg-red-100 text-red-800"
      case "On hold": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className={`overflow-hidden border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`px-4 py-3 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
        <div>
          <h3 className="font-bold text-sm truncate w-[200px]">{record.clientName}</h3>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {record.clientPhone || 'N/A'}
          </p>
          {record.clientEmail && (
            <p className={`text-[10px] truncate w-[200px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {record.clientEmail}
            </p>
          )}
          <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {safeFormatDate(record.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Select 
              value={record.status} 
              onValueChange={(val) => onUpdateField(record.id, 'status', val)}
            >
              <SelectTrigger className={`w-24 h-8 text-[10px] font-bold rounded-lg border-0 ${getStatusColor(record.status)}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Not Paid">Not Paid</SelectItem>
                <SelectItem value="On hold">On hold</SelectItem>
              </SelectContent>
            </Select>
            <button 
              onClick={() => onViewHistory(record.id, 'status')}
              className="text-[9px] px-1.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 transition-colors"
            >
              LOG
            </button>
          </div>
          
          {/* Automation Status Badge */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className={`flex flex-col items-center justify-center w-6 h-6 rounded-md ${
              record.status === 'Paid' || record.automationStatus === 'Completed'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
            }`}>
              <span className="text-[10px] font-black leading-none">{record.automationStep || 0}</span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[7px] font-black uppercase tracking-tighter ${
                record.automationStatus === 'Completed' ? 'text-green-500' : 
                record.automationEnabled ? 'text-purple-500' : 'text-gray-500'
              }`}>
                {record.automationStatus || (record.automationEnabled ? 'Active' : 'Disabled')}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-4">
        {/* Client & Fee details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Phone</p>
            <p className="text-xs font-medium">{record.clientPhone || 'N/A'}</p>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className={`text-[10px] uppercase tracking-wider font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Fee Type</p>
              <button 
                onClick={() => onViewHistory(record.id, 'feeType')}
                className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 transition-colors"
              >
                LOG
              </button>
            </div>
            <Select 
              value={record.feeType} 
              onValueChange={(val) => onUpdateField(record.id, 'feeType', val)}
            >
              <SelectTrigger className={`h-7 text-xs font-bold border-0 ${
                record.feeType === 'Retainer Fees' ? (isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-800') :
                record.feeType === 'Success Fees' ? (isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-800') :
                record.feeType === 'Signup Fees' ? (isDarkMode ? 'bg-pink-900/40 text-pink-400' : 'bg-pink-100 text-pink-800') :
                (isDarkMode ? 'bg-gray-700' : 'bg-gray-50')
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Retainer Fees">Retainer</SelectItem>
                <SelectItem value="Success Fees">Success</SelectItem>
                <SelectItem value="Signup Fees">Signup</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Amounts */}
        <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold w-16 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Claimed</span>
              <button 
                onClick={() => onViewHistory(record.id, 'amountPending')}
                className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 transition-colors mr-auto"
              >
                LOG
              </button>
              <RecoveryAmountInput 
                recordId={record.id}
                initialValue={record.amountPending}
                isDarkMode={isDarkMode}
                onSave={(id, val) => onUpdateField(id, 'amountPending', val)}
                buttonColor="bg-orange-500 hover:bg-orange-600"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold w-16 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Received</span>
              <button 
                onClick={() => onViewHistory(record.id, 'amountReceived')}
                className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 transition-colors mr-auto"
              >
                LOG
              </button>
              <RecoveryAmountInput 
                recordId={record.id}
                initialValue={record.amountReceived}
                isDarkMode={isDarkMode}
                onSave={(id, val) => onUpdateField(id, 'amountReceived', val)}
                buttonColor="bg-green-500 hover:bg-green-600"
              />
            </div>
            <div className={`pt-2 mt-2 border-t flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-500">Outstanding</span>
              <span className="font-bold">₹{parseFloat(record.total || '0').toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-purple-50/30 border-purple-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                record.status === 'Paid' || record.automationStatus === 'Completed' ? 'text-green-500' : 
                record.status === 'On hold' ? 'text-orange-500' : 'text-purple-500'
              }`}>
                {record.automationStatus === 'Completed' ? 'Completed' : 
                 record.status === 'On hold' ? 'Paused' : 
                 record.automationStatus || 'Active'}
              </span>
              <span className="text-[8px] opacity-50 font-bold uppercase tracking-tighter">Recovery Lifecycle</span>
            </div>
            <div className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <span className="text-xs font-black">{record.automationStep || 0}</span>
              <span className="text-[8px] font-bold opacity-30 ml-0.5">/ 5</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((stepIdx) => {
              const isSent = record[`step${stepIdx}SentAt`] || record.automationStep >= stepIdx;
              const isCurrent = record.automationStep === stepIdx;
              const isError = record.automationStatus?.toLowerCase().includes('error') && isCurrent;
              const sentDate = record[`step${stepIdx}SentAt`];
              
              let displayDate = safeFormatDate(sentDate);
              if (displayDate === '---' && record.createdAt) {
                const baseDate = new Date(record.createdAt?.seconds ? record.createdAt.seconds * 1000 : record.createdAt);
                if (!isNaN(baseDate.getTime())) {
                  baseDate.setDate(baseDate.getDate() + (stepIdx - 1) * 7);
                  displayDate = baseDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                }
              }

              return (
                <div key={stepIdx} className="flex flex-col gap-1">
                  {/* Document icon */}
                  <div className="flex justify-center h-4">
                    {record[`step${stepIdx}Url`] ? (
                      <button
                        onClick={() => onDocPreview?.({
                          url: record[`step${stepIdx}Url`],
                          label: `${record.clientName} — ${stepIdx === 2 ? 'Police Complaint' : stepIdx === 5 ? 'Mediation Notice' : `Notice ${stepIdx}`}`
                        })}
                        className={`w-4 h-4 rounded flex items-center justify-center ${
                          isDarkMode 
                            ? 'bg-purple-900/40 text-purple-400' 
                            : 'bg-purple-100 text-purple-600'
                        }`}
                        title="View Document"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                          <path d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" />
                        </svg>
                      </button>
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`h-1.5 rounded-full relative ${
                    isError ? 'bg-red-500' :
                    isSent ? (record.automationStatus === 'Completed' ? 'bg-green-500' : 'bg-purple-500') :
                    (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')
                  }`}>
                    {isCurrent && !isSent && !isError && (
                      <div className="absolute inset-0 bg-purple-400 opacity-50 rounded-full" />
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-[8px] font-black tracking-tighter ${isSent ? 'opacity-100' : 'opacity-30'}`}>
                      {stepIdx === 2 ? 'PC' : stepIdx === 5 ? 'MN' : `N${stepIdx}`}
                    </span>
                    <span className={`text-[7px] font-bold whitespace-nowrap ${isSent ? 'opacity-100' : 'opacity-20'}`}>{displayDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remarks */}
        <div>
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Remarks</p>
          <RecoveryRemarkInput 
            recordId={record.id}
            initialValue={record.latestRemark?.remark || ""}
            isDarkMode={isDarkMode}
            onSave={onSaveRemark}
            onHistory={(id) => onViewHistory(id, 'remark')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
