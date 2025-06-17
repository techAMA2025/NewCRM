'use client'

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as crmDb } from '@/firebase/firebase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  ComposedChart
} from 'recharts';
import { FiUsers, FiTrendingUp, FiTarget, FiDollarSign, FiPhone, FiMail, FiMapPin, FiCalendar, FiActivity, FiPieChart } from 'react-icons/fi';

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

const BillcutLeadReportPage = () => {
  const [leads, setLeads] = useState<BillcutLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [userRole, setUserRole] = useState<string>('');

  // Check user role on component mount
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setUserRole(storedRole);
    }
  }, []);

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
          endDate.setHours(23, 59, 59, 999);
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
    const averageIncome = leads.reduce((sum, lead) => sum + (parseInt(lead.income) || 0), 0) / totalLeads;
    
    // Category distribution
    const categoryDistribution = leads.reduce((acc, lead) => {
      const category = lead.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
      averageIncome: Math.round(averageIncome),
      categoryDistribution: Object.entries(categoryDistribution).map(([name, value]) => ({ name, value })),
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
      <div className="flex min-h-screen bg-gray-50">
        {userRole === 'overlord' ? <OverlordSidebar /> : <BillcutSidebar />}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        {userRole === 'overlord' ? <OverlordSidebar /> : <BillcutSidebar />}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-600">No data available for analysis</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {userRole === 'overlord' ? <OverlordSidebar /> : <BillcutSidebar />}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Billcut Leads Dashboard</h1>
            
            {/* Date Range Filter */}
            <div className="mt-4 flex gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
                className="mt-6 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>
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
              title="Average Income"
              value={`₹${analytics.averageIncome.toLocaleString()}`}
              icon={<FiDollarSign size={24} />}
              color="#F59E0B"
            />
            <MetricCard
              title="Contact Rate"
              value={`${Math.round((analytics.contactAnalysis.hasPhone / analytics.totalLeads) * 100)}%`}
              icon={<FiPhone size={24} />}
              color="#EF4444"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Category Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiPieChart className="mr-2" />
                Lead Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Sales Performance */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiActivity className="mr-2" />
                Sales Rep Performance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.salesPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiDollarSign className="mr-2" />
                Debt Range Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.debtRangeDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Time-based and Geographic Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Trend */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiCalendar className="mr-2" />
                Monthly Lead Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.monthlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Geographic Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiMapPin className="mr-2" />
                Top States Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.stateDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#EC4899" name="Number of Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Rate Analysis */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FiTarget className="mr-2" />
              Sales Rep Conversion Rates
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analytics.salesPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="totalLeads" fill="#3B82F6" name="Total Leads" />
                <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#EF4444" strokeWidth={3} name="Conversion Rate %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>


        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default BillcutLeadReportPage;
