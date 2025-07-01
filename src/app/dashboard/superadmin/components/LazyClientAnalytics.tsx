import React, { useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

import { MetricCard, ChartSkeleton } from './index';
import { chartOptions, pieOptions } from '../utils/chartConfigs';

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
  // Memoize chart data to prevent unnecessary re-renders
  const clientStatusChartData = useMemo(() => ({
    labels: Object.keys(clientAnalytics.statusDistribution || {}),
    datasets: [
      {
        label: 'Clients by Status',
        data: Object.values(clientAnalytics.statusDistribution || {}),
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
    labels: Object.keys(clientAnalytics.loanTypeDistribution || {}),
    datasets: [
      {
        data: Object.values(clientAnalytics.loanTypeDistribution || {}),
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
        <div className="h-48">
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
      
      {/* Right column: Loan type distribution and top advocates */}
      <div className="w-full">
        <h3 className="text-base font-semibold text-blue-200 mb-3">Loan Type Distribution</h3>
        <div className="h-48">
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
        <div className="mt-4">
          <h3 className="text-base font-semibold text-blue-200 mb-2">Top Advocates</h3>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-900/80 to-purple-900/80">
                  <th className="py-2 px-3 text-left text-xs font-semibold text-blue-100">Advocate Name</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-blue-100">Clients</th>
                </tr>
              </thead>
              <tbody>
                {(clientAnalytics.topAdvocates || []).map((advocate: any, index: number) => (
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
  );
};

export default LazyClientAnalytics; 