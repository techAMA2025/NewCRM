'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Import custom hooks
import {
  useLeadsData,
  useSalesAnalytics,
  useClientAnalytics,
  usePaymentAnalytics,
  useProgressiveDataLoading
} from './hooks';

// Import components
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

// Import chart configurations
import { chartOptions, pieOptions } from './utils/chartConfigs';

// Import types
import { AnalyticsStats } from './types';

// Helper function to get current month date range
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

export default function SuperAdminDashboard() {
  // Progressive loading state
  const { loadingStages, enabledStages, setStageLoaded } = useProgressiveDataLoading();

  // Get current month date range for default
  const currentMonthRange = getCurrentMonthDateRange();

  // Date filter state - Initialize with current month
  const [startDate, setStartDate] = useState<string>(currentMonthRange.startDate);
  const [endDate, setEndDate] = useState<string>(currentMonthRange.endDate);
  const [isFilterApplied, setIsFilterApplied] = useState(true); // Set to true by default since we have default dates
  
  // Analytics filter state
  const [selectedAnalyticsMonth, setSelectedAnalyticsMonth] = useState<number | null>(null);
  const [selectedAnalyticsYear, setSelectedAnalyticsYear] = useState<number | null>(null);
  
  // Salesperson selection state
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);
  const [selectedLeadsSalesperson, setSelectedLeadsSalesperson] = useState<string | null>(null);

  // Custom hooks for data fetching with progressive loading
  const {
    salesAnalytics,
    salespeople,
    individualSalesData
  } = useSalesAnalytics({
    selectedAnalyticsMonth,
    selectedAnalyticsYear,
    selectedSalesperson,
    enabled: enabledStages.salesAnalytics,
    onLoadComplete: () => setStageLoaded('salesAnalytics')
  });

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
    onLoadComplete: () => setStageLoaded('leadsData')
  });

  const {
    clientAnalytics,
    isLoading: clientsLoading
  } = useClientAnalytics({
    enabled: enabledStages.clientAnalytics,
    onLoadComplete: () => setStageLoaded('clientAnalytics')
  });

  const {
    paymentAnalytics,
    currentMonthPayments,
    isLoading: paymentsLoading
  } = usePaymentAnalytics({
    enabled: enabledStages.paymentAnalytics,
    onLoadComplete: () => setStageLoaded('paymentAnalytics')
  });

  // Memoize chart data to prevent unnecessary re-renders and glitching
  const clientStatusChartData = useMemo(() => ({
    labels: Object.keys(clientAnalytics.statusDistribution),
    datasets: [
      {
        label: 'Clients by Status',
        data: Object.values(clientAnalytics.statusDistribution),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(54, 162, 235, 0.6)',
        ],
      }
    ],
  }), [clientAnalytics.statusDistribution]);

  const loanTypeChartData = useMemo(() => ({
    labels: Object.keys(clientAnalytics.loanTypeDistribution),
    datasets: [
      {
        data: Object.values(clientAnalytics.loanTypeDistribution),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  }), [clientAnalytics.loanTypeDistribution]);

  // Date filter handlers
  const applyDateFilter = () => {
    setIsFilterApplied(true);
  };
  
  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsFilterApplied(false);
  };

  // Salesperson selection handlers
  const handleSalespersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSalesperson(value !== "all" ? value : null);
  };

  const handleLeadsSalespersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedLeadsSalesperson(value !== "all" ? value : null);
  };

  // Get analytics stats based on selection
  const getAnalyticsStats = (): AnalyticsStats => {
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
  };

  const analyticsStats = getAnalyticsStats();

  // Get chart data for sales analytics
  const getChartData = () => {
    const currentMonth = new Date().getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6MonthsLabels = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6MonthsLabels.unshift(monthNames[monthIndex]);
    }

    if (selectedSalesperson && individualSalesData) {
      return {
        labels: last6MonthsLabels,
        datasets: [
          {
            label: `${individualSalesData.name}'s Conversions`,
            data: individualSalesData.monthlyData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4,
            fill: true,
          },
        ],
      };
    } else {
      return {
        labels: last6MonthsLabels,
        datasets: [
          {
            label: 'Monthly Revenue',
            data: salesAnalytics.monthlyRevenue,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4,
            fill: true,
          },
        ],
      };
    }
  };

  return (
    <div className="p-2 min-h-screen bg-gray-900 text-white w-full max-w-full">
      <h1 className="text-xl font-bold mb-3">Super Admin Dashboard</h1>

      <div className="flex flex-col gap-3 w-full">
        {/* Sales Analytics Section */}
        <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg w-full">
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
            <CardContent className="w-full">
              {/* Sales Metrics Cards - Show skeleton while loading */}
              {loadingStages.salesAnalytics ? (
                <SalesMetricsSkeleton />
              ) : (
                <SalesMetricsCards
                  analyticsStats={analyticsStats}
                  selectedSalesperson={selectedSalesperson}
                  individualSalesData={individualSalesData}
                />
              )}

              {/* CRM Leads Analytics Section */}
              <div className="mt-4 flex flex-col lg:flex-row gap-3 w-full">
                {/* Left side: Table with filters */}
                <div className="lg:w-2/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 shadow-xl w-full">
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
                  
                  {/* CRM Leads Table - Show skeleton while loading */}
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
                <div className="lg:w-1/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-xl flex flex-col w-full">
                  {!enabledStages.leadsData || leadsLoading ? (
                    <ChartSkeleton height="h-64" />
                  ) : (
                    <CRMLeadsPieChart
                      sourceTotals={sourceTotals}
                      isLoading={leadsLoading}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Analytics Section */}
        <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg w-full">
            <CardHeader>
              <CardTitle className="text-white text-base">Client & Advocate Analytics</CardTitle>
            </CardHeader>
            <CardContent className="w-full">
              {!enabledStages.clientAnalytics || clientsLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                  <ChartSkeleton />
                  <ChartSkeleton />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                  {/* Left column: Client status distribution */}
                  <div className="w-full">
                    <h3 className="text-base font-semibold text-blue-200 mb-3">Client Status Distribution</h3>
                    <div className="h-48 w-full">
                      <Bar 
                        data={clientStatusChartData} 
                        options={{
                          ...chartOptions,
                          indexAxis: 'y' as const,
                          plugins: {
                            ...chartOptions.plugins,
                            title: {
                              display: true,
                              text: 'Clients by Status',
                              color: 'rgba(255, 255, 255, 0.8)',
                            },
                          },
                        }} 
                      />
                    </div>
                    
                    {/* Client stats cards */}
                    <div className="grid grid-cols-2 gap-2 mt-3 w-full">
                      <MetricCard
                        title="Total Clients"
                        value={clientAnalytics.totalClients}
                        gradient="bg-gradient-to-r from-blue-400 to-blue-600"
                        textColor="text-blue-300"
                      />
                      <MetricCard
                        title="Active Clients"
                        value={clientAnalytics.statusDistribution.Active || 0}
                        gradient="bg-gradient-to-r from-green-400 to-green-600"
                        textColor="text-green-300"
                      />
                      <MetricCard
                        title="Avg. Loan Amount"
                        value={`₹${clientAnalytics.avgLoanAmount.toLocaleString('en-IN')}`}
                        gradient="bg-gradient-to-r from-purple-400 to-purple-600"
                        textColor="text-purple-300"
                      />
                      <MetricCard
                        title="Total Loan Amount"
                        value={`₹${clientAnalytics.totalLoanAmount.toLocaleString('en-IN')}`}
                        gradient="bg-gradient-to-r from-amber-400 to-amber-600"
                        textColor="text-amber-300"
                      />
                    </div>
                  </div>
                  
                  {/* Right column: Loan type distribution and top advocates */}
                  <div className="w-full">
                    <h3 className="text-base font-semibold text-blue-200 mb-3">Loan Type Distribution</h3>
                    <div className="h-48 w-full">
                      <Pie 
                        data={loanTypeChartData} 
                        options={{
                          ...pieOptions,
                          plugins: {
                            ...pieOptions.plugins,
                            title: {
                              display: true,
                              text: 'Loans by Type',
                              color: 'rgba(255, 255, 255, 0.8)',
                            },
                          },
                        }} 
                      />
                    </div>
                    
                    {/* Top advocates section */}
                    <div className="mt-4 w-full">
                      <h3 className="text-base font-semibold text-blue-200 mb-2">Top Advocates</h3>
                      <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden w-full">
                        <table className="min-w-full">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-900/80 to-purple-900/80">
                              <th className="py-2 px-3 text-left text-xs font-semibold text-blue-100">Advocate Name</th>
                              <th className="py-2 px-3 text-right text-xs font-semibold text-blue-100">Clients</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientAnalytics.topAdvocates.map((advocate, index) => (
                              <tr key={`${advocate.name}-${index}`} className={index % 2 === 0 ? "bg-gray-800/40" : "bg-gray-800/60"}>
                                <td className="py-2 px-3 text-xs text-gray-200">{advocate.name}</td>
                                <td className="py-2 px-3 text-xs text-right text-gray-200">
                                  <span className="px-2 py-1 bg-blue-900/40 rounded-md text-blue-200">
                                    {advocate.clientCount}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Analytics Section */}
        {/* <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg w-full">
            <CardHeader>
              <CardTitle className="text-white text-base">Payment Analytics</CardTitle>
            </CardHeader>
            <CardContent className="w-full">
              {!enabledStages.paymentAnalytics || paymentsLoading ? (
                <>
                  <SalesMetricsSkeleton />
                  <div className="flex flex-col lg:flex-row gap-3 w-full">
                    <ChartSkeleton />
                    <ChartSkeleton />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 w-full">
                    <MetricCard
                      title="Total Clients"
                      value={paymentAnalytics.clientCount}
                      gradient="bg-gradient-to-r from-blue-400 to-blue-600"
                      textColor="text-blue-300"
                    />
                    <MetricCard
                      title="This Month's Collection"
                      value={`₹${currentMonthPayments.collected.toLocaleString('en-IN')}`}
                      subtitle={`Total: ₹${paymentAnalytics.totalPaidAmount.toLocaleString('en-IN')}`}
                      gradient="bg-gradient-to-r from-green-400 to-green-600"
                      textColor="text-green-300"
                    />
                    <MetricCard
                      title="This Month's Pending"
                      value={`₹${currentMonthPayments.pending.toLocaleString('en-IN')}`}
                      subtitle={`Total: ₹${paymentAnalytics.totalPendingAmount.toLocaleString('en-IN')}`}
                      gradient="bg-gradient-to-r from-amber-400 to-amber-600"
                      textColor="text-amber-300"
                    />
                    <MetricCard
                      title="Collection Rate"
                      value={`${paymentAnalytics.completionRate}%`}
                      gradient="bg-gradient-to-r from-purple-400 to-pink-400"
                      textColor="text-purple-300"
                      progress={paymentAnalytics.completionRate}
                      showProgress={true}
                    />
                  </div>

                  <div className="flex flex-col lg:flex-row gap-3 w-full">
                    <div className="lg:w-1/2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 shadow-xl w-full">
                      <h3 className="text-base font-semibold text-blue-200 mb-2">Monthly Collection Trends</h3>
                      <div className="h-44 w-full">
                        <Line 
                          data={{
                            labels: (() => {
                              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const currentMonth = new Date().getMonth();
                              const last6MonthsLabels = [];
                              for (let i = 5; i >= 0; i--) {
                                const monthIndex = (currentMonth - i + 12) % 12;
                                last6MonthsLabels.unshift(monthNames[monthIndex]);
                              }
                              return last6MonthsLabels;
                            })(),
                            datasets: [
                              {
                                label: 'Monthly Payment Collection',
                                data: paymentAnalytics.monthlyPaymentsData,
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                tension: 0.4,
                                fill: true,
                              },
                            ],
                          }} 
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              title: {
                                display: true,
                                text: 'Payment Collections (Last 6 Months)',
                                color: 'rgba(255, 255, 255, 0.8)',
                                font: {
                                  size: 12
                                }
                              },
                            },
                          }} 
                        />
                      </div>
                    </div>

                    <div className="lg:w-1/2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 shadow-xl w-full">
                      <h3 className="text-base font-semibold text-blue-200 mb-2">Payment Types</h3>
                      <div className="flex w-full">
                        <div className="h-24 w-24">
                          <Pie 
                            data={{
                              labels: ['Full Payments', 'Partial Payments'],
                              datasets: [
                                {
                                  data: [
                                    paymentAnalytics.paymentTypeDistribution.full,
                                    paymentAnalytics.paymentTypeDistribution.partial
                                  ],
                                  backgroundColor: [
                                    'rgba(54, 162, 235, 0.8)',
                                    'rgba(255, 206, 86, 0.8)',
                                  ],
                                  borderWidth: 1,
                                },
                              ],
                            }} 
                            options={{
                              ...pieOptions,
                              cutout: '50%',
                              plugins: {
                                ...pieOptions.plugins,
                                title: {
                                  display: false,
                                },
                              },
                            }} 
                          />
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="grid grid-cols-1 gap-1 w-full">
                            <div className="flex items-center justify-between bg-blue-900/30 p-1.5 rounded-lg">
                              <span className="text-blue-300 text-xs">Full Payments:</span>
                              <span className="font-semibold text-white text-xs">{paymentAnalytics.paymentTypeDistribution.full}</span>
                            </div>
                            <div className="flex items-center justify-between bg-yellow-900/30 p-1.5 rounded-lg">
                              <span className="text-yellow-300 text-xs">Partial Payments:</span>
                              <span className="font-semibold text-white text-xs">{paymentAnalytics.paymentTypeDistribution.partial}</span>
                            </div>
                            <div className="flex items-center justify-between bg-gray-700/50 p-1.5 rounded-lg">
                              <span className="text-gray-300 text-xs">Total Transactions:</span>
                              <span className="font-semibold text-white text-xs">
                                {paymentAnalytics.paymentTypeDistribution.full + paymentAnalytics.paymentTypeDistribution.partial}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div> */}
      </div>
    </div>
  );
} 