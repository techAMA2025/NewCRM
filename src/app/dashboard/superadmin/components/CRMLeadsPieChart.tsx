import React from 'react';
import { Pie } from 'react-chartjs-2';
import { SourceTotals } from '../types';
import { getSourceTotalsPieOptions, sourceColors } from '../utils/chartConfigs';
import { useTheme } from '../context/ThemeContext';

interface CRMLeadsPieChartProps {
  sourceTotals: SourceTotals;
  isLoading: boolean;
}

export const CRMLeadsPieChart: React.FC<CRMLeadsPieChartProps> = ({
  sourceTotals,
  isLoading
}) => {
  const { theme } = useTheme();
  const options = getSourceTotalsPieOptions(theme);

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="text-blue-600 dark:text-blue-200">Loading lead data...</div>
      </div>
    );
  }

  const sourceTotalsPieData = {
    labels: ['Settleloans', 'Credsettlee', 'AMA', 'Billcut'],
    datasets: [
      {
        data: [sourceTotals.settleloans, sourceTotals.credsettlee, sourceTotals.ama, sourceTotals.billcut],
        backgroundColor: [
          sourceColors.settleloans,  // Teal for Settleloans
          sourceColors.credsettlee,  // Indigo for Credsettlee
          sourceColors.ama,          // Orange for AMA
          sourceColors.billcut,      // Pink for Billcut
        ],
        borderColor: [
          '#134e4a', // Settleloans
          '#6b21a8', // Credsettlee
          '#92400e', // AMA
          '#FFD46F', // Billcut
        ],
        borderWidth: 1,
      },
    ],
  };

  const totalLeads = sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama + sourceTotals.billcut;

  const getPercentage = (value: number) => {
    return totalLeads > 0 ? Math.round((value / totalLeads) * 100) : 0;
  };

  return (
    <>
      <div className="flex-1 flex items-center justify-center">
        <div className="h-48 w-full">
          <Pie data={sourceTotalsPieData} options={options} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        <div className="bg-white dark:bg-gradient-to-br dark:from-teal-900/70 dark:to-teal-800/50 p-2 rounded-lg border border-teal-200 dark:border-teal-700/30 shadow-md flex justify-between items-center transition-colors">
          <div>
            <p className="text-[#134e4a] dark:text-teal-300 font-medium text-xs">Settleloans</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sourceTotals.settleloans}</p>
          </div>
          <div className="text-white text-xs bg-[#134e4a] dark:bg-teal-800/60 rounded-md px-2 py-1 font-medium">
            {getPercentage(sourceTotals.settleloans)}%
          </div>
        </div>
        <div className="bg-white dark:bg-gradient-to-br dark:from-purple-900/70 dark:to-purple-800/50 p-2 rounded-lg border border-purple-200 dark:border-purple-700/30 shadow-md flex justify-between items-center transition-colors">
          <div>
            <p className="text-[#6b21a8] dark:text-purple-300 font-medium text-xs">Credsettlee</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sourceTotals.credsettlee}</p>
          </div>
          <div className="text-white text-xs bg-[#6b21a8] dark:bg-purple-800/60 rounded-md px-2 py-1 font-medium">
            {getPercentage(sourceTotals.credsettlee)}%
          </div>
        </div>
        <div className="bg-white dark:bg-gradient-to-br dark:from-amber-900/70 dark:to-amber-800/50 p-2 rounded-lg border border-amber-200 dark:border-amber-700/30 shadow-md flex justify-between items-center transition-colors">
          <div>
            <p className="text-[#92400e] dark:text-amber-300 font-medium text-xs">AMA</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sourceTotals.ama}</p>
          </div>
          <div className="text-white text-xs bg-[#92400e] dark:bg-amber-800/60 rounded-md px-2 py-1 font-medium">
            {getPercentage(sourceTotals.ama)}%
          </div>
        </div>
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#FFD46F]/80 dark:to-[#FFD46F]/50 p-2 rounded-lg border border-yellow-300 dark:border-yellow-700/30 shadow-md flex justify-between items-center transition-colors">
          <div>
            <p className="text-yellow-700 dark:text-yellow-300 font-medium text-xs">Billcut</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sourceTotals.billcut}</p>
          </div>
          <div className="text-yellow-900 text-xs bg-[#FFD46F] rounded-md px-2 py-1 font-medium">
            {getPercentage(sourceTotals.billcut)}%
          </div>
        </div>
        <div className="bg-gray-100 dark:bg-gradient-to-r dark:from-blue-900/70 dark:to-purple-900/70 p-2 rounded-lg border border-gray-300 dark:border-blue-700/30 shadow-md transition-colors">
          <p className="text-gray-700 dark:text-blue-200 font-medium text-xs">Total Leads</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalLeads}</p>
        </div>
      </div>
    </>
  );
}; 