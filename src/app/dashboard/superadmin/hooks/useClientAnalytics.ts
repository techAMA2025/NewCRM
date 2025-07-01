import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { ClientAnalytics } from '../types';

interface UseClientAnalyticsParams {
  enabled?: boolean;
  onLoadComplete?: () => void;
}

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

  useEffect(() => {
    if (!enabled || hasLoaded.current) {
      setIsLoading(false);
      return;
    }

    const fetchClientAnalytics = async () => {
      try {
        console.time('Client Analytics Load');
        
        // Query all clients with optimized ordering for better cache performance
        const clientsCollection = collection(db, 'clients');
        const clientsQuery = query(clientsCollection, orderBy('__name__')); // Order by document ID for better performance
        
        const clientsSnapshot = await getDocs(clientsQuery);
        console.log(`Loading ${clientsSnapshot.size} clients...`);
        
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
        
        // Process clients in batches for better performance
        const BATCH_SIZE = 100;
        const allClients: any[] = [];
        
        // Collect all client data first
        clientsSnapshot.forEach((doc) => {
          allClients.push(doc.data());
        });
        
        // Process in batches to prevent blocking the main thread
        for (let i = 0; i < allClients.length; i += BATCH_SIZE) {
          const batch = allClients.slice(i, i + BATCH_SIZE);
          processClientsBatch(batch, analytics);
          
          // Allow other tasks to run between batches
          if (i + BATCH_SIZE < allClients.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        // Sort advocates by client count efficiently
        const advocateEntries = Object.entries(analytics.advocateCount);
        advocateEntries.sort((a, b) => b[1] - a[1]); // Sort by count descending
        const topAdvocates = advocateEntries.slice(0, 5).map(([name, clientCount]) => ({ name, clientCount }));
        
        // Calculate average loan amount
        const avgLoanAmount = analytics.loanCount > 0 
          ? Math.round(analytics.totalLoanAmount / analytics.loanCount) 
          : 0;
        
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
        
        setClientAnalytics(finalAnalytics);
        setIsLoading(false);
        hasLoaded.current = true;
        onLoadComplete?.();
        
        console.timeEnd('Client Analytics Load');
        console.log(`Processed ${analytics.totalClients} clients successfully`);
        
      } catch (error) {
        console.error('Error fetching client analytics:', error);
        setIsLoading(false);
        onLoadComplete?.();
      }
    };
    
    fetchClientAnalytics();
  }, [enabled, onLoadComplete]);

  return {
    clientAnalytics,
    isLoading
  };
}; 