'use client'

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as crmDb } from '@/firebase/firebase';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import BillcutSidebar from '@/components/navigation/BillcutSidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { FiUsers, FiTrendingUp, FiTarget, FiDollarSign, FiPhone, FiMail, FiMapPin, FiCalendar, FiActivity, FiPieChart, FiSun, FiMoon } from 'react-icons/fi';

// Types
interface BillcutLead {
  id: string;
  address: string;
  assigned_to: string;
  category: string;
  date: number;
  debt_range: string;
  email: string;
  income: string;
  mobile: string;
  name: string;
  sales_notes: string;
  synced_date: any;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon, color }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {change && (
          <p className={`text-sm mt-2 flex items-center ${
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {change}
          </p>
        )}
      </div>
      <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
  </div>
);

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
];

// Status color function
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'interested':
      return 'bg-green-700 text-white';
    case 'not interested':
      return 'bg-red-900 text-white';
    case 'not answering':
      return 'bg-orange-900 text-white';
    case 'callback':
      return 'bg-yellow-900 text-white';
    case 'converted':
      return 'bg-emerald-900 text-white';
    case 'loan required':
      return 'bg-purple-900 text-white';
    case 'cibil issue':
      return 'bg-rose-900 text-white';
    case 'closed lead':
      return 'bg-gray-500 text-white';
    case 'select status':
      return 'bg-gray-400 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

// Status badge color function (for table cells with borders)
const getStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'interested':
      return 'bg-green-700 text-white border-green-700';
    case 'not interested':
      return 'bg-red-900 text-white border-red-700';
    case 'not answering':
      return 'bg-orange-900 text-white border-orange-700';
    case 'callback':
      return 'bg-yellow-900 text-white border-yellow-700';
    case 'converted':
      return 'bg-emerald-900 text-white border-emerald-700';
    case 'loan required':
      return 'bg-purple-900 text-white border-purple-700';
    case 'cibil issue':
      return 'bg-rose-900 text-white border-rose-700';
    case 'closed lead':
      return 'bg-gray-500 text-white border-gray-700';
    case 'select status':
      return 'bg-gray-400 text-white border-gray-600';
    default:
      return 'bg-gray-400 text-white border-gray-600';
  }
};

const BillcutLeadReportPage = () => {
  const [leads, setLeads] = useState<BillcutLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [userRole, setUserRole] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  // Function to navigate to billcut leads page with filters
  const navigateToLeadsWithFilters = (salesperson: string, status: string) => {
    const params = new URLSearchParams();
    
    // Add salesperson filter
    if (salesperson && salesperson !== 'Unassigned') {
      params.append('salesPerson', salesperson);
    }
    
    // Add status filter
    if (status && status !== 'No Status') {
      params.append('status', status);
    } else if (status === 'No Status') {
      params.append('status', 'No Status');
    }
    
    // Navigate to billcut leads page with filters (without date restrictions)
    router.push(`/billcutleads?${params.toString()}`);
  };

  // Function to handle quick date range filters
  const handleQuickDateFilter = (filter: string) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (filter) {
      case 'today':
        // Set to start of current day (00:00:00)
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        // Set to current time
        endDate = new Date();
        break;
      case 'thisMonth':
        // Set to start of current month (00:00:00)
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        // Set to current time
        endDate = new Date();
        break;
      case 'last30Days':
        // Set to 30 days ago at start of day (00:00:00)
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        // Set to current time
        endDate = new Date();
        break;
      case 'last60Days':
        // Set to 60 days ago at start of day (00:00:00)
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 60);
        startDate.setHours(0, 0, 0, 0);
        // Set to current time
        endDate = new Date();
        break;
    }

    // Convert to local date strings to ensure correct timezone handling
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateRange({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    });
  };

  // Check user role and theme preference on component mount
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    const storedTheme = localStorage.getItem('theme');
    if (storedRole) {
      setUserRole(storedRole);
    }
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Fetch leads data
  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoading(true);
      try {
        const billcutLeadsRef = collection(crmDb, 'billcutLeads');
        
        let queryConstraints = [];
        
        if (dateRange.startDate) {
          const startDate = new Date(dateRange.startDate);
          startDate.setHours(0, 0, 0, 0);
          queryConstraints.push(where('date', '>=', startDate.getTime()));
        }
        
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          // If it's today, use current time, otherwise use end of day
          if (endDate.toDateString() === new Date().toDateString()) {
            endDate.setTime(new Date().getTime());
          } else {
            endDate.setHours(23, 59, 59, 999);
          }
          queryConstraints.push(where('date', '<=', endDate.getTime()));
        }
        
        const q = queryConstraints.length > 0 ? query(billcutLeadsRef, ...queryConstraints) : billcutLeadsRef;
        const querySnapshot = await getDocs(q);
        
        const fetchedLeads = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as BillcutLead));
        
        setLeads(fetchedLeads);
      } catch (error) {
        console.error("Error fetching billcut leads:", error);
        toast.error("Failed to load billcut leads data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [dateRange]);

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!leads.length) return null;

    // Basic metrics
    const totalLeads = leads.length;
    const uniqueAssignees = new Set(leads.map(lead => lead.assigned_to)).size;
    
    // Calculate average debt range
    const debtRanges: number[] = leads.map(lead => {
      const range = lead.debt_range || 'Not specified';
      if (range === 'Not specified') return null;
      const [min, max] = range.split(' - ').map(r => {
        const num = parseInt(r);
        return isNaN(num) ? 0 : num * 100000; // Convert lakhs to actual amount, handle invalid numbers
      });
      return (min + max) / 2;
    }).filter((val): val is number => val !== null && val > 0); // Filter out null and zero values
    
    const averageDebt = debtRanges.length > 0 
      ? Math.round(debtRanges.reduce((sum, val) => sum + val, 0) / debtRanges.length)
      : 0;
    
    // Calculate conversion rate
    const convertedLeads = leads.filter(lead => lead.category === 'Converted').length;
    const conversionRate = (convertedLeads / totalLeads) * 100;
    
    // Category distribution with percentage
    const categoryDistribution = leads.reduce((acc, lead) => {
      const category = lead.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryDistribution).map(([name, value]) => ({
      name,
      value,
      percentage: (value / totalLeads) * 100
    }));

    // Assigned to distribution
    const assigneeDistribution = leads.reduce((acc, lead) => {
      const assignee = lead.assigned_to || 'Unassigned';
      acc[assignee] = (acc[assignee] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Debt range distribution
    const debtRangeDistribution = leads.reduce((acc, lead) => {
      const range = lead.debt_range || 'Not specified';
      // Sort the ranges numerically for better display
      if (range !== 'Not specified') {
        const [min, max] = range.split(' - ').map(r => {
          const num = parseInt(r);
          return num * 100000; // Convert lakhs to actual amount
        });
        acc[range] = (acc[range] || 0) + 1;
      } else {
        acc[range] = (acc[range] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Sort debt ranges for better visualization
    const sortedDebtRanges = Object.entries(debtRangeDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        if (a.name === 'Not specified') return 1;
        if (b.name === 'Not specified') return -1;
        const [aMin] = a.name.split(' - ').map(r => parseInt(r));
        const [bMin] = b.name.split(' - ').map(r => parseInt(r));
        return aMin - bMin;
      });

    // Income distribution
    const incomeRanges = {
      '0-25K': 0,
      '25K-50K': 0,
      '50K-75K': 0,
      '75K-100K': 0,
      '100K+': 0
    };
    
    leads.forEach(lead => {
      const income = parseInt(lead.income) || 0;
      if (income <= 25000) incomeRanges['0-25K']++;
      else if (income <= 50000) incomeRanges['25K-50K']++;
      else if (income <= 75000) incomeRanges['50K-75K']++;
      else if (income <= 100000) incomeRanges['75K-100K']++;
      else incomeRanges['100K+']++;
    });

    // Geographic distribution (extract state from pincode)
    const stateDistribution = leads.reduce((acc, lead) => {
      const address = lead.address || '';
      // Extract pincode (6 digits) from address
      const pincodeMatch = address.match(/\b\d{6}\b/);
      const pincode = pincodeMatch ? pincodeMatch[0] : '';
      
      let state = 'Unknown';
      if (pincode) {
        const firstTwoDigits = parseInt(pincode.substring(0, 2));
        
        if (firstTwoDigits === 11) state = 'Delhi';
        else if (firstTwoDigits >= 12 && firstTwoDigits <= 13) state = 'Haryana';
        else if (firstTwoDigits >= 14 && firstTwoDigits <= 16) state = 'Punjab';
        else if (firstTwoDigits === 17) state = 'Himachal Pradesh';
        else if (firstTwoDigits >= 18 && firstTwoDigits <= 19) state = 'Jammu & Kashmir';
        else if (firstTwoDigits >= 20 && firstTwoDigits <= 28) state = 'Uttar Pradesh';
        else if (firstTwoDigits >= 30 && firstTwoDigits <= 34) state = 'Rajasthan';
        else if (firstTwoDigits >= 36 && firstTwoDigits <= 39) state = 'Gujarat';
        else if (firstTwoDigits >= 0 && firstTwoDigits <= 44) state = 'Maharashtra';
        else if (firstTwoDigits >= 45 && firstTwoDigits <= 48) state = 'Madhya Pradesh';
        else if (firstTwoDigits === 49) state = 'Chhattisgarh';
        else if (firstTwoDigits >= 50 && firstTwoDigits <= 53) state = 'Andhra Pradesh/Telangana';
        else if (firstTwoDigits >= 56 && firstTwoDigits <= 59) state = 'Karnataka';
        else if (firstTwoDigits >= 60 && firstTwoDigits <= 64) state = 'Tamil Nadu';
        else if (firstTwoDigits >= 67 && firstTwoDigits <= 69) state = 'Kerala';
        else if (firstTwoDigits === 682) state = 'Lakshadweep';
        else if (firstTwoDigits >= 70 && firstTwoDigits <= 74) state = 'West Bengal';
        else if (firstTwoDigits === 744) state = 'Andaman & Nicobar';
        else if (firstTwoDigits >= 75 && firstTwoDigits <= 77) state = 'Odisha';
        else if (firstTwoDigits === 78) state = 'Assam';
        else if (firstTwoDigits === 79) state = 'North Eastern States';
        else if (firstTwoDigits >= 80 && firstTwoDigits <= 85) state = 'Bihar';
        else if ((firstTwoDigits >= 80 && firstTwoDigits <= 83) || firstTwoDigits === 92) state = 'Jharkhand';
      }
      
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort states by count in descending order
    const sortedStateDistribution = Object.entries(stateDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Take top 10 states

    // Time-based analysis
    const monthlyDistribution = leads.reduce((acc, lead) => {
      const date = new Date(lead.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sales performance
    const salesPerformance = Object.entries(assigneeDistribution).map(([name, count]) => {
      const assigneeLeads = leads.filter(lead => lead.assigned_to === name);
      const interestedCount = assigneeLeads.filter(lead => lead.category === 'Interested').length;
      const convertedCount = assigneeLeads.filter(lead => lead.category === 'Converted').length;
      const conversionRate = count > 0 ? ((interestedCount + convertedCount) / count * 100) : 0;
      
      return {
        name,
        totalLeads: count,
        interested: interestedCount,
        converted: convertedCount,
        conversionRate: Math.round(conversionRate * 100) / 100
      };
    });

    // Contact info analysis
    const contactAnalysis = {
      hasEmail: leads.filter(lead => lead.email && lead.email !== '').length,
      hasPhone: leads.filter(lead => lead.mobile && lead.mobile !== '').length,
      hasNotes: leads.filter(lead => lead.sales_notes && lead.sales_notes !== '').length
    };

    return {
      totalLeads,
      uniqueAssignees,
      averageDebt,
      conversionRate: Math.round(conversionRate * 100) / 100,
      categoryDistribution: categoryData,
      assigneeDistribution: Object.entries(assigneeDistribution).map(([name, value]) => ({ name, value })),
      debtRangeDistribution: sortedDebtRanges,
      incomeDistribution: Object.entries(incomeRanges).map(([name, value]) => ({ name, value })),
      stateDistribution: sortedStateDistribution,
      monthlyDistribution: Object.entries(monthlyDistribution).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name)),
      salesPerformance,
      contactAnalysis
    };
  }, [leads]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {userRole === 'overlord' ? <OverlordSidebar /> : <BillcutSidebar />}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {userRole === 'overlord' ? <OverlordSidebar /> : <BillcutSidebar />}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-gray-300">No data available for analysis</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {userRole === 'overlord' ? <OverlordSidebar /> : <BillcutSidebar />}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Billcut Leads Dashboard</h1>
            
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <FiSun className="w-6 h-6 text-yellow-500" />
              ) : (
                <FiMoon className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
          
          {/* Date Range Filter */}
          <div className="my-4 flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quick Filters</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleQuickDateFilter('today')}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickDateFilter('thisMonth')}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  This Month
                </button>
                <button
                  onClick={() => handleQuickDateFilter('last30Days')}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => handleQuickDateFilter('last60Days')}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  Last 60 Days
                </button>
                <button
                  onClick={() => setDateRange({ startDate: '', endDate: '' })}
                  className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Leads"
              value={analytics.totalLeads.toLocaleString()}
              icon={<FiUsers size={24} />}
              color="#3B82F6"
            />
            <MetricCard
              title="Active Sales Reps"
              value={analytics.uniqueAssignees}
              icon={<FiTarget size={24} />}
              color="#10B981"
            />
            <MetricCard
              title="Average Debt"
              value={analytics.averageDebt > 0 ? `₹${(analytics.averageDebt / 100000).toFixed(2)}L` : '₹0.00L'}
              icon={<FiDollarSign size={24} />}
              color="#F59E0B"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${analytics.conversionRate}%`}
              icon={<FiTrendingUp size={24} />}
              color="#EF4444"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Category Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiPieChart className="mr-2" />
                Lead Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={analytics.categoryDistribution}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    label={{ value: 'Percentage', angle: 90, position: 'insideRight' }}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1F2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      color: isDarkMode ? '#fff' : '#000'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Count') return [value, 'Number of Leads'];
                      if (name === 'Percentage') return [`${value.toFixed(1)}%`, 'Percentage'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="value" 
                    fill="#3B82F6" 
                    name="Count"
                    barSize={40}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Percentage"
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Sales Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiActivity className="mr-2" />
                Sales Rep Performance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.salesPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1F2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      color: isDarkMode ? '#fff' : '#000'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalLeads" fill="#3B82F6" name="Total Leads" />
                  <Bar dataKey="interested" fill="#10B981" name="Interested" />
                  <Bar dataKey="converted" fill="#F59E0B" name="Converted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Debt Range Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiDollarSign className="mr-2" />
                Debt Range Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.debtRangeDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" stroke={isDarkMode ? "#fff" : "#000"} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    tick={{ fontSize: 12 }}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1F2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      color: isDarkMode ? '#fff' : '#000'
                    }}
                    formatter={(value: number) => [`${value} leads`, 'Count']}
                    labelFormatter={(label) => `Debt Range: ${label}`}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#8B5CF6"
                    name="Number of Leads"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Income Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiTrendingUp className="mr-2" />
                Income Range Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.incomeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analytics.incomeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1F2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      color: isDarkMode ? '#fff' : '#000'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Time-based and Geographic Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiCalendar className="mr-2" />
                Monthly Lead Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.monthlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1F2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      color: isDarkMode ? '#fff' : '#000'
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Geographic Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiMapPin className="mr-2" />
                Top States Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.stateDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1F2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      color: isDarkMode ? '#fff' : '#000'
                    }}
                  />
                  <Bar dataKey="value" fill="#EC4899" name="Number of Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Rate Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiTarget className="mr-2" />
              Sales Rep Conversion Rates
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analytics.salesPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  stroke={isDarkMode ? "#fff" : "#000"}
                />
                <YAxis 
                  yAxisId="left"
                  stroke={isDarkMode ? "#fff" : "#000"}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  stroke={isDarkMode ? "#fff" : "#000"}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1F2937' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    color: isDarkMode ? '#fff' : '#000'
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="totalLeads" fill="#3B82F6" name="Total Leads" />
                <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#EF4444" strokeWidth={3} name="Conversion Rate %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Salesperson-wise Lead Status Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiUsers className="mr-2" />
              Salesperson-wise Lead Status Analytics
            </h3>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {analytics.salesPerformance.map((rep, index) => (
                <div key={rep.name} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{rep.name}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{rep.totalLeads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Interested:</span>
                      <span className="font-medium text-green-600">{rep.interested}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Converted:</span>
                      <span className="font-medium text-blue-600">{rep.converted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Rate:</span>
                      <span className="font-medium text-purple-600">{rep.conversionRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800">
                      Salesperson
                    </th>
                    {analytics.categoryDistribution.map(category => (
                      <th key={category.name} className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getStatusColor(category.name)}`}>
                        {category.name}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800">
                      Conversion Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.salesPerformance.map((rep) => {
                    // Get detailed status breakdown for this salesperson
                    const repLeads = leads.filter(lead => lead.assigned_to === rep.name);
                    const statusBreakdown = analytics.categoryDistribution.reduce((acc, category) => {
                      acc[category.name] = repLeads.filter(lead => lead.category === category.name).length;
                      return acc;
                    }, {} as Record<string, number>);

                    return (
                      <tr key={rep.name} className="hover:opacity-80 transition-opacity duration-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white bg-gray-800">
                          {rep.name}
                        </td>
                        {analytics.categoryDistribution.map(category => (
                          <td key={category.name} className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(category.name)}`}>
                            <div className="flex items-center">
                              <span 
                                className={`mr-2 px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadgeColor(category.name)} cursor-pointer hover:opacity-80 transition-opacity duration-200`}
                                onClick={() => navigateToLeadsWithFilters(rep.name, category.name)}
                                title={`Click to view ${category.name} leads for ${rep.name}`}
                              >
                                {statusBreakdown[category.name] || 0}
                              </span>
                              {rep.totalLeads > 0 && (
                                <span className="text-xs text-white opacity-80">
                                  ({((statusBreakdown[category.name] || 0) / rep.totalLeads * 100).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white bg-gray-800">
                          {rep.totalLeads}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white bg-gray-800">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rep.conversionRate >= 20 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            rep.conversionRate >= 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {rep.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Performance Insights */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Top Performer</h4>
                {(() => {
                  const topPerformer = analytics.salesPerformance.reduce((max, rep) => 
                    rep.conversionRate > max.conversionRate ? rep : max
                  );
                  return (
                    <div className="text-sm">
                      <p className="text-blue-700 dark:text-blue-300">{topPerformer.name}</p>
                      <p className="text-blue-600 dark:text-blue-400 font-medium">{topPerformer.conversionRate}% conversion rate</p>
                    </div>
                  );
                })()}
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">Most Leads</h4>
                {(() => {
                  const mostLeads = analytics.salesPerformance.reduce((max, rep) => 
                    rep.totalLeads > max.totalLeads ? rep : max
                  );
                  return (
                    <div className="text-sm">
                      <p className="text-green-700 dark:text-green-300">{mostLeads.name}</p>
                      <p className="text-green-600 dark:text-green-400 font-medium">{mostLeads.totalLeads} total leads</p>
                    </div>
                  );
                })()}
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">Most Converted</h4>
                {(() => {
                  const mostConverted = analytics.salesPerformance.reduce((max, rep) => 
                    rep.converted > max.converted ? rep : max
                  );
                  return (
                    <div className="text-sm">
                      <p className="text-purple-700 dark:text-purple-300">{mostConverted.name}</p>
                      <p className="text-purple-600 dark:text-purple-400 font-medium">{mostConverted.converted} conversions</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillcutLeadReportPage;
