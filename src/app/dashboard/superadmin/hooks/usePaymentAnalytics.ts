import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { PaymentAnalytics, CurrentMonthPayments } from '../types';

interface UsePaymentAnalyticsParams {
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const usePaymentAnalytics = ({ 
  enabled = true, 
  onLoadComplete 
}: UsePaymentAnalyticsParams = {}) => {
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics>({
    totalPaymentsAmount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
    completionRate: 0,
    clientCount: 0,
    paymentMethodDistribution: {},
    monthlyPaymentsData: [0, 0, 0, 0, 0, 0],
    paymentTypeDistribution: {
      full: 0,
      partial: 0
    }
  });

  const [currentMonthPayments, setCurrentMonthPayments] = useState<CurrentMonthPayments>({
    collected: 0,
    pending: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to track loading state and prevent infinite re-renders
  const hasLoaded = useRef(false);

  // Memoize the onLoadComplete callback
  const handleLoadComplete = useCallback(() => {
    onLoadComplete?.();
  }, [onLoadComplete]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate loads
    if (hasLoaded.current) {
      return;
    }

    const fetchPaymentAnalytics = async () => {
      try {
        console.log('🚀 Loading payment analytics...');
        
        // First, get a limited set of payment records for faster initial load
        const paymentsCollection = collection(db, 'clients_payments');
        const limitedQuery = query(paymentsCollection, limit(50)); // Limit initial load
        const paymentsSnapshot = await getDocs(limitedQuery);
        
        const analytics = {
          totalPaymentsAmount: 0,
          totalPaidAmount: 0,
          totalPendingAmount: 0,
          clientCount: 0,
          paymentMethodDistribution: {} as Record<string, number>,
          monthlyPaymentsData: [0, 0, 0, 0, 0, 0],
          paymentTypeDistribution: {
            full: 0,
            partial: 0
          }
        };

        // Get current month's start and end dates
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthStart = new Date(currentYear, currentMonth, 1);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
        
        let currentMonthCollected = 0;
        let currentMonthPending = 0;
        
        const clientIds: string[] = [];
        
        // Process limited client payment documents
        paymentsSnapshot.forEach((clientDoc) => {
          const clientPayment = clientDoc.data();
          const clientId = clientDoc.id;
          clientIds.push(clientId);
          
          analytics.clientCount++;
          
          analytics.totalPaymentsAmount += clientPayment.totalPaymentAmount || 0;
          analytics.totalPaidAmount += clientPayment.paidAmount || 0;
          analytics.totalPendingAmount += clientPayment.pendingAmount || 0;

          const monthlyFees = clientPayment.monthlyFees || 0;
          
          if (clientPayment.startDate) {
            const startDate = clientPayment.startDate.toDate ? 
              clientPayment.startDate.toDate() : new Date(clientPayment.startDate);
            
            if (startDate <= currentMonthEnd) {
              currentMonthPending += monthlyFees;
            }
          }

          if (clientPayment.paymentsCompleted > 0) {
            if (clientPayment.paidAmount < monthlyFees) {
              analytics.paymentTypeDistribution.partial++;
            } else {
              analytics.paymentTypeDistribution.full++;
            }
          }
        });
        
        // Process only first 10 clients for payment history to speed up initial load
        const maxClientsToProcess = Math.min(clientIds.length, 10);
        
        for (let i = 0; i < maxClientsToProcess; i++) {
          const clientId = clientIds[i];
          const paymentHistoryRef = collection(db, `clients_payments/${clientId}/payment_history`);
          
          const paymentHistoryQuery = query(
            paymentHistoryRef,
            where('payment_status', 'in', ['approved', 'Approved']),
            limit(5) // Limit to recent records only
          );
          
          try {
            const paymentHistorySnapshot = await getDocs(paymentHistoryQuery);
            
            paymentHistorySnapshot.forEach((paymentDoc) => {
              const payment = paymentDoc.data();
              
              currentMonthCollected += payment.requestedAmount || 0;
              
              let isCurrentMonth = false;
              
              if (payment.paymentDate) {
                const paymentDate = payment.paymentDate.toDate ? 
                  payment.paymentDate.toDate() : new Date(payment.paymentDate);
                
                if (paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd) {
                  isCurrentMonth = true;
                }
              } 
              else if (payment.dateApproved) {
                const approvalDate = payment.dateApproved.toDate ? 
                  payment.dateApproved.toDate() : new Date(payment.dateApproved);
                
                if (approvalDate >= currentMonthStart && approvalDate <= currentMonthEnd) {
                  isCurrentMonth = true;
                }
              }
              else if (payment.requestDate) {
                const requestDate = payment.requestDate.toDate ? 
                  payment.requestDate.toDate() : new Date(payment.requestDate);
                
                if (requestDate >= currentMonthStart && requestDate <= currentMonthEnd) {
                  isCurrentMonth = true;
                }
              }
              else if (payment.monthNumber === currentMonth + 1) {
                isCurrentMonth = true;
              }
            });
          } catch (error) {
            console.error('Error getting payment history for client:', error);
          }
        }

        currentMonthPending = Math.max(0, currentMonthPending - currentMonthCollected);
        
        const completionRate = analytics.totalPaymentsAmount > 0 
          ? Math.round((analytics.totalPaidAmount / analytics.totalPaymentsAmount) * 100) 
          : 0;
        
        setPaymentAnalytics({
          ...analytics,
          completionRate
        });
        
        setCurrentMonthPayments({
          collected: currentMonthCollected,
          pending: currentMonthPending
        });
        
        setIsLoading(false);
        hasLoaded.current = true;
        
        console.log('✅ Payment analytics loaded successfully');
        handleLoadComplete();
        
      } catch (error) {
        console.error('❌ Error fetching payment analytics:', error);
        setIsLoading(false);
        hasLoaded.current = true;
        handleLoadComplete();
      }
    };
    
    fetchPaymentAnalytics();
  }, [enabled, handleLoadComplete]);

  return {
    paymentAnalytics,
    currentMonthPayments,
    isLoading
  };
}; 