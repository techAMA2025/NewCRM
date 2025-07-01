import React from 'react';
import { MetricCard } from './MetricCard';
import { AnalyticsStats } from '../types';

interface SalesMetricsCardsProps {
  analyticsStats: AnalyticsStats;
  selectedSalesperson: string | null;
  individualSalesData: any;
}

export const SalesMetricsCards: React.FC<SalesMetricsCardsProps> = ({
  analyticsStats,
  selectedSalesperson,
  individualSalesData
}) => {
  const targetIcon = (
    <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    </div>
  );

  const conversionRateIcon = (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-12 h-12 transform -rotate-90">
        <circle 
          cx="24" 
          cy="24" 
          r="20"
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          className="text-gray-700"
        />
        <circle 
          cx="24" 
          cy="24" 
          r="20"
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={`${20 * 2 * Math.PI}`}
          strokeDashoffset={`${20 * 2 * Math.PI * (1 - analyticsStats.conversionRate / 100)}`}
          className="text-green-500"
        />
      </svg>
      <span className="absolute text-xs font-bold text-white">{analyticsStats.conversionRate}%</span>
    </div>
  );

  const dealSizeIcon = (
    <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
      {/* Revenue Card */}
      <MetricCard
        title={selectedSalesperson ? 'Revenue Collected' : 'Total Revenue'}
        value={`₹${analyticsStats.totalCollectedAmount.toLocaleString('en-IN')}`}
        subtitle={selectedSalesperson ? 'collected' : 'total'}
        gradient="bg-gradient-to-r from-blue-400 to-teal-400"
        textColor="text-blue-300"
        progress={analyticsStats.revenueAchievementPercentage}
        showProgress={true}
      />

      {/* Target Card */}
      <MetricCard
        title={selectedSalesperson ? 'Personal Target' : 'Total Target'}
        value={`₹${analyticsStats.totalTargetAmount.toLocaleString('en-IN')}`}
        subtitle={selectedSalesperson ? 'assigned' : 'total'}
        gradient="bg-gradient-to-r from-purple-400 to-indigo-400"
        textColor="text-purple-300"
        icon={targetIcon}
      />

      {/* Conversion Rate Card */}
      <MetricCard
        title="Conversion Rate"
        value={`${analyticsStats.conversionRate}%`}
        subtitle="of target"
        gradient="bg-gradient-to-r from-green-400 to-emerald-400"
        textColor="text-green-300"
        icon={conversionRateIcon}
      />
    </div>
  );
}; 