'use client';

import { Dispute } from '../types';
import { useEffect, useRef, useState } from 'react';
import QueryViewModal from './QueryViewModal';
import { FaWhatsapp } from 'react-icons/fa';
import DisputeMobileCard from './DisputeMobileCard';

interface DisputesTableProps {
  disputes: Dispute[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
  statusOptions: string[];
  onUpdateDispute: (id: string, updates: Partial<Dispute>) => Promise<void>;
  onViewHistory: (disputeId: string, disputeName: string) => void;
  onOpenWhatsApp: (dispute: Dispute) => void;
  // Selection props
  selectedDisputes: string[];
  onSelectDispute: (id: string) => void;
  onSelectAll: () => void;
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

export default function DisputesTable({ 
  disputes, 
  hasMore, 
  loading, 
  loadMore, 
  statusOptions, 
  onUpdateDispute,
  onViewHistory,
  onOpenWhatsApp,
  selectedDisputes,
  onSelectDispute,
  onSelectAll
}: DisputesTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [editingRemarks, setEditingRemarks] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({});
  
  // WhatsApp state is now handled by parent via modal
  // Removed local showWhatsAppMenu and isSendingWhatsApp states
  // WhatsApp handling is now passed to parent
  
  // Query view state
  const [selectedQuery, setSelectedQuery] = useState<{ text: string, name: string } | null>(null);

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
    await onUpdateDispute(id, { status });
  };

  const handleRemarksChange = (id: string, value: string) => {
    setEditingRemarks(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveRemarks = async (id: string) => {
    const remarks = editingRemarks[id];
    if (remarks === undefined) return;
    
    setIsSaving(prev => ({ ...prev, [id]: true }));
    try {
      await onUpdateDispute(id, { remarks });
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
    <div className="space-y-4">
      {/* Mobile view - Card stack */}
      <div className="md:hidden space-y-4">
        {disputes.length === 0 && !loading && (
          <div className="bg-white p-8 text-center rounded-xl border border-gray-200 text-sm text-gray-500">
            No disputes found.
          </div>
        )}
        {disputes.map((dispute) => (
          <DisputeMobileCard
            key={dispute.id}
            dispute={dispute}
            statusOptions={statusOptions}
            onUpdateDispute={onUpdateDispute}
            onViewHistory={onViewHistory}
            onOpenWhatsApp={onOpenWhatsApp}
            isSelected={selectedDisputes.includes(dispute.id)}
            onSelect={onSelectDispute}
            onViewQuery={(text, name) => setSelectedQuery({ text, name })}
          />
        ))}
      </div>

      {/* Desktop view - Standard table */}
      <div className="hidden md:block overflow-hidden bg-white shadow-md rounded-lg border border-gray-200">
        <div className="overflow-x-auto">

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left sticky top-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={disputes.length > 0 && selectedDisputes.length === disputes.length}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-[#D2A02A] focus:ring-[#D2A02A]"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Submitted At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Remarks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Query</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {disputes.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  No disputes found.
                </td>
              </tr>
            ) : (
              disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedDisputes.includes(dispute.id)}
                      onChange={() => onSelectDispute(dispute.id)}
                      className="rounded border-gray-300 text-[#D2A02A] focus:ring-[#D2A02A]"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {dispute.submittedAt
                        ? new Date(dispute.submittedAt).toLocaleDateString()
                        : '-'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {dispute.submittedAt
                        ? new Date(dispute.submittedAt).toLocaleTimeString()
                        : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>{dispute.name}</div>
                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">{dispute.userEmail}</div>
                    <div className="text-[10px] text-[#D2A02A] font-normal">{dispute.userPhone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispute.phone}</td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col space-y-2">
                       <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium border ${getStatusColor(dispute.status || 'No Status')}`}>
                        {dispute.status || 'No Status'}
                      </span>
                      <select 
                        value={dispute.status || 'No Status'}
                        onChange={(e) => handleStatusChange(dispute.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded p-1 bg-white text-gray-900"
                      >
                        {statusOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-col space-y-1">
                      <textarea
                        className="text-xs border border-gray-300 rounded p-1 w-full min-w-[150px] bg-white text-gray-900"
                        rows={2}
                        value={editingRemarks[dispute.id] !== undefined ? editingRemarks[dispute.id] : dispute.remarks || ''}
                        onChange={(e) => handleRemarksChange(dispute.id, e.target.value)}
                        placeholder="Add remarks..."
                      />
                      <div className="flex justify-end gap-2 mt-1">
                        {editingRemarks[dispute.id] !== undefined && (
                          <button
                            onClick={() => handleSaveRemarks(dispute.id)}
                            disabled={isSaving[dispute.id]}
                            className="text-[10px] bg-[#D2A02A] text-white rounded px-2 py-1 hover:bg-[#B8911E] disabled:opacity-50"
                          >
                            {isSaving[dispute.id] ? 'Saving...' : 'Save'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => onViewHistory(dispute.id, dispute.name)}
                          className="text-[10px] bg-gray-500 text-white rounded px-2 py-1 hover:bg-gray-600"
                        >
                          History
                        </button>

                          <button
                            onClick={() => onOpenWhatsApp(dispute)}
                            className="p-1.5 rounded transition-colors bg-green-500 hover:bg-green-600 text-white shadow-sm"
                            title="Send WhatsApp message"
                          >
                            <FaWhatsapp className="w-4 h-4" />
                          </button>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="font-medium text-gray-700">{dispute.selected_service}</div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-col space-y-2">
                      <div className="max-w-xs truncate" title={dispute.query}>
                        {dispute.query}
                      </div>
                      <button
                        onClick={() => setSelectedQuery({ text: dispute.query, name: dispute.name })}
                        className="text-[10px] w-fit font-medium text-[#D2A02A] border border-[#D2A02A]/30 px-2 py-0.5 rounded hover:bg-[#D2A02A] hover:text-white transition-all"
                      >
                        View Full Query
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    
    <div ref={observerTarget} className="h-16 w-full flex items-center justify-center p-4 bg-gray-50 border-t border-gray-200">
      {loading ? (
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          <span className="text-sm">Loading more disputes...</span>
        </div>
      ) : (
        !hasMore && disputes.length > 0 && (
          <span className="text-gray-500 text-sm font-medium">End of list</span>
        )
      )}
    </div>

    <QueryViewModal 
      isOpen={!!selectedQuery}
      onClose={() => setSelectedQuery(null)}
      query={selectedQuery?.text || ''}
      name={selectedQuery?.name || ''}
    />
  </div>
);
}
