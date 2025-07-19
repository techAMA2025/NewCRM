'use client'

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as crmDb } from '@/firebase/firebase';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import BillcutSidebar from '@/components/navigation/BillcutSidebar';
import AdminSidebar from '@/components/navigation/AdminSidebar';
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
import { FiUsers, FiTrendingUp, FiTarget, FiDollarSign, FiPhone, FiMail, FiMapPin, FiCalendar, FiActivity, FiPieChart, FiSun, FiMoon, FiFilter, FiX } from 'react-icons/fi';

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
  convertedAt?: any;
  lastModified?: any;
  status?: string;
  language_barrier?: string;
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
    case 'short loan':
      return 'bg-teal-900 text-white';
    case 'cibil issue':
      return 'bg-rose-900 text-white';
    case 'retargeting':
      return 'bg-cyan-900 text-white';
    case 'closed lead':
      return 'bg-gray-500 text-white';
    case 'select status':
      return 'bg-gray-400 text-white';
    case 'language barrier':
      return 'bg-indigo-900 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

// Status short form function
const getStatusShortForm = (status: string) => {
  switch (status.toLowerCase()) {
    case 'interested':
      return 'int';
    case 'not interested':
      return 'ni';
    case 'not answering':
      return 'na';
    case 'callback':
      return 'cb';
    case 'converted':
      return 'conv';
    case 'loan required':
      return 'lr';
    case 'cibil issue':
      return 'ci';
    case 'retargeting':
      return 'rt';
    case 'closed lead':
      return 'cl';
    case 'select status':
      return 'ss';
    case 'language barrier':
      return 'lb';
    case 'future potential':
      return 'fp';
    default:
      return status;
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
    case 'short loan':
      return 'bg-teal-900 text-white border-teal-700';
    case 'cibil issue':
      return 'bg-rose-900 text-white border-rose-700';
    case 'retargeting':
      return 'bg-cyan-900 text-white border-cyan-700';
    case 'closed lead':
      return 'bg-gray-500 text-white border-gray-700';
    case 'select status':
      return 'bg-gray-400 text-white border-gray-600';
    case 'language barrier':
      return 'bg-indigo-900 text-white border-indigo-700';
    default:
      return 'bg-gray-400 text-white border-gray-600';
  }
};

// Add new interface for productivity stats
interface ProductivityStats {
  userId: string;
  userName: string;
  date: string;
  leadsWorked: number;
  lastActivity: Date;
  statusBreakdown: { [key: string]: number };
}

// Add new interface for productivity date range
interface ProductivityDateRange {
  startDate: Date;
  endDate: Date;
}

// All possible statuses in uniform sequence
const getAllStatuses = () => [
  'No Status',
  'Interested',
  'Not Interested',
  'Not Answering',
  'Callback',
  'Future Potential',
  'Converted',
  'Loan Required',
  'Short Loan',
  'Cibil Issue',
  'Language Barrier',
  'Retargeting',
  'Closed Lead'
];

const BillcutLeadReportContent = () => {
  const [leads, setLeads] = useState<BillcutLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [userRole, setUserRole] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const router = useRouter();

  // Add state for productivity tracking
  const [productivityStats, setProductivityStats] = useState<ProductivityStats[]>([]);
  const [productivityDateRange, setProductivityDateRange] = useState<ProductivityDateRange>({
    startDate: new Date(),
    endDate: new Date()
  });
  const [showProductivityCustomRange, setShowProductivityCustomRange] = useState(false);
  const [selectedProductivityRange, setSelectedProductivityRange] = useState<string>('today');
  const [productivityLoading, setProductivityLoading] = useState(false);

  // Helper function to navigate to billcut leads page with filters
  const navigateToLeadsWithFilters = (salesperson: string, status: string) => {
    const params = new URLSearchParams();
    
    // Add salesperson filter
    if (salesperson && salesperson !== 'Unassigned') {
      params.append('salesPerson', salesperson);
    } else if (salesperson === 'Unassigned') {
      // For unassigned leads, pass empty string to match the billcut leads page logic
      params.append('salesPerson', '');
    }
    
    // Add status filter - map to exact case-sensitive values expected by billcut leads page
    if (status && status !== 'No Status') {
      // Map status values to match the exact case-sensitive values in billcut leads page
      const statusMapping: { [key: string]: string } = {
        'interested': 'Interested',
        'not interested': 'Not Interested',
        'not answering': 'Not Answering',
        'callback': 'Callback',
        'converted': 'Converted',
        'loan required': 'Loan Required',
        'cibil issue': 'Cibil Issue',
        'closed lead': 'Closed Lead',
        '-': 'No Status'
      };
      
      const mappedStatus = statusMapping[status.toLowerCase()] || status;
      params.append('status', mappedStatus);
    } else if (status === 'No Status') {
      params.append('status', 'No Status');
    }
    
    // Debug logging
    console.log('Navigating to billcut leads with filters:', {
      originalSalesperson: salesperson,
      originalStatus: status,
      finalParams: params.toString()
    });
    
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
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setDate(today.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(today.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last30Days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case 'last60Days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 60);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case 'last90Days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
    }

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
    setSelectedPreset(filter);
    setShowDatePicker(false);
  };

  // Function to clear date filters
  const clearDateFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    setSelectedPreset('');
    setShowDatePicker(false);
  };

  // Function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Function to get current date range display text
  const getDateRangeDisplay = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return 'All Time';
    }
    if (dateRange.startDate && dateRange.endDate) {
      return `${formatDateForDisplay(dateRange.startDate)} - ${formatDateForDisplay(dateRange.endDate)}`;
    }
    if (dateRange.startDate) {
      return `From ${formatDateForDisplay(dateRange.startDate)}`;
    }
    if (dateRange.endDate) {
      return `Until ${formatDateForDisplay(dateRange.endDate)}`;
    }
    return 'All Time';
  };

  // Function to handle custom date range changes
  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setCustomDateRange(prev => ({ ...prev, [field]: value }));
  };

  // Function to apply custom date range
  const applyCustomDateRange = () => {
    setDateRange(customDateRange);
    setSelectedPreset('');
    setShowDatePicker(false);
  };

  // Function to cancel custom date selection
  const cancelCustomDateSelection = () => {
    setCustomDateRange(dateRange);
    setShowDatePicker(false);
  };

  // Function to get current month and year for display
  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      month: now.getMonth(),
      year: now.getFullYear()
    };
  };

  // Function to get month name
  const getMonthName = (monthIndex: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  };

  // Function to generate calendar days for a month
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: Array<{ day: number | string; isEmpty: boolean }> = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: '', isEmpty: true });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isEmpty: false });
    }
    
    return days;
  };

  // Function to create a date string in local timezone
  const createLocalDateString = (year: number, month: number, day: number) => {
    // Create date in local timezone to avoid timezone conversion issues
    const date = new Date(year, month, day, 12, 0, 0, 0); // Use noon to avoid timezone edge cases
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  // Helper function to convert date to IST
  const toIST = (date: Date): Date => {
    const utcDate = new Date(date);
    const utcTime = utcDate.getTime();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = utcTime + istOffset;
    return new Date(istTime);
  };

  // Helper function to convert IST to UTC for Firestore queries
  const toUTC = (istDate: Date): Date => {
    const istTime = new Date(istDate).getTime();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = istTime - istOffset;
    return new Date(utcTime);
  };

  // Helper function to get productivity date range
  const getProductivityDateRange = (range: string): ProductivityDateRange => {
    const nowIST = toIST(new Date());
    const todayIST = new Date(nowIST);
    todayIST.setHours(23, 59, 59, 999);
    
    const startOfTodayIST = new Date(nowIST);
    startOfTodayIST.setHours(0, 0, 0, 0);

    switch (range) {
      case 'today':
        return { startDate: startOfTodayIST, endDate: todayIST };
      case 'yesterday':
        const yesterdayStartIST = new Date(startOfTodayIST);
        yesterdayStartIST.setDate(yesterdayStartIST.getDate() - 1);
        const yesterdayEndIST = new Date(yesterdayStartIST);
        yesterdayEndIST.setHours(23, 59, 59, 999);
        return { startDate: yesterdayStartIST, endDate: yesterdayEndIST };
      case 'last7days':
        const last7IST = new Date(startOfTodayIST);
        last7IST.setDate(last7IST.getDate() - 6);
        return { startDate: last7IST, endDate: todayIST };
      case 'last30days':
        const last30IST = new Date(startOfTodayIST);
        last30IST.setDate(last30IST.getDate() - 29);
        return { startDate: last30IST, endDate: todayIST };
      case 'custom':
        const customStartIST = new Date(productivityDateRange.startDate);
        customStartIST.setHours(0, 0, 0, 0);
        const customEndIST = new Date(productivityDateRange.endDate);
        customEndIST.setHours(23, 59, 59, 999);
        return { startDate: customStartIST, endDate: customEndIST };
      default:
        return { startDate: startOfTodayIST, endDate: todayIST };
    }
  };

  // Helper functions for productivity data
  const getProductivityDisplayName = () => {
    switch (selectedProductivityRange) {
      case 'today': return "Today's Productivity";
      case 'yesterday': return "Yesterday's Productivity";
      case 'last7days': return "Last 7 Days Productivity";
      case 'last30days': return "Last 30 Days Productivity";
      case 'custom': return "Custom Range Productivity";
      default: return "Today's Productivity";
    }
  };

  const getProductivityColor = () => {
    switch (selectedProductivityRange) {
      case 'today': return 'text-emerald-600';
      case 'yesterday': return 'text-blue-600';
      case 'last7days': return 'text-purple-600';
      case 'last30days': return 'text-indigo-600';
      case 'custom': return 'text-orange-600';
      default: return 'text-emerald-600';
    }
  };

  const getProductivityGradient = () => {
    switch (selectedProductivityRange) {
      case 'today': return 'from-emerald-600/5 to-green-600/5';
      case 'yesterday': return 'from-blue-600/5 to-indigo-600/5';
      case 'last7days': return 'from-purple-600/5 to-violet-600/5';
      case 'last30days': return 'from-indigo-600/5 to-blue-600/5';
      case 'custom': return 'from-orange-600/5 to-amber-600/5';
      default: return 'from-emerald-600/5 to-green-600/5';
    }
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

  // Initialize custom date range when date picker is opened
  useEffect(() => {
    if (showDatePicker) {
      setCustomDateRange(dateRange);
    }
  }, [showDatePicker, dateRange]);

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

  // Separate useEffect for productivity tracking
  useEffect(() => {
    const fetchProductivityData = async () => {
      try {
        setProductivityLoading(true);

        // Get productivity date range
        const { startDate, endDate } = getProductivityDateRange(selectedProductivityRange);
        
        console.log('Productivity tracking (IST):', {
          range: selectedProductivityRange,
          startDate: startDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          endDate: endDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        });

        // Convert IST dates to UTC for Firestore query
        const startDateUTC = toUTC(startDate);
        const endDateUTC = toUTC(endDate);
        
        console.log('Productivity Firestore query (UTC):', {
          startDateUTC: startDateUTC.toISOString(),
          endDateUTC: endDateUTC.toISOString()
        });
        
        const productivityQuery = query(
          collection(crmDb, 'billcutLeads'),
          where('lastModified', '>=', startDateUTC),
          where('lastModified', '<=', endDateUTC)
        );

        const productivitySnapshot = await getDocs(productivityQuery);
        console.log('Found leads for productivity tracking:', productivitySnapshot.docs.length);

        // Group leads by user and date
        const productivityMap: { [key: string]: { [key: string]: ProductivityStats } } = {};

        productivitySnapshot.docs.forEach(doc => {
          const leadData = doc.data();
          
          // Only process if lead has lastModified and status is not "-"
          if (leadData.lastModified && leadData.category !== '-') {
            // Use lastModified as UTC (do NOT convert to IST)
            const lastModifiedUTC = leadData.lastModified.toDate();
            
            // For last7days and last30days, use a single date key to aggregate all data
            // For other ranges, use individual dates
            let dateKey: string;
            if (selectedProductivityRange === 'last7days' || selectedProductivityRange === 'last30days') {
              // Use a single key for the entire period
              dateKey = selectedProductivityRange === 'last7days' ? 'Last 7 Days' : 'Last 30 Days';
            } else {
              // Use individual date keys for other ranges
              dateKey = lastModifiedUTC.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }).split(',').slice(1).join(',').trim() || lastModifiedUTC.toISOString().split('T')[0];
            }
            
            const userId = leadData.assigned_to || 'Unassigned';
            const userName = leadData.assigned_to || 'Unassigned';
            const status = leadData.category || 'No Status';
            
            // Initialize user if not exists
            if (!productivityMap[userId]) {
              productivityMap[userId] = {};
            }
            
            // Initialize date if not exists
            if (!productivityMap[userId][dateKey]) {
              productivityMap[userId][dateKey] = {
                userId,
                userName,
                date: dateKey,
                leadsWorked: 0,
                lastActivity: lastModifiedUTC, // Store as UTC
                statusBreakdown: {}
              };
            }
            
            // Update stats
            productivityMap[userId][dateKey].leadsWorked += 1;
            productivityMap[userId][dateKey].statusBreakdown[status] = 
              (productivityMap[userId][dateKey].statusBreakdown[status] || 0) + 1;
            
            // Update last activity if this is more recent
            if (lastModifiedUTC > productivityMap[userId][dateKey].lastActivity) {
              productivityMap[userId][dateKey].lastActivity = lastModifiedUTC;
            }
          }
        });

        // Convert to array format
        const productivityArray: ProductivityStats[] = [];
        Object.values(productivityMap).forEach(userDates => {
          Object.values(userDates).forEach(stats => {
            productivityArray.push(stats);
          });
        });

        // Sort by date (newest first) and then by leads worked (descending)
        productivityArray.sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          return b.leadsWorked - a.leadsWorked;
        });

        console.log('Productivity stats:', productivityArray);
        setProductivityStats(productivityArray);
        
      } catch (error) {
        console.error('Error fetching productivity data:', error);
      } finally {
        setProductivityLoading(false);
      }
    };

    fetchProductivityData();
  }, [selectedProductivityRange, productivityDateRange]);

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

    // NEW: Short Loan Analytics
    const shortLoanLeads = leads.filter(lead => lead.category === 'Short Loan').length;
    const shortLoanRate = (shortLoanLeads / totalLeads) * 100;

    // NEW: Conversion Time Analysis
    const convertedLeadsWithTime = leads.filter(lead => 
      lead.category === 'Converted' && 
      lead.convertedAt && 
      (lead.date || lead.synced_date)
    );

    const conversionTimeData = convertedLeadsWithTime.map(lead => {
      const leadCreationTime = lead.date || (lead.synced_date?.toMillis ? lead.synced_date.toMillis() : lead.synced_date);
      const conversionTime = lead.convertedAt?.toMillis ? lead.convertedAt.toMillis() : lead.convertedAt;
      
      const timeDiffMs = conversionTime - leadCreationTime;
      const timeDiffDays = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
      const timeDiffHours = Math.floor((timeDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return {
        leadName: lead.name,
        assignedTo: lead.assigned_to,
        createdAt: new Date(leadCreationTime),
        convertedAt: new Date(conversionTime),
        conversionTimeDays: timeDiffDays,
        conversionTimeHours: timeDiffHours,
        conversionTimeMs: timeDiffMs,
        debtRange: lead.debt_range,
        income: lead.income
      };
    });

    // Average conversion time calculation
    const avgConversionTimeMs = conversionTimeData.length > 0 
      ? conversionTimeData.reduce((sum, item) => sum + item.conversionTimeMs, 0) / conversionTimeData.length
      : 0;
    
    const avgConversionTimeDays = Math.floor(avgConversionTimeMs / (1000 * 60 * 60 * 24));
    const avgConversionTimeHours = Math.floor((avgConversionTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    // Conversion time distribution (buckets)
    const conversionTimeBuckets = {
      'Same Day (0-24h)': 0,
      '2-3 Days': 0,
      '4-7 Days': 0,
      '1-2 Weeks': 0,
      '2-4 Weeks': 0,
      '1-2 Months': 0,
      '2+ Months': 0
    };

    conversionTimeData.forEach(item => {
      const days = item.conversionTimeDays;
      if (days === 0) conversionTimeBuckets['Same Day (0-24h)']++;
      else if (days <= 3) conversionTimeBuckets['2-3 Days']++;
      else if (days <= 7) conversionTimeBuckets['4-7 Days']++;
      else if (days <= 14) conversionTimeBuckets['1-2 Weeks']++;
      else if (days <= 30) conversionTimeBuckets['2-4 Weeks']++;
      else if (days <= 60) conversionTimeBuckets['1-2 Months']++;
      else conversionTimeBuckets['2+ Months']++;
    });

    // NEW: Lead Entry Timeline Analysis
    const leadEntryTimeline = leads.reduce((acc, lead) => {
      const creationDate = new Date(lead.date || (lead.synced_date?.toMillis ? lead.synced_date.toMillis() : lead.synced_date));
      const dateKey = creationDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          totalLeads: 0,
          convertedLeads: 0,
          interestedLeads: 0,
          notInterestedLeads: 0
        };
      }
      
      acc[dateKey].totalLeads++;
      
      if (lead.category === 'Converted') {
        acc[dateKey].convertedLeads++;
      } else if (lead.category === 'Interested') {
        acc[dateKey].interestedLeads++;
      } else if (lead.category === 'Not Interested') {
        acc[dateKey].notInterestedLeads++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const leadEntryTimelineData = Object.values(leadEntryTimeline)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .slice(-30); // Show last 30 days

    // Conversion time by salesperson
    const conversionTimeBySalesperson = conversionTimeData.reduce((acc, item) => {
      if (!acc[item.assignedTo]) {
        acc[item.assignedTo] = {
          name: item.assignedTo,
          conversions: [],
          avgDays: 0,
          fastestDays: Infinity,
          slowestDays: 0
        };
      }
      
      acc[item.assignedTo].conversions.push(item.conversionTimeDays);
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for each salesperson
    Object.values(conversionTimeBySalesperson).forEach((rep: any) => {
      const conversions = rep.conversions;
      rep.avgDays = conversions.reduce((sum: number, days: number) => sum + days, 0) / conversions.length;
      rep.fastestDays = Math.min(...conversions);
      rep.slowestDays = Math.max(...conversions);
      rep.totalConversions = conversions.length;
    });

    const conversionTimeBySalespersonData = Object.values(conversionTimeBySalesperson);

    // Hourly lead entry pattern
    const hourlyPattern = leads.reduce((acc, lead) => {
      const creationDate = new Date(lead.date || (lead.synced_date?.toMillis ? lead.synced_date.toMillis() : lead.synced_date));
      const hour = creationDate.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const hourlyPatternData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      leads: hourlyPattern[hour] || 0
    }));

    // Day of week pattern
    const dayOfWeekPattern = leads.reduce((acc, lead) => {
      const creationDate = new Date(lead.date || (lead.synced_date?.toMillis ? lead.synced_date.toMillis() : lead.synced_date));
      const dayOfWeek = creationDate.getDay(); // 0 = Sunday, 6 = Saturday
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek];
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dayOfWeekPatternData = Object.entries(dayOfWeekPattern).map(([day, count]) => ({ day, count }));
    
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

    // NEW: Language Barrier Analytics
    const languageBarrierLeads = leads.filter(lead => 
      lead.category === 'Language Barrier' || 
      lead.status === 'Language Barrier' || 
      (lead.language_barrier && lead.language_barrier !== '')
    );

    // Language distribution analysis
    const languageDistribution = languageBarrierLeads.reduce((acc, lead) => {
      // Check multiple sources for language information
      let language = '';
      if (lead.language_barrier && lead.language_barrier !== '') {
        language = lead.language_barrier;
      } else if (lead.sales_notes && lead.sales_notes.includes('Language Barrier')) {
        // Extract language from sales notes if available
        const languageMatch = lead.sales_notes.match(/Language Barrier[:\s-]+([A-Za-z]+)/i);
        language = languageMatch ? languageMatch[1] : 'Unknown';
      } else {
        language = 'Unknown';
      }
      
      acc[language] = (acc[language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const languageDistributionData = Object.entries(languageDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Language barrier by salesperson
    const languageBarrierBySalesperson = languageBarrierLeads.reduce((acc, lead) => {
      const salesperson = lead.assigned_to || 'Unassigned';
      if (!acc[salesperson]) {
        acc[salesperson] = {
          name: salesperson,
          totalLanguageBarrierLeads: 0,
          languages: {} as Record<string, number>
        };
      }
      
      acc[salesperson].totalLanguageBarrierLeads += 1;
      
      // Track languages for this salesperson
      let language = '';
      if (lead.language_barrier && lead.language_barrier !== '') {
        language = lead.language_barrier;
      } else if (lead.sales_notes && lead.sales_notes.includes('Language Barrier')) {
        const languageMatch = lead.sales_notes.match(/Language Barrier[:\s-]+([A-Za-z]+)/i);
        language = languageMatch ? languageMatch[1] : 'Unknown';
      } else {
        language = 'Unknown';
      }
      
      acc[salesperson].languages[language] = (acc[salesperson].languages[language] || 0) + 1;
      
      return acc;
    }, {} as Record<string, { name: string; totalLanguageBarrierLeads: number; languages: Record<string, number> }>);

    const languageBarrierBySalespersonData = Object.values(languageBarrierBySalesperson)
      .map(rep => ({
        name: rep.name,
        totalLeads: rep.totalLanguageBarrierLeads,
        topLanguage: Object.entries(rep.languages)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
        topLanguageCount: Object.entries(rep.languages)
          .sort((a, b) => b[1] - a[1])[0]?.[1] || 0,
        uniqueLanguages: Object.keys(rep.languages).length
      }))
      .sort((a, b) => b.totalLeads - a.totalLeads);

    // Language barrier by geographic region (state)
    const languageBarrierByState = languageBarrierLeads.reduce((acc, lead) => {
      const address = lead.address || '';
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
      
      if (!acc[state]) {
        acc[state] = {
          name: state,
          totalLanguageBarrierLeads: 0,
          languages: {} as Record<string, number>
        };
      }
      
      acc[state].totalLanguageBarrierLeads += 1;
      
      let language = '';
      if (lead.language_barrier && lead.language_barrier !== '') {
        language = lead.language_barrier;
      } else if (lead.sales_notes && lead.sales_notes.includes('Language Barrier')) {
        const languageMatch = lead.sales_notes.match(/Language Barrier[:\s-]+([A-Za-z]+)/i);
        language = languageMatch ? languageMatch[1] : 'Unknown';
      } else {
        language = 'Unknown';
      }
      
      acc[state].languages[language] = (acc[state].languages[language] || 0) + 1;
      
      return acc;
    }, {} as Record<string, { name: string; totalLanguageBarrierLeads: number; languages: Record<string, number> }>);

    const languageBarrierByStateData = Object.values(languageBarrierByState)
      .map(state => ({
        name: state.name,
        totalLeads: state.totalLanguageBarrierLeads,
        topLanguage: Object.entries(state.languages)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
        topLanguageCount: Object.entries(state.languages)
          .sort((a, b) => b[1] - a[1])[0]?.[1] || 0,
        uniqueLanguages: Object.keys(state.languages).length
      }))
      .sort((a, b) => b.totalLeads - a.totalLeads)
      .slice(0, 10); // Top 10 states

    // Language barrier conversion analysis
    const languageBarrierConversionData = languageBarrierLeads.reduce((acc, lead) => {
      let language = '';
      if (lead.language_barrier && lead.language_barrier !== '') {
        language = lead.language_barrier;
      } else if (lead.sales_notes && lead.sales_notes.includes('Language Barrier')) {
        const languageMatch = lead.sales_notes.match(/Language Barrier[:\s-]+([A-Za-z]+)/i);
        language = languageMatch ? languageMatch[1] : 'Unknown';
      } else {
        language = 'Unknown';
      }
      
      if (!acc[language]) {
        acc[language] = {
          language,
          totalLeads: 0,
          convertedLeads: 0,
          interestedLeads: 0,
          notInterestedLeads: 0,
          conversionRate: 0
        };
      }
      
      acc[language].totalLeads += 1;
      
      if (lead.category === 'Converted') {
        acc[language].convertedLeads += 1;
      } else if (lead.category === 'Interested') {
        acc[language].interestedLeads += 1;
      } else if (lead.category === 'Not Interested') {
        acc[language].notInterestedLeads += 1;
      }
      
      return acc;
    }, {} as Record<string, { language: string; totalLeads: number; convertedLeads: number; interestedLeads: number; notInterestedLeads: number; conversionRate: number }>);

    // Calculate conversion rates
    Object.values(languageBarrierConversionData).forEach(data => {
      data.conversionRate = data.totalLeads > 0 ? (data.convertedLeads / data.totalLeads) * 100 : 0;
    });

    const languageBarrierConversionDataArray = Object.values(languageBarrierConversionData)
      .sort((a, b) => b.totalLeads - a.totalLeads);

    return {
      totalLeads,
      uniqueAssignees,
      averageDebt,
      conversionRate: Math.round(conversionRate * 100) / 100,
      // NEW: Short Loan Analytics
      shortLoanRate: Math.round(shortLoanRate * 100) / 100,
      // NEW: Conversion time analytics
      conversionTimeData,
      avgConversionTimeDays,
      avgConversionTimeHours,
      conversionTimeBuckets: Object.entries(conversionTimeBuckets).map(([name, value]) => ({ name, value })),
      conversionTimeBySalesperson: conversionTimeBySalespersonData,
      // NEW: Lead entry analytics
      leadEntryTimelineData,
      hourlyPatternData,
      dayOfWeekPatternData,
      // NEW: Language barrier analytics
      languageBarrierLeads: languageBarrierLeads.length,
      languageDistribution: languageDistributionData,
      languageBarrierBySalesperson: languageBarrierBySalespersonData,
      languageBarrierByState: languageBarrierByStateData,
      languageBarrierConversion: languageBarrierConversionDataArray,
      // Existing analytics
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
        {userRole === 'overlord' ? <OverlordSidebar /> : userRole === 'admin' ? <AdminSidebar /> : <BillcutSidebar />}
        <div 
          className="flex-1 flex items-center justify-center transition-all duration-300"
          style={{ 
            marginLeft: userRole === 'overlord' ? (isExpanded ? '0px' : '0px') : '0'
          }}
        >
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
        {userRole === 'overlord' ? <OverlordSidebar /> : userRole === 'admin' ? <AdminSidebar /> : <BillcutSidebar />}
        <div 
          className="flex-1 flex items-center justify-center transition-all duration-300"
          style={{ 
            marginLeft: userRole === 'overlord' ? (isExpanded ? '0px' : '0px') : '0'
          }}
        >
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-gray-300">No data available for analysis</p>
          </div>
        </div>
      </div>
    );
  }

  // Productivity Stats Component
  const ProductivityStatsComponent = () => {
    if (productivityLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-200/50 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <div className="w-16 h-16 border-4 border-transparent border-l-green-500 rounded-full animate-spin absolute top-0 left-0 animate-pulse"></div>
          </div>
        </div>
      );
    }

    if (productivityStats.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="p-4 bg-emerald-50/50 rounded-xl">
            <p className="text-emerald-600 font-medium">No productivity data found for the selected date range</p>
            <p className="text-sm text-gray-500 mt-2">Try selecting a different date range or check if there's any activity</p>
          </div>
        </div>
      );
    }

    // Group by user for summary
    const userSummary = productivityStats.reduce((acc, stat) => {
      if (!acc[stat.userId]) {
        acc[stat.userId] = {
          userName: stat.userName,
          totalLeads: 0,
          totalDays: new Set(),
          averageLeadsPerDay: 0,
          lastActivity: new Date(0),
          statusBreakdown: {}
        };
      }
      acc[stat.userId].totalLeads += stat.leadsWorked;
      acc[stat.userId].totalDays.add(stat.date);
      if (stat.lastActivity > acc[stat.userId].lastActivity) {
        acc[stat.userId].lastActivity = stat.lastActivity;
      }
      
      // Aggregate status breakdown
      Object.entries(stat.statusBreakdown).forEach(([status, count]) => {
        // Normalize status name to match our expected format
        const normalizedStatus = status.toLowerCase().trim();
        let matchedStatus = null;
        
        // Find matching status from our list
        for (const expectedStatus of getAllStatuses()) {
          if (expectedStatus.toLowerCase() === normalizedStatus) {
            matchedStatus = expectedStatus;
            break;
          }
        }
        
        if (matchedStatus) {
          acc[stat.userId].statusBreakdown[matchedStatus] = (acc[stat.userId].statusBreakdown[matchedStatus] || 0) + count;
        } else {
          // If no match found, use the original status
          acc[stat.userId].statusBreakdown[status] = (acc[stat.userId].statusBreakdown[status] || 0) + count;
        }
      });
      
      return acc;
    }, {} as { [key: string]: { userName: string; totalLeads: number; totalDays: Set<string>; averageLeadsPerDay: number; lastActivity: Date; statusBreakdown: { [key: string]: number } } });

    // Debug: Log the actual status breakdown data
    console.log('User Summary Status Breakdown:', userSummary);
    console.log('Productivity Stats:', productivityStats);

    // Calculate averages
    Object.values(userSummary).forEach(user => {
      // For aggregated periods (last7days, last30days), calculate average based on the actual period length
      if (selectedProductivityRange === 'last7days') {
        user.averageLeadsPerDay = user.totalLeads / 7;
      } else if (selectedProductivityRange === 'last30days') {
        user.averageLeadsPerDay = user.totalLeads / 30;
      } else {
        // For other ranges, use the actual number of days with activity
        user.averageLeadsPerDay = user.totalLeads / user.totalDays.size;
      }
    });

    return (
      <div className="space-y-6">
        {/* Productivity Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(userSummary).map((user, index) => (
            <div key={index} className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5"></div>
              <div className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-md">
                    <FiUsers className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Worked</p>
                    <h3 className="text-xl font-bold text-gray-900">{user.totalLeads}</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Avg/Day:</span>
                    <span className="font-bold text-emerald-600">{user.averageLeadsPerDay.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {selectedProductivityRange === 'last7days' || selectedProductivityRange === 'last30days' ? 'Period:' : 'Days Active:'}
                    </span>
                    <span className="font-bold text-blue-600">
                      {selectedProductivityRange === 'last7days' 
                        ? '7 days' 
                        : selectedProductivityRange === 'last30days' 
                          ? '30 days' 
                          : user.totalDays.size
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Last Activity:</span>
                    <span className="font-bold text-purple-600">
                      {user.lastActivity.toLocaleDateString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-gray-900 truncate mb-2">{user.userName}</p>
                  
                  {/* Status Breakdown */}
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <tbody>
                        {getAllStatuses().map((status) => (
                          <tr key={status} className="border-b border-gray-100 last:border-b-0">
                            <td className="py-1 pr-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(status)}`}>
                                {status}
                              </span>
                            </td>
                            <td className="py-1 text-right font-bold text-gray-900">
                              {user.statusBreakdown[status] || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 w-full" >
      {userRole === 'overlord' ? <OverlordSidebar /> : userRole === 'admin' ? <AdminSidebar /> : <BillcutSidebar />}
      <div 
        className="flex-1 p-4 lg:p-8 transition-all duration-300 overflow-x-hidden"
        style={{ 
          marginLeft: userRole === 'overlord' ? (isExpanded ? '0px' : '0px') : '0'
        }}
      >
        <div className="max-w-8xl mx-auto" >
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
          
          {/* Date Range Filter - New User-Friendly Design */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Date Range Display and Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <FiCalendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date Range
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2"
                      >
                        <span className="font-medium">{getDateRangeDisplay()}</span>
                        <FiFilter className="w-4 h-4" />
                      </button>
                      {(dateRange.startDate || dateRange.endDate) && (
                        <button
                          onClick={clearDateFilters}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                          title="Clear filters"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'today', label: 'Today', color: 'bg-blue-500 hover:bg-blue-600' },
                    { key: 'yesterday', label: 'Yesterday', color: 'bg-gray-500 hover:bg-gray-600' },
                    { key: 'thisWeek', label: 'This Week', color: 'bg-green-500 hover:bg-green-600' },
                    { key: 'thisMonth', label: 'This Month', color: 'bg-purple-500 hover:bg-purple-600' },
                    { key: 'lastMonth', label: 'Last Month', color: 'bg-orange-500 hover:bg-orange-600' },
                    { key: 'last30Days', label: 'Last 30 Days', color: 'bg-indigo-500 hover:bg-indigo-600' },
                    { key: 'last60Days', label: 'Last 60 Days', color: 'bg-teal-500 hover:bg-teal-600' },
                    { key: 'last90Days', label: 'Last 90 Days', color: 'bg-pink-500 hover:bg-pink-600' },
                    { key: 'thisYear', label: 'This Year', color: 'bg-red-500 hover:bg-red-600' }
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => handleQuickDateFilter(key)}
                      className={`px-3 py-1.5 text-white rounded-lg text-sm font-medium transition-colors ${
                        selectedPreset === key ? 'ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800' : ''
                      } ${color}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

           

              {/* Custom Date Range Picker */}
              {showDatePicker && (
                <div className="lg:ml-4 p-4 lg:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 w-full lg:w-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customDateRange.startDate}
                        onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customDateRange.endDate}
                        onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={cancelCustomDateSelection}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={applyCustomDateRange}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Apply Date Range
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Filters Display */}
            {(dateRange.startDate || dateRange.endDate) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FiFilter className="w-4 h-4" />
                  <span>Active filters:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getDateRangeDisplay()}
                  </span>
                  {selectedPreset && (
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">
                      {selectedPreset.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
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
            <MetricCard
              title="Short Loan Rate"
              value={`${analytics.shortLoanRate}%`}
              icon={<FiDollarSign size={24} />}
              color="#0D9488"
            />
          </div>

          {/* NEW: Conversion Time Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <MetricCard
              title="Avg Conversion Time"
              value={analytics.conversionTimeData.length > 0 ? `${analytics.avgConversionTimeDays}d ${analytics.avgConversionTimeHours}h` : 'N/A'}
              icon={<FiCalendar size={24} />}
              color="#8B5CF6"
            />
            <MetricCard
              title="Total Conversions"
              value={analytics.conversionTimeData.length.toLocaleString()}
              icon={<FiTarget size={24} />}
              color="#EC4899"
            />
            <MetricCard
              title="Fastest Conversion"
              value={analytics.conversionTimeData.length > 0 ? 
                (() => {
                  const fastest = Math.min(...analytics.conversionTimeData.map(item => item.conversionTimeDays));
                  return fastest === 0 ? 'Same Day' : `${fastest} days`;
                })() : 'N/A'
              }
              icon={<FiActivity size={24} />}
              color="#14B8A6"
            />
            <MetricCard
              title="Slowest Conversion"
              value={analytics.conversionTimeData.length > 0 ? 
                `${Math.max(...analytics.conversionTimeData.map(item => item.conversionTimeDays))} days` : 'N/A'
              }
              icon={<FiActivity size={24} />}
              color="#F97316"
            />
          </div>

          {/* NEW: Language Barrier Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <MetricCard
              title="Language Barrier Leads"
              value={analytics.languageBarrierLeads.toLocaleString()}
              icon={<FiUsers size={24} />}
              color="#6366F1"
            />
            <MetricCard
              title="Unique Languages"
              value={analytics.languageDistribution.length}
              icon={<FiTarget size={24} />}
              color="#8B5CF6"
            />
            <MetricCard
              title="Top Language"
              value={analytics.languageDistribution.length > 0 ? analytics.languageDistribution[0].name : 'N/A'}
              icon={<FiActivity size={24} />}
              color="#EC4899"
            />
            <MetricCard
              title="Language Barrier %"
              value={analytics.totalLeads > 0 ? `${((analytics.languageBarrierLeads / analytics.totalLeads) * 100).toFixed(1)}%` : '0%'}
              icon={<FiTrendingUp size={24} />}
              color="#F59E0B"
            />
          </div>

          {/* NEW: Conversion Time Analytics Section */}
          <div className="w-full mb-6 lg:mb-8">
            {/* Conversion Time Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiCalendar className="mr-2" />
                Conversion Time Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.conversionTimeBuckets}>
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
                    formatter={(value: number) => [`${value} conversions`, 'Count']}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {/* Category Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {/* Debt Range Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {/* Monthly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
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
           {/* NEW: Language Barrier Analytics Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiUsers className="mr-2" />
              Language Barrier Analytics
            </h3>
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Language Barriers</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.languageBarrierLeads.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Languages Affected</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics.languageDistribution.length}</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Most Common</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {analytics.languageDistribution.length > 0 ? analytics.languageDistribution[0].name : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {analytics.languageDistribution.length > 0 ? `${analytics.languageDistribution[0].value} leads` : ''}
                  </p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Barrier Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics.totalLeads > 0 ? `${((analytics.languageBarrierLeads / analytics.totalLeads) * 100).toFixed(1)}%` : '0%'}
                  </p>
                </div>
              </div>
            </div>

            {/* Language Barrier Breakdown Table */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiUsers className="mr-2" />
                Language Barrier Breakdown
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">LANGUAGE</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">NUMBER OF LEADS</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">PERCENTAGE</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">IMPACT LEVEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.languageDistribution.map((language, index) => {
                      const percentage = analytics.languageBarrierLeads > 0 ? 
                        ((language.value / analytics.languageBarrierLeads) * 100).toFixed(1) : '0';
                      
                      // Determine impact level based on percentage
                      let impactLevel = 'Low';
                      let impactColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
                      if (parseFloat(percentage) >= 30) {
                        impactLevel = 'High';
                        impactColor = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                      } else if (parseFloat(percentage) >= 15) {
                        impactLevel = 'Medium';
                        impactColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
                      }

                      // Language color dots
                      const languageColors = [
                        'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
                        'bg-orange-500', 'bg-purple-500', 'bg-teal-500',
                        'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-gray-500'
                      ];

                      return (
                        <tr key={language.name} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${languageColors[index % languageColors.length]} mr-3`}></div>
                              <span className="font-medium text-gray-900 dark:text-white">{language.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-3 py-1 rounded-full text-sm font-medium">
                              {language.value}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-medium text-gray-900 dark:text-white">{percentage}%</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${impactColor}`}>
                              {impactLevel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Salesperson-wise Lead Status Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiUsers className="mr-2" />
              Salesperson-wise Lead Status Analytics
            </h3>
            
           

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800">
                      Salesperson
                    </th>
                    {analytics.categoryDistribution.map(category => (
                      <th key={category.name} className={`px-3 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getStatusColor(category.name)}`}>
                        {category.name}
                      </th>
                    ))}
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800">
                      Total
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800">
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
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-white bg-gray-800">
                          {rep.name}
                        </td>
                        {analytics.categoryDistribution.map(category => (
                          <td key={category.name} className={`px-3 lg:px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(category.name)}`}>
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
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-white bg-gray-800">
                          {rep.totalLeads}
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-white bg-gray-800">
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

          {/* Productivity Stats Component */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiActivity className="mr-2" />
              Productivity Analytics
            </h3>
            <ProductivityStatsComponent />
          </div>

          {/* Productivity Filters Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Productivity Date Range Filter */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <FiCalendar className="h-4 w-4 text-emerald-500" />
                  Productivity Date Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'last7days', label: 'Last 7 Days' },
                    { key: 'last30days', label: 'Last 30 Days' },
                    { key: 'custom', label: 'Custom Range' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        console.log('Productivity date range button clicked:', key, label);
                        setSelectedProductivityRange(key);
                        setShowProductivityCustomRange(key === 'custom');
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        selectedProductivityRange === key
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                          : 'bg-gray-50/80 text-gray-700 hover:bg-gray-100/80 border border-gray-200/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Custom Productivity Date Range Picker */}
                {showProductivityCustomRange && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={productivityDateRange.startDate.toISOString().split('T')[0]}
                        onChange={(e) => setProductivityDateRange(prev => ({
                          ...prev,
                          startDate: new Date(e.target.value)
                        }))}
                        className="block w-full rounded-lg border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                      <input
                        type="date"
                        value={productivityDateRange.endDate.toISOString().split('T')[0]}
                        onChange={(e) => setProductivityDateRange(prev => ({
                          ...prev,
                          endDate: new Date(e.target.value)
                        }))}
                        className="block w-full rounded-lg border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Productivity Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FiActivity className="h-4 w-4 text-emerald-500" />
                    Productivity Info
                  </label>
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/50">
                    <p className="text-xs text-emerald-700 font-medium mb-1">
                      {getProductivityDisplayName()}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Shows leads worked on per day based on lastModified timestamps
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

         
        </div>
      </div>
    </div>
  );
};

const BillcutLeadReportPage = () => {
  return (
    <BillcutLeadReportContent />
  );
};

export default BillcutLeadReportPage;
