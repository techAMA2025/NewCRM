import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, QuerySnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { ClientAnalytics } from '../types';
import { perfMonitor } from '../utils/performance';
import { analyticsCache, generateCacheKey } from '../utils/cache';

interface UseClientAnalyticsParams {
  enabled?: boolean;
  onLoadComplete?: () => void;
}

// Global loading state to prevent multiple simultaneous loads
let isGloballyLoading = false;
let globalLoadPromise: Promise<ClientAnalytics> | null = null;

// Helper function to process clients in batches for better performance
const processClientsBatch = (clientsBatch: any[], analytics: any) => {
  clientsBatch.forEach((client) => {
    analytics.totalClients++;
    
    // Count by status - optimized lookup with proper status mapping
    const status = client.adv_status || client.status || 'Inactive';
    
    // Initialize status if it doesn't exist
    if (analytics.statusDistribution[status] === undefined) {
      analytics.statusDistribution[status] = 0;
    }
    analytics.statusDistribution[status]++;
    
    // Count by advocate
    const advocate = client.alloc_adv || 'Unassigned';
    analytics.advocateCount[advocate] = (analytics.advocateCount[advocate] || 0) + 1;
    
    // Track status distribution per advocate
    if (!analytics.advocateStatusDistribution[advocate]) {
      analytics.advocateStatusDistribution[advocate] = {
        Active: 0,
        Dropped: 0,
        'Not Responding': 0,
        'On Hold': 0,
        Inactive: 0
      };
    }
    if (analytics.advocateStatusDistribution[advocate][status] !== undefined) {
      analytics.advocateStatusDistribution[advocate][status]++;
    } else {
      analytics.advocateStatusDistribution[advocate][status] = 1;
    }
    
    // Count by source
    const source = client.source || 'Unknown';
    analytics.sourceDistribution[source] = (analytics.sourceDistribution[source] || 0) + 1;
    
    // Count by city
    const city = client.city || 'Unknown';
    analytics.cityDistribution[city] = (analytics.cityDistribution[city] || 0) + 1;
    
    // Process total loan amount from creditCardDues + personalLoanDues
    let totalClientLoanAmount = 0;
    
    // Process credit card dues
    if (client.creditCardDues) {
      const creditCardDues = typeof client.creditCardDues === 'string' 
        ? parseFloat(client.creditCardDues.replace(/[^0-9.-]+/g, '')) 
        : parseFloat(client.creditCardDues) || 0;
      if (!isNaN(creditCardDues) && creditCardDues > 0) {
        totalClientLoanAmount += creditCardDues;
      }
    }

    // Process personal loan dues
    if (client.personalLoanDues) {
      const personalLoanDues = typeof client.personalLoanDues === 'string'
        ? parseFloat(client.personalLoanDues.replace(/[^0-9.-]+/g, ''))
        : parseFloat(client.personalLoanDues) || 0;
      if (!isNaN(personalLoanDues) && personalLoanDues > 0) {
        totalClientLoanAmount += personalLoanDues;
      }
    }

    // Add to total if client has any loan amount
    if (totalClientLoanAmount > 0) {
      analytics.totalLoanAmount += totalClientLoanAmount;
      analytics.loanCount++;
    }
    
    // Process banks array for loan type distribution only
    if (client.banks && Array.isArray(client.banks) && client.banks.length > 0) {
      client.banks.forEach((bank: any) => {
        const loanType = bank.loanType || 'Unknown';
        analytics.loanTypeDistribution[loanType] = (analytics.loanTypeDistribution[loanType] || 0) + 1;
      });
    }
  });
};

// Progressive client analytics loading with immediate results
const loadClientAnalyticsProgressive = async (onProgress?: (partial: ClientAnalytics) => void): Promise<ClientAnalytics> => {
  const timerId = `client-analytics-${Date.now()}`;
  perfMonitor.start(timerId);
  
  console.log('⚡ Loading all client analytics in one go...');
  
  // Check cache first at the global level
  const clientAnalyticsCacheKey = generateCacheKey.clientAnalytics();
  const cachedData = analyticsCache.get<ClientAnalytics>(clientAnalyticsCacheKey);
  if (cachedData) {
    console.log('⚡ Using cached client analytics (global level)');
    onProgress?.(cachedData);
    return cachedData;
  }
  
  // Initialize analytics object
  const analytics = {
    totalClients: 0,
    statusDistribution: { 
      Active: 0, 
      Dropped: 0, 
      'Not Responding': 0, 
      'On Hold': 0, 
      Inactive: 0 
    },
    advocateCount: {} as Record<string, number>,
    loanTypeDistribution: {} as Record<string, number>,
    sourceDistribution: {} as Record<string, number>,
    cityDistribution: {} as Record<string, number>,
    totalLoanAmount: 0,
    loanCount: 0,
    advocateStatusDistribution: {} as Record<string, Record<string, number>>
  };
  
  const clientsCollection = collection(db, 'clients');
  
  // Fetch all clients at once
  const clientsQuery = query(clientsCollection, orderBy('__name__'));
  const clientsSnapshot: QuerySnapshot<DocumentData> = await getDocs(clientsQuery);
  
  console.log(`📊 Fetched ${clientsSnapshot.size} clients in one go`);
  
  // Process all clients at once
  const allClients: any[] = [];
  clientsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
    allClients.push(doc.data());
  });
  
  processClientsBatch(allClients, analytics);
  
  // Calculate final results
  const avgLoanAmount = analytics.loanCount > 0 
    ? Math.round(analytics.totalLoanAmount / analytics.loanCount) 
    : 0;
  
  const advocateEntries = Object.entries(analytics.advocateCount);
  advocateEntries.sort((a, b) => b[1] - a[1]);
  const topAdvocates = advocateEntries.slice(0, 10).map(([name, clientCount]) => ({ name, clientCount }));
  
  const finalAnalytics: ClientAnalytics = {
    totalClients: analytics.totalClients,
    statusDistribution: analytics.statusDistribution,
    topAdvocates,
    loanTypeDistribution: analytics.loanTypeDistribution,
    sourceDistribution: analytics.sourceDistribution,
    cityDistribution: analytics.cityDistribution,
    totalLoanAmount: analytics.totalLoanAmount,
    avgLoanAmount,
    advocateStatusDistribution: analytics.advocateStatusDistribution
  };
  
  const duration = perfMonitor.safeEnd(timerId);
  console.log(`🎯 COMPLETE: All ${analytics.totalClients} clients loaded in ${duration.toFixed(2)}ms`);
  
  // Cache the result using the new cache system
  analyticsCache.set(clientAnalyticsCacheKey, finalAnalytics);
  
  // Call progress callback with final result
  onProgress?.(finalAnalytics);
  
  return finalAnalytics;
};

// Super fast client analytics with progressive loading
export const useClientAnalytics = ({ 
  enabled = true, 
  onLoadComplete 
}: UseClientAnalyticsParams = {}) => {
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
  const hasLoaded = useRef(false);

  // Use ref to store the callback to avoid dependency issues
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  // Generate cache key
  const clientAnalyticsCacheKey = generateCacheKey.clientAnalytics();

  // Progress callback to update UI immediately
  const handleProgress = useCallback((partialResult: ClientAnalytics) => {
    setClientAnalytics(partialResult);
    setIsLoading(false); // Stop showing loading after first batch
    
    // Call completion for first batch (UI shows content immediately)
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      onLoadCompleteRef.current?.();
    }
  }, []); // Removed onLoadComplete dependency

  useEffect(() => {
    if (!enabled || hasLoaded.current) {
      setIsLoading(false);
      return;
    }

    const fetchClientAnalytics = async () => {
      try {
        // Check cache first
        const cachedData = analyticsCache.get<ClientAnalytics>(clientAnalyticsCacheKey);
        if (cachedData) {
          console.log('⚡ Using cached client analytics (hook level)');
          setClientAnalytics(cachedData);
          setIsLoading(false);
          hasLoaded.current = true;
          onLoadCompleteRef.current?.();
          return;
        }

        // Prevent multiple simultaneous loads
        if (isGloballyLoading && globalLoadPromise) {
          console.log('🔄 Reusing existing progressive load...');
          const result = await globalLoadPromise;
          setClientAnalytics(result);
          setIsLoading(false);
          hasLoaded.current = true;
          onLoadCompleteRef.current?.();
          return;
        }
        
        // Start new progressive load
        isGloballyLoading = true;
        globalLoadPromise = loadClientAnalyticsProgressive(handleProgress);
        
        const result = await globalLoadPromise;
        
        // Final update with complete data
        setClientAnalytics(result);
        
      } catch (error) {
        console.error('❌ Error fetching client analytics:', error);
        setIsLoading(false);
        onLoadCompleteRef.current?.();
      } finally {
        // Reset global loading state
        setTimeout(() => {
          isGloballyLoading = false;
          globalLoadPromise = null;
        }, 1000);
      }
    };
    
    fetchClientAnalytics();
    // Removed onLoadComplete and handleProgress from dependency array
  }, [enabled, clientAnalyticsCacheKey]);

  return {
    clientAnalytics,
    isLoading
  };
}; 