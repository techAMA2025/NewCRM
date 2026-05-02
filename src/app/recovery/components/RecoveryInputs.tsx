"use client"

import React, { useState, useEffect } from "react"

export const RecoveryRemarkInput = ({
  recordId,
  initialValue,
  isDarkMode,
  onSave,
  onHistory,
}: {
  recordId: string
  initialValue: string
  isDarkMode: boolean
  onSave: (id: string, value: string) => void
  onHistory: (id: string) => void
}) => {
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <div className="flex flex-col space-y-2 w-full">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add remark..."
        className={`w-full px-2 py-1 border rounded-lg text-[10px] min-h-[60px] resize-y transition-all focus:ring-1 focus:ring-purple-500 outline-none ${
          isDarkMode
            ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-500"
            : "bg-gray-100/50 border-gray-200 text-gray-800"
        }`}
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setIsSaving(true)
            try {
              await onSave(recordId, value)
            } finally {
              setIsSaving(false)
            }
          }}
          disabled={isSaving}
          className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 text-white shadow-lg ${
            isSaving ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </button>
        <button
          onClick={() => onHistory(recordId)}
          className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-800/50"
        >
          LOG
        </button>
      </div>
    </div>
  )
}

export const RecoveryAmountInput = ({
  recordId,
  initialValue,
  isDarkMode,
  onSave,
  buttonColor = "bg-purple-600 hover:bg-purple-500",
}: {
  recordId: string
  initialValue: string
  isDarkMode: boolean
  onSave: (id: string, value: string) => void
  buttonColor?: string
}) => {
  const fmt = (val: string) => {
    if (!val) return "0"
    const clean = val.toString().replace(/,/g, "").replace(/[^0-9.]/g, "")
    if (!clean) return "0"
    const num = parseFloat(clean)
    if (isNaN(num)) return val
    return num.toLocaleString("en-IN")
  }

  const [value, setValue] = useState(fmt(initialValue))

  useEffect(() => {
    setValue(fmt(initialValue))
  }, [initialValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "")
    if (!raw) { setValue(""); return }
    if (e.target.value.endsWith(".")) { setValue(fmt(raw) + "."); return }
    setValue(fmt(raw))
  }

  return (
    <div className="flex items-center gap-1.5 w-full">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="0"
        className={`w-full px-1.5 py-1 border rounded-lg text-[9px] h-7 focus:ring-1 focus:ring-purple-500 outline-none transition-all ${
          isDarkMode
            ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-500"
            : "bg-white border-gray-200 text-gray-800"
        }`}
      />
      <button
        onClick={() => onSave(recordId, value.replace(/,/g, ""))}
        className={`shrink-0 w-7 h-7 rounded-lg transition-all active:scale-90 flex items-center justify-center text-white shadow-lg ${buttonColor}`}
        title="Save"
      >
        <span className="text-xs">✓</span>
      </button>
    </div>
  )
}
