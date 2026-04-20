'use client';

import { useEffect, useRef } from 'react';
import { AmaQuestion } from '../types';
import QuestionCard from './QuestionCard';

interface AmaQuestionsListProps {
  questions: AmaQuestion[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
  onViewComments: (q: AmaQuestion) => void;
  onAnswer: (q: AmaQuestion) => void;
  onDelete: (id: string) => void;
  userRole?: string | null;
}

export default function AmaQuestionsList({ questions, hasMore, loading, loadMore, onViewComments, onAnswer, onDelete, userRole }: AmaQuestionsListProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {questions.length === 0 && !loading ? (
         <div className="col-span-full text-center py-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500">
           No questions found.
         </div>
      ) : (
        questions.map((item) => (
          <QuestionCard 
             key={item.id} 
             question={item}
             onViewComments={onViewComments}
             onAnswer={onAnswer}
             onDelete={onDelete}
             userRole={userRole}
          />
        ))
      )}
      
      <div ref={observerTarget} className="col-span-full h-16 flex items-center justify-center">
        {loading ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            <span className="text-sm">Loading more questions...</span>
          </div>
        ) : (
          !hasMore && questions.length > 0 && (
            <span className="text-gray-500 text-sm font-medium">End of list</span>
          )
        )}
      </div>
    </div>
  );
}
