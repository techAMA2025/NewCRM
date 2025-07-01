'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Lazy load Chart.js and heavy components
const LazyCharts = lazy(() => import('./components/LazyCharts'));
const LazyClientAnalytics = lazy(() => import('./components/LazyClientAnalytics'));
const ErrorBoundary = lazy(() => import('./components/ErrorBoundary'));

// Import custom hooks
import {
  useLeadsData,
  useSalesAnalytics,
  useClientAnalytics,
  usePaymentAnalytics,
  useProgressiveDataLoading
} from './hooks';

// Import lightweight components only
import {
  DateRangeFilter,
  SalesMetricsCards,
  CRMLeadsTable,
  CRMLeadsPieChart,
  MetricCard,
  SalesMetricsSkeleton,
  ChartSkeleton,
  TableSkeleton
} from './components';

// Import performance utilities
import { perfMonitor, preloadCriticalResources } from './utils/performance';

// Import types
import { AnalyticsStats } from './types';

// Memoized helper function to get current month date range
const getCurrentMonthDateRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // First day of current month
  const startDate = new Date(year, month, 1);
  // Today
  const endDate = now;
  
  // Format as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};

// Loading fallback component
const LoadingFallback = React.memo(({ height = "h-48" }: { height?: string }) => (
  <div className={`${height} bg-gray-800 rounded-lg animate-pulse flex items-center justify-center`}>
    <div className="text-gray-400 text-sm">Loading...</div>
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';

// Simple Error Fallback for cases where ErrorBoundary lazy load fails
const SimpleErrorFallback = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-900 text-white">
    {children}
  </div>
);

const SuperAdminDashboard = React.memo(() => {
  // Start performance monitoring
  useEffect(() => {
    perfMonitor.start('dashboard-initial-load');
    perfMonitor.start('critical-resources-preload');
    
    // Preload critical resources
    preloadCriticalResources();
    perfMonitor.end('critical-resources-preload');

    return () => {
      perfMonitor.safeEnd('dashboard-initial-load');
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          const metrics = perfMonitor.getMetrics();
          if (metrics.length > 0) {
            console.table(metrics);
          }
        }, 1000);
      }
    };
  }, []);

  // Progressive loading state with staggered initialization
  const { loadingStages, enabledStages, setStageLoaded } = useProgressiveDataLoading();

  // Get current month date range for default (memoized)
  const currentMonthRange = useMemo(() => getCurrentMonthDateRange(), []);

  // Date filter state - Initialize empty (no default dates)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  
  // Analytics filter state
  const [selectedAnalyticsMonth, setSelectedAnalyticsMonth] = useState<number | null>(null);
  const [selectedAnalyticsYear, setSelectedAnalyticsYear] = useState<number | null>(null);
  
  // Salesperson selection state
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);
  const [selectedLeadsSalesperson, setSelectedLeadsSalesperson] = useState<string | null>(null);

  // Lazy loading state
  const [showClientAnalytics, setShowClientAnalytics] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  // Progressive component loading with intersection observer for better performance
  useEffect(() => {
    perfMonitor.start('lazy-components-load');
    
    // Use requestIdleCallback for non-critical operations
    const loadComponents = () => {
      const timer1 = setTimeout(() => {
        setShowCharts(true);
      }, 50);
      
      const timer2 = setTimeout(() => {
        setShowClientAnalytics(true);
      }, 100);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        perfMonitor.safeEnd('lazy-components-load');
      };
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadComponents);
    } else {
      loadComponents();
    }
  }, []);

  // Start sales analytics timer when component mounts
  useEffect(() => {
    perfMonitor.start('sales-analytics-load');
  }, []);

  // Only load critical data initially (sales analytics)
  const {
    salesAnalytics,
    salespeople,
    individualSalesData
  } = useSalesAnalytics({
    selectedAnalyticsMonth,
    selectedAnalyticsYear,
    selectedSalesperson,
    enabled: true, // Always enabled for critical data
    onLoadComplete: useCallback(() => {
      setStageLoaded('salesAnalytics');
      perfMonitor.safeEnd('sales-analytics-load');
    }, [setStageLoaded])
  });

  // Delayed loading for non-critical data
  const {
    leadsBySourceData,
    sourceTotals,
    isLoading: leadsLoading
  } = useLeadsData({
    startDate,
    endDate,
    isFilterApplied,
    selectedLeadsSalesperson,
    enabled: enabledStages.leadsData,
    onLoadComplete: useCallback(() => setStageLoaded('leadsData'), [setStageLoaded])
  });

  const {
    clientAnalytics,
    isLoading: clientsLoading
  } = useClientAnalytics({
    enabled: showClientAnalytics && enabledStages.clientAnalytics,
    onLoadComplete: useCallback(() => setStageLoaded('clientAnalytics'), [setStageLoaded])
  });

  const {
    paymentAnalytics,
    currentMonthPayments,
    isLoading: paymentsLoading
  } = usePaymentAnalytics({
    enabled: enabledStages.paymentAnalytics,
    onLoadComplete: useCallback(() => setStageLoaded('paymentAnalytics'), [setStageLoaded])
  });

  // Memoized date filter handlers
  const applyDateFilter = useCallback(() => {
    setIsFilterApplied(true);
  }, []);
  
  const clearDateFilter = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setIsFilterApplied(false);
  }, []);

  // Memoized salesperson selection handlers
  const handleSalespersonChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSalesperson(value !== "all" ? value : null);
  }, []);

  const handleLeadsSalespersonChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedLeadsSalesperson(value !== "all" ? value : null);
  }, []);

  // Memoized analytics stats calculation
  const analyticsStats = useMemo((): AnalyticsStats => {
    if (selectedSalesperson && individualSalesData) {
      return {
        totalCollectedAmount: individualSalesData.collectedAmount,
        totalTargetAmount: individualSalesData.targetAmount,
        conversionRate: individualSalesData.conversionRate,
        avgDealSize: individualSalesData.collectedAmount > 0 ? individualSalesData.collectedAmount : 0,
        revenueAchievementPercentage: individualSalesData.targetAmount > 0 
          ? Math.min(Math.round((individualSalesData.collectedAmount / individualSalesData.targetAmount) * 100), 100)
          : 0
      };
    } else {
      return {
        ...salesAnalytics,
        revenueAchievementPercentage: salesAnalytics.totalTargetAmount > 0 
          ? Math.min(Math.round((salesAnalytics.totalCollectedAmount / salesAnalytics.totalTargetAmount) * 100), 100)
          : 0
      };
    }
  }, [selectedSalesperson, individualSalesData, salesAnalytics]);

  return (
    <SimpleErrorFallback>
      <div className="p-2 min-h-screen bg-gray-900 text-white">
        <h1 className="text-xl font-bold mb-3">Super Admin Dashboard</h1>

        <div className="flex flex-col gap-3">
          {/* Sales Analytics Section - Priority Loading */}
          <div className="w-full">
            <Card className="bg-gray-800 border-gray-700 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-white text-base">
                  {selectedSalesperson && individualSalesData
                    ? `${individualSalesData.name}'s Sales Performance`
                    : 'Overall Sales Analytics'
                  }
                </CardTitle>
                
                {/* Analytics Filters */}
                <div className="flex items-center gap-2">
                  {/* Month-Year Filter */}
                  <div className="flex items-center gap-1">
                    <select
                      className="bg-gray-700 border border-gray-600 text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : new Date().getMonth()}
                      onChange={(e) => setSelectedAnalyticsMonth(parseInt(e.target.value))}
                    >
                      <option value="0">January</option>
                      <option value="1">February</option>
                      <option value="2">March</option>
                      <option value="3">April</option>
                      <option value="4">May</option>
                      <option value="5">June</option>
                      <option value="6">July</option>
                      <option value="7">August</option>
                      <option value="8">September</option>
                      <option value="9">October</option>
                      <option value="10">November</option>
                      <option value="11">December</option>
                    </select>
                    
                    <select
                      className="bg-gray-700 border border-gray-600 text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedAnalyticsYear !== null ? selectedAnalyticsYear : new Date().getFullYear()}
                      onChange={(e) => setSelectedAnalyticsYear(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    
                    {(selectedAnalyticsMonth !== null || selectedAnalyticsYear !== null) && (
                      <button 
                        onClick={() => {
                          setSelectedAnalyticsMonth(null);
                          setSelectedAnalyticsYear(null);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/30 px-1 py-1 rounded-md"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  
                  {/* Salesperson Dropdown */}
                  <div className="flex items-center">
                    <label htmlFor="salesperson" className="mr-1 text-gray-300 text-xs">View:</label>
                    <select
                      id="salesperson"
                      className="bg-gray-700 border border-gray-600 text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedSalesperson || "all"}
                      onChange={handleSalespersonChange}
                    >
                      <option value="all">All Salespeople</option>
                      {salespeople.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Sales Metrics Cards - Always visible */}
                <SalesMetricsCards
                  analyticsStats={analyticsStats}
                  selectedSalesperson={selectedSalesperson}
                  individualSalesData={individualSalesData}
                />

                {/* CRM Leads Analytics Section - Deferred loading */}
                <div className="mt-4 flex flex-col lg:flex-row gap-3">
                  {/* Left side: Table with filters */}
                  <div className="lg:w-2/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-blue-100">CRM Leads Analytics</h3>
                      
                      {/* Salesperson filter dropdown */}
                      <div className="flex items-center">
                        <label htmlFor="lead-salesperson" className="mr-1 text-gray-300 text-xs">Salesperson:</label>
                        <select
                          id="lead-salesperson"
                          className="bg-gray-700 border border-gray-600 text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={selectedLeadsSalesperson || "all"}
                          onChange={handleLeadsSalespersonChange}
                        >
                          <option value="all">All Salespeople</option>
                          {salespeople.map((person) => (
                            <option key={person.id} value={person.name}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Date Range Filter */}
                    {enabledStages.leadsData && (
                      <DateRangeFilter
                        startDate={startDate}
                        endDate={endDate}
                        isFilterApplied={isFilterApplied}
                        isLoading={leadsLoading}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        onApplyFilter={applyDateFilter}
                        onClearFilter={clearDateFilter}
                      />
                    )}
                    
                    {/* CRM Leads Table */}
                    {!enabledStages.leadsData || leadsLoading ? (
                      <TableSkeleton />
                    ) : (
                      <CRMLeadsTable
                        leadsBySourceData={leadsBySourceData}
                        sourceTotals={sourceTotals}
                        isLoading={leadsLoading}
                      />
                    )}
                  </div>
                  
                  {/* Right side: Pie chart */}
                  <div className="lg:w-1/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-xl flex flex-col">
                    {showCharts ? (
                      <Suspense fallback={<LoadingFallback height="h-64" />}>
                        {!enabledStages.leadsData || leadsLoading ? (
                          <ChartSkeleton height="h-64" />
                        ) : (
                          <CRMLeadsPieChart
                            sourceTotals={sourceTotals}
                            isLoading={leadsLoading}
                          />
                        )}
                      </Suspense>
                    ) : (
                      <LoadingFallback height="h-64" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Analytics Section - Lazy loaded */}
          {showClientAnalytics && (
            <div className="w-full">
              <Card className="bg-gray-800 border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white text-base">Client & Advocate Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary>
                      <LazyClientAnalytics
                        clientAnalytics={clientAnalytics}
                        clientsLoading={clientsLoading}
                        enabledStages={enabledStages}
                      />
                    </ErrorBoundary>
                  </Suspense>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </SimpleErrorFallback>
  );
});

SuperAdminDashboard.displayName = 'SuperAdminDashboard';

export default SuperAdminDashboard; 