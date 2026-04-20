'use client';

import { useEffect, useState, useCallback } from 'react';
import { AmaQuestion } from './types';
import AmaQuestionsList from './components/AmaQuestionsList';
import CommentsModal from './components/CommentsModal';
import AnswerModal from './components/AnswerModal';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import AdminSidebar from "@/components/navigation/AdminSidebar";
import { authFetch } from '@/lib/authFetch';
import { useAuth } from '@/context/AuthContext';

export default function AmaQuestionsPage() {
  const { userRole, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<AmaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<AmaQuestion | null>(null);
  const [answeringQuestion, setAnsweringQuestion] = useState<AmaQuestion | null>(null);

  const fetchQuestions = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '20' });
      
      // Cache busting
      params.append('_t', Date.now().toString());
      
      if (isLoadMore && lastTimestamp && lastId) {
        params.append('lastTimestamp', lastTimestamp.toString());
        params.append('lastId', lastId);
      }

      const response = await authFetch(`/api/ama-questions?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTotal(data.total);
      
      if (isLoadMore) {
        setQuestions(prev => [...prev, ...data.questions]);
      } else {
        setQuestions(data.questions);
      }

      setHasMore(data.hasMore);

      if (data.questions.length > 0) {
        const lastItem = data.questions[data.questions.length - 1];
        setLastTimestamp(lastItem.timestamp);
        setLastId(lastItem.id);
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [lastTimestamp, lastId]);

  useEffect(() => {
    if (!authLoading) {
      fetchQuestions(false);
    }
  }, [authLoading]);

  const handleLoadMore = () => {
    fetchQuestions(true);
  };

  const handleDelete = async (questionId: string) => {
    if (userRole === 'admin') {
      alert('Admins do not have permission to delete questions.');
      return;
    }

    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authFetch(`/api/ama-questions/${questionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete question');
      }

      setQuestions(prev => prev.filter(q => q.id !== questionId));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Failed to delete question. Please try again.');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const pageContent = (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">AMA Questions</h1>
          <div className="bg-[#D2A02A] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
             Total Questions: {total.toLocaleString()}
          </div>
      </header>
      
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <div className="space-y-6 w-full">
           {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{error}</span>
              </div>
           )}
           
           <AmaQuestionsList 
              questions={questions} 
              hasMore={hasMore} 
              loading={loading} 
              loadMore={handleLoadMore}
              onViewComments={setSelectedQuestion}
              onAnswer={setAnsweringQuestion}
              onDelete={handleDelete}
              userRole={userRole}
           />
        </div>
      </main>

      {selectedQuestion && (
          <CommentsModal 
              question={selectedQuestion} 
              onClose={() => setSelectedQuestion(null)} 
          />
      )}

      {answeringQuestion && (
          <AnswerModal
              question={answeringQuestion}
              onClose={() => setAnsweringQuestion(null)}
          />
      )}
    </div>
  );

  if (userRole === 'overlord') {
    return <OverlordSidebar>{pageContent}</OverlordSidebar>;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {pageContent}
      </div>
    </div>
  );
}
