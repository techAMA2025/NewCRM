'use client';

import { Dispute } from '../types';
import { FaWhatsapp, FaHistory, FaEye } from 'react-icons/fa';
import { useState } from 'react';

interface DisputeMobileCardProps {
  dispute: Dispute;
  statusOptions: string[];
  onUpdateDispute: (id: string, updates: Partial<Dispute>) => Promise<void>;
  onViewHistory: (disputeId: string, disputeName: string) => void;
  onOpenWhatsApp: (dispute: Dispute) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onViewQuery: (text: string, name: string) => void;
}

const getStatusColor = (status: string) => {
  const key = (status || '').toLowerCase();
  if (key === 'no status') return 'bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20';
  if (key === 'interested') return 'bg-green-100 text-green-800 border-green-200';
  if (key === 'not interested') return 'bg-red-100 text-red-800 border-red-200';
  if (key === 'not answering') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (key === 'callback') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (key === 'future potential') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (key === 'converted') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (key === 'language barrier') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (key === 'closed lead') return 'bg-gray-100 text-gray-800 border-gray-200';
  if (key === 'loan required') return 'bg-purple-100 text-purple-800 border-purple-200';
  if (key === 'short loan') return 'bg-teal-100 text-teal-800 border-teal-200';
  if (key === 'cibil issue') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (key === 'retargeting') return 'bg-cyan-100 text-cyan-800 border-cyan-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function DisputeMobileCard({
  dispute,
  statusOptions,
  onUpdateDispute,
  onViewHistory,
  onOpenWhatsApp,
  isSelected,
  onSelect,
  onViewQuery,
}: DisputeMobileCardProps) {
  const [remarks, setRemarks] = useState(dispute.remarks || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveRemarks = async () => {
    setIsSaving(true);
    try {
      await onUpdateDispute(dispute.id, { remarks });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl border p-4 mb-4 shadow-sm transition-all ${isSelected ? 'border-[#D2A02A] ring-1 ring-[#D2A02A]' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(dispute.id)}
            className="h-5 w-5 rounded border-gray-300 text-[#D2A02A] focus:ring-[#D2A02A]"
          />
          <div>
            <h3 className="text-base font-bold text-gray-900">{dispute.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {dispute.submittedAt ? new Date(dispute.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(dispute.status || 'No Status')}`}>
          {dispute.status || 'No Status'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Phone:</span>
          <a href={`tel:${dispute.phone}`} className="text-blue-600 font-medium">{dispute.phone}</a>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Lead Email:</span>
          <span className="text-gray-700 truncate max-w-[180px]">{dispute.userEmail || 'N/A'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Service:</span>
          <span className="text-gray-700 font-medium">{dispute.selected_service}</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Remarks & Status</label>
        <div className="space-y-3">
          <select 
            value={dispute.status || 'No Status'}
            onChange={(e) => onUpdateDispute(dispute.id, { status: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-900 shadow-sm"
          >
            {statusOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          
          <div className="relative">
            <textarea
              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-900 shadow-sm pr-16"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks..."
            />
            {remarks !== dispute.remarks && (
              <button
                onClick={handleSaveRemarks}
                disabled={isSaving}
                className="absolute right-2 bottom-2 text-[10px] bg-[#D2A02A] text-white rounded-md px-3 py-1.5 hover:bg-[#B8911E] disabled:opacity-50 shadow-sm font-bold"
              >
                {isSaving ? '...' : 'SAVE'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onViewQuery(dispute.query, dispute.name)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors border border-gray-200"
        >
          <FaEye /> View Query
        </button>
        <button
          onClick={() => onViewHistory(dispute.id, dispute.name)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors border border-gray-200"
        >
          <FaHistory /> History
        </button>
        <button
          onClick={() => onOpenWhatsApp(dispute)}
          className="flex items-center justify-center p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-colors"
          title="Send WhatsApp"
        >
          <FaWhatsapp className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
