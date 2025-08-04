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
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useOpsPaymentsAnalytics = ({ 
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

  // Use ref to store the callback to avoid dependency issues
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  // Generate cache key
  const opsPaymentsCacheKey = generateCacheKey.opsPaymentsAnalytics();

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate loads
    if (hasLoaded.current) {
      return;
    }

    const fetchOpsPaymentsAnalytics = async () => {
      try {
        // Check cache first
        const cachedData = analyticsCache.get<OpsPaymentsAnalytics>(opsPaymentsCacheKey);
        
        if (cachedData) {
          console.log('⚡ Using cached ops payments analytics');
          setOpsPaymentsAnalytics(cachedData);
          setIsLoading(false);
          hasLoaded.current = true;
          onLoadCompleteRef.current?.();
          return;
        }

        console.log('🚀 Loading ops payments analytics...');
        
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

        // Process each payment document
        opsPaymentsSnapshot.forEach((doc) => {
          const payment = doc.data() as OpsPayment;
          const amount = parseFloat(payment.amount) || 0;
          
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
        
        console.log('✅ Ops payments analytics loaded successfully:', analytics);
        onLoadCompleteRef.current?.();
        
      } catch (error) {
        console.error('❌ Error fetching ops payments analytics:', error);
        setIsLoading(false);
        hasLoaded.current = true;
        onLoadCompleteRef.current?.();
      }
    };
    
    fetchOpsPaymentsAnalytics();
  }, [enabled, opsPaymentsCacheKey]);

  return {
    opsPaymentsAnalytics,
    isLoading
  };
}; 