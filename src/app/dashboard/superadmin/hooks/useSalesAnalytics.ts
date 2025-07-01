import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { SalesAnalytics, Salesperson, IndividualSalesData } from '../types';

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

  // Fetch salespeople
  useEffect(() => {
    if (!enabled) return;
    
    const fetchSalespeople = async () => {
      try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const currentMonthName = `${monthNames[currentMonth]}_${currentYear}`;
        const salesTargetsRef = collection(db, `targets/${currentMonthName}/sales_targets`);
        
        try {
          const salesTargetsSnapshot = await getDocs(salesTargetsRef);
          const salespeople: Salesperson[] = [];
          
          salesTargetsSnapshot.forEach((doc) => {
            const targetData = doc.data();
            if (targetData.userName) {
              salespeople.push({
                id: doc.id,
                name: targetData.userName
              });
            }
          });
          
          salespeople.sort((a, b) => a.name.localeCompare(b.name));
          setSalespeople(salespeople);
        } catch (error) {
          const prevMonthIndex = (currentMonth - 1 + 12) % 12;
          const prevMonthYear = prevMonthIndex > currentMonth ? currentYear - 1 : currentYear;
          const prevMonthName = `${monthNames[prevMonthIndex]}_${prevMonthYear}`;
          
          const prevMonthTargetsRef = collection(db, `targets/${prevMonthName}/sales_targets`);
          const prevMonthSnapshot = await getDocs(prevMonthTargetsRef);
          
          const salespeople: Salesperson[] = [];
          
          prevMonthSnapshot.forEach((doc) => {
            const targetData = doc.data();
            if (targetData.userName) {
              salespeople.push({
                id: doc.id,
                name: targetData.userName
              });
            }
          });
          
          salespeople.sort((a, b) => a.name.localeCompare(b.name));
          setSalespeople(salespeople);
        }
      } catch (error) {
        console.error('Error fetching salespeople:', error);
      }
    };
    
    fetchSalespeople();
  }, [enabled]);

  // Fetch sales analytics
  useEffect(() => {
    if (!enabled) return;
    
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

        try {
          const targetMonthDoc = `${targetMonthName}_${targetYear}`;
          const salesTargetsRef = collection(db, `targets/${targetMonthDoc}/sales_targets`);
          const salesTargetsSnapshot = await getDocs(salesTargetsRef);
          
          let targetDataCount = 0;
          totalTarget = 0;
          
          salesTargetsSnapshot.forEach((doc) => {
            const targetData = doc.data();
            targetDataCount++;
            
            const targetAmount = targetData.amountCollectedTarget || 0;
            totalTarget += targetAmount;
            
            if (!hasPaymentData) {
              totalCollected += targetData.amountCollected || 0;
            }
          });
          
          if (targetDataCount === 0) {
            for (let m = targetMonth - 1; m >= 0; m--) {
              const prevMonthName = monthNames[m];
              const prevMonthDoc = `${prevMonthName}_${targetYear}`;
              
              try {
                const prevTargetsRef = collection(db, `targets/${prevMonthDoc}/sales_targets`);
                const prevTargetsSnapshot = await getDocs(prevTargetsRef);
                
                if (!prevTargetsSnapshot.empty) {
                  totalTarget = 0;
                  
                  prevTargetsSnapshot.forEach((doc) => {
                    const targetData = doc.data();
                    totalTarget += targetData.amountCollectedTarget || 0;
                    
                    if (!hasPaymentData) {
                      totalCollected += targetData.amountCollected || 0;
                    }
                  });
                  
                  break;
                }
              } catch (err) {
                console.error('Error checking previous month:', err);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching targets for target month:', error);
        }
        
        if (hasPaymentData) {
          totalCollected = paymentBasedRevenue;
        }
        
        const analyticsStats = {
          conversionRate: totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0,
          avgDealSize: 0
        };
        
        setSalesAnalytics({
          totalTargetAmount: totalTarget,
          totalCollectedAmount: totalCollected,
          monthlyRevenue: monthlyData,
          conversionRate: analyticsStats.conversionRate,
          avgDealSize: analyticsStats.avgDealSize
        });
        
        onLoadComplete?.();
        
      } catch (error) {
        console.error('Error fetching sales analytics:', error);
        onLoadComplete?.();
      }
    };
    
    fetchSalesAnalytics();
  }, [salespeople.length, selectedAnalyticsMonth, selectedAnalyticsYear, enabled, onLoadComplete]);

  // Fetch individual salesperson data
  useEffect(() => {
    if (!enabled) return;
    
    const fetchIndividualSalesData = async () => {
      if (!selectedSalesperson) {
        setIndividualSalesData(null);
        return;
      }
      
      try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const last6Months = [];
        for (let i = 0; i < 6; i++) {
          const monthIndex = (currentMonth - i + 12) % 12;
          const year = monthIndex > currentMonth ? currentYear - 1 : currentYear;
          last6Months.push({
            monthName: `${monthNames[monthIndex]}_${year}`,
            index: 5 - i
          });
        }
        
        const monthlyData = [0, 0, 0, 0, 0, 0];
        
        let salespersonName = "";
        let targetAmount = 0;
        let collectedAmount = 0;
        
        for (const { monthName, index } of last6Months) {
          try {
            const targetRef = doc(db, `targets/${monthName}/sales_targets/${selectedSalesperson}`);
            const targetSnap = await getDoc(targetRef);
            
            if (targetSnap.exists()) {
              const targetData = targetSnap.data();
              
              if (!salespersonName) {
                salespersonName = targetData.userName || "";
                targetAmount = targetData.amountCollectedTarget || 0;
                collectedAmount = targetData.amountCollected || 0;
              }
              
              monthlyData[index] = targetData.amountCollected || 0;
            }
          } catch (error) {
            console.error('Error fetching individual sales data:', error);
          }
        }
        
        const conversionRate = targetAmount > 0 ? Math.round((collectedAmount / targetAmount) * 100) : 0;
        
        setIndividualSalesData({
          name: salespersonName,
          targetAmount: targetAmount,
          collectedAmount: collectedAmount,
          conversionRate: conversionRate,
          monthlyData: monthlyData
        });
      } catch (error) {
        console.error('Error fetching individual sales data:', error);
      }
    };
    
    fetchIndividualSalesData();
  }, [selectedSalesperson, enabled]);

  return {
    salesAnalytics,
    salespeople,
    individualSalesData
  };
}; 