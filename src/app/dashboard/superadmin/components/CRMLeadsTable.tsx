import React from 'react';
import { Bar } from 'react-chartjs-2';
import { LeadsBySourceData, SourceTotals } from '../types';
import { horizontalBarOptions } from '../utils/chartConfigs';

interface CRMLeadsTableProps {
  leadsBySourceData: LeadsBySourceData;
  sourceTotals: SourceTotals;
  isLoading: boolean;
}

export const CRMLeadsTable: React.FC<CRMLeadsTableProps> = ({
  leadsBySourceData,
  sourceTotals,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="text-blue-200">Loading lead data...</div>
      </div>
    );
  }

  // Prepare data for conversion analytics chart
  const convertedLeadsData = {
    labels: ['Settleloans', 'Credsettlee', 'AMA'],
    datasets: [
      {
        label: 'Converted Leads',
        data: leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data || [0, 0, 0],
        backgroundColor: [
          'rgba(52, 191, 163, 0.9)',  // Teal for Settleloans
          'rgba(79, 70, 229, 0.9)',   // Indigo for Credsettlee
          'rgba(249, 115, 22, 0.9)',  // Orange for AMA
        ],
        borderColor: [
          'rgba(52, 191, 163, 1)',
          'rgba(79, 70, 229, 1)',
          'rgba(249, 115, 22, 1)',
        ],
        borderWidth: 1,
      },
      {
        label: 'Non-Converted Leads',
        data: [
          sourceTotals.settleloans - (leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data[0] || 0),
          sourceTotals.credsettlee - (leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data[1] || 0),
          sourceTotals.ama - (leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data[2] || 0)
        ],
        backgroundColor: [
          'rgba(52, 191, 163, 0.2)',  // Lighter Teal for Settleloans
          'rgba(79, 70, 229, 0.2)',   // Lighter Indigo for Credsettlee
          'rgba(249, 115, 22, 0.2)',  // Lighter Orange for AMA
        ],
        borderColor: [
          'rgba(52, 191, 163, 0.6)',
          'rgba(79, 70, 229, 0.6)',
          'rgba(249, 115, 22, 0.6)',
        ],
        borderWidth: 1,
      }
    ]
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-700 mb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-900/80 to-purple-900/80">
              <th className="p-2 text-left font-semibold text-blue-100 text-xs">Source / Status</th>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <th key={idx} className="p-2 text-center font-semibold text-blue-100 text-xs">
                  {dataset.label}
                </th>
              ))}
              <th className="p-2 text-center font-semibold text-blue-100 text-xs">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Settleloans Row */}
            <tr className="bg-gray-800/40 hover:bg-gray-700/40 transition-colors">
              <td className="p-2 border-t border-gray-700 font-medium text-teal-300 text-xs">
                Settleloans
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <td key={idx} className="p-2 text-center border-t border-gray-700 text-gray-100 text-xs">
                  {dataset.data[0]}
                </td>
              ))}
              <td className="p-2 text-center border-t border-gray-700 font-semibold text-white text-xs">
                {sourceTotals.settleloans}
              </td>
            </tr>
            
            {/* Credsettlee Row */}
            <tr className="bg-gray-800/60 hover:bg-gray-700/40 transition-colors">
              <td className="p-2 border-t border-gray-700 font-medium text-indigo-300 text-xs">
                Credsettlee
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <td key={idx} className="p-2 text-center border-t border-gray-700 text-gray-100 text-xs">
                  {dataset.data[1]}
                </td>
              ))}
              <td className="p-2 text-center border-t border-gray-700 font-semibold text-white text-xs">
                {sourceTotals.credsettlee}
              </td>
            </tr>
            
            {/* AMA Row */}
            <tr className="bg-gray-800/40 hover:bg-gray-700/40 transition-colors">
              <td className="p-2 border-t border-gray-700 font-medium text-orange-300 text-xs">
                AMA
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => (
                <td key={idx} className="p-2 text-center border-t border-gray-700 text-gray-100 text-xs">
                  {dataset.data[2]}
                </td>
              ))}
              <td className="p-2 text-center border-t border-gray-700 font-semibold text-white text-xs">
                {sourceTotals.ama}
              </td>
            </tr>
            
            {/* Total Row */}
            <tr className="bg-gradient-to-r from-blue-900/90 to-purple-900/90">
              <td className="p-2 font-bold text-blue-100 border-t border-gray-600 text-xs">
                Total
              </td>
              {leadsBySourceData.datasets.map((dataset, idx) => {
                const statusTotal = dataset.data.reduce((sum, val) => sum + val, 0);
                return (
                  <td key={idx} className="p-2 text-center font-bold text-blue-100 border-t border-gray-600 text-xs">
                    {statusTotal}
                  </td>
                );
              })}
              <td className="p-2 text-center font-bold text-white border-t border-gray-600 text-xs">
                {sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Horizontal Bar Chart for Converted Leads */}
      <div className="mt-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
        <h4 className="text-blue-200 font-medium mb-2 text-sm">Conversion Analytics</h4>
        <div className="h-32">
          <Bar data={convertedLeadsData} options={horizontalBarOptions} />
        </div>
        
        {/* Conversion rate cards */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-gradient-to-r from-teal-900/50 to-teal-800/30 p-2 rounded-lg border border-teal-700/20">
            <div className="flex justify-between items-center">
              <span className="text-teal-300 text-xs">Settleloans</span>
              <span className="text-white font-semibold text-xs">
                {convertedLeadsData.datasets[0].data[0]} Converted
              </span>
            </div>
            <div className="mt-1 text-xs text-right text-teal-100">
              {sourceTotals.settleloans > 0 
                ? `${Math.round((convertedLeadsData.datasets[0].data[0] / sourceTotals.settleloans) * 100)}% Rate` 
                : '0% Rate'}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-900/50 to-indigo-800/30 p-2 rounded-lg border border-indigo-700/20">
            <div className="flex justify-between items-center">
              <span className="text-indigo-300 text-xs">Credsettlee</span>
              <span className="text-white font-semibold text-xs">
                {convertedLeadsData.datasets[0].data[1]} Converted
              </span>
            </div>
            <div className="mt-1 text-xs text-right text-indigo-100">
              {sourceTotals.credsettlee > 0 
                ? `${Math.round((convertedLeadsData.datasets[0].data[1] / sourceTotals.credsettlee) * 100)}% Rate` 
                : '0% Rate'}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-900/50 to-orange-800/30 p-2 rounded-lg border border-orange-700/20">
            <div className="flex justify-between items-center">
              <span className="text-orange-300 text-xs">AMA</span>
              <span className="text-white font-semibold text-xs">
                {convertedLeadsData.datasets[0].data[2]} Converted
              </span>
            </div>
            <div className="mt-1 text-xs text-right text-orange-100">
              {sourceTotals.ama > 0 
                ? `${Math.round((convertedLeadsData.datasets[0].data[2] / sourceTotals.ama) * 100)}% Rate` 
                : '0% Rate'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 