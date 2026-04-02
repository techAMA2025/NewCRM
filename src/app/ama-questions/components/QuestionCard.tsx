'use client';

import { AmaQuestion } from '../types';
import { FaUser, FaUserShield, FaComment, FaPen, FaTrash } from 'react-icons/fa';

interface QuestionCardProps {
  question: AmaQuestion;
  onViewComments: (q: AmaQuestion) => void;
  onAnswer: (q: AmaQuestion) => void;
  onDelete: (id: string) => void;
}

function formatDate(timestamp: number) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString();
}

export default function QuestionCard({ question, onViewComments, onAnswer, onDelete }: QuestionCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all flex flex-col h-full relative group">
       {/* Delete Button */}
       <button
         onClick={(e) => {
           e.stopPropagation();
           onDelete(question.id);
         }}
         className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
         title="Delete Question"
       >
         <FaTrash size={14} />
       </button>

       {/* Header: User Info */}
       <div className="flex justify-between items-start mb-4 pr-6">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <FaUser size={14} />
             </div>
             <div>
                <div className="text-sm font-medium text-gray-900">{question.userName}</div>
                <div className="flex flex-col">
                    <div className="text-xs text-gray-500 capitalize">{question.userRole}</div>
                    {question.phone && (
                        <div className="text-xs text-blue-600 font-medium">{question.phone}</div>
                    )}
                </div>
             </div>
          </div>
          <span className="text-xs text-gray-400">
             {formatDate(question.timestamp)}
          </span>
       </div>

       {/* Content: Question */}
       <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 leading-relaxed">
             {question.content}
          </h3>
       </div>

       {/* Answer Section (if exists) */}
       {question.answer && (
           <div className="mt-auto mb-4 bg-green-50 rounded-lg p-3 border border-green-100">
               <div className="flex items-center gap-2 mb-2">
                   <FaUserShield className="text-green-600 w-3 h-3" />
                   <span className="text-xs font-semibold text-green-800">
                       Answered by {question.answer.answered_by}
                   </span>
               </div>
               <p className="text-sm text-green-900 leading-relaxed whitespace-pre-wrap">
                   {question.answer.content}
               </p>
           </div>
       )}

       {/* Footer: Comments & Actions */}
       <div className={`pt-3 border-t border-gray-100 flex items-center justify-between ${!question.answer ? 'mt-auto' : ''}`}>
           <div className="flex items-center gap-4">
               <button 
                 onClick={() => onViewComments(question)}
                 className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D2A02A] transition-colors"
               >
                   <FaComment />
                   <span>{question.commentsCount} Comments</span>
               </button>
               
               <button 
                 onClick={() => onAnswer(question)}
                 className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 transition-colors"
               >
                   <FaPen size={10} />
                   <span>{question.answer ? 'Edit Answer' : 'Answer'}</span>
               </button>
           </div>
           <div className="text-xs text-gray-400 font-mono">
               ID: {question.id.slice(0, 6)}
           </div>
       </div>
    </div>
  );
}
