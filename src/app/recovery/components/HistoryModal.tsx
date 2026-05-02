"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  history: Array<{
    oldValue: any
    newValue: any
    changedBy: string
    timestamp: Date | null
  }>
  fieldLabel: string
  isDarkMode: boolean
}

export default function HistoryModal({
  isOpen,
  onClose,
  history,
  fieldLabel,
  isDarkMode,
}: HistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col ${
          isDarkMode ? "bg-gray-900 text-white border-gray-800" : "bg-white"
        }`}
      >
        <DialogHeader>
          <DialogTitle>History: {fieldLabel}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-4 custom-scrollbar">
          {history.length === 0 ? (
            <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No history found.
            </p>
          ) : (
            history.map((entry, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border ${
                  isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-sm">{entry.changedBy || 'Unknown User'}</span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown Date'}
                  </span>
                </div>
                
                {fieldLabel.toLowerCase().includes('remark') ? (
                  <p className="text-sm whitespace-pre-wrap">{entry.newValue}</p>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`line-through opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {String(entry.oldValue ?? 'None')}
                    </span>
                    <span>→</span>
                    <span className="font-medium">
                      {String(entry.newValue ?? 'None')}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
