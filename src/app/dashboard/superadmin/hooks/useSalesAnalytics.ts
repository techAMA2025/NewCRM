import { useState, useEffect, useRef } from 'react';
import { SalesAnalytics, Salesperson, IndividualSalesData } from '../types';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '@/context/AuthContext';

interface UseSalesAnalyticsParams {
  selectedAnalyticsMonth: number | null;
  selectedAnalyticsYear: number | null;
  selectedSalesperson: string | null;
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useSalesAnalytics = ({
  selectedAnalyticsMonth,
  selectedAnalyticsYear,
  selectedSalesperson,
  enabled = true,
  onLoadComplete
}: UseSalesAnalyticsParams) => {
  const { user } = useAuth();
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics>({
    totalTargetAmount: 0,
    totalCollectedAmount: 0,
    monthlyRevenue: [0, 0, 0, 0, 0, 0],
    conversionRate: 0,
    avgDealSize: 0
  });

  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [individualSalesData, setIndividualSalesData] = useState<IndividualSalesData>(null);
  const [allSalesTargets, setAllSalesTargets] = useState<Record<string, any>>({});
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
        const params = new URLSearchParams();
        if (selectedAnalyticsMonth !== null) params.append('month', selectedAnalyticsMonth.toString());
        if (selectedAnalyticsYear !== null) params.append('year', selectedAnalyticsYear.toString());
        if (selectedSalesperson) params.append('salesperson', selectedSalesperson);

        const response = await fetch(`/api/dashboard/superadmin/sales?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch sales analytics');

        const data = await response.json();

        // Use functional updates to avoid overwriting real-time data from onSnapshot
        setSalesAnalytics(prev => ({
          ...data.salesAnalytics,
          // Preserve the real-time collected amount if it's already been updated
          totalCollectedAmount: prev.totalCollectedAmount || data.salesAnalytics.totalCollectedAmount
        }));
        setSalespeople(data.salespeople);
        setIndividualSalesData(prev => {
          if (!data.individualSalesData) return null;
          return {
            ...data.individualSalesData,
            // Preserve real-time collected amount for individual data too
            collectedAmount: prev?.collectedAmount || data.individualSalesData.collectedAmount
          };
        });
        setAllSalesTargets(data.allSalesTargets || {});

      } catch (error) {
        console.error("Error fetching sales analytics from API:", error);
      } finally {
        setIsLoading(false);
        onLoadCompleteRef.current?.();
      }
    };

    fetchData();

    // Real-time listener for Sales Revenue (payments collection)
    const targetMonth = selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : new Date().getMonth();
    const targetYear = selectedAnalyticsYear !== null ? selectedAnalyticsYear : new Date().getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const paymentsRef = collection(db, 'payments');
    let q = query(
      paymentsRef,
      where('status', '==', 'approved'),
      where('timestamp', '>=', startOfMonth.toISOString()),
      where('timestamp', '<=', endOfMonth.toISOString())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalCollected = 0;

      snapshot.forEach((doc) => {
        const payment = doc.data();
        const amount = parseFloat(payment.amount) || 0;

        // Filter by salesperson if selected
        if (selectedSalesperson) {
          if (payment.salespersonName === selectedSalesperson) {
            totalCollected += amount;
          }
        } else {
          totalCollected += amount;
        }
      });

      setSalesAnalytics((prev: SalesAnalytics) => ({
        ...prev,
        totalCollectedAmount: totalCollected
      }));

      if (selectedSalesperson) {
        setIndividualSalesData((prev: IndividualSalesData) => {
          if (!prev) return prev;
          return {
            ...prev,
            collectedAmount: totalCollected
          };
        });
      }
    }, (error) => {
      console.error("Error listening to payments:", error);
    });

    return () => unsubscribe();
  }, [selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson, enabled, user]);

  return {
    salesAnalytics,
    salespeople,
    individualSalesData,
    allSalesTargets,
    isLoading
  };
};