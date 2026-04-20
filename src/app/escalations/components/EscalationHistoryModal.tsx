'use client'

import React, { useState, useEffect } from 'react'
import { FaHistory, FaUser, FaClock, FaTimes } from 'react-icons/fa'
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

interface HistoryEntry {
  id: string
  content: string
  author: string
  role: string
  timestamp: any
}

interface EscalationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  escalationId: string
  type: 'concern' | 'sales' | 'ops'
  title: string
}

const EscalationHistoryModal: React.FC<EscalationHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  escalationId, 
  type,
  title
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !escalationId) return

    setLoading(true)
    const historyRef = collection(db, 'escalations', escalationId, `${type}History`)
    const q = query(historyRef, orderBy('timestamp', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HistoryEntry[]
      setHistory(entries)
      setLoading(false)
    }, (error) => {
      console.error("Error fetching history:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [isOpen, escalationId, type])

  if (!isOpen) return null

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Recent'
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              type === 'sales' ? 'bg-blue-100 text-blue-600' : 
              type === 'ops' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              <FaHistory />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Chronological list of updates</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Fetching history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaHistory className="text-gray-400 text-2xl" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No history entries found for this category.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-3 pl-8 space-y-8">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-full border-4 border-white dark:border-gray-900 shadow-sm ${
                    type === 'sales' ? 'bg-blue-500' : 
                    type === 'ops' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                  
                  <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-white dark:bg-gray-700 p-1.5 rounded-full shadow-sm">
                          <FaUser className="text-gray-400 text-xs" />
                        </div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{entry.author}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                          entry.role === 'sales' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          entry.role === 'advocate' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        }`}>
                          {entry.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs">
                        <FaClock />
                        <span>{formatTime(entry.timestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default EscalationHistoryModal
