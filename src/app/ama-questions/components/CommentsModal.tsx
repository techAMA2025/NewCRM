'use client';

import { useEffect, useState } from 'react';
import { AmaQuestion, AmaComment } from '../types';
import { FaUser, FaUserShield } from 'react-icons/fa';
import { authFetch } from '@/lib/authFetch';

interface CommentsModalProps {
  question: AmaQuestion;
  onClose: () => void;
}

function formatDate(timestamp: number) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString();
}

export default function CommentsModal({ question, onClose }: CommentsModalProps) {
  const [comments, setComments] = useState<AmaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`/api/ama-questions/${question.id}/comments?_t=${Date.now()}`, {
            cache: 'no-store'
        });
        
        if (!response.ok) throw new Error('Failed to fetch comments');
        
        const data = await response.json();
        setComments(data.comments || []);
      } catch (err) {
        setError('Error loading comments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (question.id) {
        fetchComments();
    }
  }, [question.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px] p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#F8F5EC] px-6 py-4 border-b border-[#5A4C33]/10 flex justify-between items-center">
             <h3 className="text-lg font-semibold text-[#5A4C33]">Discussion</h3>
             <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
           {/* Original Question */}
           <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#D2A02A]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#D2A02A] font-bold text-xs">Q</span>
                    </div>
                    <div>
                        <p className="text-gray-900 font-medium">{question.content}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                             <span>{question.userName}</span>
                             {question.phone && (
                                <>
                                    <span>•</span>
                                    <span className="text-blue-600 font-medium">{question.phone}</span>
                                </>
                             )}
                             <span>•</span>
                             <span>{formatDate(question.timestamp)}</span>
                        </div>
                    </div>
                </div>
           </div>

           {/* Comments List */}
           <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Comments ({comments.length})</h4>
              
              {loading ? (
                  <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-[#D2A02A] rounded-full mx-auto mb-2"></div>
                      Loading comments...
                  </div>
              ) : error ? (
                  <div className="text-red-500 text-sm text-center">{error}</div>
              ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm italic">No comments yet.</div>
              ) : (
                  comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                          {comment.profileImgUrl ? (
                              <img src={comment.profileImgUrl} alt={comment.commentedBy} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                          ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${comment.userRole === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                  {comment.userRole === 'admin' ? <FaUserShield size={12} /> : <FaUser size={12} />}
                              </div>
                          )}
                          <div className="bg-white p-3 rounded-lg rounded-tl-none border border-gray-100 shadow-sm flex-1">
                               <div className="flex justify-between items-start mb-1">
                                  <div className="flex flex-col">
                                      <span className={`text-xs font-semibold ${comment.userRole === 'admin' ? 'text-blue-600' : 'text-gray-900'}`}>
                                          {comment.commentedBy}
                                      </span>
                                      {comment.phone && (
                                          <span className="text-[10px] text-blue-500 font-mono leading-none mt-0.5">{comment.phone}</span>
                                      )}
                                  </div>
                                  <span className="text-[10px] text-gray-400">{formatDate(comment.timestamp)}</span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                      </div>
                  ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
}













