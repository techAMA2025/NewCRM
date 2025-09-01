import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { analyticsCache, generateCacheKey } from '../utils/cache';

interface OpsPayment {
  id: string;
  name: string;
  phoneNumber: string;
  amount: string;
  source: string;
  type: string;
  miscellaneousDetails?: string;
  submittedBy: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  edited_by?: string | null;
  edited_at?: string;
}

interface OpsPaymentsAnalytics {
  totalApprovedAmount: number;
  totalPendingAmount: number;
  totalRejectedAmount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalCount: number;
}

interface UseOpsPaymentsAnalyticsParams {
  selectedAnalyticsMonth?: number | null;
  selectedAnalyticsYear?: number | null;
  selectedSalesperson?: string | null;
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useOpsPaymentsAnalytics = ({ 
  selectedAnalyticsMonth = null,
  selectedAnalyticsYear = null,
  selectedSalesperson = null,
  enabled = true, 
  onLoadComplete 
}: UseOpsPaymentsAnalyticsParams = {}) => {
  const [opsPaymentsAnalytics, setOpsPaymentsAnalytics] = useState<OpsPaymentsAnalytics>({
    totalApprovedAmount: 0,
    totalPendingAmount: 0,
    totalRejectedAmount: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    totalCount: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to track loading state and prevent infinite re-renders
  const hasLoaded = useRef(false);
  const lastFilterParams = useRef<string>('');

  // Use ref to store the callback to avoid dependency issues
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  // Generate cache key with filter parameters
  const opsPaymentsCacheKey = generateCacheKey.opsPaymentsAnalytics(selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Create a unique key for current filter parameters to avoid duplicate calls
    const currentFilterParams = `${selectedAnalyticsMonth}-${selectedAnalyticsYear}-${selectedSalesperson}`;
    if (lastFilterParams.current === currentFilterParams && hasLoaded.current) {
      return;
    }

    const fetchOpsPaymentsAnalytics = async () => {
      try {
        // Check cache first
        const cachedData = analyticsCache.get<OpsPaymentsAnalytics>(opsPaymentsCacheKey);
        
        if (cachedData) {
          console.log('⚡ Using cached ops payments analytics with filters:', { selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson });
          setOpsPaymentsAnalytics(cachedData);
          setIsLoading(false);
          hasLoaded.current = true;
          lastFilterParams.current = currentFilterParams;
          onLoadCompleteRef.current?.();
          return;
        }

        console.log('🚀 Loading ops payments analytics with filters:', { selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson });
        
        // Get current date for default values
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Use filter values or defaults
        const targetMonth = selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : currentMonth;
        const targetYear = selectedAnalyticsYear !== null ? selectedAnalyticsYear : currentYear;
        
        // Create date range for filtering
        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
        
        // Fetch all ops_payments documents
        const opsPaymentsCollection = collection(db, 'ops_payments');
        const opsPaymentsSnapshot = await getDocs(opsPaymentsCollection);
        
        const analytics: OpsPaymentsAnalytics = {
          totalApprovedAmount: 0,
          totalPendingAmount: 0,
          totalRejectedAmount: 0,
          approvedCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
          totalCount: 0
        };

        // Process each payment document with filters
        opsPaymentsSnapshot.forEach((doc) => {
          const payment = doc.data() as OpsPayment;
          const amount = parseFloat(payment.amount) || 0;
          
          // Apply date filter
          if (payment.timestamp) {
            const paymentDate = new Date(payment.timestamp);
            if (paymentDate < startOfMonth || paymentDate > endOfMonth) {
              return; // Skip payments outside the selected month/year
            }
          }
          
          // Apply salesperson filter if specified
          if (selectedSalesperson && payment.submittedBy !== selectedSalesperson) {
            return; // Skip payments not submitted by the selected salesperson
          }
          
          analytics.totalCount++;
          
          switch (payment.status) {
            case 'approved':
              analytics.totalApprovedAmount += amount;
              analytics.approvedCount++;
              break;
            case 'pending':
              analytics.totalPendingAmount += amount;
              analytics.pendingCount++;
              break;
            case 'rejected':
              analytics.totalRejectedAmount += amount;
              analytics.rejectedCount++;
              break;
          }
        });

        // Cache the results
        analyticsCache.set(opsPaymentsCacheKey, analytics);
        
        setOpsPaymentsAnalytics(analytics);
        setIsLoading(false);
        hasLoaded.current = true;
        lastFilterParams.current = currentFilterParams;
        
        console.log('✅ Ops payments analytics loaded successfully with filters:', {
          filters: { selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson },
          analytics
        });
        onLoadCompleteRef.current?.();
        
      } catch (error) {
        console.error('❌ Error fetching ops payments analytics:', error);
        setIsLoading(false);
        hasLoaded.current = true;
        lastFilterParams.current = currentFilterParams;
        onLoadCompleteRef.current?.();
      }
    };
    
    fetchOpsPaymentsAnalytics();
  }, [enabled, opsPaymentsCacheKey, selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson]);

  return {
    opsPaymentsAnalytics,
    isLoading
  };
}; 