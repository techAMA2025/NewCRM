import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { SalesAnalytics, Salesperson, IndividualSalesData } from '../types';
import { analyticsCache, generateCacheKey } from '../utils/cache';

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
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics>({
    totalTargetAmount: 0,
    totalCollectedAmount: 0,
    monthlyRevenue: [0, 0, 0, 0, 0, 0],
    conversionRate: 0,
    avgDealSize: 0
  });

  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [individualSalesData, setIndividualSalesData] = useState<IndividualSalesData>(null);

  // Use refs to track loading states and prevent infinite re-renders
  const salesAnalyticsLoaded = useRef(false);
  const salespeopleLoaded = useRef(false);
  const lastAnalyticsParams = useRef<string>('');

  // Use ref to store the callback to avoid dependency issues
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  const salesAnalyticsCacheKey = generateCacheKey.salesAnalytics(selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson);
  const salespeopleCacheKey = generateCacheKey.salespeople();

  // Fetch salespeople - only once when enabled
  useEffect(() => {
    if (!enabled || salespeopleLoaded.current) return;
    
    const fetchSalespeople = async () => {
      try {
        const cachedPeople = analyticsCache.get<Salesperson[]>(salespeopleCacheKey);
        if (cachedPeople) {
          setSalespeople(cachedPeople);
          salespeopleLoaded.current = true;
          return;
        }
        
        // Get salespeople from users collection - filter active users
        const usersCollection = collection(db, 'users');
        const usersQuery = query(usersCollection, where('role', '==', 'sales'));
        const usersSnapshot = await getDocs(usersQuery);
        
        const salespeople: Salesperson[] = [];
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const firstName = userData.firstName || '';
          const lastName = userData.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          // Only include users who are active (status === 'active' or status is not 'inactive')
          const userStatus = userData.status;
          const isActive = userStatus === 'active' || userStatus === undefined || userStatus === null;
          
          if (fullName && isActive) {
            salespeople.push({
              id: doc.id,
              name: fullName
            });
          }
        });
        
        salespeople.sort((a, b) => a.name.localeCompare(b.name));
        analyticsCache.set(salespeopleCacheKey, salespeople);
        setSalespeople(salespeople);
        salespeopleLoaded.current = true;
        
        console.log('🔍 Fetched salespeople from users collection:', salespeople);
      } catch (error) {
        console.error('Error fetching salespeople from users collection:', error);
        
        // Fallback: try to get from targets collection
        try {
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          const currentMonthName = `${monthNames[currentMonth]}_${currentYear}`;
          const salesTargetsRef = collection(db, `targets/${currentMonthName}/sales_targets`);
          
          const salesTargetsSnapshot = await getDocs(salesTargetsRef);
          const fallbackSalespeople: Salesperson[] = [];
          
          salesTargetsSnapshot.forEach((doc) => {
            const targetData = doc.data();
            if (targetData.userName) {
              fallbackSalespeople.push({
                id: doc.id,
                name: targetData.userName
              });
            }
          });
          
          fallbackSalespeople.sort((a, b) => a.name.localeCompare(b.name));
          analyticsCache.set(salespeopleCacheKey, fallbackSalespeople);
          setSalespeople(fallbackSalespeople);
          salespeopleLoaded.current = true;
          
          console.log('🔍 Fallback: Fetched salespeople from targets collection:', fallbackSalespeople);
        } catch (fallbackError) {
          console.error('Error fetching salespeople from targets collection:', fallbackError);
          salespeopleLoaded.current = true;
        }
      }
    };
    
    fetchSalespeople();
  }, [enabled]);

  // Fetch sales analytics - triggered by filter changes
  useEffect(() => {
    if (!enabled) return;
    
    // Create a unique key for current parameters to avoid duplicate calls
    const currentParams = `${selectedAnalyticsMonth}-${selectedAnalyticsYear}`;
    if (lastAnalyticsParams.current === currentParams && salesAnalyticsLoaded.current) {
      return;
    }
    
    const fetchSalesAnalytics = async () => {
      try {
        const monthlyData = [0, 0, 0, 0, 0, 0];
        
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const targetMonth = selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : currentMonth;
        const targetYear = selectedAnalyticsYear !== null ? selectedAnalyticsYear : currentYear;
        const targetMonthName = monthNames[targetMonth];
        
        let totalTarget = 0;
        let totalCollected = 0;
        let paymentBasedRevenue = 0;
        let hasPaymentData = false;
        
        // Try to get revenue from payments collection
        try {
          const paymentsCollection = collection(db, 'payments');
          const paymentsSnapshot = await getDocs(paymentsCollection);
          
          const startOfMonth = new Date(targetYear, targetMonth, 1);
          const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
      
          paymentsSnapshot.forEach((doc) => {
            const payment = doc.data();
            
            if (payment.status === 'approved' && payment.timestamp) {
              const paymentDate = new Date(payment.timestamp);
              
              if (paymentDate >= startOfMonth && paymentDate <= endOfMonth) {
                const amount = parseFloat(payment.amount) || 0;
                paymentBasedRevenue += amount;
                hasPaymentData = true;
              }
            }
          });
        } catch (error) {
          console.error('Error fetching payments data:', error);
        }
        
        // Fetch targets and sales data
        const monthYearName = `${targetMonthName}_${targetYear}`;
        const salesTargetsRef = collection(db, `targets/${monthYearName}/sales_targets`);
        
        try {
          const salesTargetsSnapshot = await getDocs(salesTargetsRef);
          
          salesTargetsSnapshot.forEach((doc) => {
            const targetData = doc.data();
            totalTarget += targetData.amountCollectedTarget || 0;
            
            if (targetData.amountCollected !== undefined) {
              totalCollected += targetData.amountCollected || 0;
            }
          });
        } catch (error) {
          console.error('Error fetching sales targets:', error);
        }
        
        if (hasPaymentData) {
          totalCollected = paymentBasedRevenue;
        }
        
        const analyticsStats = {
          conversionRate: totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0,
          avgDealSize: 0
        };
        
        const cachedAnalytics = analyticsCache.get<SalesAnalytics>(salesAnalyticsCacheKey);
        if (cachedAnalytics) {
          setSalesAnalytics(cachedAnalytics);
          lastAnalyticsParams.current = currentParams;
          salesAnalyticsLoaded.current = true;
          onLoadCompleteRef.current?.();
          return;
        }
        
        const newSalesAnalytics = {
          totalTargetAmount: totalTarget,
          totalCollectedAmount: totalCollected,
          monthlyRevenue: monthlyData,
          conversionRate: analyticsStats.conversionRate,
          avgDealSize: analyticsStats.avgDealSize,
        } as SalesAnalytics;
        analyticsCache.set(salesAnalyticsCacheKey, newSalesAnalytics);
        setSalesAnalytics(newSalesAnalytics);
        
        // Update tracking refs
        lastAnalyticsParams.current = currentParams;
        salesAnalyticsLoaded.current = true;
        
        // Call completion callback only once
        if (!salesAnalyticsLoaded.current) {
          onLoadCompleteRef.current?.();
        }
        
      } catch (error) {
        console.error('Error fetching sales analytics:', error);
        onLoadCompleteRef.current?.();
      }
    };
    
    fetchSalesAnalytics();
  }, [selectedAnalyticsMonth, selectedAnalyticsYear, enabled]);

  // Fetch individual sales data when salesperson is selected
  useEffect(() => {
    if (!enabled || !selectedSalesperson) {
      setIndividualSalesData(null);
      return;
    }
    
    const fetchIndividualSalesData = async () => {
      try {
        console.log('🔍 Fetching individual sales data for:', selectedSalesperson);
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const targetMonth = selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : currentMonth;
        const targetYear = selectedAnalyticsYear !== null ? selectedAnalyticsYear : currentYear;
        const targetMonthName = monthNames[targetMonth];
        const monthYearName = `${targetMonthName}_${targetYear}`;
        
        console.log('🔍 Querying targets collection:', `targets/${monthYearName}/sales_targets`);
        
        // First, try to find the user ID that corresponds to the selected salesperson name
        const usersCollection = collection(db, 'users');
        const usersQuery = query(usersCollection, where('role', '==', 'sales'));
        const usersSnapshot = await getDocs(usersQuery);
        
        let targetUserId = null;
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const firstName = userData.firstName || '';
          const lastName = userData.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          if (fullName === selectedSalesperson) {
            targetUserId = doc.id;
          }
        });
        
        console.log('🔍 Found target user ID:', targetUserId);
        
        // Query by userName field instead of using selectedSalesperson as document ID
        const salesTargetsRef = collection(db, `targets/${monthYearName}/sales_targets`);
        let salesTargetsSnapshot;
        
        if (targetUserId) {
          // Try to get by user ID first
          const targetDocRef = doc(salesTargetsRef, targetUserId);
          const targetDoc = await getDoc(targetDocRef);
          
          if (targetDoc.exists()) {
            console.log('🔍 Found target by user ID');
            const targetData = targetDoc.data();
            setIndividualSalesData({
              name: targetData.userName || selectedSalesperson,
              targetAmount: targetData.amountCollectedTarget || 0,
              collectedAmount: targetData.amountCollected || 0,
              conversionRate: targetData.amountCollectedTarget > 0 
                ? Math.round((targetData.amountCollected / targetData.amountCollectedTarget) * 100) 
                : 0,
              monthlyData: [0, 0, 0, 0, 0, 0]
            });
            return;
          }
        }
        
        // Fallback: query by userName field
        const salesTargetsQuery = query(salesTargetsRef, where('userName', '==', selectedSalesperson));
        salesTargetsSnapshot = await getDocs(salesTargetsQuery);
        
        console.log('🔍 Found target documents by userName:', salesTargetsSnapshot.size);
        
        if (!salesTargetsSnapshot.empty) {
          const targetDoc = salesTargetsSnapshot.docs[0];
          const targetData = targetDoc.data();
          console.log('🔍 Target data found:', targetData);
          setIndividualSalesData({
            name: targetData.userName || selectedSalesperson,
            targetAmount: targetData.amountCollectedTarget || 0,
            collectedAmount: targetData.amountCollected || 0,
            conversionRate: targetData.amountCollectedTarget > 0 
              ? Math.round((targetData.amountCollected / targetData.amountCollectedTarget) * 100) 
              : 0,
            monthlyData: [0, 0, 0, 0, 0, 0]
          });
        } else {
          console.log('🔍 No target data found for salesperson:', selectedSalesperson);
          setIndividualSalesData(null);
        }
      } catch (error) {
        console.error('Error fetching individual sales data:', error);
        setIndividualSalesData(null);
      }
    };
    
    fetchIndividualSalesData();
  }, [selectedSalesperson, selectedAnalyticsMonth, selectedAnalyticsYear, enabled]);

  return {
    salesAnalytics,
    salespeople,
    individualSalesData
  };
}; 