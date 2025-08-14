import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

import { MetricCard, ChartSkeleton } from './index';
import { chartOptions } from '../utils/chartConfigs';

interface LazyClientAnalyticsProps {
  clientAnalytics: any;
  clientsLoading: boolean;
  enabledStages: any;
}

const LazyClientAnalytics: React.FC<LazyClientAnalyticsProps> = ({
  clientAnalytics,
  clientsLoading,
  enabledStages
}) => {
  if (!enabledStages.clientAnalytics || clientsLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left column: Client status distribution */}
      <div className="w-full">
        <h3 className="text-base font-semibold text-blue-200 mb-3">Client Status Distribution</h3>
        
        {/* Client Status Counts */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-r from-green-900/50 to-green-800/30 p-3 rounded-lg border border-green-700/20">
            <div className="flex justify-between items-center">
              <span className="text-green-300 text-sm font-medium">Active</span>
              <span className="text-white font-bold text-lg">
                {clientAnalytics.statusDistribution?.Active || 0}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-900/50 to-red-800/30 p-3 rounded-lg border border-red-700/20">
            <div className="flex justify-between items-center">
              <span className="text-red-300 text-sm font-medium">Dropped</span>
              <span className="text-white font-bold text-lg">
                {clientAnalytics.statusDistribution?.Dropped || 0}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/30 p-3 rounded-lg border border-yellow-700/20">
            <div className="flex justify-between items-center">
              <span className="text-yellow-300 text-sm font-medium">Not Responding</span>
              <span className="text-white font-bold text-lg">
                {clientAnalytics.statusDistribution?.['Not Responding'] || 0}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-900/50 to-orange-800/30 p-3 rounded-lg border border-orange-700/20">
            <div className="flex justify-between items-center">
              <span className="text-orange-300 text-sm font-medium">On Hold</span>
              <span className="text-white font-bold text-lg">
                {clientAnalytics.statusDistribution?.['On Hold'] || 0}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/30 p-3 rounded-lg border border-gray-700/20">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm font-medium">Inactive</span>
              <span className="text-white font-bold text-lg">
                {clientAnalytics.statusDistribution?.Inactive || 0}
              </span>
            </div>
          </div>
        </div>
        
        {/* Client stats cards */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <MetricCard
            title="Total Clients"
            value={clientAnalytics.totalClients}
            gradient="bg-gradient-to-r from-blue-400 to-blue-600"
            textColor="text-blue-300"
          />
          <MetricCard
            title="Active Clients"
            value={clientAnalytics.statusDistribution?.Active || 0}
            gradient="bg-gradient-to-r from-green-400 to-green-600"
            textColor="text-green-300"
          />
          <MetricCard
            title="Avg. Loan Amount"
            value={`₹${clientAnalytics.avgLoanAmount?.toLocaleString('en-IN') || 0}`}
            gradient="bg-gradient-to-r from-purple-400 to-purple-600"
            textColor="text-purple-300"
          />
          <MetricCard
            title="Total Loan Amount"
            value={`₹${clientAnalytics.totalLoanAmount?.toLocaleString('en-IN') || 0}`}
            gradient="bg-gradient-to-r from-amber-400 to-amber-600"
            textColor="text-amber-300"
          />
        </div>
      </div>
      
      {/* Right column: Advocate analytics and top advocates */}
      <div className="w-full">
        <h3 className="text-base font-semibold text-blue-200 mb-3">Advocate Analytics</h3>
        
        {/* Advocate Status Distribution Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden mb-4">
          <div className="p-3 border-b border-gray-700">
            <h4 className="text-sm font-medium text-blue-100">Client Status by Advocate</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-800/80">
                <tr className="bg-gradient-to-r from-blue-900/80 to-purple-900/80">
                  <th className="py-2 px-3 text-left text-xs font-semibold text-blue-100">Advocate</th>
                  <th className="py-2 px-2 text-center text-xs font-semibold text-blue-100">Total</th>
                  <th className="py-2 px-2 text-center text-xs font-semibold text-blue-100">Active</th>
                  <th className="py-2 px-2 text-center text-xs font-semibold text-blue-100">Dropped</th>
                  <th className="py-2 px-2 text-center text-xs font-semibold text-blue-100">Not Resp</th>
                  <th className="py-2 px-2 text-center text-xs font-semibold text-blue-100">On Hold</th>
                  <th className="py-2 px-2 text-center text-xs font-semibold text-blue-100">Inactive</th>
                </tr>
              </thead>
              <tbody>
                {(clientAnalytics.topAdvocates || []).map((advocate: any, index: number) => {
                  // Get actual status distribution for this advocate
                  const advocateStatusCounts = clientAnalytics.advocateStatusDistribution?.[advocate.name] || {
                    Active: 0,
                    Dropped: 0,
                    'Not Responding': 0,
                    'On Hold': 0,
                    Inactive: 0
                  };
                  
                  return (
                    <tr key={`${advocate.name}-${index}`} className={index % 2 === 0 ? "bg-gray-800/40" : "bg-gray-800/60"}>
                      <td className="py-2 px-3 text-xs text-gray-200 font-medium">{advocate.name}</td>
                      <td className="py-2 px-2 text-xs text-center text-gray-200 font-semibold">
                        <span className="px-2 py-1 bg-blue-900/40 rounded-md text-blue-200">
                          {advocate.clientCount}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-center text-green-300 font-semibold">
                        {advocateStatusCounts.Active}
                      </td>
                      <td className="py-2 px-2 text-xs text-center text-red-300 font-semibold">
                        {advocateStatusCounts.Dropped}
                      </td>
                      <td className="py-2 px-2 text-xs text-center text-yellow-300 font-semibold">
                        {advocateStatusCounts['Not Responding']}
                      </td>
                      <td className="py-2 px-2 text-xs text-center text-orange-300 font-semibold">
                        {advocateStatusCounts['On Hold']}
                      </td>
                      <td className="py-2 px-2 text-xs text-center text-gray-300 font-semibold">
                        {advocateStatusCounts.Inactive}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Advocate Summary Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gradient-to-r from-indigo-900/50 to-indigo-800/30 p-3 rounded-lg border border-indigo-700/20">
            <div className="flex justify-between items-center">
              <span className="text-indigo-300 text-xs font-medium">Total Advocates</span>
              <span className="text-white font-bold text-sm">
                {(clientAnalytics.topAdvocates || []).length}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/30 p-3 rounded-lg border border-purple-700/20">
            <div className="flex justify-between items-center">
              <span className="text-purple-300 text-xs font-medium">Avg Clients/Advocate</span>
              <span className="text-white font-bold text-sm">
                {(() => {
                  const advocates = clientAnalytics.topAdvocates || [];
                  if (advocates.length === 0) return 0;
                  const totalClients = advocates.reduce((sum: number, adv: any) => sum + adv.clientCount, 0);
                  return Math.round(totalClients / advocates.length);
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LazyClientAnalytics; 