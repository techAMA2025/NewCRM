import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp, QueryConstraint, limit } from 'firebase/firestore';
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

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const fetchLeadsData = async () => {
      try {
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
        } else {
          // If no filters applied, limit to prevent loading too much data
          leadsQuery = query(leadsQuery, limit(500));
        }
        
        // Add salesperson filter if selected
        if (selectedLeadsSalesperson) {
          leadsQuery = query(leadsQuery, where('assignedTo', '==', selectedLeadsSalesperson));
        }
        
        const leadsSnapshot = await getDocs(leadsQuery);
        
        // Initialize direct counts for total leads by source
        const sourceTotalCounts = {
          settleloans: 0,
          credsettlee: 0,
          ama: 0,
        };
        
        // Initialize counters for each status and source combination
        const statusCounts = {
          'Interested': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Not Interested': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Not Answering': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Callback': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Converted': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Loan Required': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Cibil Issue': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Closed Lead': { settleloans: 0, credsettlee: 0, ama: 0 },
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
                // Count leads with valid source but invalid/missing status as "Other"
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
        onLoadComplete?.();
      } catch (error) {
        console.error('Error fetching leads data:', error);
        setIsLoading(false);
        onLoadComplete?.();
      }
    };
    
    fetchLeadsData();
  }, [startDate, endDate, isFilterApplied, selectedLeadsSalesperson, enabled, onLoadComplete]);

  return {
    leadsBySourceData,
    sourceTotals,
    isLoading
  };
}; 