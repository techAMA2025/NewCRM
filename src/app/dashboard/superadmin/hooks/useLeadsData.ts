import { useState, useEffect, useRef } from 'react';
import { LeadsBySourceData, SourceTotals, Salesperson } from '../types';
import { useAuth } from '@/context/AuthContext';

interface UseLeadsDataParams {
  startDate: string;
  endDate: string;
  isFilterApplied: boolean;
  selectedLeadsSalesperson: string | null;
  salespeople?: Salesperson[];
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
  const { user } = useAuth();
  const [leadsBySourceData, setLeadsBySourceData] = useState<LeadsBySourceData>({
    labels: ['Settleloans', 'Credsettlee', 'AMA', 'Billcut'],
    datasets: [],
  });

  const [sourceTotals, setSourceTotals] = useState<SourceTotals>({
    settleloans: 0,
    credsettlee: 0,
    ama: 0,
    billcut: 0,
  });

  const [leadsBySalesperson, setLeadsBySalesperson] = useState<Record<string, { interested: number; converted: number }>>({});

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
        const params = new URLSearchParams({
          startDate,
          endDate,
          isFilterApplied: isFilterApplied.toString(),
          selectedLeadsSalesperson: selectedLeadsSalesperson || 'all'
        });

        const response = await fetch(`/api/dashboard/superadmin/leads?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch leads data');

        const data = await response.json();

        setLeadsBySourceData(data.leadsBySourceData);
        setSourceTotals(data.sourceTotals);
        setLeadsBySalesperson(data.leadsBySalesperson || {});

      } catch (error) {
        console.error("Error fetching leads data from API:", error);
      } finally {
        setIsLoading(false);
        onLoadCompleteRef.current?.();
      }
    };

    fetchData();
  }, [startDate, endDate, isFilterApplied, selectedLeadsSalesperson, enabled, user]);

  return {
    leadsBySourceData,
    sourceTotals,
    leadsBySalesperson,
    isLoading
  };
};