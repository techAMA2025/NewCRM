'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppFeedback } from './types';
import FeedbackList from './components/FeedbackList';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import { authFetch } from '@/lib/authFetch';

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<AppFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '20' });
      
      // Add a random timestamp to bust cache
      params.append('_t', Date.now().toString());
      
      if (isLoadMore && lastSubmittedAt && lastId) {
        params.append('lastSubmittedAt', lastSubmittedAt);
        params.append('lastId', lastId);
      }

      const response = await authFetch(`/api/feedback?${params.toString()}`, {
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
        setFeedbacks(prev => [...prev, ...data.feedbacks]);
      } else {
        setFeedbacks(data.feedbacks);
      }

      setHasMore(data.hasMore);

      if (data.feedbacks.length > 0) {
        const lastItem = data.feedbacks[data.feedbacks.length - 1];
        setLastSubmittedAt(lastItem.submittedAt);
        setLastId(lastItem.id);
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [lastSubmittedAt, lastId]);

  useEffect(() => {
    fetchFeedbacks(false);
  }, []);

  const handleLoadMore = () => {
    fetchFeedbacks(true);
  };

  return (
    <OverlordSidebar>
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Customer Feedback</h1>
            <div className="bg-[#D2A02A] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
               Total Feedback: {total.toLocaleString()}
            </div>
        </header>
        
        <main className="flex-1 p-6 bg-gray-50">
          <div className="space-y-6 w-full">
             {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
             )}
             
             <FeedbackList 
                feedbacks={feedbacks} 
                hasMore={hasMore} 
                loading={loading} 
                loadMore={handleLoadMore}
             />
          </div>
        </main>
      </div>
    </OverlordSidebar>
  );
}













