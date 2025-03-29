'use client';

import React, { useState, useEffect } from 'react';
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
} from 'chart.js';
import { collection, getDocs, query, where, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

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
  Legend
);

// Define type for status and source keys
type StatusKey = 'Interested' | 'Not Interested' | 'Not Answering' | 'Callback' 
| 'Converted' | 'Loan Required' | 'Cibil Issue' | 'Closed Lead' | 'Other';
type SourceKey = 'settleloans' | 'credsettlee' | 'ama';

// Define the dataset type for the chart
type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor: string;
};

export default function SuperAdminDashboard() {
  // State for leads data with proper typing
  const [leadsBySourceData, setLeadsBySourceData] = useState<{
    labels: string[];
    datasets: ChartDataset[];
  }>({
    labels: ['Settleloans', 'Credsettlee', 'AMA'],
    datasets: [],
  });
  
  const [sourceTotals, setSourceTotals] = useState({
    settleloans: 0,
    credsettlee: 0,
    ama: 0,
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Add state for date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  
  // Function to apply date filter
  const applyDateFilter = () => {
    setIsLoading(true);
    setIsFilterApplied(true);
  };
  
  // Function to clear date filter
  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsFilterApplied(false);
    setIsLoading(true);
  };

  // Fetch leads data from Firestore
  useEffect(() => {
    const fetchLeadsData = async () => {
      try {
        // Create a base query
        const leadsCollection = collection(db, 'crm_leads');
        let leadsQuery: any = leadsCollection;
        
        // Apply date filters if set
        if (isFilterApplied && (startDate || endDate)) {
          const constraints: QueryConstraint[] = [];
          
          if (startDate) {
            constraints.push(where(
              'synced_at', 
              '>=', 
              Timestamp.fromDate(new Date(startDate))
            ));
          }
          
          if (endDate) {
            constraints.push(where(
              'synced_at', 
              '<=', 
              Timestamp.fromDate(new Date(`${endDate}T23:59:59`))
            ));
          }
          
          leadsQuery = query(leadsQuery, ...constraints);
        }
        
        const leadsSnapshot = await getDocs(leadsQuery);
        
        // Initialize direct counts for total leads by source
        const sourceTotalCounts = {
          settleloans: 0,
          credsettlee: 0,
          ama: 0,
        };
        
        // Initialize counters for each status and source combination
        const statusCounts = {
          'Interested': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Not Interested': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Not Answering': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Callback': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Converted': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Loan Required': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Cibil Issue': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Closed Lead': { settleloans: 0, credsettlee: 0, ama: 0 },
          'Other': { settleloans: 0, credsettlee: 0, ama: 0 },
        };
        
        // Process each lead document
        leadsSnapshot.forEach((doc) => {
          const lead = doc.data() as {
            source_database?: string;
            status?: string;
            [key: string]: any;
          };
          
          let source = lead.source_database;
          
          // Normalize source to lowercase if it exists
          if (source) {
            source = source.toLowerCase();
            
            // Map source to one of our three categories
            let mappedSource;
            if (source.includes('settleloans')) {
              mappedSource = 'settleloans';
            } else if (source.includes('credsettlee') || source.includes('credsettle')) {
              mappedSource = 'credsettlee';
            } else if (source.includes('ama')) {
              mappedSource = 'ama';
            }
            
            // First, count all leads by source (regardless of status)
            if (mappedSource) {
              sourceTotalCounts[mappedSource as SourceKey]++;
              
              // Then categorize leads by status for the chart
              const status = lead.status;
              if (status && statusCounts[status as StatusKey]) {
                statusCounts[status as StatusKey][mappedSource as SourceKey]++;
              } else {
                // Count leads with valid source but invalid/missing status as "Other"
                statusCounts['Other'][mappedSource as SourceKey]++;
              }
            }
          }
        });
        
        // Prepare chart data
        const datasets = Object.entries(statusCounts).map(([status, sources], index) => {
          // Colors for each status
          const colors = [
            'rgba(52, 191, 163, 0.8)',
            'rgba(235, 87, 87, 0.8)',
            'rgba(249, 178, 51, 0.8)',
            'rgba(98, 114, 164, 0.8)',
            'rgba(30, 215, 96, 0.8)',
            'rgba(138, 43, 226, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(201, 203, 207, 0.8)',
            'rgba(128, 128, 128, 0.8)',
          ];
          
          return {
            label: status,
            data: [sources.settleloans, sources.credsettlee, sources.ama],
            backgroundColor: colors[index % colors.length],
          };
        });
        
        // Log for debugging
        console.log("Total leads found:", 
          sourceTotalCounts.settleloans + sourceTotalCounts.credsettlee + sourceTotalCounts.ama,
          "Settleloans:", sourceTotalCounts.settleloans,
          "Credsettlee:", sourceTotalCounts.credsettlee,
          "AMA:", sourceTotalCounts.ama,
          "Date Filter:", isFilterApplied ? `${startDate || 'any'} to ${endDate || 'any'}` : 'None'
        );
        
        // Update chart data
        setLeadsBySourceData({
          labels: ['Settleloans', 'Credsettlee', 'AMA'],
          datasets: datasets,
        });
        
        setSourceTotals(sourceTotalCounts);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching leads data:", error);
        setIsLoading(false);
      }
    };
    
    fetchLeadsData();
  }, [startDate, endDate, isFilterApplied]);

  // Sample data for charts
  const adminData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Active Admins',
        data: [12, 19, 15, 17, 14, 18],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'New Admins',
        data: [5, 7, 4, 6, 2, 8],
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
    ],
  };

  const salesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Revenue',
        data: [65000, 59000, 80000, 81000, 56000, 90000],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const advocateData = {
    labels: ['New', 'Active', 'Inactive', 'Top Performers'],
    datasets: [
      {
        data: [35, 45, 15, 5],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  // Add stacked bar chart options
  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      },
      title: {
        display: true,
        text: 'Lead Distribution by Source and Status',
        color: 'rgba(255, 255, 255, 0.8)',
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        stacked: true,
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      },
    },
  };

  // Add data for the source totals pie chart
  const sourceTotalsPieData = {
    labels: ['Settleloans', 'Credsettlee', 'AMA'],
    datasets: [
      {
        data: [sourceTotals.settleloans, sourceTotals.credsettlee, sourceTotals.ama],
        backgroundColor: [
          'rgba(52, 191, 163, 0.8)',  // Teal for Settleloans
          'rgba(79, 70, 229, 0.8)',   // Indigo for Credsettlee
          'rgba(249, 115, 22, 0.8)',  // Orange for AMA
        ],
        borderColor: [
          'rgba(52, 191, 163, 1)',
          'rgba(79, 70, 229, 1)',
          'rgba(249, 115, 22, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Customize pie chart options
  const sourceTotalsPieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          padding: 15,
          font: {
            size: 12
          }
        },
      },
      title: {
        display: true,
        text: 'Total Leads by Source',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          size: 16
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
    },
  };

  // Find converted leads data from datasets
  const convertedLeadsData = {
    labels: ['Settleloans', 'Credsettlee', 'AMA'],
    datasets: [
      {
        label: 'Converted Leads',
        data: leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data || [0, 0, 0],
        backgroundColor: [
          'rgba(52, 191, 163, 0.8)',  // Teal for Settleloans
          'rgba(79, 70, 229, 0.8)',   // Indigo for Credsettlee
          'rgba(249, 115, 22, 0.8)',  // Orange for AMA
        ],
        borderColor: [
          'rgba(52, 191, 163, 1)',
          'rgba(79, 70, 229, 1)',
          'rgba(249, 115, 22, 1)',
        ],
        borderWidth: 1,
      }
    ]
  };
  
  // Horizontal bar chart options
  const horizontalBarOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Converted Leads by Source',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          size: 16
        },
        padding: {
          top: 10,
          bottom: 15
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      }
    },
  };

  return (
    <div className="p-6 min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>

      <div className="flex flex-col gap-6">
        {/* Sales Analytics Section */}
        <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Sales Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line data={salesData} options={options} />
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold">$431,000</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400">Monthly Goal</p>
                  <p className="text-2xl font-bold">90%</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400">Conversion Rate</p>
                  <p className="text-2xl font-bold">24.5%</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400">Avg. Deal Size</p>
                  <p className="text-2xl font-bold">$2,850</p>
                </div>
              </div>
              
              {/* CRM Leads Analytics Section with Table and Pie Chart */}
              <div className="mt-8 flex flex-col md:flex-row gap-6">
                {/* Left side: Table with filters */}
                <div className="md:w-2/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl">
                  <h3 className="text-xl font-semibold mb-4 text-blue-100">CRM Leads Analytics</h3>
                  
                  {/* Date range filter */}
                  <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-800/70 rounded-lg border border-gray-700">
                    <div>
                      <label htmlFor="start-date" className="block text-sm text-blue-200 mb-1">From Date</label>
                      <input
                        id="start-date"
                        type="date"
                        className="bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="end-date" className="block text-sm text-blue-200 mb-1">To Date</label>
                      <input
                        id="end-date"
                        type="date"
                        className="bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex gap-2 self-end mb-0.5">
                      <button
                        onClick={applyDateFilter}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                        disabled={isLoading}
                      >
                        Apply Filter
                      </button>
                      
                      <button
                        onClick={clearDateFilter}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                        disabled={isLoading || (!startDate && !endDate)}
                      >
                        Clear Filter
                      </button>
                    </div>
                    
                    {isFilterApplied && (
                      <div className="ml-auto text-sm text-blue-200">
                        Showing data from: {startDate || 'all time'} to {endDate || 'present'}
                      </div>
                    )}
                  </div>
                  
                  {isLoading ? (
                    <div className="flex justify-center items-center h-60 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="text-blue-200">Loading lead data...</div>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-gray-700 mb-6">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-900/80 to-purple-900/80">
                              <th className="p-3 text-left font-semibold text-blue-100">Source / Status</th>
                              {leadsBySourceData.datasets.map((dataset, idx) => (
                                <th key={idx} className="p-3 text-center font-semibold text-blue-100">
                                  {dataset.label}
                                </th>
                              ))}
                              <th className="p-3 text-center font-semibold text-blue-100">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Settleloans Row */}
                            <tr className="bg-gray-800/40 hover:bg-gray-700/40 transition-colors">
                              <td className="p-3 border-t border-gray-700 font-medium text-teal-300">
                                Settleloans
                              </td>
                              {leadsBySourceData.datasets.map((dataset, idx) => (
                                <td key={idx} className="p-3 text-center border-t border-gray-700 text-gray-100">
                                  {dataset.data[0]}
                                </td>
                              ))}
                              <td className="p-3 text-center border-t border-gray-700 font-semibold text-white">
                                {sourceTotals.settleloans}
                              </td>
                            </tr>
                            
                            {/* Credsettlee Row */}
                            <tr className="bg-gray-800/60 hover:bg-gray-700/40 transition-colors">
                              <td className="p-3 border-t border-gray-700 font-medium text-indigo-300">
                                Credsettlee
                              </td>
                              {leadsBySourceData.datasets.map((dataset, idx) => (
                                <td key={idx} className="p-3 text-center border-t border-gray-700 text-gray-100">
                                  {dataset.data[1]}
                                </td>
                              ))}
                              <td className="p-3 text-center border-t border-gray-700 font-semibold text-white">
                                {sourceTotals.credsettlee}
                              </td>
                            </tr>
                            
                            {/* AMA Row */}
                            <tr className="bg-gray-800/40 hover:bg-gray-700/40 transition-colors">
                              <td className="p-3 border-t border-gray-700 font-medium text-orange-300">
                                AMA
                              </td>
                              {leadsBySourceData.datasets.map((dataset, idx) => (
                                <td key={idx} className="p-3 text-center border-t border-gray-700 text-gray-100">
                                  {dataset.data[2]}
                                </td>
                              ))}
                              <td className="p-3 text-center border-t border-gray-700 font-semibold text-white">
                                {sourceTotals.ama}
                              </td>
                            </tr>
                            
                            {/* Total Row */}
                            <tr className="bg-gradient-to-r from-blue-900/90 to-purple-900/90">
                              <td className="p-3 font-bold text-blue-100 border-t border-gray-600">
                                Total
                              </td>
                              {leadsBySourceData.datasets.map((dataset, idx) => {
                                const statusTotal = dataset.data.reduce((sum, val) => sum + val, 0);
                                return (
                                  <td key={idx} className="p-3 text-center font-bold text-blue-100 border-t border-gray-600">
                                    {statusTotal}
                                  </td>
                                );
                              })}
                              <td className="p-3 text-center font-bold text-white border-t border-gray-600">
                                {sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Horizontal Bar Chart for Converted Leads */}
                      <div className="mt-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-blue-200 font-medium mb-2">Conversion Analytics</h4>
                        <div className="h-40">
                          <Bar data={convertedLeadsData} options={horizontalBarOptions} />
                        </div>
                        
                        {/* Conversion rate cards */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          <div className="bg-gradient-to-r from-teal-900/50 to-teal-800/30 p-3 rounded-lg border border-teal-700/20">
                            <div className="flex justify-between items-center">
                              <span className="text-teal-300">Settleloans</span>
                              <span className="text-white font-semibold">
                                {convertedLeadsData.datasets[0].data[0]} Converted
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-right text-teal-100">
                              {sourceTotals.settleloans > 0 
                                ? `${Math.round((convertedLeadsData.datasets[0].data[0] / sourceTotals.settleloans) * 100)}% Rate` 
                                : '0% Rate'}
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-indigo-900/50 to-indigo-800/30 p-3 rounded-lg border border-indigo-700/20">
                            <div className="flex justify-between items-center">
                              <span className="text-indigo-300">Credsettlee</span>
                              <span className="text-white font-semibold">
                                {convertedLeadsData.datasets[0].data[1]} Converted
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-right text-indigo-100">
                              {sourceTotals.credsettlee > 0 
                                ? `${Math.round((convertedLeadsData.datasets[0].data[1] / sourceTotals.credsettlee) * 100)}% Rate` 
                                : '0% Rate'}
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-orange-900/50 to-orange-800/30 p-3 rounded-lg border border-orange-700/20">
                            <div className="flex justify-between items-center">
                              <span className="text-orange-300">AMA</span>
                              <span className="text-white font-semibold">
                                {convertedLeadsData.datasets[0].data[2]} Converted
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-right text-orange-100">
                              {sourceTotals.ama > 0 
                                ? `${Math.round((convertedLeadsData.datasets[0].data[2] / sourceTotals.ama) * 100)}% Rate` 
                                : '0% Rate'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Right side: Pie chart */}
                <div className="md:w-1/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl flex flex-col">
                  {isLoading ? (
                    <div className="flex-1 flex justify-center items-center bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="text-blue-200">Loading lead data...</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="h-64 w-full">
                          <Pie data={sourceTotalsPieData} options={sourceTotalsPieOptions} />
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <div className="bg-gradient-to-br from-teal-900/70 to-teal-800/50 p-3 rounded-lg border border-teal-700/30 shadow-md flex justify-between items-center">
                          <div>
                            <p className="text-teal-300 font-medium">Settleloans</p>
                            <p className="text-xl font-bold text-white">{sourceTotals.settleloans}</p>
                          </div>
                          <div className="text-white text-sm bg-teal-800/60 rounded-md px-2 py-1 font-medium">
                            {sourceTotals.settleloans > 0 ? 
                              `${Math.round((sourceTotals.settleloans / 
                                (sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama)) * 100)}%` : 
                              '0%'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-900/70 to-indigo-800/50 p-3 rounded-lg border border-indigo-700/30 shadow-md flex justify-between items-center">
                          <div>
                            <p className="text-indigo-300 font-medium">Credsettlee</p>
                            <p className="text-xl font-bold text-white">{sourceTotals.credsettlee}</p>
                          </div>
                          <div className="text-white text-sm bg-indigo-800/60 rounded-md px-2 py-1 font-medium">
                            {sourceTotals.credsettlee > 0 ? 
                              `${Math.round((sourceTotals.credsettlee / 
                                (sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama)) * 100)}%` : 
                              '0%'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-900/70 to-orange-800/50 p-3 rounded-lg border border-orange-700/30 shadow-md flex justify-between items-center">
                          <div>
                            <p className="text-orange-300 font-medium">AMA</p>
                            <p className="text-xl font-bold text-white">{sourceTotals.ama}</p>
                          </div>
                          <div className="text-white text-sm bg-orange-800/60 rounded-md px-2 py-1 font-medium">
                            {sourceTotals.ama > 0 ? 
                              `${Math.round((sourceTotals.ama / 
                                (sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama)) * 100)}%` : 
                              '0%'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-900/70 to-purple-900/70 p-3 rounded-lg border border-blue-700/30 shadow-md">
                          <p className="text-blue-200 font-medium">Total Leads</p>
                          <p className="text-2xl font-bold text-white">
                            {sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Admin Analytics Section */}
        <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Admin Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar data={adminData} options={options} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400">Total Admins</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400">Active Today</p>
                  <p className="text-2xl font-bold">18</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400">Admin Actions</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        

        {/* Advocate Analytics Section */}
        <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Advocate Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex">
                <div className="w-1/2 h-80">
                  <Pie data={advocateData} options={pieOptions} />
                </div>
                <div className="w-1/2 grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400">Total Advocates</p>
                    <p className="text-2xl font-bold">128</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400">New This Month</p>
                    <p className="text-2xl font-bold">15</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400">Top Performer</p>
                    <p className="text-2xl font-bold">Sarah J.</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400">Retention Rate</p>
                    <p className="text-2xl font-bold">92%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
