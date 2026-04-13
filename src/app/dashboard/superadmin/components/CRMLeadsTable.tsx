import React from 'react';
import { LeadsBySourceData, SourceTotals, Salesperson, SalesTargetData, LeadsBySalesperson } from '../types';
import { SalespersonPerformanceTable } from './SalespersonPerformanceTable';

interface CRMLeadsTableProps {
  leadsBySourceData: LeadsBySourceData;
  sourceTotals: SourceTotals;
  salespeople: Salesperson[];
  allSalesTargets: Record<string, SalesTargetData>;
  leadsBySalesperson: LeadsBySalesperson;
  isLoading: boolean;
  selectedAnalyticsMonth?: number | null;
  selectedAnalyticsYear?: number | null;
}

export const CRMLeadsTable: React.FC<CRMLeadsTableProps> = ({
  leadsBySourceData,
  sourceTotals,
  salespeople,
  allSalesTargets,
  leadsBySalesperson,
  isLoading,
  selectedAnalyticsMonth,
  selectedAnalyticsYear
}) => {
  const sourceHex: Record<string, string> = {
    ama: '#92400e',
    credsettlee: '#6b21a8',
    settleloans: '#134e4a',
    billcut: '#FFD46F',
    total: '#475569'
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="text-blue-600 dark:text-blue-200">Loading lead data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4 transition-colors">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gradient-to-r dark:from-blue-900/80 dark:to-purple-900/80 transition-colors">
              <th className="p-2 text-left font-semibold text-gray-700 dark:text-blue-100 text-xs">Source / Status</th>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <th key={idx} className="p-2 text-center font-semibold text-gray-700 dark:text-blue-100 text-xs">
                  {dataset.label}
                </th>
              ))}
              <th className="p-2 text-center font-semibold text-gray-700 dark:text-blue-100 text-xs">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Settleloans Row */}
            <tr className="bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
              <td className="p-2 border-t border-gray-200 dark:border-gray-700 font-medium text-xs">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-teal-700" style={{ backgroundColor: sourceHex.settleloans }}>
                  Settleloans
                </span>
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <td key={idx} className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-xs">
                  {dataset.data[0]}
                </td>
              ))}
              <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white text-xs">
                {sourceTotals.settleloans}
              </td>
            </tr>
            
            {/* Credsettlee Row */}
            <tr className="bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors">
              <td className="p-2 border-t border-gray-200 dark:border-gray-700 font-medium text-xs">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-purple-700" style={{ backgroundColor: sourceHex.credsettlee }}>
                  Credsettlee
                </span>
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <td key={idx} className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-xs">
                  {dataset.data[1]}
                </td>
              ))}
              <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white text-xs">
                {sourceTotals.credsettlee}
              </td>
            </tr>
            
            {/* AMA Row */}
            <tr className="bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
              <td className="p-2 border-t border-gray-200 dark:border-gray-700 font-medium text-xs">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-amber-700" style={{ backgroundColor: sourceHex.ama }}>
                  AMA
                </span>
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <td key={idx} className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-xs">
                  {dataset.data[2]}
                </td>
              ))}
              <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white text-xs">
                {sourceTotals.ama}
              </td>
            </tr>
            
            {/* Billcut Row */}
            <tr className="bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors">
              <td className="p-2 border-t border-gray-200 dark:border-gray-700 font-medium text-xs">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-gray-900 border border-yellow-500" style={{ backgroundColor: sourceHex.billcut }}>
                  Billcut
                </span>
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <td key={idx} className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-xs">
                  {dataset.data[3]}
                </td>
              ))}
              <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white text-xs">
                {sourceTotals.billcut}
              </td>
            </tr>
            
            {/* Total Row */}
            <tr className="bg-gray-200 dark:bg-gradient-to-r dark:from-blue-900/90 dark:to-purple-900/90 transition-colors">
              <td className="p-2 border-t border-gray-300 dark:border-gray-600 text-xs">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-gray-600" style={{ backgroundColor: sourceHex.total }}>
                  Total
                </span>
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => {
                const statusTotal = dataset.data.reduce((sum, val) => sum + val, 0);
                return (
                  <td key={idx} className="p-2 text-center font-bold text-gray-800 dark:text-blue-100 border-t border-gray-300 dark:border-gray-600 text-xs">
                    {statusTotal}
                  </td>
                );
              })}
              <td className="p-2 text-center font-bold text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 text-xs">
                {sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama + sourceTotals.billcut}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Salesperson Performance Table */}
      <div className="mt-4">
        <SalespersonPerformanceTable
          salespeople={salespeople}
          allSalesTargets={allSalesTargets}
          leadsBySalesperson={leadsBySalesperson}
          selectedAnalyticsMonth={selectedAnalyticsMonth}
          selectedAnalyticsYear={selectedAnalyticsYear}
        />
      </div>
    </>
  );
}; 