'use client';

import { useState } from 'react';
import { AppQuery } from '../types';
import { authFetch } from '@/lib/authFetch';

interface QueryDetailsModalProps {
  query: AppQuery;
  onClose: () => void;
}

function formatDate(timestamp: number) {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleString();
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'resolved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function QueryDetailsModal({ query, onClose }: QueryDetailsModalProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [newRemarks, setNewRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!query) return null;

  // Normalize remarks to ensure string type
  const remarks = query.remarks && typeof query.remarks === 'string' ? query.remarks : '';

  const handleResolve = async () => {
    try {
        setIsSubmitting(true);
        
        // Get user info from localStorage
        const userName = localStorage.getItem('userName') || 'Admin';
        const userRole = localStorage.getItem('userRole') || 'admin';
        // Phone is not usually stored, so we might leave it empty or use a placeholder if strict
        // But the structure allows strings.
        const resolvedBy = {
            name: userName,
            role: userRole,
            phone: '' // Can't get phone easily from localStorage based on Login implementation
        };

        const response = await authFetch('/api/app-queries', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: query.id,
                status: 'resolved',
                remarks: newRemarks,
                resolved_by: resolvedBy
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update query');
        }

        // Success - Reload page to refresh data
        window.location.reload();

    } catch (error) {
        console.error('Error resolving query:', error);
        alert('Failed to resolve query. Please try again.');
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px] p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#F8F5EC] px-6 py-4 border-b border-[#5A4C33]/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <h3 className="text-lg font-semibold text-[#5A4C33]">Query Details</h3>
             <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(query.status)}`}>
                {query.status}
             </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
           {/* Query Section */}
           <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Query Content</h4>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                 {query.query}
              </div>
              <div className="mt-1 text-xs text-gray-400 flex justify-end">
                 ID: {query.queryId}
              </div>
           </div>

           {/* Render remarks section if it exists */}
           {remarks && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                 <h4 className="text-xs font-semibold text-yellow-700 uppercase tracking-wider mb-2">Remarks</h4>
                 <p className="text-sm text-yellow-900 whitespace-pre-wrap">
                    {remarks}
                 </p>
              </div>
           )}

           {/* Resolve Action Section */}
           {query.status?.toLowerCase() !== 'resolved' && !isResolving && (
               <div className="flex justify-end">
                   <button 
                       onClick={() => setIsResolving(true)}
                       className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                   >
                       Mark as Resolved
                   </button>
               </div>
           )}

           {/* Resolution Form */}
           {isResolving && (
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                   <h4 className="text-sm font-semibold text-gray-900">Resolve Query</h4>
                   <div>
                       <label className="block text-xs font-medium text-gray-700 mb-1">
                           Remarks <span className="text-gray-400 font-normal">(Optional)</span>
                       </label>
                       <textarea 
                           value={newRemarks}
                           onChange={(e) => setNewRemarks(e.target.value)}
                           className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                           rows={3}
                           placeholder="Add any remarks about the resolution..."
                       />
                   </div>
                   <div className="flex justify-end gap-3">
                       <button 
                           onClick={() => {
                               setIsResolving(false);
                               setNewRemarks('');
                           }}
                           disabled={isSubmitting}
                           className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                       >
                           Cancel
                       </button>
                       <button 
                           onClick={handleResolve}
                           disabled={isSubmitting}
                           className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                       >
                           {isSubmitting ? (
                               <>
                                   <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                   Saving...
                               </>
                           ) : (
                               'Confirm Resolution'
                           )}
                       </button>
                   </div>
               </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Submitter Info */}
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                 <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">Submitted By</h4>
                 <div className="space-y-2">
                    <div className="flex justify-between">
                       <span className="text-sm text-gray-500">Name:</span>
                       <span className="text-sm font-medium text-gray-900">{query.posted_by || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-sm text-gray-500">Role:</span>
                       <span className="text-sm font-medium text-gray-900 capitalize">{query.role}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-sm text-gray-500">Phone:</span>
                       <span className="text-sm font-medium text-gray-900">{query.phone}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-sm text-gray-500">Date:</span>
                       <span className="text-sm font-medium text-gray-900">{formatDate(query.submitted_at)}</span>
                    </div>
                 </div>
              </div>

              {/* Assignment Info */}
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                 <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">Assignment</h4>
                 <div className="space-y-2">
                    <div className="flex justify-between">
                       <span className="text-sm text-gray-500">Primary Advocate:</span>
                       <span className="text-sm font-medium text-gray-900">{query.alloc_adv || 'Unassigned'}</span>
                    </div>
                    {query.alloc_adv_secondary && (
                        <div className="flex justify-between">
                           <span className="text-sm text-gray-500">Secondary:</span>
                           <span className="text-sm font-medium text-gray-900">{query.alloc_adv_secondary}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                       <span className="text-sm text-gray-500">Parent Doc ID:</span>
                       <span className="text-sm font-mono text-gray-600 text-xs">{query.parentDocId || '-'}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Resolution Info */}
           {query.resolved_at && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                 <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-3 border-b border-green-200 pb-2">Resolution Details</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                       <span className="text-sm text-green-600 block mb-1">Resolved By:</span>
                       <span className="text-sm font-medium text-green-900">{query.resolved_by?.name || 'Unknown'}</span>
                       <span className="text-xs text-green-700 block">({query.resolved_by?.role || 'Unknown'})</span>
                    </div>
                    <div>
                       <span className="text-sm text-green-600 block mb-1">Resolved Date:</span>
                       <span className="text-sm font-medium text-green-900">{formatDate(query.resolved_at)}</span>
                    </div>
                 </div>
              </div>
           )}
        </div>
        
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
           <button 
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A]"
           >
              Close
           </button>
        </div>
      </div>
    </div>
  );
}
