import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { LeadsBySourceData, SourceTotals, StatusKey, SourceKey, ChartDataset } from '../types';
import { statusColors } from '../utils/chartConfigs';

interface UseLeadsDataParams {
  startDate: string;
  endDate: string;
  isFilterApplied: boolean;
  selectedLeadsSalesperson: string | null;
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useLeadsData = ({
  startDate,
  endDate,
  isFilterApplied,
  selectedLeadsSalesperson,
  enabled = true,
  onLoadComplete
}: UseLeadsDataParams) => {
  const [leadsBySourceData, setLeadsBySourceData] = useState<LeadsBySourceData>({
    labels: ['Settleloans', 'Credsettlee', 'AMA'],
    datasets: [],
  });
  
  const [sourceTotals, setSourceTotals] = useState<SourceTotals>({
    settleloans: 0,
    credsettlee: 0,
    ama: 0,
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Use ref to store the callback to avoid dependency issues
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const fetchLeadsData = async () => {
      try {
        console.log('🚀 Loading ALL leads data (no limits)...');
        
        // Create a base query
        const leadsCollection = collection(db, 'crm_leads');
        let leadsQuery: any = leadsCollection;
        
        // Apply date filters if set
        if (isFilterApplied && (startDate || endDate)) {
          const constraints: QueryConstraint[] = [];
          
          if (startDate) {
            constraints.push(where(
              'synced_at', 
              '>=', 
              Timestamp.fromDate(new Date(startDate))
            ));
          }
          
          if (endDate) {
            constraints.push(where(
              'synced_at', 
              '<=', 
              Timestamp.fromDate(new Date(`${endDate}T23:59:59`))
            ));
          }
          
          leadsQuery = query(leadsQuery, ...constraints);
        }
        // Removed the limit(500) to load ALL leads when no date filter is applied
        
        // Add salesperson filter if selected
        if (selectedLeadsSalesperson) {
          leadsQuery = query(leadsQuery, where('assignedTo', '==', selectedLeadsSalesperson));
        }
        
        const leadsSnapshot = await getDocs(leadsQuery);
        console.log(`📊 Processing ${leadsSnapshot.size} leads...`);
        
        // Initialize direct counts for total leads by source
        const sourceTotalCounts = {
          settleloans: 0,
          credsettlee: 0,
          ama: 0,
        };
        
        // Initialize counters for each status and source combination (including new statuses)
        const statusCounts = {
          'Interested': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Not Interested': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Not Answering': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Callback': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Converted': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Loan Required': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Cibil Issue': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Closed Lead': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Language Barrier': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Future Potential': { settleloans: 0, credsettlee: 0, ama: 0 },
          'No Status': { settleloans: 0, credsettlee: 0, ama: 0 },
        };
        
        // Process each lead document
        leadsSnapshot.forEach((doc) => {
          const lead = doc.data() as {
            source_database?: string;
            status?: string;
            [key: string]: any;
          };
          
          let source = lead.source_database;
          
          // Normalize source to lowercase if it exists
          if (source) {
            source = source.toLowerCase();
            
            // Map source to one of our three categories
            let mappedSource;
            if (source.includes('settleloans')) {
              mappedSource = 'settleloans';
            } else if (source.includes('credsettlee') || source.includes('credsettle')) {
              mappedSource = 'credsettlee';
            } else if (source.includes('ama')) {
              mappedSource = 'ama';
            }
            
            // First, count all leads by source (regardless of status)
            if (mappedSource) {
              sourceTotalCounts[mappedSource as SourceKey]++;
              
              // Then categorize leads by status for the chart
              const status = lead.status;
              if (status && statusCounts[status as StatusKey]) {
                statusCounts[status as StatusKey][mappedSource as SourceKey]++;
              } else {
                // Count leads with valid source but invalid/missing status as "No Status"
                statusCounts['No Status'][mappedSource as SourceKey]++;
              }
            }
          }
        });
        
        // Prepare chart data
        const datasets = Object.entries(statusCounts).map(([status, sources], index): ChartDataset => {
          return {
            label: status,
            data: [sources.settleloans, sources.credsettlee, sources.ama],
            backgroundColor: statusColors[index % statusColors.length],
          };
        });
        
        // Update chart data
        setLeadsBySourceData({
          labels: ['Settleloans', 'Credsettlee', 'AMA'],
          datasets: datasets,
        });
        
        setSourceTotals(sourceTotalCounts);
        setIsLoading(false);
        
        // Call the callback using the ref to avoid dependency issues
        onLoadCompleteRef.current?.();
        
        console.log(`✅ Leads analytics complete: ${leadsSnapshot.size} leads processed`);
      } catch (error) {
        console.error('Error fetching leads data:', error);
        setIsLoading(false);
        onLoadCompleteRef.current?.();
      }
    };
    
    fetchLeadsData();
    // Removed onLoadComplete from dependency array to prevent infinite re-renders
  }, [startDate, endDate, isFilterApplied, selectedLeadsSalesperson, enabled]);

  return {
    leadsBySourceData,
    sourceTotals,
    isLoading
  };
}; 