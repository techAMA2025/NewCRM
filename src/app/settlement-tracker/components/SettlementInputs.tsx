"use client"

import React, { useState, useEffect } from "react"

// Separate component for the remark input to prevent re-rendering the whole list
export const RemarkInput = ({ 
  settlementId, 
  initialValue, 
  isDarkMode, 
  onSave, 
  onHistory 
}: { 
  settlementId: string
  initialValue: string
  isDarkMode: boolean
  onSave: (id: string, value: string) => void
  onHistory: (id: string) => void
}) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <div className="flex flex-col space-y-2 w-full">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add remark..."
        className={`w-full px-2 py-1 border rounded-lg text-[10px] min-h-[60px] h-auto resize-y transition-all focus:ring-1 focus:ring-green-500 outline-none ${
          isDarkMode 
            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' 
            : 'bg-gray-100/50 border-gray-200 text-gray-800'
        }`}
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(settlementId, value)}
          className="flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 bg-green-600 hover:bg-green-700 text-white shadow-lg"
        >
          SAVE
        </button>
        <button
          onClick={() => onHistory(settlementId)}
          className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-800/50"
        >
          LOG
        </button>
      </div>
    </div>
  )
}

// Component for inline settlement amount editing
export const SettlementAmountInput = ({
  settlementId,
  initialValue,
  isDarkMode,
  onSave,
  buttonColor = "bg-green-600 hover:bg-green-500"
}: {
  settlementId: string
  initialValue: string
  isDarkMode: boolean
  onSave: (id: string, value: string) => void
  buttonColor?: string
}) => {
  // Format initial value to Indian standard if it exists
  const formatValue = (val: string) => {
    if (!val) return ''
    const clean = val.toString().replace(/,/g, '').replace(/[^0-9.]/g, '')
    if (clean === '') return ''
    const num = parseFloat(clean)
    if (isNaN(num)) return val
    return num.toLocaleString('en-IN')
  }

  const [value, setValue] = useState(formatValue(initialValue))

  // Update value if initialValue changes
  useEffect(() => {
    setValue(formatValue(initialValue))
  }, [initialValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '')
    if (rawValue === '') {
      setValue('')
      return
    }
    
    // Support decimal points while typing
    if (e.target.value.endsWith('.')) {
        setValue(formatValue(rawValue) + '.')
        return
    }

    setValue(formatValue(rawValue))
  }

  return (
    <div className="flex items-center gap-1.5 relative w-full">
       <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="0"
         className={`w-full px-1.5 py-1 border rounded-lg text-[9px] h-7 focus:ring-1 focus:ring-green-500 outline-none transition-all ${
          isDarkMode 
            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' 
            : 'bg-white border-gray-200 text-gray-800'
        }`}
      />
       <button
        onClick={() => onSave(settlementId, value.replace(/,/g, ''))}
        className={`shrink-0 w-7 h-7 rounded-lg transition-all active:scale-90 flex items-center justify-center text-white shadow-lg ${buttonColor}`}
        title="Save Amount"
      >
        <span className="text-xs">✓</span>
      </button>
    </div>
  )
}
