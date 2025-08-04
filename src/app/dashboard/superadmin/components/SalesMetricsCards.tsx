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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Sales Revenue - Concise Circular Design */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700/50 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-300">
            {selectedSalesperson ? 'Revenue Collected' : 'Sales Revenue'}
          </h3>
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Circular Progress */}
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="54"
                stroke="rgba(75, 85, 99, 0.3)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="60" cy="60" r="54"
                stroke="url(#salesGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - Math.min(analyticsStats.revenueAchievementPercentage, 100) / 100)}`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="salesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{analyticsStats.revenueAchievementPercentage}%</span>
            </div>
          </div>
          
          {/* Revenue Data */}
          <div className="flex-1">
            <div className="text-2xl font-bold text-green-400 mb-1">
              ₹{analyticsStats.totalCollectedAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-sm text-gray-400">
              of ₹{analyticsStats.totalTargetAmount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Ops Revenue - Approved Only */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700/50 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-emerald-300">Operations Revenue</h3>
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-400 mb-2">
            {opsPaymentsLoading ? '...' : `₹${opsPaymentsAnalytics?.totalApprovedAmount.toLocaleString('en-IN') || '0'}`}
          </div>
          <div className="text-sm text-gray-400">Approved Payments</div>
        </div>
      </div>
    </div>
  );
}; 