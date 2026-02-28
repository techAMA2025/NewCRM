import { useState, useEffect, useRef } from 'react';
import { ClientAnalytics } from '../types';
import { useAuth } from '@/context/AuthContext';

interface UseClientAnalyticsParams {
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useClientAnalytics = ({
  enabled = true,
  onLoadComplete
}: UseClientAnalyticsParams = {}) => {
  const { user } = useAuth();
  const [clientAnalytics, setClientAnalytics] = useState<ClientAnalytics>({
    totalClients: 0,
    statusDistribution: {
      Active: 0,
      Dropped: 0,
      'Not Responding': 0,
      'On Hold': 0,
      Inactive: 0
    },
    topAdvocates: [],
    loanTypeDistribution: {},
    sourceDistribution: {},
    cityDistribution: {},
    totalLoanAmount: 0,
    avgLoanAmount: 0,
    advocateStatusDistribution: {}
  });

  const [isLoading, setIsLoading] = useState(true);

  // Use ref to store the callback to avoid dependency issues
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  useEffect(() => {
    if (!enabled || !user) {
      if (!enabled) setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/dashboard/superadmin/clients', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch client analytics');

        const data = await response.json();
        setClientAnalytics(data);

      } catch (error) {
        console.error("Error fetching client analytics from API:", error);
      } finally {
        setIsLoading(false);
        onLoadCompleteRef.current?.();
      }
    };

    fetchData();
  }, [enabled, user]);

  return {
    clientAnalytics,
    isLoading
  };
};