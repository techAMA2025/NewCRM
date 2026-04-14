'use client';

import { Dispute } from '../types';
import { useEffect, useRef, useState } from 'react';
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
  onViewQuery: (text: string, name: string) => void;
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
  return 'bg-[#5A4C33]/10 text-[#5A4C33] border border-[#5A4C33]/20';
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
  onSelectAll,
  onViewQuery,
}: DisputesTableProps) {
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

    if (observerTarget.current) observer.observe(observerTarget.current);

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [hasMore, loading, loadMore]);

  const handleStatusChange = async (id: string, status: string) => {
    await onUpdateDispute(id, { status });
  };

  const handleRemarksChange = (id: string, value: string) => {
    setEditingRemarks((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveRemarks = async (id: string) => {
    const remarks = editingRemarks[id];
    if (remarks === undefined) return;
    setIsSaving((prev) => ({ ...prev, [id]: true }));
    try {
      await onUpdateDispute(id, { remarks });
      setEditingRemarks((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setIsSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ── Shared th class ──────────────────────────────────────────────────────
  const thBase =
    'py-1 px-2 text-left font-semibold text-[10px] uppercase tracking-wider border-b border-[#5A4C33]/20 bg-white/50';
  const thWithRight = `${thBase} border-r border-[#5A4C33]/20`;

  return (
    <div className="overflow-x-auto relative w-full">
      {/* Loading overlay */}
      {loading && disputes.length === 0 && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D2A02A]" />
            <span className="text-sm font-medium text-[#5A4C33]">Loading disputes...</span>
          </div>
        </div>
      )}

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3 p-3">
        {disputes.length === 0 && !loading && (
          <div className="bg-[#F8F5EC] p-8 text-center rounded-xl border border-[#5A4C33]/15 text-sm text-[#5A4C33]/60">
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
            onViewQuery={onViewQuery}
          />
        ))}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block">
        <table className="min-w-full border-collapse">
          {/* ── Header ── */}
          <thead className="bg-[#F8F5EC] text-[10px] uppercase font-medium sticky top-0 z-10">
            <tr>
              {/* Checkbox */}
              <th className={`${thWithRight} w-10`}>
                <div className="flex items-center justify-center p-1">
                  <input
                    type="checkbox"
                    checked={disputes.length > 0 && selectedDisputes.length === disputes.length}
                    onChange={onSelectAll}
                    className="rounded border-[#5A4C33]/30 text-[#D2A02A] bg-white focus:ring-[#D2A02A] focus:ring-2"
                  />
                </div>
              </th>

              {/* Submitted At */}
              <th className={`${thWithRight} w-28`}>
                <div className="flex items-center p-2">
                  <span className="text-[#D2A02A]">Submitted At</span>
                </div>
              </th>

              {/* Name */}
              <th className={`${thWithRight} w-40`}>
                <div className="flex items-center p-2">
                  <span className="text-[#D2A02A]">Name</span>
                </div>
              </th>

              {/* Contact */}
              {/* Status */}
              <th className={`${thWithRight} w-36`}>
                <div className="flex items-center p-2">
                  <span className="text-[#D2A02A]">Status</span>
                </div>
              </th>

              {/* Remarks */}
              <th className={`${thWithRight} w-48`}>
                <div className="flex items-center p-2">
                  <span className="text-[#D2A02A]">Remarks</span>
                </div>
              </th>

              {/* Service */}
              <th className={`${thWithRight} w-32`}>
                <div className="flex items-center p-2">
                  <span className="text-[#D2A02A]">Service</span>
                </div>
              </th>

              {/* Query — last column: no right border */}
              <th className={`${thBase} w-44`}>
                <div className="flex items-center p-2">
                  <span className="text-[#D2A02A]">Query</span>
                </div>
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-[#5A4C33]/10">
            {disputes.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-[#5A4C33]/50 font-medium"
                >
                  No disputes found.
                </td>
              </tr>
            ) : (
              disputes.map((dispute) => (
                <tr
                  key={dispute.id}
                  className={`transition-colors ${
                    selectedDisputes.includes(dispute.id)
                      ? 'bg-[#D2A02A]/8'
                      : 'hover:bg-[#F8F5EC]/60'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2 border-r border-[#5A4C33]/10 w-10">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedDisputes.includes(dispute.id)}
                        onChange={() => onSelectDispute(dispute.id)}
                        className="rounded border-[#5A4C33]/30 text-[#D2A02A] bg-white focus:ring-[#D2A02A]"
                      />
                    </div>
                  </td>

                  {/* Submitted At */}
                  <td className="px-3 py-2 border-r border-[#5A4C33]/10 w-28">
                    <div className="text-xs font-medium text-[#5A4C33]">
                      {dispute.submittedAt
                        ? new Date(dispute.submittedAt).toLocaleDateString()
                        : '–'}
                    </div>
                    <div className="text-[10px] text-[#5A4C33]/50 mt-0.5">
                      {dispute.submittedAt
                        ? new Date(dispute.submittedAt).toLocaleTimeString()
                        : ''}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2 border-r border-[#5A4C33]/10 w-40">
                    <div className="text-xs font-semibold text-[#5A4C33] leading-tight">
                      {dispute.name}
                    </div>
                    <div className="text-[10px] text-[#5A4C33]/50 mt-0.5 truncate max-w-[150px]">
                      {dispute.userEmail}
                    </div>
                    <div className="text-[10px] text-[#D2A02A] font-medium">
                      {dispute.userPhone}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2 border-r border-[#5A4C33]/10 w-36">
                    <div className="flex flex-col gap-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusColor(
                          dispute.status || 'No Status'
                        )}`}
                      >
                        {dispute.status || 'No Status'}
                      </span>
                      <select
                        value={dispute.status || 'No Status'}
                        onChange={(e) => handleStatusChange(dispute.id, e.target.value)}
                        className="text-[10px] border border-[#5A4C33]/20 rounded-md px-1.5 py-1 bg-white text-[#5A4C33] focus:outline-none focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] transition-colors"
                      >
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Remarks */}
                  <td className="px-3 py-2 border-r border-[#5A4C33]/10 w-48">
                    <div className="flex flex-col gap-1">
                      <textarea
                        className="text-[10px] border border-[#5A4C33]/20 rounded-md p-1.5 w-full min-w-[140px] bg-white text-[#5A4C33] placeholder-[#5A4C33]/30 focus:outline-none focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] transition-colors resize-none"
                        rows={2}
                        value={
                          editingRemarks[dispute.id] !== undefined
                            ? editingRemarks[dispute.id]
                            : dispute.remarks || ''
                        }
                        onChange={(e) => handleRemarksChange(dispute.id, e.target.value)}
                        placeholder="Add remarks..."
                      />
                      <div className="flex justify-end gap-1.5">
                        {editingRemarks[dispute.id] !== undefined && (
                          <button
                            onClick={() => handleSaveRemarks(dispute.id)}
                            disabled={isSaving[dispute.id]}
                            className="text-[10px] bg-[#D2A02A] text-white rounded px-2 py-0.5 hover:bg-[#B8911E] disabled:opacity-50 font-semibold transition-colors"
                          >
                            {isSaving[dispute.id] ? 'Saving...' : 'Save'}
                          </button>
                        )}
                        <button
                          onClick={() => onViewHistory(dispute.id, dispute.name)}
                          className="text-[10px] bg-[#5A4C33]/10 text-[#5A4C33] border border-[#5A4C33]/20 rounded px-2 py-0.5 hover:bg-[#5A4C33]/20 font-medium transition-colors"
                        >
                          History
                        </button>
                        <button
                          onClick={() => onOpenWhatsApp(dispute)}
                          className="p-1 rounded-md transition-colors bg-green-500 hover:bg-green-600 text-white shadow-sm"
                          title="Send WhatsApp message"
                        >
                          <FaWhatsapp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Service */}
                  <td className="px-3 py-2 border-r border-[#5A4C33]/10 w-32">
                    <div className="text-xs font-medium text-[#5A4C33]">
                      {dispute.selected_service || '–'}
                    </div>
                  </td>

                  {/* Query */}
                  <td className="px-3 py-2 w-44">
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="text-[10px] text-[#5A4C33]/70 max-w-[160px] truncate leading-snug"
                        title={dispute.query}
                      >
                        {dispute.query || '–'}
                      </div>
                      {dispute.query && (
                        <button
                          onClick={() =>
                            onViewQuery(dispute.query, dispute.name)
                          }
                          className="text-[10px] w-fit font-semibold text-[#D2A02A] border border-[#D2A02A]/30 px-2 py-0.5 rounded hover:bg-[#D2A02A] hover:text-white transition-all"
                        >
                          View Full
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── Footer / Load more indicator ── */}
        <div
          ref={observerTarget}
          className="h-14 w-full flex items-center justify-center border-t border-[#5A4C33]/10 bg-[#F8F5EC]/50"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-[#5A4C33]/60">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#D2A02A]" />
              <span className="text-xs font-medium">Loading more disputes...</span>
            </div>
          ) : (
            !hasMore &&
            disputes.length > 0 && (
              <div className="px-4 py-1.5 bg-[#5A4C33]/10 text-[#5A4C33] rounded-md text-xs font-medium">
                No more disputes available
              </div>
            )
          )}
        </div>
      </div>

    </div>
  );
}
