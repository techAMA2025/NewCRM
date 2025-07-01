import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, QuerySnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { ClientAnalytics } from '../types';
import { perfMonitor } from '../utils/performance';

interface UseClientAnalyticsParams {
  enabled?: boolean;
  onLoadComplete?: () => void;
}

// Global loading state to prevent multiple simultaneous loads
let isGloballyLoading = false;
let globalLoadPromise: Promise<ClientAnalytics> | null = null;
let cachedResult: ClientAnalytics | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Helper function to process clients in batches for better performance
const processClientsBatch = (clientsBatch: any[], analytics: any) => {
  clientsBatch.forEach((client) => {
    analytics.totalClients++;
    
    // Count by status - optimized lookup
    const status = client.adv_status || client.status || 'Pending';
    if (analytics.statusDistribution[status] !== undefined) {
      analytics.statusDistribution[status]++;
    } else {
      analytics.statusDistribution[status] = 1;
    }
    
    // Count by advocate
    const advocate = client.alloc_adv || 'Unassigned';
    analytics.advocateCount[advocate] = (analytics.advocateCount[advocate] || 0) + 1;
    
    // Count by source
    const source = client.source || 'Unknown';
    analytics.sourceDistribution[source] = (analytics.sourceDistribution[source] || 0) + 1;
    
    // Count by city
    const city = client.city || 'Unknown';
    analytics.cityDistribution[city] = (analytics.cityDistribution[city] || 0) + 1;
    
    // Process banks array efficiently
    if (client.banks && Array.isArray(client.banks) && client.banks.length > 0) {
      client.banks.forEach((bank: any) => {
        const loanType = bank.loanType || 'Unknown';
        analytics.loanTypeDistribution[loanType] = (analytics.loanTypeDistribution[loanType] || 0) + 1;
        
        // Optimized loan amount parsing
        if (bank.loanAmount) {
          let amount: number = 0;
          
          if (typeof bank.loanAmount === 'number') {
            amount = bank.loanAmount;
          } else {
            const amountStr = String(bank.loanAmount).toLowerCase();
            
            if (amountStr.includes('lakh')) {
              const match = amountStr.match(/(\d+(?:\.\d+)?)/);
              amount = match ? parseFloat(match[0]) * 100000 : 0;
            } else if (amountStr.includes('crore')) {
              const match = amountStr.match(/(\d+(?:\.\d+)?)/);
              amount = match ? parseFloat(match[0]) * 10000000 : 0;
            } else {
              // Clean and parse the amount
              const cleanedStr = amountStr.replace(/[₹rs.,\s]/g, '').replace(/^0+/, '');
              amount = parseFloat(cleanedStr) || 0;
            }
          }
          
          if (amount > 0) {
            analytics.totalLoanAmount += amount;
            analytics.loanCount++;
          }
        }
      });
    }
  });
};

// Progressive client analytics loading with immediate results
const loadClientAnalyticsProgressive = async (onProgress?: (partial: ClientAnalytics) => void): Promise<ClientAnalytics> => {
  const timerId = `progressive-client-analytics-${Date.now()}`;
  perfMonitor.start(timerId);
  
  console.log('⚡ Loading client analytics with FAST progressive strategy...');
  
  // Initialize analytics object
  const analytics = {
    totalClients: 0,
    statusDistribution: { Active: 0, Pending: 0, Inactive: 0, Converted: 0 },
    advocateCount: {} as Record<string, number>,
    loanTypeDistribution: {} as Record<string, number>,
    sourceDistribution: {} as Record<string, number>,
    cityDistribution: {} as Record<string, number>,
    totalLoanAmount: 0,
    loanCount: 0
  };
  
  // Aggressive optimization settings
  const INITIAL_BATCH = 100; // Show results after first 100 clients
  const PAGE_SIZE = 150; // Larger batches for faster loading
  let processedCount = 0;
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let isFirstBatch = true;
  
  const clientsCollection = collection(db, 'clients');
  
  // Load data progressively
  while (true) {
    const batchSize = isFirstBatch ? INITIAL_BATCH : PAGE_SIZE;
    let clientsQuery;
    
    if (lastDoc) {
      clientsQuery = query(
        clientsCollection, 
        orderBy('__name__'),
        startAfter(lastDoc),
        limit(batchSize)
      );
    } else {
      clientsQuery = query(
        clientsCollection, 
        orderBy('__name__'),
        limit(batchSize)
      );
    }
    
    const clientsSnapshot: QuerySnapshot<DocumentData> = await getDocs(clientsQuery);
    
    if (clientsSnapshot.empty) {
      break; // No more documents
    }
    
    // Process this batch
    const clientsBatch: any[] = [];
    clientsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      clientsBatch.push(doc.data());
    });
    
    processClientsBatch(clientsBatch, analytics);
    processedCount += clientsBatch.length;
    
    // Update last document for pagination
    lastDoc = clientsSnapshot.docs[clientsSnapshot.docs.length - 1];
    
    // Calculate current results
    const avgLoanAmount = analytics.loanCount > 0 
      ? Math.round(analytics.totalLoanAmount / analytics.loanCount) 
      : 0;
    
    const advocateEntries = Object.entries(analytics.advocateCount);
    advocateEntries.sort((a, b) => b[1] - a[1]);
    const topAdvocates = advocateEntries.slice(0, 10).map(([name, clientCount]) => ({ name, clientCount }));
    
    const currentResult: ClientAnalytics = {
      totalClients: analytics.totalClients,
      statusDistribution: { ...analytics.statusDistribution },
      topAdvocates,
      loanTypeDistribution: { ...analytics.loanTypeDistribution },
      sourceDistribution: { ...analytics.sourceDistribution },
      cityDistribution: { ...analytics.cityDistribution },
      totalLoanAmount: analytics.totalLoanAmount,
      avgLoanAmount
    };
    
    // Show immediate results after first batch
    if (isFirstBatch) {
      console.log(`🚀 FAST PREVIEW: Showing results with first ${processedCount} clients...`);
      onProgress?.(currentResult);
      isFirstBatch = false;
    }
    
    // Log progress for remaining batches
    if (processedCount % 300 === 0) {
      console.log(`📊 Background loading: ${processedCount} clients processed...`);
    }
    
    // Break if we got fewer results than requested (reached end)
    if (clientsBatch.length < batchSize) {
      console.log(`✅ Completed: ${processedCount} total clients processed`);
      break;
    }
    
    // Minimal delay to keep UI responsive
    if (processedCount % 300 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
  
  // Final result
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
    avgLoanAmount
  };
  
  const duration = perfMonitor.safeEnd(timerId);
  console.log(`🎯 COMPLETE: All ${analytics.totalClients} clients loaded in ${duration.toFixed(2)}ms`);
  
  // Cache the result
  cachedResult = finalAnalytics;
  cacheTimestamp = Date.now();
  
  return finalAnalytics;
};

// Super fast client analytics with progressive loading
export const useClientAnalytics = ({ 
  enabled = true, 
  onLoadComplete 
}: UseClientAnalyticsParams = {}) => {
  const [clientAnalytics, setClientAnalytics] = useState<ClientAnalytics>({
    totalClients: 0,
    statusDistribution: { Active: 0, Pending: 0, Inactive: 0, Converted: 0 },
    topAdvocates: [],
    loanTypeDistribution: {},
    sourceDistribution: {},
    cityDistribution: {},
    totalLoanAmount: 0,
    avgLoanAmount: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);

  // Progress callback to update UI immediately
  const handleProgress = useCallback((partialResult: ClientAnalytics) => {
    setClientAnalytics(partialResult);
    setIsLoading(false); // Stop showing loading after first batch
    
    // Call completion for first batch (UI shows content immediately)
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      onLoadComplete?.();
    }
  }, [onLoadComplete]);

  useEffect(() => {
    if (!enabled || hasLoaded.current) {
      setIsLoading(false);
      return;
    }

    const fetchClientAnalytics = async () => {
      try {
        // Check cache first
        if (cachedResult && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
          console.log('⚡ Using cached client analytics (instant load)');
          setClientAnalytics(cachedResult);
          setIsLoading(false);
          hasLoaded.current = true;
          onLoadComplete?.();
          return;
        }
        
        // Prevent multiple simultaneous loads
        if (isGloballyLoading && globalLoadPromise) {
          console.log('🔄 Reusing existing progressive load...');
          const result = await globalLoadPromise;
          setClientAnalytics(result);
          setIsLoading(false);
          hasLoaded.current = true;
          onLoadComplete?.();
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
        onLoadComplete?.();
      } finally {
        // Reset global loading state
        setTimeout(() => {
          isGloballyLoading = false;
          globalLoadPromise = null;
        }, 1000);
      }
    };
    
    fetchClientAnalytics();
  }, [enabled, onLoadComplete, handleProgress]);

  return {
    clientAnalytics,
    isLoading
  };
}; 