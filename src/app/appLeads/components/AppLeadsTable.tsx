'use client';

import { AppLead } from '../types';
import { useEffect, useRef, useState } from 'react';

interface AppLeadsTableProps {
  leads: AppLead[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
  statusOptions: string[];
  onUpdateLead: (id: string, updates: Partial<AppLead>) => Promise<void>;
  onViewHistory: (leadId: string, leadName: string) => void;
  onViewQuery: (query: string, leadName: string) => void;
}

const getStatusColor = (status: string) => {
  const key = (status || '').toLowerCase();
  if (key === 'no status') return 'bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20';
  if (key === 'interested') return 'bg-green-900 text-green-100 border border-green-700';
  if (key === 'not interested') return 'bg-red-900 text-red-100 border border-red-700';
  if (key === 'not answering') return 'bg-orange-900 text-orange-100 border border-orange-700';
  if (key === 'callback') return 'bg-yellow-900 text-yellow-100 border border-yellow-700';
  if (key === 'future potential') return 'bg-blue-900 text-blue-100 border border-blue-700';
  if (key === 'converted') return 'bg-emerald-900 text-emerald-100 border border-emerald-700';
  if (key === 'language barrier') return 'bg-indigo-900 text-indigo-100 border border-indigo-700';
  if (key === 'closed lead') return 'bg-gray-500 text-white border border-gray-700';
  if (key === 'loan required') return 'bg-purple-900 text-purple-100 border border-purple-700';
  if (key === 'short loan') return 'bg-teal-900 text-teal-100 border border-teal-700';
  if (key === 'cibil issue') return 'bg-rose-900 text-rose-100 border border-rose-700';
  if (key === 'retargeting') return 'bg-cyan-900 text-cyan-100 border border-cyan-700';
  return 'bg-gray-700 text-gray-200 border border-gray-600';
};

export default function AppLeadsTable({ leads, hasMore, loading, loadMore, statusOptions, onUpdateLead, onViewHistory, onViewQuery }: AppLeadsTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [editingRemarks, setEditingRemarks] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadMore]);

  const handleStatusChange = async (id: string, status: string) => {
    await onUpdateLead(id, { status });
  };

  const handleRemarksChange = (id: string, value: string) => {
    setEditingRemarks(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveRemarks = async (id: string) => {
    const remarks = editingRemarks[id];
    if (remarks === undefined) return;
    
    setIsSaving(prev => ({ ...prev, [id]: true }));
    try {
      await onUpdateLead(id, { remarks });
      // Clear editing state after successful save
      setEditingRemarks(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    } finally {
      setIsSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="overflow-hidden bg-white shadow-md rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Created At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Remarks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">State/Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Query</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No leads found.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onViewQuery(lead.query || '', lead.name)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {lead.created_at
                        ? new Date(lead.created_at * 1000).toLocaleDateString()
                        : '-'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {lead.created_at
                        ? new Date(lead.created_at * 1000).toLocaleTimeString()
                        : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.phone} <br /> {lead.email}</td>
                  
                  {/* Status Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col space-y-2">
                       <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium border ${getStatusColor(lead.status || 'No Status')}`}>
                        {lead.status || 'No Status'}
                      </span>
                      <select 
                        value={lead.status || 'No Status'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded p-1 bg-white text-gray-900"
                      >
                        {statusOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Remarks Column */}
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-col space-y-1">
                      <textarea
                        className="text-xs border border-gray-300 rounded p-1 w-full min-w-[150px] bg-white text-gray-900"
                        rows={2}
                        value={editingRemarks[lead.id] !== undefined ? editingRemarks[lead.id] : lead.remarks || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleRemarksChange(lead.id, e.target.value)}
                        placeholder="Add remarks..."
                      />
                      <div className="flex justify-end gap-2 mt-1">
                        {editingRemarks[lead.id] !== undefined && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveRemarks(lead.id);
                            }}
                            disabled={isSaving[lead.id]}
                            className="text-[10px] bg-[#D2A02A] text-white rounded px-2 py-1 hover:bg-[#B8911E] disabled:opacity-50"
                          >
                            {isSaving[lead.id] ? 'Saving...' : 'Save'}
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewHistory(lead.id, lead.name);
                          }}
                          className="text-[10px] bg-gray-500 text-white rounded px-2 py-1 hover:bg-gray-600"
                        >
                          History
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="font-medium text-gray-700">{lead.state}</div>
                    <div className="text-xs text-gray-400">{lead.source}</div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate" title={lead.query}>{lead.query}</div>
                    {lead.query && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewQuery(lead.query, lead.name);
                        }}
                        className="text-[10px] text-[#D2A02A] hover:underline mt-1 font-medium"
                      >
                        View Full Remark
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Sentinel element for infinite scroll */}
      <div ref={observerTarget} className="h-16 w-full flex items-center justify-center p-4 bg-gray-50 border-t border-gray-200">
        {loading ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            <span className="text-sm">Loading more leads...</span>
          </div>
        ) : (
          !hasMore && leads.length > 0 && (
            <span className="text-gray-500 text-sm font-medium">End of list</span>
          )
        )}
      </div>
    </div>
  );
}

