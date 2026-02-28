import { useState, useEffect, useRef } from 'react';
import { PaymentAnalytics, CurrentMonthPayments } from '../types';
import { useAuth } from '@/context/AuthContext';

interface UsePaymentAnalyticsParams {
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const usePaymentAnalytics = ({
  enabled = true,
  onLoadComplete
}: UsePaymentAnalyticsParams = {}) => {
  const { user } = useAuth();
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics>({
    totalPaymentsAmount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
    completionRate: 0,
    clientCount: 0,
    paymentMethodDistribution: {},
    monthlyPaymentsData: [0, 0, 0, 0, 0, 0],
    paymentTypeDistribution: {
      full: 0,
      partial: 0
    }
  });

  const [currentMonthPayments, setCurrentMonthPayments] = useState<CurrentMonthPayments>({
    collected: 0,
    pending: 0
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
        const response = await fetch('/api/dashboard/superadmin/payments', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch payment analytics');

        const data = await response.json();
        setPaymentAnalytics(data.paymentAnalytics);
        setCurrentMonthPayments(data.currentMonthPayments);

      } catch (error) {
        console.error("Error fetching payment analytics from API:", error);
      } finally {
        setIsLoading(false);
        onLoadCompleteRef.current?.();
      }
    };

    fetchData();
  }, [enabled, user]);

  return {
    paymentAnalytics,
    currentMonthPayments,
    isLoading
  };
}; 