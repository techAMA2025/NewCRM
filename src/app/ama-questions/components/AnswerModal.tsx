'use client';

import { useEffect, useState } from 'react';
import { AmaQuestion } from '../types';
import { authFetch } from '@/lib/authFetch';

interface AnswerModalProps {
  question: AmaQuestion;
  onClose: () => void;
}

export default function AnswerModal({ question, onClose }: AnswerModalProps) {
  const [answerContent, setAnswerContent] = useState(question.answer?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answerContent.trim()) return;

    try {
        setIsSubmitting(true);
        
        const userName = localStorage.getItem('userName') || 'Admin';
        let userRole = localStorage.getItem('userRole') || 'admin';
        
        if (userRole === 'overlord') {
            userRole = 'admin';
        }

        const answerData = {
            answered_by: userName,
            content: answerContent,
            role: userRole,
            timestamp: Date.now()
        };

        const response = await authFetch('/api/ama-questions', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: question.id,
                answer: answerData
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to submit answer');
        }

        window.location.reload();
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('Failed to submit answer');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px] p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="bg-[#F8F5EC] px-6 py-4 border-b border-[#5A4C33]/10 flex justify-between items-center">
             <h3 className="text-lg font-semibold text-[#5A4C33]">
                {question.answer ? 'Edit Answer' : 'Add Answer'}
             </h3>
             <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
        </div>
        
        <div className="p-6 space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-2">
                <div className="text-sm text-gray-700 italic leading-relaxed">"{question.content}"</div>
                <div className="flex items-center gap-2 text-xs text-[#D2A02A] font-medium pt-2 border-t border-gray-100">
                    <span>Asker: {question.userName}</span>
                    <span className="opacity-50">•</span>
                    <span className="font-mono">{question.phone}</span>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Answer</label>
                <textarea 
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    rows={6}
                    className="text-black bg-white w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D2A02A] focus:border-transparent outline-none text-sm"
                    placeholder="Type your answer here..."
                />
            </div>

            <div className="flex justify-end pt-2">
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !answerContent.trim()}
                    className="px-4 py-2 bg-[#D2A02A] text-white rounded-lg text-sm font-medium hover:bg-[#b88b22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Saving...' : 'Save Answer'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

