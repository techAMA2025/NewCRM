'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import BillcutSidebar from '@/components/navigation/BillcutSidebar';
import { CalendarDaysIcon, FunnelIcon, ChartBarIcon, UserGroupIcon, PhoneIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface SalesUser {
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

interface LeadStatusCount {
  userId: string;
  userName: string;
  statusCounts: {
    [key: string]: number;
  };
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface SummaryMetrics {
  totalLeads: number;
  conversionRate: number;
  activeLeads: number;
  totalSales: number;
}

interface ChartProps {
  distribution: LeadStatusCount;
}

interface TeamChartProps {
  leadStatusDistribution: LeadStatusCount[];
}

const LEAD_STATUSES = [
  'No Status',
  'Interested',
  'Not Interested',
  'Not Answering',
  'Callback',
  'Converted',
  'Loan Required',
  'Cibil Issue',
  'Closed Lead'
];

const LEAD_SOURCES = ['credsettlee', 'ama', 'settleloans', 'billcut'];

const DATE_RANGES = {
  all: 'All Time',
  today: 'Today',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  last60days: 'Last 60 Days',
  custom: 'Custom Range'
};

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#FF6B6B',
  '#4ECDC4'
];

export default function SalesReport() {
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [leadStatusDistribution, setLeadStatusDistribution] = useState<LeadStatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedRange, setSelectedRange] = useState<string>('today');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: new Date(),
    endDate: new Date()
  });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics>({
    totalLeads: 0,
    conversionRate: 0,
    activeLeads: 0,
    totalSales: 0
  });
  const [userRole, setUserRole] = useState<string>('');

  const getDateRange = (range: string): DateRange => {
    const today = new Date();
    today.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds(), new Date().getMilliseconds());
    console.log(today);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);


    switch (range) {
      case 'all':
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 10);
        oldDate.setHours(0, 0, 0, 0);
        return { startDate: oldDate, endDate: today };
      case 'today':
        return { startDate: startOfToday, endDate: today };
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        last7.setHours(0, 0, 0, 0);
        return { startDate: last7, endDate: today };
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        last30.setHours(0, 0, 0, 0);
        return { startDate: last30, endDate: today };
      case 'last60days':
        const last60 = new Date(today);
        last60.setDate(last60.getDate() - 60);
        last60.setHours(0, 0, 0, 0);
        return { startDate: last60, endDate: today };
      case 'custom':
        return customDateRange;
      default:
        return { startDate: startOfToday, endDate: today };
    }
  };

  useEffect(() => {
    // Get user role from localStorage
    const localStorageRole = localStorage.getItem('userRole');
    if (localStorageRole) {
      setUserRole(localStorageRole);
      // Set source filter to billcut if user is billcut
      if (localStorageRole === 'billcut') {
        setSelectedSource('billcut');
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'sales'),
          where('status', '==', 'active')
        );
        const usersSnapshot = await getDocs(usersQuery);
        const salesUsersData = usersSnapshot.docs.map(doc => ({
          ...doc.data() as SalesUser,
          id: doc.id
        }));
        setSalesUsers(salesUsersData);

        const { startDate, endDate } = getDateRange(selectedRange);

        let dateQuery;
        if (selectedRange === 'all') {
          dateQuery = query(collection(db, 'crm_leads'));
        } else {
          dateQuery = query(
            collection(db, 'crm_leads'),
            where('synced_at', '>=', Timestamp.fromDate(startDate)),
            where('synced_at', '<=', Timestamp.fromDate(endDate))
          );
        }
        const leadsSnapshot = await getDocs(dateQuery);

        const leadsDistribution: LeadStatusCount[] = [];

        for (const user of salesUsersData) {
          const statusCounts: { [key: string]: number } = {};
          LEAD_STATUSES.forEach(status => {
            statusCounts[status] = 0;
          });

          leadsSnapshot.docs.forEach(doc => {
            const leadData = doc.data();
            if (
              leadData.assignedToId === user.id &&
              (selectedSource === 'all' || leadData.source_database === selectedSource)
            ) {
              const status = leadData.status || 'No Status';
              statusCounts[status] = (statusCounts[status] || 0) + 1;
            }
          });

          leadsDistribution.push({
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            statusCounts
          });
        }

        setLeadStatusDistribution(leadsDistribution);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRange, selectedSource, customDateRange]);

  useEffect(() => {
    const calculateSummaryMetrics = (distribution: LeadStatusCount[]) => {
      const totalLeads = distribution.reduce((sum, dist) => 
        sum + Object.values(dist.statusCounts).reduce((a, b) => a + b, 0), 0
      );
      
      const convertedLeads = distribution.reduce((sum, dist) => 
        sum + (dist.statusCounts['Converted'] || 0), 0
      );

      const activeLeads = distribution.reduce((sum, dist) => 
        sum + (dist.statusCounts['Interested'] || 0) + 
        (dist.statusCounts['Callback'] || 0) +
        (dist.statusCounts['No Status'] || 0), 0
      );

      setSummaryMetrics({
        totalLeads,
        conversionRate: totalLeads ? (convertedLeads / totalLeads) * 100 : 0,
        activeLeads,
        totalSales: convertedLeads
      });
    };

    calculateSummaryMetrics(leadStatusDistribution);
  }, [leadStatusDistribution]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Converted': 'bg-emerald-100 text-emerald-800',
      'Interested': 'bg-indigo-100 text-indigo-800',
      'Not Interested': 'bg-rose-100 text-rose-800',
      'Not Answering': 'bg-amber-100 text-amber-800',
      'Callback': 'bg-violet-100 text-violet-800',
      'Loan Required': 'bg-cyan-100 text-cyan-800',
      'Cibil Issue': 'bg-orange-100 text-orange-800',
      'Closed Lead': 'bg-slate-100 text-slate-800',
      'No Status': 'bg-neutral-100 text-neutral-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Add this new component for individual salesperson chart
  const SalesPersonRadarChart: React.FC<ChartProps> = ({ distribution }) => {
    const data = LEAD_STATUSES.map(status => ({
      name: status,
      value: distribution.statusCounts[status] || 0
    })).filter(item => item.value > 0); // Only show statuses with values

    // Calculate conversion rate
    const totalLeads = Object.values(distribution.statusCounts).reduce((a, b) => a + b, 0);
    const convertedLeads = distribution.statusCounts['Converted'] || 0;
    const conversionRate = totalLeads ? (convertedLeads / totalLeads) * 100 : 0;

    // Custom label renderer function
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
      const RADIAN = Math.PI / 180;
      // Increase the radius to push labels further out
      const radius = outerRadius * 1.4;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      // Adjust text anchor based on position
      const textAnchor = x > cx ? 'start' : 'end';

      return (
        <text 
          x={x} 
          y={y} 
          fill="#374151" 
          textAnchor={textAnchor}
          dominantBaseline="central"
          fontSize="12"
        >
          {`${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
        </text>
      );
    };

    return (
      <div className="flex flex-col items-center">
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                labelLine={true}
                label={renderCustomizedLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Leads']} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <div className="bg-indigo-50 rounded-xl px-6 py-3 shadow-sm">
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-2xl font-bold text-indigo-600">{conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {convertedLeads} out of {totalLeads} leads converted
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Add this new component for team performance bar chart
  const TeamPerformanceChart: React.FC<TeamChartProps> = ({ leadStatusDistribution }) => {
    const data = LEAD_STATUSES.map(status => ({
      status,
      ...leadStatusDistribution.reduce((acc: { [key: string]: number }, dist) => {
        acc[dist.userName] = dist.statusCounts[status] || 0;
        return acc;
      }, {})
    }));

    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            {leadStatusDistribution.map((dist, index) => (
              <Bar
                key={dist.userName}
                dataKey={dist.userName}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Add this new component for conversion rate pie chart
  const ConversionPieChart: React.FC<TeamChartProps> = ({ leadStatusDistribution }) => {
    const data = leadStatusDistribution.map(dist => {
      const total = Object.values(dist.statusCounts).reduce((a: number, b: number) => a + b, 0);
      const converted = dist.statusCounts['Converted'] || 0;
      return {
        name: dist.userName,
        value: (converted / total) * 100
      };
    });

    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, value }: { name: string; value: number }) => `${name}: ${value.toFixed(1)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {userRole === 'billcut' ? <BillcutSidebar /> : <OverlordSidebar />}
      <div className="flex-1">
        <div>
          <div className="mb-3 p-3 relative">
            <div className="flex items-center gap-2 mb-2">
              <ChartBarIcon className="h-7 w-7 text-indigo-500" />
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                Sales Team Report
              </h1>
            </div>
            <p className="mt-1.5 text-base text-gray-600">
              Track and analyze your team's performance across different lead sources and statuses
            </p>
            <div className="absolute top-0 right-0 w-56 h-56 bg-blue-100 rounded-full filter blur-3xl opacity-20 -z-10"></div>
          </div>

          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5 mb-3 px-1.5">
            {/* Total Leads Card */}
            <div className="bg-white rounded-lg shadow-xl p-3 border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500 rounded-full filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Leads</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1.5">{summaryMetrics.totalLeads}</h3>
                </div>
                <div className="bg-teal-100 p-2.5 rounded-xl">
                  <UserGroupIcon className="h-5 w-5 text-teal-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <span className="flex items-center text-teal-600">
                  <span className="font-medium">Active Pipeline</span>
                </span>
              </div>
            </div>

            {/* Conversion Rate Card */}
            <div className="bg-white rounded-lg shadow-xl p-3 border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500 rounded-full filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1.5">
                    {summaryMetrics.conversionRate.toFixed(1)}%
                  </h3>
                </div>
                <div className="bg-emerald-100 p-2.5 rounded-xl">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <span className="flex items-center text-emerald-600">
                  <span className="font-medium">Success Rate</span>
                </span>
              </div>
            </div>

            {/* Active Leads Card */}
            <div className="bg-white rounded-lg shadow-xl p-3 border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500 rounded-full filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Leads</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1.5">{summaryMetrics.activeLeads}</h3>
                </div>
                <div className="bg-blue-100 p-2.5 rounded-xl">
                  <PhoneIcon className="h-5 w-5 text-black" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <span className="flex items-center text-amber-600">
                  <span className="font-medium text-black">In Progress</span>
                </span>
              </div>
            </div>

            {/* Total Sales Card */}
            <div className="bg-white rounded-lg shadow-xl p-3 border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-28 h-28 bg-fuchsia-500 rounded-full filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Sales</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1.5">{summaryMetrics.totalSales}</h3>
                </div>
                <div className="bg-fuchsia-100 p-2.5 rounded-xl">
                  <ChartBarIcon className="h-5 w-5 text-fuchsia-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <span className="flex items-center text-fuchsia-600">
                  <span className="font-medium">Converted Leads</span>
                </span>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white shadow-xl p-3 mb-3 backdrop-blur-lg bg-opacity-90 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full filter blur-3xl opacity-20 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative">
              {/* Date Range Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Date Range</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(DATE_RANGES).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedRange(key);
                        setShowCustomRange(key === 'custom');
                      }}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                        selectedRange === key
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                {showCustomRange && (
                  <div className="mt-6 flex gap-4 animate-fadeIn">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customDateRange.startDate.toISOString().split('T')[0]}
                        onChange={(e) => setCustomDateRange(prev => ({
                          ...prev,
                          startDate: new Date(e.target.value)
                        }))}
                        className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-200 hover:border-blue-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customDateRange.endDate.toISOString().split('T')[0]}
                        onChange={(e) => setCustomDateRange(prev => ({
                          ...prev,
                          endDate: new Date(e.target.value)
                        }))}
                        className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-200 hover:border-blue-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Source Filter */}
              <div className="min-w-[240px]">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-base">Lead Source</span>
                </label>
                {userRole === 'billcut' ? (
                  <div className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-200 hover:border-blue-400 cursor-not-allowed bg-gray-100 px-3 py-2">
                    Billcut
                  </div>
                ) : (
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-200 hover:border-blue-400 cursor-pointer"
                  >
                    <option value="all">All Sources</option>
                    {LEAD_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source.charAt(0).toUpperCase() + source.slice(1)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                <div className="w-16 h-16 border-4 border-transparent border-l-purple-500 rounded-full animate-spin absolute top-0 left-0 [animation-delay:0.2s]"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 mb-3 px-1.5">
                {/* Team Performance Chart */}
                <div className="bg-white shadow-xl p-3 col-span-2">
                  <h3 className="text-lg font-semibold mb-3">Team Performance Overview</h3>
                  <TeamPerformanceChart leadStatusDistribution={leadStatusDistribution} />
                </div>

                {/* Conversion Rate Pie Chart */}
                <div className="bg-white shadow-xl p-3">
                  <h3 className="text-lg font-semibold mb-3">Conversion Rates</h3>
                  <ConversionPieChart leadStatusDistribution={leadStatusDistribution} />
                </div>

                {/* Individual Performance Charts */}
                {leadStatusDistribution.map((distribution) => (
                  <div key={distribution.userId} className="bg-white shadow-xl p-3">
                    <h3 className="text-lg font-semibold mb-3">{distribution.userName}'s Lead Distribution</h3>
                    <SalesPersonRadarChart distribution={distribution} />
                  </div>
                ))}
              </div>

              {/* Original Table Section */}
              <div className="bg-white shadow-xl overflow-hidden backdrop-blur-lg bg-opacity-90 border border-gray-100 transition-all duration-300 hover:shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Sales Person
                        </th>
                        {LEAD_STATUSES.map((status) => (
                          <th key={status} scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex flex-col">
                              <span>{status}</span>
                              <span className="text-[9px] text-gray-400 font-normal normal-case">
                                {leadStatusDistribution.reduce((sum, dist) => sum + (dist.statusCounts[status] || 0), 0)} leads
                              </span>
                            </div>
                          </th>
                        ))}
                        <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total Leads
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leadStatusDistribution.map((distribution, index) => {
                        const total = Object.values(distribution.statusCounts).reduce((a, b) => a + b, 0);
                        return (
                          <tr 
                            key={index} 
                            className="transition-colors duration-200 hover:bg-blue-50/50"
                          >
                            <td className="px-5 py-3 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{distribution.userName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {((distribution.statusCounts['Converted'] || 0) / total * 100).toFixed(1)}% conversion
                              </div>
                            </td>
                            {LEAD_STATUSES.map((status) => (
                              <td key={status} className="px-5 py-3 whitespace-nowrap">
                                <div className="flex flex-col items-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)} transition-all duration-200 hover:scale-110`}>
                                    {distribution.statusCounts[status] || 0}
                                  </span>
                                  <div className="text-[9px] text-gray-400 mt-1">
                                    {((distribution.statusCounts[status] || 0) / total * 100).toFixed(1)}%
                                  </div>
                                </div>
                              </td>
                            ))}
                            <td className="px-5 py-3 whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-bold text-gray-900 bg-blue-50 px-4 py-1 rounded-full">
                                  {total}
                                </span>
                                <div className="text-xs text-gray-500 mt-1">
                                  {((total / summaryMetrics.totalLeads) * 100).toFixed(1)}% of total
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 font-semibold">
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-900">Total</td>
                        {LEAD_STATUSES.map((status) => {
                          const statusTotal = leadStatusDistribution.reduce((sum, dist) => sum + (dist.statusCounts[status] || 0), 0);
                          return (
                            <td key={status} className="px-5 py-3 whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)} transition-all duration-200 hover:scale-110`}>
                                  {statusTotal}
                                </span>
                                <div className="text-[9px] text-gray-400 mt-1">
                                  {((statusTotal / summaryMetrics.totalLeads) * 100).toFixed(1)}%
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900 bg-blue-100 px-4 py-1 rounded-full">
                            {summaryMetrics.totalLeads}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
