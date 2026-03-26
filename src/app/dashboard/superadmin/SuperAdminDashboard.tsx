'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  getDashboardHistory,
  getOpsRevenueHistory,
  HistoryData,
  WeeklyHistoryData,
  getSourceAnalyticsData, // [NEW]
  SourceAnalyticsData,     // [NEW]
  getBillcutPayoutAnalytics,
  getBillcutHistoryData,
  BillcutHistoryData
} from '../actions';

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
  useOpsPaymentsAnalytics,
  useProgressiveDataLoading
} from './hooks';

// Import lightweight components only
import {
  DateRangeFilter,
  SalesMetricsCards,
  CRMLeadsTable,
  MetricCard,
  SalesMetricsSkeleton,
  ChartSkeleton,
  TableSkeleton,
  SalespersonWeeklyAnalyticsComponent,
  ClientSourceWeeklyAnalyticsComponent
} from './components';

import { ThemeToggle } from './components/ThemeToggle';

import { ThemeProvider } from './context/ThemeContext';

// Import performance utilities
import { perfMonitor, preloadCriticalResources } from './utils/performance';
import { dashboardCache, analyticsCache, generateCacheKey } from './utils/cache';

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

  // History Data State
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [opsHistoryData, setOpsHistoryData] = useState<HistoryData[]>([]);

  // Fetch history data on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [history, opsHistory] = await Promise.all([
          getDashboardHistory('Dec', new Date().getFullYear()), // Month/Year params are ignored for all-time now
          getOpsRevenueHistory()
        ]);
        setHistoryData(history);
        setOpsHistoryData(opsHistory);
      } catch (error) {
        console.error("Error fetching history data:", error);
      }
    };
    fetchHistory();
  }, []);

  // --- Weekly Revenue Comparison State & Logic ---
  const [showWeeklyComparison, setShowWeeklyComparison] = useState(false);
  const [weeklyData, setWeeklyData] = useState<{ sales: WeeklyHistoryData[], ops: WeeklyHistoryData[] } | null>(null);
  const [weeklyDataLoading, setWeeklyDataLoading] = useState(false);

  // --- Source Analytics State ---
  const [sourceData, setSourceData] = useState<SourceAnalyticsData[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceMonth, setSourceMonth] = useState<number>(new Date().getMonth());
  const [sourceYear, setSourceYear] = useState<number>(new Date().getFullYear());
  const [billcutPayoutAmount, setBillcutPayoutAmount] = useState<number>(0);
  const [billcutHistory, setBillcutHistory] = useState<BillcutHistoryData[]>([]);
  const [billcutHistoryLoading, setBillcutHistoryLoading] = useState(false);

  // Fetch weekly data when toggle is enabled
  useEffect(() => {
    if (showWeeklyComparison && !weeklyData) {
      const fetchWeekly = async () => {
        setWeeklyDataLoading(true);
        try {
          // Dynamic import to avoid circular dependency issues if any, or just call action
          // Note context: getWeeklyRevenueHistory is imported at top level now
          const data = await import('../actions').then(mod => mod.getWeeklyRevenueHistory());
          setWeeklyData(data);
        } catch (error) {
          console.error("Error fetching weekly revenue data:", error);
        } finally {
          setWeeklyDataLoading(false);
        }
      };
      fetchWeekly();
    }
  }, [showWeeklyComparison, weeklyData]);

  // Fetch Source Analytics
  useEffect(() => {
    async function fetchSourceData() {
      setSourceLoading(true);
      try {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const data = await getSourceAnalyticsData(monthNames[sourceMonth], sourceYear);
        setSourceData(data);
      } catch (error) {
        console.error("Error fetching source analytics:", error);
      } finally {
        setSourceLoading(false);
      }
    }
    async function fetchBillcutPayout() {
      try {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const amount = await getBillcutPayoutAnalytics(monthNames[sourceMonth], sourceYear);
        setBillcutPayoutAmount(amount);
      } catch (error) {
        console.error("Error fetching billcut payout:", error);
      }
    }
    async function fetchBillcutHistory() {
      setBillcutHistoryLoading(true);
      try {
        const history = await getBillcutHistoryData();
        setBillcutHistory(history);
      } catch (error) {
        console.error("Error fetching billcut history:", error);
      } finally {
        setBillcutHistoryLoading(false);
      }
    }
    fetchSourceData();
    fetchBillcutPayout();
    fetchBillcutHistory();
  }, [sourceMonth, sourceYear]);

  // Helper function for Indian number formatting
  const formatIndianCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(2)} K`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Helper for full amount display in tables
  const formatFullCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  };

  // Cache keys for different data types
  const salesAnalyticsCacheKey = useMemo(() => 
    generateCacheKey.salesAnalytics(selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson),
    [selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson]
  );

  const leadsDataCacheKey = useMemo(() => 
    generateCacheKey.leadsData(startDate, endDate, selectedLeadsSalesperson, isFilterApplied),
    [startDate, endDate, selectedLeadsSalesperson, isFilterApplied]
  );

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
    individualSalesData,
    allSalesTargets,
    isLoading: salesLoading
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
    leadsBySalesperson,
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

  const {
    opsPaymentsAnalytics,
    isLoading: opsPaymentsLoading
  } = useOpsPaymentsAnalytics({
    selectedAnalyticsMonth,
    selectedAnalyticsYear,
    selectedSalesperson,
    enabled: enabledStages.opsPayments, // Use the opsPayments stage
    onLoadComplete: useCallback(() => setStageLoaded('opsPayments'), [setStageLoaded])
  });

  // Memoized date filter handlers with cache invalidation
  const applyDateFilter = useCallback(() => {
    setIsFilterApplied(true);
    // Clear cache for leads data when filter changes
    analyticsCache.delete(leadsDataCacheKey);
  }, [leadsDataCacheKey]);
  
  const clearDateFilter = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setIsFilterApplied(false);
    // Clear cache for leads data when filter changes
    analyticsCache.delete(leadsDataCacheKey);
  }, [leadsDataCacheKey]);

  // Memoized salesperson selection handlers with cache invalidation
  const handleSalespersonChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSalesperson(value !== "all" ? value : null);
    // Clear cache for sales analytics when salesperson changes
    analyticsCache.delete(salesAnalyticsCacheKey);
  }, [salesAnalyticsCacheKey]);

  const handleLeadsSalespersonChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('🔍 AMA Leads filter changed:', { value, selectedLeadsSalesperson: value !== "all" ? value : null });
    setSelectedLeadsSalesperson(value !== "all" ? value : null);
    // Clear cache for leads data when salesperson changes - use a more specific key
    const currentLeadsCacheKey = generateCacheKey.leadsData(startDate, endDate, value !== "all" ? value : null, isFilterApplied);
    analyticsCache.delete(currentLeadsCacheKey);
  }, [startDate, endDate, isFilterApplied]);

  // Cache management functions
  const clearAllCache = useCallback(() => {
    dashboardCache.clear();
    analyticsCache.clear();
    console.log('🗑️ All dashboard cache cleared');
  }, []);

  const refreshAllData = useCallback(() => {
    clearAllCache();
    // Force refresh by triggering re-renders
    window.location.reload();
  }, [clearAllCache]);

  // Combined Revenue History calculation
  const combinedHistoryData = useMemo(() => {
    const combinedMap = new Map();

    // CRM History
    historyData.forEach(item => {
      combinedMap.set(item.fullLabel, {
        fullLabel: item.fullLabel,
        crmCollected: item.collected,
        opsRevenue: 0,
        totalRevenue: item.collected,
        month: item.month,
        year: item.year
      });
    });

    // Ops History
    opsHistoryData.forEach(item => {
      if (combinedMap.has(item.fullLabel)) {
        const existing = combinedMap.get(item.fullLabel);
        existing.opsRevenue = item.collected;
        existing.totalRevenue = existing.crmCollected + item.collected;
      } else {
        combinedMap.set(item.fullLabel, {
          fullLabel: item.fullLabel,
          crmCollected: 0,
          opsRevenue: item.collected,
          totalRevenue: item.collected,
          month: item.month,
          year: item.year
        });
      }
    });

    return Array.from(combinedMap.values()).sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
  }, [historyData, opsHistoryData]);

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
      <ThemeProvider>
        <div className="p-2 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold">Super Admin Dashboard</h1>
          
          {/* Cache management controls */}
            <div className="flex items-center gap-2 mr-10">
              <ThemeToggle />
             
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Sales Analytics Section - Priority Loading */}
          <div className="w-full">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg transition-colors duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-gray-900 dark:text-white text-base">
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
                  
                 
                </div>
              </CardHeader>
              <CardContent>
                {/* Sales Metrics Cards - Always visible */}
                <SalesMetricsCards
                  analyticsStats={analyticsStats}
                  selectedSalesperson={selectedSalesperson}
                  individualSalesData={individualSalesData}
                  selectedAnalyticsMonth={selectedAnalyticsMonth}
                  selectedAnalyticsYear={selectedAnalyticsYear}
                  opsPaymentsAnalytics={opsPaymentsAnalytics}
                  opsPaymentsLoading={opsPaymentsLoading}
                  salesLoading={salesLoading}
                />

                {/* History Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  {/* Collection Trends Chart */}
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-gray-900 dark:text-white text-base">Sales Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={historyData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="fullLabel" 
                              stroke="#9CA3AF" 
                              tick={{ fill: '#9CA3AF' }} 
                            />
                            <YAxis 
                              stroke="#9CA3AF" 
                              tick={{ fill: '#9CA3AF' }}
                              tickFormatter={formatIndianCurrency}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                              itemStyle={{ color: '#F3F4F6' }}
                              formatter={(value: number) => [value.toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' }), '']}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="target" 
                              name="Collection Target" 
                              stroke="#818cf8" 
                              activeDot={{ r: 8 }} 
                              strokeWidth={2} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="collected" 
                              name="Collected Amount" 
                              stroke="#34d399" 
                              strokeWidth={2} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ops Revenue Trends Chart */}
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-gray-900 dark:text-white text-base">Ops Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={opsHistoryData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="fullLabel" 
                              stroke="#9CA3AF" 
                              tick={{ fill: '#9CA3AF' }} 
                            />
                            <YAxis 
                              stroke="#9CA3AF" 
                              tick={{ fill: '#9CA3AF' }}
                              tickFormatter={formatIndianCurrency}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                              itemStyle={{ color: '#F3F4F6' }}
                              formatter={(value: number) => [value.toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' }), '']}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="collected" 
                              name="Ops Revenue" 
                              stroke="#f59e0b" 
                              strokeWidth={2} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Revenue Trends Chart */}
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-gray-900 dark:text-white text-base">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={combinedHistoryData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="fullLabel" 
                              stroke="#9CA3AF" 
                              tick={{ fill: '#9CA3AF' }} 
                            />
                            <YAxis 
                              stroke="#9CA3AF" 
                              tick={{ fill: '#9CA3AF' }}
                              tickFormatter={formatIndianCurrency}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                              itemStyle={{ color: '#F3F4F6' }}
                              formatter={(value: number) => [value.toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' }), '']}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="totalRevenue" 
                              name="Total Revenue" 
                              stroke="#ec4899" 
                              strokeWidth={3} 
                              activeDot={{ r: 8 }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Weekly Revenue Comparison Section (Toggleable) */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowWeeklyComparison(!showWeeklyComparison)}
                    className="mb-4 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                  >
                    {showWeeklyComparison ? 'Hide' : 'Show'} Weekly Revenue Comparison
                    {!showWeeklyComparison && <span className="text-xs opacity-70">(Click to compare weeks across months)</span>}
                  </button>

                  {showWeeklyComparison && weeklyData && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300">
                      {/* Sales Revenue Weekly Comparison Table */}
                      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-gray-900 dark:text-white text-base">Sales Revenue - Weekly Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {weeklyDataLoading ? (
                            <LoadingFallback height="h-[300px]" />
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                  <tr>
                                    <th scope="col" className="px-2 py-2">Month</th>
                                    <th scope="col" className="px-2 py-2">Week 1</th>
                                    <th scope="col" className="px-2 py-2">Week 2</th>
                                    <th scope="col" className="px-2 py-2">Week 3</th>
                                    <th scope="col" className="px-2 py-2">Week 4+</th>
                                    <th scope="col" className="px-2 py-2 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {weeklyData.sales.slice().reverse().map((item, index) => (
                                    <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                        {item.fullLabel}
                                      </td>
                                      <td className="px-2 py-2">{formatFullCurrency(item.weeks.week1)}</td>
                                      <td className="px-2 py-2">{formatFullCurrency(item.weeks.week2)}</td>
                                      <td className="px-2 py-2">{formatFullCurrency(item.weeks.week3)}</td>
                                      <td className="px-2 py-2">{formatFullCurrency(item.weeks.week4)}</td>
                                      <td className="px-2 py-2 text-right font-bold text-emerald-500">{formatFullCurrency(item.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Ops Revenue Weekly Comparison Table */}
                      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-gray-900 dark:text-white text-base">Ops Revenue - Weekly Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {weeklyDataLoading ? (
                            <LoadingFallback height="h-[300px]" />
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                  <tr>
                                    <th scope="col" className="px-2 py-2">Month</th>
                                    <th scope="col" className="px-2 py-2">Week 1</th>
                                    <th scope="col" className="px-2 py-2">Week 2</th>
                                    <th scope="col" className="px-2 py-2">Week 3</th>
                                    <th scope="col" className="px-2 py-2">Week 4+</th>
                                    <th scope="col" className="px-2 py-2 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {weeklyData.ops.slice().reverse().map((item, index) => (
                                    <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                        {item.fullLabel}
                                      </td>
                                      <td className="px-2 py-2">{formatFullCurrency(item.weeks.week1)}</td>
                                      <td className="px-2 py-2">{formatFullCurrency(item.weeks.week2)}</td>
                                      <td className="px-2 py-2">{formatFullCurrency(item.weeks.week3)}</td>
                                      <td className="px-2 py-2">{formatFullCurrency(item.weeks.week4)}</td>
                                      <td className="px-2 py-2 text-right font-bold text-amber-500">{formatFullCurrency(item.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                {/* Salesperson Weekly & Historical Analytics */}
                <SalespersonWeeklyAnalyticsComponent />

                {/* Source Analytics Section */}
                <div className="mt-4">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-gray-900 dark:text-white text-base">Source Performance Analytics</CardTitle>
                      
                      {/* Source Analytics Filters */}
                      <div className="flex items-center gap-2">
                        <select
                          className="bg-gray-700 border border-gray-600 text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={sourceMonth}
                          onChange={(e) => setSourceMonth(parseInt(e.target.value))}
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
                          value={sourceYear}
                          onChange={(e) => setSourceYear(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sourceLoading ? (
                        <LoadingFallback height="h-[200px]" />
                      ) : (
                        <>
                        {/* Billcut History Graph [NEW] */}
                        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md mb-4 overflow-hidden">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Billcut Performance History (Monthly Trend)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[250px] w-full">
                              {billcutHistoryLoading ? (
                                <div className="h-full w-full flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={billcutHistory}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis 
                                      dataKey="fullLabel" 
                                      stroke="#9CA3AF" 
                                      tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                                    />
                                    <YAxis 
                                      stroke="#9CA3AF" 
                                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                      tickFormatter={formatIndianCurrency}
                                    />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                      itemStyle={{ fontSize: '12px' }}
                                      formatter={(value: number) => [formatFullCurrency(value), '']}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Line 
                                      type="monotone" 
                                      dataKey="earned" 
                                      name="Amount Got (Revenue)" 
                                      stroke="#818cf8" 
                                      strokeWidth={2}
                                      activeDot={{ r: 6 }} 
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="paid" 
                                      name="Amount Paid (Payout)" 
                                      stroke="#10b981" 
                                      strokeWidth={2}
                                      activeDot={{ r: 6 }} 
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                              <tr>
                                <th scope="col" className="px-3 py-3">Source</th>
                                <th scope="col" className="px-3 py-3 text-center">Leads Created</th>
                                <th scope="col" className="px-3 py-3 text-right">Total Revenue</th>
                                <th scope="col" className="px-3 py-3 text-right">Valuation (Rev/Lead)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sourceData.length > 0 ? (
                                sourceData.map((item, index) => (
                                  <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                      {item.source}
                                    </td>
                                    <td className="px-3 py-3 text-center">{item.leadsCount}</td>
                                    <td className="px-3 py-3 text-right font-semibold text-emerald-500">
                                      {formatFullCurrency(item.revenue)}
                                    </td>
                                    <td className="px-3 py-3 text-right font-medium text-blue-500">
                                      {formatFullCurrency(item.valuation)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                                    No data available for this month
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* CRM Leads Analytics Section - Deferred loading */}
                <div className="mt-4 flex flex-col lg:flex-row gap-3">
                  {/* Left side: Table with filters - Now full width */}
                  <div className="w-full bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-xl transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-blue-100">AMA Leads Analytics</h3>
                      
                      {/* Salesperson filter dropdown */}
                      <div className="flex items-center">
                        <label htmlFor="lead-salesperson" className="mr-1 text-gray-600 dark:text-gray-300 text-xs">Salesperson:</label>
                        <select
                          id="lead-salesperson"
                          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                        salespeople={salespeople}
                        allSalesTargets={allSalesTargets}
                        leadsBySalesperson={leadsBySalesperson}
                        isLoading={leadsLoading}
                        selectedAnalyticsMonth={selectedAnalyticsMonth}
                        selectedAnalyticsYear={selectedAnalyticsYear}
                      />
                    )}
                  </div>
                  
                  {/* Right side: Pie chart - COMMENTED OUT */}
                  {/* <div className="lg:w-1/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-xl flex flex-col">
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
                  </div> */}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Analytics Section - Lazy loaded */}
          {showClientAnalytics && (
            <div className="w-full">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg transition-colors">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white text-base">Client & Advocate Analytics</CardTitle>
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

          {/* Client Source Weekly & Historical Analytics */}
          <ClientSourceWeeklyAnalyticsComponent />
        </div>
      </div>
      </ThemeProvider>
    </SimpleErrorFallback>
  );
});

SuperAdminDashboard.displayName = 'SuperAdminDashboard';

export default SuperAdminDashboard; 