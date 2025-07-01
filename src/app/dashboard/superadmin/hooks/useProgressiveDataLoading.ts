import { useState, useEffect } from 'react';

export const useProgressiveDataLoading = () => {
  const [loadingStages, setLoadingStages] = useState({
    salesAnalytics: true,    // Load immediately
    leadsData: true,         // Load after 100ms
    clientAnalytics: true,   // Load after 500ms
    paymentAnalytics: true,  // Load after 1000ms
  });

  const [enabledStages, setEnabledStages] = useState({
    salesAnalytics: true,    // Enable immediately
    leadsData: false,        // Enable after delay
    clientAnalytics: false,  // Enable after delay
    paymentAnalytics: false, // Enable after delay
  });

  useEffect(() => {
    // Enable leads data loading after 100ms
    const timer1 = setTimeout(() => {
      setEnabledStages(prev => ({ ...prev, leadsData: true }));
    }, 100);

    // Enable client analytics after 500ms
    const timer2 = setTimeout(() => {
      setEnabledStages(prev => ({ ...prev, clientAnalytics: true }));
    }, 500);

    // Enable payment analytics after 1000ms
    const timer3 = setTimeout(() => {
      setEnabledStages(prev => ({ ...prev, paymentAnalytics: true }));
    }, 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const setStageLoaded = (stage: keyof typeof loadingStages) => {
    setLoadingStages(prev => ({ ...prev, [stage]: false }));
  };

  return {
    loadingStages,
    enabledStages,
    setStageLoaded
  };
}; 