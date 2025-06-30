import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Line, Pie, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function BillcutDashboard() {
  // Dummy data for sales analytics
  const salesAnalytics = {
    totalTargetAmount: 5000000,
    totalCollectedAmount: 3750000,
    monthlyRevenue: [280000, 320000, 450000, 380000, 420000, 550000],
    conversionRate: 75,
    avgDealSize: 125000,
    revenueAchievementPercentage: 75
  }

  // Add dummy data for leads
  const leadsBySourceData = {
    labels: ['Interested', 'Not Interested', 'Not Answering', 'Callback', 'Converted', 'Loan Required', 'Cibil Issue', 'Closed Lead', 'No Status'],
    datasets: [
      {
        label: 'Interested',
        data: [45],
        backgroundColor: 'rgba(52, 191, 163, 0.8)',
      },
      {
        label: 'Not Interested',
        data: [25],
        backgroundColor: 'rgba(235, 87, 87, 0.8)',
      },
      {
        label: 'Converted',
        data: [35],
        backgroundColor: 'rgba(30, 215, 96, 0.8)',
      },
      {
        label: 'Callback',
        data: [20],
        backgroundColor: 'rgba(98, 114, 164, 0.8)',
      }
    ]
  }

  const sourceTotals = {
    billcut: 125
  }

  // Dummy data for source totals pie chart
  const sourceTotalsPieData = {
    labels: ['BillCut'],
    datasets: [
      {
        data: [sourceTotals.billcut],
        backgroundColor: [
          'rgba(52, 191, 163, 0.8)',  // Teal for BillCut
        ],
        borderColor: [
          'rgba(52, 191, 163, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // Dummy data for converted leads
  const convertedLeadsData = {
    labels: ['BillCut'],
    datasets: [
      {
        label: 'Converted Leads',
        data: [35],
        backgroundColor: [
          'rgba(52, 191, 163, 0.9)',
        ],
      },
      {
        label: 'Non-Converted Leads',
        data: [90],
        backgroundColor: [
          'rgba(52, 191, 163, 0.2)',
        ],
      }
    ]
  }

  // Chart options
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
        type: "linear" as const,
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        type: "linear" as const,
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  }

  // Sales data for chart
  const salesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Revenue',
        data: salesAnalytics.monthlyRevenue,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  }

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
  }

  const horizontalBarOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      },
      title: {
        display: true,
        text: 'Conversion Performance by Source',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          size: 16
        },
        padding: {
          top: 10,
          bottom: 15
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      },
      y: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      }
    },
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-950">
      <div className="flex-1 p-8 text-gray-200">
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Billcut Dashboard
        </h1>

        {/* Sales Analytics Section */}
        <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white">Overall Sales Analytics</CardTitle>
              
              {/* Add Month/Year Filters */}
              <div className="flex items-center gap-3">
                {/* Month-Year Filter */}
                <div className="flex items-center gap-2">
                  <select
                    className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={new Date().getMonth()}
                  >
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                  
                  <select
                    className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={new Date().getFullYear()}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                {/* Salesperson Dropdown */}
                <div className="flex items-center">
                  <label htmlFor="salesperson" className="mr-2 text-gray-300">View:</label>
                  <select
                    id="salesperson"
                    className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="all"
                  >
                    <option value="all">All Salespeople</option>
                    <option value="1">John Doe</option>
                    <option value="2">Jane Smith</option>
                    <option value="3">Mike Johnson</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Fixed metric cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Revenue Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full">
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-blue-300 font-medium text-sm uppercase tracking-wider mb-2">
                      Revenue Collected
                    </h3>
                    <div className="flex items-baseline space-x-2 mb-3">
                      <p className="text-3xl font-bold text-white">₹{salesAnalytics.totalCollectedAmount.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-400">collected</p>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{salesAnalytics.revenueAchievementPercentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-teal-400 rounded-full" 
                          style={{ width: `${salesAnalytics.revenueAchievementPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-teal-400"></div>
                </div>

                {/* Target Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full">
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-purple-300 font-medium text-sm uppercase tracking-wider mb-2">
                      Personal Target
                    </h3>
                    <div className="flex items-baseline space-x-2 mb-3">
                      <p className="text-3xl font-bold text-white">₹{salesAnalytics.totalTargetAmount.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-400">assigned</p>
                    </div>
                    
                    {/* Metric visualization */}
                    <div className="mt-auto flex items-center justify-center">
                      <div className="inline-flex items-center justify-center p-2 bg-gray-700/50 rounded-full">
                        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-400"></div>
                </div>

                {/* Conversion Rate Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full">
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-green-300 font-medium text-sm uppercase tracking-wider mb-2">Conversion Rate</h3>
                    <div className="flex items-baseline space-x-2 mb-3">
                      <p className="text-3xl font-bold text-white">{salesAnalytics.conversionRate}%</p>
                      <p className="text-sm text-gray-400">of target</p>
                    </div>
                    
                    {/* Circular progress indicator */}
                    <div className="mt-auto flex justify-center">
                      <div className="relative inline-flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle 
                            cx="32" 
                            cy="32" 
                            r="28"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            className="text-gray-700"
                          />
                          <circle 
                            cx="32" 
                            cy="32" 
                            r="28"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={`${28 * 2 * Math.PI}`}
                            strokeDashoffset={`${28 * 2 * Math.PI * (1 - salesAnalytics.conversionRate / 100)}`}
                            className="text-green-500"
                          />
                        </svg>
                        <span className="absolute text-sm font-bold text-white">{salesAnalytics.conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400"></div>
                </div>

                {/* Avg Deal Size Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full">
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-amber-300 font-medium text-sm uppercase tracking-wider mb-2">
                      Average Deal Size
                    </h3>
                    <div className="flex items-baseline space-x-2 mb-3">
                      <p className="text-3xl font-bold text-white">₹{salesAnalytics.avgDealSize.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-400">per deal</p>
                    </div>
                    
                    <div className="mt-auto flex justify-center">
                      <div className="inline-flex items-center justify-center p-2 bg-gray-700/50 rounded-full">
                        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-gradient-to-r from-amber-400 to-yellow-400"></div>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="mt-6 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-blue-200 mb-4">Revenue Trends</h3>
                <div className="h-80">
                  <Line data={salesData} options={options} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CRM Leads Analytics Section */}
        <div className="mt-8 flex flex-col md:flex-row gap-6">
          {/* Left side: Table with filters */}
          <div className="md:w-2/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-100">CRM Leads Analytics</h3>
              
              {/* Salesperson filter dropdown */}
              <div className="flex items-center">
                <label htmlFor="lead-salesperson" className="mr-2 text-gray-300">Salesperson:</label>
                <select
                  id="lead-salesperson"
                  className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="all"
                >
                  <option value="all">All Salespeople</option>
                  <option value="1">John Doe</option>
                  <option value="2">Jane Smith</option>
                  <option value="3">Mike Johnson</option>
                </select>
              </div>
            </div>
            
            {/* Date range filter */}
            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-800/70 rounded-lg border border-gray-700">
              <div>
                <label htmlFor="start-date" className="block text-sm text-blue-200 mb-1">From Date</label>
                <input
                  id="start-date"
                  type="date"
                  className="bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              
              <div>
                <label htmlFor="end-date" className="block text-sm text-blue-200 mb-1">To Date</label>
                <input
                  id="end-date"
                  type="date"
                  className="bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              
              <div className="flex gap-2 self-end mb-0.5">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                >
                  Apply Filter
                </button>
                
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            </div>

            {/* Leads Table */}
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
                  {/* BillCut Row */}
                  <tr className="bg-gray-800/40 hover:bg-gray-700/40 transition-colors">
                    <td className="p-3 border-t border-gray-700 font-medium text-teal-300">
                      BillCut
                    </td>
                    {leadsBySourceData.datasets.map((dataset, idx) => (
                      <td key={idx} className="p-3 text-center border-t border-gray-700 text-gray-100">
                        {dataset.data[0]}
                      </td>
                    ))}
                    <td className="p-3 text-center border-t border-gray-700 font-semibold text-white">
                      {sourceTotals.billcut}
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
                      {sourceTotals.billcut}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Conversion Analytics */}
            <div className="mt-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="text-blue-200 font-medium mb-2">Conversion Analytics</h4>
              <div className="h-40">
                <Bar data={convertedLeadsData} options={horizontalBarOptions} />
              </div>
              
              {/* Conversion rate cards */}
              <div className="grid grid-cols-1 gap-3 mt-4">
                <div className="bg-gradient-to-r from-teal-900/50 to-teal-800/30 p-3 rounded-lg border border-teal-700/20">
                  <div className="flex justify-between items-center">
                    <span className="text-teal-300">BillCut</span>
                    <span className="text-white font-semibold">
                      35 Converted
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-right text-teal-100">
                    28% Rate
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side: Pie chart */}
          <div className="md:w-1/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="h-64 w-full">
                <Pie data={sourceTotalsPieData} options={sourceTotalsPieOptions} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="bg-gradient-to-br from-teal-900/70 to-teal-800/50 p-3 rounded-lg border border-teal-700/30 shadow-md flex justify-between items-center">
                <div>
                  <p className="text-teal-300 font-medium">BillCut</p>
                  <p className="text-xl font-bold text-white">{sourceTotals.billcut}</p>
                </div>
                <div className="text-white text-sm bg-teal-800/60 rounded-md px-2 py-1 font-medium">
                  100%
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-900/70 to-purple-900/70 p-3 rounded-lg border border-blue-700/30 shadow-md">
                <p className="text-blue-200 font-medium">Total Leads</p>
                <p className="text-2xl font-bold text-white">
                  {sourceTotals.billcut}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}