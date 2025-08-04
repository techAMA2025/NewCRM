import { useState, useEffect, useCallback } from 'react';

export const useProgressiveDataLoading = () => {
  const [loadingStages, setLoadingStages] = useState({
    salesAnalytics: true,    // Load immediately
    leadsData: true,         // Load after 10ms
    clientAnalytics: true,   // Load after 50ms
    paymentAnalytics: true,  // Load after 100ms
    opsPayments: true,       // Load after 100ms (same as payment analytics)
  });

  const [enabledStages, setEnabledStages] = useState({
    salesAnalytics: true,    // Enable immediately
    leadsData: false,        // Enable after short delay
    clientAnalytics: false,  // Enable after short delay
    paymentAnalytics: false, // Enable after short delay
    opsPayments: false,      // Enable after short delay
  });

  useEffect(() => {
    // Enable leads data loading after 10ms (much faster)
    const timer1 = setTimeout(() => {
      setEnabledStages(prev => ({ ...prev, leadsData: true }));
    }, 10);

    // Enable client analytics after 50ms (faster)
    const timer2 = setTimeout(() => {
      setEnabledStages(prev => ({ ...prev, clientAnalytics: true }));
    }, 50);

    // Enable payment analytics and ops payments after 100ms (faster)
    const timer3 = setTimeout(() => {
      setEnabledStages(prev => ({ 
        ...prev, 
        paymentAnalytics: true,
        opsPayments: true 
      }));
    }, 100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const setStageLoaded = useCallback((stage: keyof typeof loadingStages) => {
    setLoadingStages(prev => ({ ...prev, [stage]: false }));
  }, []);

  return {
    loadingStages,
    enabledStages,
    setStageLoaded
  };
}; 