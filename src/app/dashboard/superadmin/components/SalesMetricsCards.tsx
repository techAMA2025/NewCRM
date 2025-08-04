import React from 'react';
import { MetricCard } from './MetricCard';
import { AnalyticsStats } from '../types';

interface SalesMetricsCardsProps {
  analyticsStats: AnalyticsStats;
  selectedSalesperson: string | null;
  individualSalesData: any;
  opsPaymentsAnalytics?: {
    totalApprovedAmount: number;
    totalPendingAmount: number;
    totalRejectedAmount: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    totalCount: number;
  };
  opsPaymentsLoading?: boolean;
}

export const SalesMetricsCards: React.FC<SalesMetricsCardsProps> = ({
  analyticsStats,
  selectedSalesperson,
  individualSalesData,
  opsPaymentsAnalytics,
  opsPaymentsLoading = false
}) => {
  const opsPaymentsIcon = (
    <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
      {/* Combined Revenue Card */}
      <MetricCard
        title={selectedSalesperson ? 'Revenue Collected' : 'Sales Revenue'}
        value="" // Not used when using dual values
        subtitle="target"
        gradient="bg-gradient-to-r from-blue-400 to-teal-400"
        textColor="text-blue-300"
        progress={analyticsStats.revenueAchievementPercentage}
        showProgress={true}
        collectedValue={`₹${analyticsStats.totalCollectedAmount.toLocaleString('en-IN')}`}
        targetValue={`₹${analyticsStats.totalTargetAmount.toLocaleString('en-IN')}`}
        collectedColor="text-green-400"
        targetColor="text-gray-300"
      />

      {/* Ops Payments Card */}
      <MetricCard
        title="Ops Revenue"
        value={opsPaymentsLoading ? "Loading..." : `₹${opsPaymentsAnalytics?.totalApprovedAmount.toLocaleString('en-IN') || '0'}`}
        subtitle={`${opsPaymentsAnalytics?.approvedCount || 0} payments`}
        gradient="bg-gradient-to-r from-green-400 to-emerald-400"
        textColor="text-green-300"
        icon={opsPaymentsIcon}
      />
    </div>
  );
}; 