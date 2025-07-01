import React from 'react';

export const MetricCardSkeleton: React.FC = () => (
  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full animate-pulse">
    <div className="p-3 flex-1 flex flex-col">
      <div className="h-3 bg-gray-700 rounded mb-2 w-2/3"></div>
      <div className="h-6 bg-gray-600 rounded mb-2 w-1/2"></div>
      <div className="mt-auto">
        <div className="h-1.5 w-full bg-gray-700 rounded-full"></div>
      </div>
    </div>
    <div className="w-full h-1 bg-gray-700"></div>
  </div>
);

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = "h-48" }) => (
  <div className={`${height} bg-gray-800/50 rounded-lg border border-gray-700 animate-pulse flex items-center justify-center`}>
    <div className="text-gray-500 text-sm">Loading chart...</div>
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="overflow-x-auto rounded-lg border border-gray-700 mb-4 animate-pulse">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gradient-to-r from-blue-900/80 to-purple-900/80">
          {[...Array(6)].map((_, i) => (
            <th key={i} className="p-2">
              <div className="h-3 bg-gray-600 rounded w-full"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...Array(4)].map((_, rowIndex) => (
          <tr key={rowIndex} className="bg-gray-800/40">
            {[...Array(6)].map((_, colIndex) => (
              <td key={colIndex} className="p-2 border-t border-gray-700">
                <div className="h-3 bg-gray-700 rounded w-full"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const SalesMetricsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
    {[...Array(4)].map((_, i) => (
      <MetricCardSkeleton key={i} />
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="p-2 min-h-screen bg-gray-900 text-white w-full">
    <div className="h-6 bg-gray-700 rounded w-64 mb-4 animate-pulse"></div>
    
    <div className="flex flex-col gap-3">
      {/* Sales Analytics Skeleton */}
      <div className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="h-5 bg-gray-600 rounded w-48 mb-4 animate-pulse"></div>
        <SalesMetricsSkeleton />
        
        <div className="mt-4 flex flex-col lg:flex-row gap-3">
          <div className="lg:w-2/3">
            <TableSkeleton />
          </div>
          <div className="lg:w-1/3">
            <ChartSkeleton height="h-64" />
          </div>
        </div>
      </div>
      
      {/* Client Analytics Skeleton */}
      <div className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="h-5 bg-gray-600 rounded w-48 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
      
      {/* Payment Analytics Skeleton */}
      <div className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="h-5 bg-gray-600 rounded w-48 mb-4 animate-pulse"></div>
        <SalesMetricsSkeleton />
        <div className="flex flex-col lg:flex-row gap-3">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    </div>
  </div>
); 