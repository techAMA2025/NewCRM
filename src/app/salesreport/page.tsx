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
import { useRouter } from 'next/navigation';

interface SalesUser {
  id: string;
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

interface CityData {
  city: string;
  totalLeads: number;
  statusCounts: { [key: string]: number };
  conversionRate: number;
}

interface CityChartProps {
  cityData: CityData[];
}

interface ConversionTimeData {
  leadId: string;
  leadName: string;
  createdDate: Date;
  convertedDate: Date;
  conversionTimeInDays: number;
  assignedTo: string;
  source: string;
  city: string;
}

interface ConversionMetrics {
  averageConversionTime: number;
  medianConversionTime: number;
  fastestConversion: number;
  slowestConversion: number;
  conversionsByTimeRange: {
    '0-7days': number;
    '8-30days': number;
    '31-60days': number;
    '60+days': number;
  };
}

interface ConversionTimelineProps {
  conversionData: ConversionTimeData[];
}

interface ConversionFunnelProps {
  conversionMetrics: ConversionMetrics;
  conversionData: ConversionTimeData[];
}

interface SimpleCityData {
  city: string;
  totalLeads: number;
}

interface SimpleCityChartProps {
  cityData: SimpleCityData[];
}

interface LanguageBarrierData {
  language: string;
  count: number;
  percentage: number;
}

interface LanguageBarrierChartProps {
  languageData: LanguageBarrierData[];
}

// Add new interface for lastModified tracking
interface LastModifiedCount {
  userId: string;
  userName: string;
  today: number;
  yesterday: number;
  thisWeek: number;
  custom: number;
}

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

const LEAD_STATUSES = [
  'No Status',
  'Interested',
  'Not Interested',
  'Not Answering',
  'Callback',
  'Converted',
  'Loan Required',
  'Cibil Issue',
  'Closed Lead',
  'Language Barrier',
  'Future Potential'
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
  '#4ECDC4',
  '#9B59B6',
  '#E67E22',
  '#34495E',
  '#F39C12',
  '#27AE60',
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F1C40F',
  '#9013FE',
  '#FF5722',
  '#607D8B',
  '#795548',
  '#FF9800',
  '#4CAF50'
];

const INDIAN_LANGUAGES = [
  'Hindi',
  'Bengali',
  'Telugu',
  'Marathi',
  'Tamil',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Odia',
  'Assamese',
  'Maithili',
  'Santali',
  'Kashmiri',
  'Nepali',
  'Sindhi',
  'Dogri',
  'Konkani',
  'Manipuri',
  'Bodo',
  'Sanskrit',
  'Urdu',
  'English',
  'Other'
];

export default function SalesReport() {
  const router = useRouter();
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
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const [conversionTimeData, setConversionTimeData] = useState<ConversionTimeData[]>([]);
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics>({
    averageConversionTime: 0,
    medianConversionTime: 0,
    fastestConversion: 0,
    slowestConversion: 0,
    conversionsByTimeRange: {
      '0-7days': 0,
      '8-30days': 0,
      '31-60days': 0,
      '60+days': 0
    }
  });

  // Add new state for simplified city data
  const [simpleCityData, setSimpleCityData] = useState<SimpleCityData[]>([]);
  const [languageBarrierData, setLanguageBarrierData] = useState<LanguageBarrierData[]>([]);

  // Add state for lastModified tracking
  const [lastModifiedData, setLastModifiedData] = useState<LastModifiedCount[]>([]);

  // Add state for activity tracking custom date range
  const [activityDateRange, setActivityDateRange] = useState<DateRange>({
    startDate: new Date(),
    endDate: new Date()
  });
  const [showActivityCustomRange, setShowActivityCustomRange] = useState(false);
  const [selectedActivityRange, setSelectedActivityRange] = useState<string>('today');

  // Add state for productivity tracking
  const [productivityStats, setProductivityStats] = useState<ProductivityStats[]>([]);
  const [productivityDateRange, setProductivityDateRange] = useState<ProductivityDateRange>({
    startDate: new Date(),
    endDate: new Date()
  });
  const [showProductivityCustomRange, setShowProductivityCustomRange] = useState(false);
  const [selectedProductivityRange, setSelectedProductivityRange] = useState<string>('today');
  const [productivityLoading, setProductivityLoading] = useState(false);

  // Helper function to convert date to IST
  // 
  // Timezone Handling Improvements:
  // Based on the provided timestamp examples:
  // - July 8, 2025 12:07:31 PM UTC+5:30 → 2025-07-08T06:37:31Z (UTC)
  // - May 12, 2025 6:36:38 PM UTC+5:30 → 2025-05-12T13:06:38Z (UTC)
  // - July 12, 2025 11:07:58 AM UTC+5:30 → 2025-07-12T05:37:58Z (UTC)
  //
  // This function properly converts UTC timestamps to IST (UTC+5:30)
  // by adding 5.5 hours (19,800,000 milliseconds) to the UTC time.
  const toIST = (date: Date): Date => {
    // Create a new date object to avoid mutating the original
    const utcDate = new Date(date);
    
    // Get the UTC timestamp in milliseconds
    const utcTime = utcDate.getTime();
    
    // Add IST offset (UTC+5:30 = 5.5 hours = 5.5 * 60 * 60 * 1000 milliseconds)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = utcTime + istOffset;
    
    return new Date(istTime);
  };

  // Helper function to convert IST to UTC for Firestore queries
  // 
  // This function converts IST dates back to UTC for proper Firestore timestamp queries.
  // Firestore stores timestamps in UTC, so we need to convert our IST date ranges
  // to UTC before querying the database.
  const toUTC = (istDate: Date): Date => {
    // Create a new date object to avoid mutating the original
    const istTime = new Date(istDate).getTime();
    
    // Subtract IST offset to get UTC time
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = istTime - istOffset;
    
    return new Date(utcTime);
  };

  // Utility function to debug timezone conversions
  const debugTimezoneConversion = (date: Date, label: string) => {
    console.log(`${label}:`, {
      original: date.toISOString(),
      ist: toIST(date).toISOString(),
      utc: toUTC(date).toISOString(),
      localString: date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      utcString: date.toLocaleString('en-US', { timeZone: 'UTC' })
    });
  };

  // Test function to verify timezone conversions with provided examples
  const testTimezoneConversions = () => {
    console.log('=== Testing Timezone Conversions ===');
    
    // Test with the provided examples
    const testDates = [
      { utc: '2025-07-08T06:37:31Z', expectedIST: '2025-07-08T12:07:31.000Z' },
      { utc: '2025-05-12T13:06:38Z', expectedIST: '2025-05-12T18:36:38.000Z' },
      { utc: '2025-07-12T05:37:58Z', expectedIST: '2025-07-12T11:07:58.000Z' }
    ];
    
    testDates.forEach((test, index) => {
      const utcDate = new Date(test.utc);
      const istDate = toIST(utcDate);
      const backToUTC = toUTC(istDate);
      
      console.log(`Test ${index + 1}:`, {
        originalUTC: test.utc,
        convertedIST: istDate.toISOString(),
        expectedIST: test.expectedIST,
        backToUTC: backToUTC.toISOString(),
        matches: istDate.toISOString() === test.expectedIST,
        roundTrip: utcDate.getTime() === backToUTC.getTime()
      });
    });
    
    console.log('=== End Timezone Tests ===');
  };

  // Helper function to get IST date range for activity tracking
  const getActivityDateRange = (range: string): DateRange => {
    const nowIST = toIST(new Date());
    const todayIST = new Date(nowIST);
    todayIST.setHours(23, 59, 59, 999); // End of today in IST
    
    const startOfTodayIST = new Date(nowIST);
    startOfTodayIST.setHours(0, 0, 0, 0); // Start of today in IST

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
        const customStartIST = new Date(activityDateRange.startDate);
        customStartIST.setHours(0, 0, 0, 0);
        const customEndIST = new Date(activityDateRange.endDate);
        customEndIST.setHours(23, 59, 59, 999);
        return { startDate: customStartIST, endDate: customEndIST };
      default:
        return { startDate: startOfTodayIST, endDate: todayIST };
    }
  };

  // Helper functions for activity data
  const getActivityDisplayName = () => {
    switch (selectedActivityRange) {
      case 'today': return "Today's Activity";
      case 'yesterday': return "Yesterday's Activity";
      case 'last7days': return "Last 7 Days Activity";
      case 'last30days': return "Last 30 Days Activity";
      case 'custom': return "Custom Range Activity";
      default: return "Today's Activity";
    }
  };

  const getActivityColor = () => {
    switch (selectedActivityRange) {
      case 'today': return 'text-green-600';
      case 'yesterday': return 'text-blue-600';
      case 'last7days': return 'text-purple-600';
      case 'last30days': return 'text-indigo-600';
      case 'custom': return 'text-orange-600';
      default: return 'text-green-600';
    }
  };

  const getActivityGradient = () => {
    switch (selectedActivityRange) {
      case 'today': return 'from-green-600/5 to-emerald-600/5';
      case 'yesterday': return 'from-blue-600/5 to-indigo-600/5';
      case 'last7days': return 'from-purple-600/5 to-violet-600/5';
      case 'last30days': return 'from-indigo-600/5 to-blue-600/5';
      case 'custom': return 'from-orange-600/5 to-amber-600/5';
      default: return 'from-green-600/5 to-emerald-600/5';
    }
  };

  const getActivityCount = (data: LastModifiedCount) => {
    switch (selectedActivityRange) {
      case 'today': return data.today;
      case 'yesterday': return data.yesterday;
      case 'last7days': return data.thisWeek;
      case 'last30days': return data.thisWeek;
      case 'custom': return data.custom;
      default: return data.today;
    }
  };

  const getTotalActivityCount = () => {
    return lastModifiedData.reduce((sum, data) => sum + getActivityCount(data), 0);
  };

  // Helper function to get productivity date range
  const getProductivityDateRange = (range: string): ProductivityDateRange => {
    const nowIST = toIST(new Date());
    const todayIST = new Date(nowIST);
    todayIST.setHours(23, 59, 59, 999); // End of today in IST
    
    const startOfTodayIST = new Date(nowIST);
    startOfTodayIST.setHours(0, 0, 0, 0); // Start of today in IST

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

  const handleCellClick = (salesPersonName: string, status: string) => {
    const { startDate, endDate } = getDateRange(selectedRange);
    
    const params = new URLSearchParams();
    if (salesPersonName && salesPersonName !== 'all') {
      params.set('salesPerson', salesPersonName);
    }
    if (status && status !== 'all') {
      params.set('status', status);
    }

    if (selectedRange !== 'all') {
      if (selectedRange === 'custom') {
        params.set('fromDate', customDateRange.startDate.toISOString().split('T')[0]);
        params.set('toDate', customDateRange.endDate.toISOString().split('T')[0]);
      } else if (selectedRange === 'today') {
        // For today, both fromDate and toDate should be the same (today's date)
        const todayStr = new Date().toISOString().split('T')[0];
        params.set('fromDate', todayStr);
        params.set('toDate', todayStr);
      } else {
        // For other ranges (last7days, last30days, last60days)
        params.set('fromDate', startDate.toISOString().split('T')[0]);
        params.set('toDate', endDate.toISOString().split('T')[0]);
      }
    }
    
    router.push(`/sales/leads?${params.toString()}`);
  };

  // Helper function to get city name from lead data (handles both 'city' and 'City' fields)
  const getCityName = (leadData: any): string => {
    const city = leadData.city || leadData.City || '';
    // Normalize city names and treat empty, unknown, or other as redistributable
    const normalizedCity = city.toLowerCase().trim();
    if (!normalizedCity || normalizedCity === 'unknown' || normalizedCity === 'other' || normalizedCity === 'n/a' || normalizedCity === 'na') {
      return 'REDISTRIBUTE';
    }
    return city;
  };

  // Helper function to redistribute unknown/other leads proportionally
  const redistributeUnknownLeads = (cityDataMap: { [key: string]: any }, redistributeCount: number) => {
    // Get actual cities (excluding REDISTRIBUTE)
    const actualCities = Object.keys(cityDataMap).filter(city => city !== 'REDISTRIBUTE');
    
    if (actualCities.length === 0 || redistributeCount === 0) {
      return cityDataMap;
    }

    // Calculate total leads from actual cities
    const totalActualLeads = actualCities.reduce((sum, city) => sum + cityDataMap[city].totalLeads, 0);
    
    if (totalActualLeads === 0) {
      return cityDataMap;
    }

    // Calculate proportional distribution without rounding first
    const redistributionData = actualCities.map(city => {
      const cityRatio = cityDataMap[city].totalLeads / totalActualLeads;
      const exactDistribution = redistributeCount * cityRatio;
      return {
        city,
        exactDistribution,
        floorDistribution: Math.floor(exactDistribution),
        remainder: exactDistribution - Math.floor(exactDistribution)
      };
    });

    // Calculate base distribution (floor values)
    let totalDistributed = redistributionData.reduce((sum, data) => sum + data.floorDistribution, 0);
    
    // Distribute remaining leads to cities with highest remainders
    const remainingLeads = redistributeCount - totalDistributed;
    redistributionData.sort((a, b) => b.remainder - a.remainder);
    
    for (let i = 0; i < remainingLeads; i++) {
      redistributionData[i].floorDistribution += 1;
    }

    // Apply the calculated distribution
    redistributionData.forEach(data => {
      const redistributedLeads = data.floorDistribution;
      cityDataMap[data.city].totalLeads += redistributedLeads;
      
      // For detailed city data with status counts, distribute proportionally across statuses
      if (cityDataMap[data.city].statusCounts) {
        const cityTotalOriginal = Object.values(cityDataMap[data.city].statusCounts as { [key: string]: number }).reduce((a: number, b: number) => a + b, 0);
        if (cityTotalOriginal > 0) {
          Object.keys(cityDataMap[data.city].statusCounts).forEach(status => {
            const statusRatio = (cityDataMap[data.city].statusCounts[status] || 0) / cityTotalOriginal;
            const redistributedStatusLeads = Math.round(redistributedLeads * statusRatio);
            cityDataMap[data.city].statusCounts[status] = (cityDataMap[data.city].statusCounts[status] || 0) + redistributedStatusLeads;
          });
        }
      }
    });

    // Remove the REDISTRIBUTE entry
    delete cityDataMap['REDISTRIBUTE'];
    
    return cityDataMap;
  };

  const getDateRange = (range: string): DateRange => {
    const now = new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Start of today

    switch (range) {
      case 'all':
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 10);
        oldDate.setHours(0, 0, 0, 0);
        return { startDate: oldDate, endDate: today };
      case 'today':
        return { startDate: startOfToday, endDate: today };
      case 'last7days':
        const last7 = new Date();
        last7.setDate(last7.getDate() - 6); // Changed from -7 to -6 to get exactly 7 days including today
        last7.setHours(0, 0, 0, 0);
        return { startDate: last7, endDate: today };
      case 'last30days':
        const last30 = new Date();
        last30.setDate(last30.getDate() - 29); // Changed from -30 to -29 to get exactly 30 days including today
        last30.setHours(0, 0, 0, 0);
        return { startDate: last30, endDate: today };
      case 'last60days':
        const last60 = new Date();
        last60.setDate(last60.getDate() - 59); // Changed from -60 to -59 to get exactly 60 days including today
        last60.setHours(0, 0, 0, 0);
        return { startDate: last60, endDate: today };
      case 'custom':
        // Ensure custom date range end time is set to end of day
        const customEnd = new Date(customDateRange.endDate);
        customEnd.setHours(23, 59, 59, 999);
        const customStart = new Date(customDateRange.startDate);
        customStart.setHours(0, 0, 0, 0);
        return { startDate: customStart, endDate: customEnd };
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
    
    // Test timezone conversions on component mount
    testTimezoneConversions();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // Set loading state when data fetching starts
        console.log('Fetching data for range:', selectedRange, 'and source:', selectedSource, 'and city:', selectedCity);
        
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
        console.log('Date range:', { startDate, endDate, selectedRange });

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
        console.log('Found leads:', leadsSnapshot.docs.length);

        // Calculate ALL leads that match the filter criteria (for consistent total counting)
        let allLeadsCount = 0;
        let allConvertedLeadsCount = 0;
        let allActiveLeadsCount = 0;

        leadsSnapshot.docs.forEach(doc => {
          const leadData = doc.data();
          if (
            (selectedSource === 'all' || leadData.source_database === selectedSource) &&
            (selectedCity === 'all' || leadData.city === selectedCity)
          ) {
            allLeadsCount++;
            const status = leadData.status || 'No Status';
            
            if (status === 'Converted') {
              allConvertedLeadsCount++;
            }
            
            if (status === 'Interested' || status === 'Callback' || status === 'Future Potential' || status === 'No Status') {
              allActiveLeadsCount++;
            }
          }
        });

        // Update summary metrics with ALL leads count
        setSummaryMetrics({
          totalLeads: allLeadsCount,
          conversionRate: allLeadsCount ? (allConvertedLeadsCount / allLeadsCount) * 100 : 0,
          activeLeads: allActiveLeadsCount,
          totalSales: allConvertedLeadsCount
        });

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
        
        // Aggregate city data
        const cityDataMap: { [key: string]: CityData } = {};
        const citiesSet = new Set<string>();

        leadsSnapshot.docs.forEach(doc => {
          const leadData = doc.data();
          if (
            (selectedSource === 'all' || leadData.source_database === selectedSource) &&
            (selectedCity === 'all' || leadData.city === selectedCity)
          ) {
            const city = getCityName(leadData);
            citiesSet.add(city);
            
            if (!cityDataMap[city]) {
              cityDataMap[city] = {
                city,
                totalLeads: 0,
                statusCounts: {},
                conversionRate: 0
              };
              LEAD_STATUSES.forEach(status => {
                cityDataMap[city].statusCounts[status] = 0;
              });
            }
            
            const status = leadData.status || 'No Status';
            cityDataMap[city].statusCounts[status] = (cityDataMap[city].statusCounts[status] || 0) + 1;
            cityDataMap[city].totalLeads += 1;
          }
        });

        // Redistribute unknown/other leads
        const redistributeCount = cityDataMap['REDISTRIBUTE']?.totalLeads || 0;
        const redistributedCityDataMap = redistributeUnknownLeads(cityDataMap, redistributeCount);

        // Calculate conversion rates for each city
        const cityDataArray = Object.values(redistributedCityDataMap).map(cityData => ({
          ...cityData,
          conversionRate: cityData.totalLeads > 0 
            ? (cityData.statusCounts['Converted'] || 0) / cityData.totalLeads * 100 
            : 0
        }));

        setCityData(cityDataArray);
        setAvailableCities(['all', ...Object.keys(redistributedCityDataMap).sort()]);

        // Aggregate simplified city data for the new components
        const simpleCityDataMap: { [key: string]: SimpleCityData } = {};

        leadsSnapshot.docs.forEach(doc => {
          const leadData = doc.data();
          const cityName = getCityName(leadData);
          
          if (
            (selectedSource === 'all' || leadData.source_database === selectedSource) &&
            (selectedCity === 'all' || cityName === selectedCity)
          ) {
            if (!simpleCityDataMap[cityName]) {
              simpleCityDataMap[cityName] = {
                city: cityName,
                totalLeads: 0
              };
            }
            
            simpleCityDataMap[cityName].totalLeads += 1;
          }
        });

        // Redistribute unknown/other leads for simplified data
        const redistributeCountSimple = simpleCityDataMap['REDISTRIBUTE']?.totalLeads || 0;
        const redistributedSimpleCityDataMap = redistributeUnknownLeads(simpleCityDataMap, redistributeCountSimple);

        // Convert to array and sort by total leads (descending)
        const simpleCityDataArray = Object.values(redistributedSimpleCityDataMap).sort((a, b) => b.totalLeads - a.totalLeads);
        setSimpleCityData(simpleCityDataArray);
        
        // Calculate conversion time data for converted leads
        const conversionDataArray: ConversionTimeData[] = [];
        
        leadsSnapshot.docs.forEach(doc => {
          const leadData = doc.data();
          const leadId = doc.id;
          
          // Only process converted leads with both timestamps
          if (
            leadData.status === 'Converted' &&
            leadData.synced_at &&
            leadData.convertedAt &&
            (selectedSource === 'all' || leadData.source_database === selectedSource) &&
            (selectedCity === 'all' || leadData.city === selectedCity)
          ) {
            const createdDateUTC = leadData.synced_at.toDate();
            const convertedDateUTC = leadData.convertedAt.toDate();
            
            // Convert both dates to IST for consistent day calculation
            const createdDateIST = toIST(createdDateUTC);
            const convertedDateIST = toIST(convertedDateUTC);
            
            // Calculate conversion time in days using IST dates
            const conversionTimeInDays = Math.ceil((convertedDateIST.getTime() - createdDateIST.getTime()) / (1000 * 60 * 60 * 24));
            
            // Find assigned user name
            const assignedUser = salesUsersData.find(user => user.id === leadData.assignedToId);
            const assignedUserName = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : leadData.assignedTo || 'Unknown';
            
            conversionDataArray.push({
              leadId,
              leadName: leadData.name || 'Unknown',
              createdDate: createdDateIST, // Store IST date for display
              convertedDate: convertedDateIST, // Store IST date for display
              conversionTimeInDays,
              assignedTo: assignedUserName,
              source: leadData.source_database || 'Unknown',
              city: leadData.city || 'Unknown'
            });
          }
        });
        
        setConversionTimeData(conversionDataArray);
        
        // Calculate conversion metrics
        if (conversionDataArray.length > 0) {
          const conversionTimes = conversionDataArray.map(data => data.conversionTimeInDays);
          
          // Sort for median calculation
          const sortedTimes = [...conversionTimes].sort((a, b) => a - b);
          
          const averageTime = conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length;
          const medianTime = sortedTimes.length % 2 === 0
            ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
            : sortedTimes[Math.floor(sortedTimes.length / 2)];
          
          const fastestTime = Math.min(...conversionTimes);
          const slowestTime = Math.max(...conversionTimes);
          
          // Calculate time range buckets
          const timeRangeCounts = {
            '0-7days': conversionTimes.filter(time => time <= 7).length,
            '8-30days': conversionTimes.filter(time => time > 7 && time <= 30).length,
            '31-60days': conversionTimes.filter(time => time > 30 && time <= 60).length,
            '60+days': conversionTimes.filter(time => time > 60).length
          };
          
          setConversionMetrics({
            averageConversionTime: averageTime,
            medianConversionTime: medianTime,
            fastestConversion: fastestTime,
            slowestConversion: slowestTime,
            conversionsByTimeRange: timeRangeCounts
          });
        } else {
          // Reset metrics if no conversion data
          setConversionMetrics({
            averageConversionTime: 0,
            medianConversionTime: 0,
            fastestConversion: 0,
            slowestConversion: 0,
            conversionsByTimeRange: {
              '0-7days': 0,
              '8-30days': 0,
              '31-60days': 0,
              '60+days': 0
            }
          });
        }
        
        // Process language barrier data
        const languageBarrierMap: { [key: string]: number } = {};
        let totalLanguageBarrierLeads = 0;

        leadsSnapshot.docs.forEach(doc => {
          const leadData = doc.data();
          
          // Only process leads with 'Language Barrier' status
          if (
            leadData.status === 'Language Barrier' &&
            leadData.language_barrier &&
            (selectedSource === 'all' || leadData.source_database === selectedSource) &&
            (selectedCity === 'all' || leadData.city === selectedCity)
          ) {
            const language = leadData.language_barrier || 'Other';
            languageBarrierMap[language] = (languageBarrierMap[language] || 0) + 1;
            totalLanguageBarrierLeads += 1;
          }
        });

        // Convert to array and calculate percentages
        const languageBarrierArray: LanguageBarrierData[] = Object.entries(languageBarrierMap)
          .map(([language, count]) => ({
            language,
            count,
            percentage: totalLanguageBarrierLeads > 0 ? (count / totalLanguageBarrierLeads) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count); // Sort by count in descending order

        setLanguageBarrierData(languageBarrierArray);
        
        // NOTE: Old lastModified processing moved to separate useEffect below
        /*
        // Process lastModified data for salesperson activity tracking
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of this week (Sunday)
        
        const { startDate: customStart, endDate: customEnd } = selectedRange === 'custom' 
          ? getDateRange('custom') 
          : { startDate: today, endDate: today };

        console.log('Activity tracking dates:', {
          today: today.toISOString().split('T')[0],
          yesterday: yesterday.toISOString().split('T')[0],
          startOfWeek: startOfWeek.toISOString().split('T')[0]
        });

        const lastModifiedCounts: LastModifiedCount[] = [];

        for (const user of salesUsersData) {
          const counts: LastModifiedCount = {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            today: 0,
            yesterday: 0,
            thisWeek: 0,
            custom: 0
          };

          let debugCount = 0;

          leadsSnapshot.docs.forEach(doc => {
            const leadData = doc.data();
            
            // Only count if lead is assigned to this user and matches source filter
            if (
              leadData.assignedToId === user.id &&
              leadData.lastModified &&
              (selectedSource === 'all' || leadData.source_database === selectedSource)
            ) {
              const lastModifiedDate = leadData.lastModified.toDate();
              // Create a separate date object for comparison to avoid modifying the original
              const lastModifiedDateOnly = new Date(lastModifiedDate);
              lastModifiedDateOnly.setHours(0, 0, 0, 0);
              
              // Debug log for first few records of each user
              if (debugCount < 3) {
                console.log(`Lead for ${user.firstName} ${user.lastName}:`, {
                  leadId: doc.id,
                  lastModified: lastModifiedDate.toISOString(),
                  lastModifiedDateOnly: lastModifiedDateOnly.toISOString().split('T')[0],
                  today: today.toISOString().split('T')[0],
                  yesterday: yesterday.toISOString().split('T')[0],
                  isToday: lastModifiedDateOnly.getTime() === today.getTime(),
                  isYesterday: lastModifiedDateOnly.getTime() === yesterday.getTime()
                });
                debugCount++;
              }
              
              // Count for today
              if (lastModifiedDateOnly.getTime() === today.getTime()) {
                counts.today += 1;
              }
              
              // Count for yesterday
              if (lastModifiedDateOnly.getTime() === yesterday.getTime()) {
                counts.yesterday += 1;
              }
              
              // Count for this week
              if (lastModifiedDateOnly >= startOfWeek && lastModifiedDateOnly <= today) {
                counts.thisWeek += 1;
              }
              
              // Count for custom date range
              if (selectedRange === 'custom') {
                const customStartOnly = new Date(customStart);
                customStartOnly.setHours(0, 0, 0, 0);
                const customEndOnly = new Date(customEnd);
                customEndOnly.setHours(23, 59, 59, 999);
                
                if (lastModifiedDate >= customStartOnly && lastModifiedDate <= customEndOnly) {
                  counts.custom += 1;
                }
              }
            }
          });

          console.log(`Final counts for ${user.firstName} ${user.lastName}:`, counts);
          lastModifiedCounts.push(counts);
        }

        setLastModifiedData(lastModifiedCounts);
        */
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRange, selectedSource, customDateRange, selectedCity]);

  // Separate useEffect for activity tracking with IST timezone
  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        if (salesUsers.length === 0) return;

        // Get leads data with IST date filtering
        const { startDate, endDate } = getActivityDateRange(selectedActivityRange);
        
        console.log('Activity tracking (IST):', {
          range: selectedActivityRange,
          startDate: startDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          endDate: endDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        });

        let activityQuery;
        if (selectedActivityRange === 'all') {
          activityQuery = query(collection(db, 'crm_leads'));
        } else {
          // Convert IST dates to UTC for Firestore query
          const startDateUTC = toUTC(startDate);
          const endDateUTC = toUTC(endDate);
          
          console.log('Firestore query (UTC):', {
            startDateUTC: startDateUTC.toISOString(),
            endDateUTC: endDateUTC.toISOString()
          });
          
          activityQuery = query(
            collection(db, 'crm_leads'),
            where('lastModified', '>=', Timestamp.fromDate(startDateUTC)),
            where('lastModified', '<=', Timestamp.fromDate(endDateUTC))
          );
        }

        const activitySnapshot = await getDocs(activityQuery);
        console.log('Found leads for activity tracking:', activitySnapshot.docs.length);

        // Calculate IST dates for comparison
        const nowIST = toIST(new Date());
        const todayIST = new Date(nowIST);
        todayIST.setHours(0, 0, 0, 0);
        
        const yesterdayIST = new Date(todayIST);
        yesterdayIST.setDate(yesterdayIST.getDate() - 1);
        
        const startOfWeekIST = new Date(todayIST);
        startOfWeekIST.setDate(startOfWeekIST.getDate() - startOfWeekIST.getDay());

        const activityCounts: LastModifiedCount[] = [];

        for (const user of salesUsers) {
          const counts: LastModifiedCount = {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            today: 0,
            yesterday: 0,
            thisWeek: 0,
            custom: 0
          };

          activitySnapshot.docs.forEach(doc => {
            const leadData = doc.data();
            
            // Only count if lead is assigned to this user and matches source filter
            if (
              leadData.assignedToId === user.id &&
              leadData.lastModified &&
              (selectedSource === 'all' || leadData.source_database === selectedSource)
            ) {
              // Convert lastModified to IST for comparison
              const lastModifiedUTC = leadData.lastModified.toDate();
              const lastModifiedIST = toIST(lastModifiedUTC);
              const lastModifiedDateIST = new Date(lastModifiedIST);
              lastModifiedDateIST.setHours(0, 0, 0, 0);
              
              // Count for today (IST)
              if (lastModifiedDateIST.getTime() === todayIST.getTime()) {
                counts.today += 1;
              }
              
              // Count for yesterday (IST)
              if (lastModifiedDateIST.getTime() === yesterdayIST.getTime()) {
                counts.yesterday += 1;
              }
              
              // Count for this week (IST)
              if (lastModifiedDateIST >= startOfWeekIST && lastModifiedDateIST <= todayIST) {
                counts.thisWeek += 1;
              }
              
              // Count for custom date range (IST)
              if (selectedActivityRange === 'custom') {
                const customStartDateIST = new Date(startDate);
                customStartDateIST.setHours(0, 0, 0, 0);
                const customEndDateIST = new Date(endDate);
                customEndDateIST.setHours(23, 59, 59, 999);
                
                if (lastModifiedIST >= customStartDateIST && lastModifiedIST <= customEndDateIST) {
                  counts.custom += 1;
                }
              }
            }
          });

          // Only add users with some activity (not all zeros)
          if (counts.today > 0 || counts.yesterday > 0 || counts.thisWeek > 0 || counts.custom > 0) {
            activityCounts.push(counts);
          }
        }

        console.log('Activity counts (filtered):', activityCounts);
        setLastModifiedData(activityCounts);
        
      } catch (error) {
        console.error('Error fetching activity data:', error);
      }
    };

    fetchActivityData();
  }, [selectedActivityRange, activityDateRange, selectedSource, salesUsers]);

  // Separate useEffect for productivity tracking
  useEffect(() => {
    const fetchProductivityData = async () => {
      try {
        if (salesUsers.length === 0) return;

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
          collection(db, 'crm_leads'),
          where('lastModified', '>=', Timestamp.fromDate(startDateUTC)),
          where('lastModified', '<=', Timestamp.fromDate(endDateUTC))
        );

        const productivitySnapshot = await getDocs(productivityQuery);
        console.log('Found leads for productivity tracking:', productivitySnapshot.docs.length);

        // Group leads by user and date
        const productivityMap: { [key: string]: { [key: string]: ProductivityStats } } = {};

        productivitySnapshot.docs.forEach(doc => {
          const leadData = doc.data();
          
          // Only process if lead has lastModified and matches source filter
          if (
            leadData.lastModified &&
            leadData.assignedToId &&
            (selectedSource === 'all' || leadData.source_database === selectedSource)
          ) {
            // Use lastModified as UTC (do NOT convert to IST)
            const lastModifiedUTC = leadData.lastModified.toDate();
            const dateKey = lastModifiedUTC.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }).split(',').slice(1).join(',').trim() || lastModifiedUTC.toISOString().split('T')[0]; // YYYY-MM-DD format in IST
            
            const userId = leadData.assignedToId;
            const userName = leadData.assignedTo || 'Unknown';
            const status = leadData.status || 'No Status';
            
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

        // Convert to array format and aggregate based on selected range
        let productivityArray: ProductivityStats[] = [];
        
        if (selectedProductivityRange === 'today' || selectedProductivityRange === 'yesterday') {
          // For single day ranges, show individual days
          Object.values(productivityMap).forEach(userDates => {
            Object.values(userDates).forEach(stats => {
              productivityArray.push(stats);
            });
          });
        } else {
          // For multi-day ranges (last7days, last30days, custom), aggregate by user
          Object.entries(productivityMap).forEach(([userId, userDates]) => {
            const aggregatedStats: ProductivityStats = {
              userId,
              userName: Object.values(userDates)[0]?.userName || 'Unknown',
              date: `${selectedProductivityRange === 'last7days' ? 'Last 7 Days' : 
                     selectedProductivityRange === 'last30days' ? 'Last 30 Days' : 
                     'Custom Range'}`,
              leadsWorked: 0,
              lastActivity: new Date(0),
              statusBreakdown: {}
            };

            // Aggregate all days for this user
            Object.values(userDates).forEach(stats => {
              aggregatedStats.leadsWorked += stats.leadsWorked;
              
              // Merge status breakdowns
              Object.entries(stats.statusBreakdown).forEach(([status, count]) => {
                aggregatedStats.statusBreakdown[status] = 
                  (aggregatedStats.statusBreakdown[status] || 0) + count;
              });
              
              // Update last activity if this is more recent
              if (stats.lastActivity > aggregatedStats.lastActivity) {
                aggregatedStats.lastActivity = stats.lastActivity;
              }
            });

            productivityArray.push(aggregatedStats);
          });
        }

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
  }, [selectedProductivityRange, productivityDateRange, selectedSource, salesUsers]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'No Status': 'bg-neutral-100 text-neutral-600',
      'Converted': 'bg-emerald-100 text-emerald-800',
      'Interested': 'bg-indigo-100 text-indigo-800',
      'Not Interested': 'bg-rose-100 text-rose-800',
      'Not Answering': 'bg-amber-100 text-amber-800',
      'Callback': 'bg-violet-100 text-violet-800',
      'Loan Required': 'bg-cyan-100 text-cyan-800',
      'Cibil Issue': 'bg-orange-100 text-orange-800',
      'Closed Lead': 'bg-slate-100 text-slate-800',
      'Language Barrier': 'bg-red-100 text-red-800',
      'Future Potential': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Helper function to get display name for status in table headers
  const getStatusDisplayName = (status: string) => {
    // For these specific statuses, show custom abbreviations
    if (status === 'No Status') return 'NS';
    if (status === 'Not Interested') return 'NI';
    if (status === 'Not Answering') return 'NA';
    if (status === 'Future Potential') return 'FP';
    
    // For others, show first word as before
    return status.split(' ')[0];
  };

  // Helper function to safely calculate percentage and avoid NaN
  const safePercentage = (numerator: number, denominator: number) => {
    if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
      return '0';
    }
    return ((numerator / denominator) * 100).toFixed(1);
  };

  // Replace SalesPersonRadarChart with compact performance cards
  const SalesPersonPerformanceCard: React.FC<ChartProps> = ({ distribution }) => {
    const totalLeads = Object.values(distribution.statusCounts).reduce((a, b) => a + b, 0);
    const convertedLeads = distribution.statusCounts['Converted'] || 0;
    const conversionRate = totalLeads ? (convertedLeads / totalLeads) * 100 : 0;
    
    // Priority statuses that should always be shown
    const priorityStatuses = ['Converted', 'Interested', 'Not Interested', 'Not Answering', 'Callback'];
    
    // Get priority statuses first
    const priorityStatusData = priorityStatuses.map(status => ({
      status,
      count: distribution.statusCounts[status] || 0,
      percentage: totalLeads > 0 ? ((distribution.statusCounts[status] || 0) / totalLeads * 100) : 0
    }));
    
    // Get remaining statuses with counts > 0
    const remainingStatuses = LEAD_STATUSES
      .filter(status => !priorityStatuses.includes(status))
      .map(status => ({
        status,
        count: distribution.statusCounts[status] || 0,
        percentage: totalLeads > 0 ? ((distribution.statusCounts[status] || 0) / totalLeads * 100) : 0
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
    
    // Combine priority and remaining statuses, limit to 6 total
    const displayStatuses = [...priorityStatusData, ...remainingStatuses].slice(0, 6);

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-3">
          <h4 className="text-sm font-bold text-gray-900 truncate">{distribution.userName}</h4>
          <div className="flex justify-center space-x-4 mt-2">
            <div className="text-center">
              <p className="text-xs text-gray-500">Total</p>
              <button
                onClick={() => totalLeads > 0 && handleCellClick(distribution.userName, 'all')}
                disabled={totalLeads === 0}
                className={`text-lg font-bold ${totalLeads > 0 ? 'text-gray-900 hover:text-blue-600 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
              >
                {totalLeads}
              </button>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Conv. Rate</p>
              <p className="text-lg font-bold text-indigo-600">{conversionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="flex-1 space-y-1 max-h-48 overflow-y-auto">
          {displayStatuses.map((item, index) => (
            <button
              key={item.status}
              onClick={() => item.count > 0 && handleCellClick(distribution.userName, item.status)}
              disabled={item.count === 0}
              className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
                item.count > 0 
                  ? 'bg-gray-50/50 hover:bg-gray-100/70 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500 cursor-pointer' 
                  : 'bg-gray-50/30 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[LEAD_STATUSES.indexOf(item.status) % COLORS.length] }}
                ></div>
                <span className="text-xs font-medium text-gray-700 truncate">{item.status}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${item.count > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {item.count}
                </p>
                <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
              </div>
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Performance</span>
            <span className="text-xs font-medium text-indigo-600">{conversionRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(conversionRate * 2, 100)}%` }}
            ></div>
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
            <Tooltip formatter={(value: number) => [value, 'Leads']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // City-wise Bar Chart
  const CityWiseBarChart: React.FC<CityChartProps> = ({ cityData }) => {
    const data = cityData.map(city => ({
      city: city.city,
      totalLeads: city.totalLeads,
      converted: city.statusCounts['Converted'] || 0,
      interested: city.statusCounts['Interested'] || 0,
      notInterested: city.statusCounts['Not Interested'] || 0,
      notAnswering: city.statusCounts['Not Answering'] || 0,
      callback: city.statusCounts['Callback'] || 0
    }));

    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalLeads" fill="#8884d8" name="Total Leads" />
            <Bar dataKey="converted" fill="#00C49F" name="Converted" />
            <Bar dataKey="interested" fill="#0088FE" name="Interested" />
            <Bar dataKey="notInterested" fill="#FF8042" name="Not Interested" />
            <Bar dataKey="notAnswering" fill="#FFBB28" name="Not Answering" />
            <Bar dataKey="callback" fill="#8884D8" name="Callback" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // City-wise Pie Chart
  const CityWisePieChart: React.FC<CityChartProps> = ({ cityData }) => {
    const data = cityData.map((city, index) => ({
      name: city.city,
      value: city.totalLeads,
      conversionRate: city.conversionRate
    }));

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
      const RADIAN = Math.PI / 180;
      const radius = outerRadius * 1.2;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
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
      <div className="h-[350px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderCustomizedLabel}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, 'Leads']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // City Conversion Rate Chart
  const CityConversionChart: React.FC<CityChartProps> = ({ cityData }) => {
    const data = cityData.map(city => ({
      city: city.city,
      conversionRate: city.conversionRate,
      totalLeads: city.totalLeads
    }));

    return (
      <div className="h-[350px] w-full">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conversion Rate']} />
            <Legend />
            <Bar dataKey="conversionRate" fill="#00C49F" name="Conversion Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Conversion Time Distribution Chart
  const ConversionTimeDistributionChart: React.FC<ConversionFunnelProps> = ({ conversionMetrics }) => {
    const data = Object.entries(conversionMetrics.conversionsByTimeRange).map(([range, count]) => ({
      range,
      count,
      percentage: conversionTimeData.length > 0 ? (count / conversionTimeData.length) * 100 : 0
    }));

    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip formatter={(value: number, name: string) => [
              name === 'count' ? value : `${value.toFixed(1)}%`,
              name === 'count' ? 'Leads' : 'Percentage'
            ]} />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Number of Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Conversion Timeline Scatter Chart
  const ConversionTimelineChart: React.FC<ConversionTimelineProps> = ({ conversionData }) => {
    const chartData = conversionData.map((data, index) => ({
      index: index + 1,
      conversionTime: data.conversionTimeInDays,
      leadName: data.leadName,
      assignedTo: data.assignedTo,
      source: data.source,
      createdDate: data.createdDate.toLocaleDateString(),
      convertedDate: data.convertedDate.toLocaleDateString()
    }));

    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" label={{ value: 'Lead Number', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Days to Convert', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value: number) => [`${value} days`, 'Conversion Time']}
              labelFormatter={(label: number) => `Lead #${label}`}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = chartData[Number(label) - 1];
                  return (
                    <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                      <p className="font-semibold">{data.leadName}</p>
                      <p className="text-sm text-gray-600">Assigned to: {data.assignedTo}</p>
                      <p className="text-sm text-gray-600">Source: {data.source}</p>
                      <p className="text-sm text-gray-600">Created: {data.createdDate}</p>
                      <p className="text-sm text-gray-600">Converted: {data.convertedDate}</p>
                      <p className="text-sm font-medium text-blue-600">
                        Conversion Time: {payload[0].value} days
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="conversionTime" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              name="Days to Convert"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Conversion Funnel Chart
  const ConversionFunnelChart: React.FC<ConversionFunnelProps> = ({ conversionMetrics, conversionData }) => {
    const funnelData = [
      { stage: 'Quick (0-7 days)', count: conversionMetrics.conversionsByTimeRange['0-7days'], color: '#00C49F' },
      { stage: 'Medium (8-30 days)', count: conversionMetrics.conversionsByTimeRange['8-30days'], color: '#0088FE' },
      { stage: 'Slow (31-60 days)', count: conversionMetrics.conversionsByTimeRange['31-60days'], color: '#FFBB28' },
      { stage: 'Very Slow (60+ days)', count: conversionMetrics.conversionsByTimeRange['60+days'], color: '#FF8042' }
    ];

    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={funnelData}
              dataKey="count"
              nameKey="stage"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ stage, count, percent }: any) => `${stage}: ${count} (${(percent * 100).toFixed(1)}%)`}
            >
              {funnelData.map((entry, index) => (
                <Cell key={entry.stage} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, 'Leads']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Add new simplified chart component
  const SimpleCityWiseBarChart: React.FC<SimpleCityChartProps> = ({ cityData }) => {
    const data = cityData.map(city => ({
      city: city.city,
      totalLeads: city.totalLeads
    }));

    return (
      <div className="h-[500px] w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="city" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              interval={0}
              fontSize={12}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [value, 'Total Leads']}
              labelFormatter={(label: string) => `City: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="totalLeads" 
              fill="#3B82F6" 
              name="Total Leads"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Language Barrier Bar Chart
  const LanguageBarrierBarChart: React.FC<LanguageBarrierChartProps> = ({ languageData }) => {
    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer>
          <BarChart data={languageData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="language" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              interval={0}
              fontSize={11}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: number, name: string) => [
                name === 'count' ? value : `${value.toFixed(1)}%`,
                name === 'count' ? 'Leads' : 'Percentage'
              ]}
              labelFormatter={(label: string) => `Language: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="count" 
              fill="#DC2626" 
              name="Number of Leads"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Language Barrier Pie Chart
  const LanguageBarrierPieChart: React.FC<LanguageBarrierChartProps> = ({ languageData }) => {
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, language, count }: any) => {
      const RADIAN = Math.PI / 180;
      const radius = outerRadius * 1.2;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      const textAnchor = x > cx ? 'start' : 'end';

      // Only show label if percentage is greater than 5%
      if (percent * 100 < 5) return null;

      return (
        <text 
          x={x} 
          y={y} 
          fill="#374151" 
          textAnchor={textAnchor}
          dominantBaseline="central"
          fontSize="12"
          fontWeight="500"
        >
          {`${language}: ${count} (${(percent * 100).toFixed(1)}%)`}
        </text>
      );
    };

    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={languageData}
              dataKey="count"
              nameKey="language"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={renderCustomizedLabel}
            >
              {languageData.map((entry, index) => (
                <Cell key={entry.language} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value, 'Leads']}
              labelFormatter={(label: string) => `Language: ${label}`}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

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

    // Check if we're showing aggregated data (multi-day ranges)
    const isAggregated = selectedProductivityRange === 'last7days' || selectedProductivityRange === 'last30days' || selectedProductivityRange === 'custom';

    // Group by user for summary
    const userSummary = productivityStats.reduce((acc, stat) => {
      if (!acc[stat.userId]) {
        acc[stat.userId] = {
          userName: stat.userName,
          totalLeads: 0,
          totalDays: new Set(),
          averageLeadsPerDay: 0,
          lastActivity: new Date(0),
          isAggregated: isAggregated,
          statusBreakdown: {}
        };
      }
      acc[stat.userId].totalLeads += stat.leadsWorked;
      
      // Merge status breakdowns
      Object.entries(stat.statusBreakdown).forEach(([status, count]) => {
        acc[stat.userId].statusBreakdown[status] = 
          (acc[stat.userId].statusBreakdown[status] || 0) + count;
      });
      
      if (isAggregated) {
        // For aggregated data, calculate days based on the date range
        const daysInRange = selectedProductivityRange === 'last7days' ? 7 : 
                           selectedProductivityRange === 'last30days' ? 30 : 
                           Math.ceil((productivityDateRange.endDate.getTime() - productivityDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        acc[stat.userId].totalDays = new Set(Array.from({length: daysInRange}, (_, i) => `day${i}`));
      } else {
        // For individual days, count actual days with activity
        acc[stat.userId].totalDays.add(stat.date);
      }
      
      if (stat.lastActivity > acc[stat.userId].lastActivity) {
        acc[stat.userId].lastActivity = stat.lastActivity;
      }
      return acc;
    }, {} as { [key: string]: { userName: string; totalLeads: number; totalDays: Set<string>; averageLeadsPerDay: number; lastActivity: Date; isAggregated: boolean; statusBreakdown: { [key: string]: number } } });

    // Calculate averages
    Object.values(userSummary).forEach(user => {
      user.averageLeadsPerDay = user.totalLeads / user.totalDays.size;
    });

    return (
      <div className="space-y-6">
        {/* Productivity Analytics Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-green-600/5 rounded-2xl blur-lg"></div>
          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-green-800 bg-clip-text text-transparent">
                  Productivity Analytics
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {getProductivityDisplayName()} - Performance metrics for sales agents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Productivity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(userSummary).map((user, index) => (
            <div key={index} className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5"></div>
              <div className="relative p-4 h-full flex flex-col">
                {/* Agent Name Header */}
                <div className="text-center mb-3">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{user.userName}</h4>
                </div>

                {/* Key Metrics */}
                <div className="flex justify-center space-x-4 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Total Worked</p>
                    <p className="text-lg font-bold text-gray-900">{user.totalLeads}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Avg/Day</p>
                    <p className="text-lg font-bold text-emerald-600">{user.averageLeadsPerDay.toFixed(1)}</p>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Days Active:</span>
                    <span className="font-bold text-blue-600">{user.totalDays.size}</span>
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

                {/* Lead Status Breakdown */}
                <div className="flex-1 space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(user.statusBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between p-1 rounded text-xs">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[LEAD_STATUSES.indexOf(status) % COLORS.length] }}
                          ></div>
                          <span className="text-gray-700 truncate">{status.toLowerCase()}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-gray-900">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>

       
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {userRole === 'billcut' ? <BillcutSidebar /> : <OverlordSidebar />}
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 space-y-4">
            
            {/* Header Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-indigo-600/10 rounded-2xl blur-2xl"></div>
              <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                      Sales Analytics Dashboard
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Comprehensive insights into your team's performance and conversion metrics
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Leads Card */}
              <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/5"></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-md">
                      <UserGroupIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500 mb-1">Total Leads</p>
                      <h3 className="text-xl font-bold text-gray-900">{summaryMetrics.totalLeads}</h3>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-teal-600">
                    <span className="font-medium">Active Pipeline</span>
                  </div>
                </div>
              </div>

              {/* Conversion Rate Card */}
              <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5"></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-md">
                      <CheckCircleIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500 mb-1">Conversion Rate</p>
                      <h3 className="text-xl font-bold text-gray-900">
                        {summaryMetrics.conversionRate.toFixed(1)}%
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-emerald-600">
                    <span className="font-medium">Success Rate</span>
                  </div>
                </div>
              </div>

              {/* Active Leads Card */}
              <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/5"></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                      <PhoneIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500 mb-1">Active Leads</p>
                      <h3 className="text-xl font-bold text-gray-900">{summaryMetrics.activeLeads}</h3>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-blue-600">
                    <span className="font-medium">In Progress</span>
                  </div>
                </div>
              </div>

              {/* Total Sales Card */}
              <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-violet-500/5"></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                      <ChartBarIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500 mb-1">Total Sales</p>
                      <h3 className="text-xl font-bold text-gray-900">{summaryMetrics.totalSales}</h3>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-purple-600">
                    <span className="font-medium">Converted Leads</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Time Metrics Cards */}
            {conversionTimeData.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Average Conversion Time Card */}
                <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-sky-500/5"></div>
                  <div className="relative p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-sky-600 rounded-lg shadow-md">
                        <CalendarDaysIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 mb-1">Avg. Conv.</p>
                        <h3 className="text-xl font-bold text-gray-900">
                          {conversionMetrics.averageConversionTime.toFixed(1)}d
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-blue-600">
                      <span className="font-medium">Average Time</span>
                    </div>
                  </div>
                </div>

                {/* Median Conversion Time Card */}
                <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-blue-500/5"></div>
                  <div className="relative p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg shadow-md">
                        <ChartBarIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 mb-1">Median</p>
                        <h3 className="text-xl font-bold text-gray-900">
                          {conversionMetrics.medianConversionTime.toFixed(1)}d
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-indigo-600">
                      <span className="font-medium">Median Time</span>
                    </div>
                  </div>
                </div>

                {/* Fastest Conversion Card */}
                <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5"></div>
                  <div className="relative p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 mb-1">Fastest</p>
                        <h3 className="text-xl font-bold text-gray-900">
                          {conversionMetrics.fastestConversion}d
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-green-600">
                      <span className="font-medium">Best Time</span>
                    </div>
                  </div>
                </div>

                {/* Slowest Conversion Card */}
                <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-500/5"></div>
                  <div className="relative p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                        <XCircleIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 mb-1">Slowest</p>
                        <h3 className="text-xl font-bold text-gray-900">
                          {conversionMetrics.slowestConversion}d
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-red-600">
                      <span className="font-medium">Longest Time</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-purple-600/5 to-pink-600/5 rounded-2xl blur-lg"></div>
              <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Date Range Filter */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CalendarDaysIcon className="h-4 w-4 text-indigo-500" />
                      Date Range
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(DATE_RANGES).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => {
                            console.log('Date range button clicked:', key, label);
                            setSelectedRange(key);
                            setShowCustomRange(key === 'custom');
                          }}
                          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                            selectedRange === key
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                              : 'bg-gray-50/80 text-gray-700 hover:bg-gray-100/80 border border-gray-200/50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Date Range Picker */}
                    {showCustomRange && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
                          <input
                            type="date"
                            value={customDateRange.startDate.toISOString().split('T')[0]}
                            onChange={(e) => setCustomDateRange(prev => ({
                              ...prev,
                              startDate: new Date(e.target.value)
                            }))}
                            className="block w-full rounded-lg border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
                          <input
                            type="date"
                            value={customDateRange.endDate.toISOString().split('T')[0]}
                            onChange={(e) => setCustomDateRange(prev => ({
                              ...prev,
                              endDate: new Date(e.target.value)
                            }))}
                            className="block w-full rounded-lg border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Source and City Filters */}
                  <div className="space-y-4">
                    {/* Source Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FunnelIcon className="h-4 w-4 text-purple-500" />
                        Lead Source
                      </label>
                      {userRole === 'billcut' ? (
                        <div className="block w-full rounded-lg border-gray-200/50 bg-gray-50/80 backdrop-blur-sm px-3 py-2 text-sm text-gray-600 cursor-not-allowed">
                          Billcut
                        </div>
                      ) : (
                        <select
                          value={selectedSource}
                          onChange={(e) => setSelectedSource(e.target.value)}
                          className="block w-full rounded-lg border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
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

                    {/* City Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FunnelIcon className="h-4 w-4 text-emerald-500" />
                        City
                      </label>
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="block w-full rounded-lg border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                      >
                        <option value="all">All Cities</option>
                        {availableCities.filter(city => city !== 'all').map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200/50 rounded-full animate-spin"></div>
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                  <div className="w-16 h-16 border-4 border-transparent border-l-purple-500 rounded-full animate-spin absolute top-0 left-0 animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Individual Performance Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {leadStatusDistribution.map((distribution) => (
                    <div key={distribution.userId} className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-xl blur-lg"></div>
                      <div className="relative bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4 h-96">
                        <SalesPersonPerformanceCard distribution={distribution} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sales Team Performance Table */}
                {/* <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl blur-lg"></div>
                  <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-6 py-4 border-b border-white/10 rounded-t-2xl">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                          <UserGroupIcon className="h-5 w-5 text-white" />
                        </div>
                        Sales Team Performance Analysis
                      </h3>
                    </div>
                    <div className="p-6">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm">
                            <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Sales Person
                            </th>
                            {LEAD_STATUSES.map((status) => (
                              <th key={status} scope="col" className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex flex-col">
                                  <span className="truncate">{getStatusDisplayName(status)}</span>
                                  <span className="text-[9px] text-gray-400 font-normal normal-case mt-1">
                                    {leadStatusDistribution.reduce((sum, dist) => sum + (dist.statusCounts[status] || 0), 0)}
                                  </span>
                                </div>
                              </th>
                            ))}
                            <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50">
                          {leadStatusDistribution.map((distribution, index) => {
                            const total = Object.values(distribution.statusCounts).reduce((a, b) => a + b, 0);
                            return (
                              <tr 
                                key={index} 
                                className="hover:bg-blue-50/30 transition-colors duration-200"
                              >
                                <td className="px-3 py-3">
                                  <div className="text-sm font-bold text-gray-900 truncate">{distribution.userName}</div>
                                  <div className="text-xs text-gray-500 font-medium">
                                    {safePercentage(distribution.statusCounts['Converted'] || 0, total)}%
                                  </div>
                                </td>
                                {LEAD_STATUSES.map((status) => {
                                  const count = distribution.statusCounts[status] || 0;
                                  return (
                                    <td key={status} className="px-2 py-3 text-center">
                                      <div className="flex flex-col items-center space-y-1">
                                        <button
                                          onClick={() => count > 0 && handleCellClick(distribution.userName, status)}
                                          disabled={count === 0}
                                          className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${getStatusColor(status)} shadow-sm ${count > 0 ? 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500' : 'cursor-not-allowed'}`}
                                        >
                                          {count}
                                        </button>
                                        <div className="text-[9px] text-gray-400">
                                          {safePercentage(count, total)}%
                                        </div>
                                      </div>
                                    </td>
                                  )
                                })}
                                <td className="px-3 py-3 text-center">
                                  <div className="flex flex-col items-center space-y-1">
                                    <button
                                      onClick={() => total > 0 && handleCellClick(distribution.userName, 'all')}
                                      disabled={total === 0}
                                      className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold text-gray-900 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm ${total > 0 ? 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500' : 'cursor-not-allowed'}`}
                                    >
                                      {total}
                                    </button>
                                    <div className="text-xs text-gray-500 font-medium">
                                      {safePercentage(total, summaryMetrics.totalLeads)}%
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm border-t-2 border-gray-200">
                            <td className="px-3 py-3 text-sm font-bold text-gray-900">Total</td>
                            {LEAD_STATUSES.map((status) => {
                              const statusTotal = leadStatusDistribution.reduce((sum, dist) => sum + (dist.statusCounts[status] || 0), 0);
                              return (
                                <td key={status} className="px-2 py-3 text-center">
                                  <div className="flex flex-col items-center space-y-1">
                                    <button
                                      onClick={() => statusTotal > 0 && handleCellClick('all', status)}
                                      disabled={statusTotal === 0}
                                      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${getStatusColor(status)} shadow-md border border-white/50 ${statusTotal > 0 ? 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500' : 'cursor-not-allowed'}`}
                                    >
                                      {statusTotal}
                                    </button>
                                    <div className="text-[9px] text-gray-400 font-medium">
                                      {safePercentage(statusTotal, summaryMetrics.totalLeads)}%
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => summaryMetrics.totalLeads > 0 && handleCellClick('all', 'all')}
                                disabled={summaryMetrics.totalLeads === 0}
                                className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold text-gray-900 bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 shadow-md ${summaryMetrics.totalLeads > 0 ? 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500' : 'cursor-not-allowed'}`}
                              >
                                {summaryMetrics.totalLeads}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div> */}

                {/* NEW: Simplified City-wise Lead Distribution Section */}
                {simpleCityData.length > 0 && (
                  <>
                    {/* Section Divider */}
                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gradient-to-r from-indigo-300 to-purple-300"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/20 px-6 py-2 text-lg font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                          Simplified City Distribution
                        </span>
                      </div>
                    </div>

                    {/* Summary Card */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-gray-600/5 rounded-2xl blur-lg"></div>
                      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Cities</p>
                            <p className="text-2xl font-bold text-gray-900">{simpleCityData.length}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Leads</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {simpleCityData.reduce((sum, city) => sum + city.totalLeads, 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Top City</p>
                            <p className="text-lg font-bold text-emerald-600">
                              {simpleCityData.length > 0 ? simpleCityData[0].city : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {simpleCityData.length > 0 ? `${simpleCityData[0].totalLeads} leads` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Simplified City-wise Lead Distribution Bar Chart */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-gray-600/5 rounded-2xl blur-lg"></div>
                      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg">
                            <ChartBarIcon className="h-5 w-5 text-white" />
                          </div>
                          Simplified Lead Distribution by City
                        </h3>
                        <SimpleCityWiseBarChart cityData={simpleCityData} />
                      </div>
                    </div>
                  </>
                )}

                {/* Language Barrier Analytics Section */}
                {languageBarrierData.length > 0 && (
                  <>
                    {/* Section Divider */}
                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gradient-to-r from-indigo-300 to-purple-300"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/20 px-6 py-2 text-lg font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                          Language Barrier Analytics
                        </span>
                      </div>
                    </div>

                    {/* Language Barrier Summary Card */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-orange-600/5 rounded-2xl blur-lg"></div>
                      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Language Barriers</p>
                            <p className="text-2xl font-bold text-red-600">
                              {languageBarrierData.reduce((sum, lang) => sum + lang.count, 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Languages Affected</p>
                            <p className="text-2xl font-bold text-orange-600">{languageBarrierData.length}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Most Common</p>
                            <p className="text-lg font-bold text-amber-600">
                              {languageBarrierData.length > 0 ? languageBarrierData[0].language : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {languageBarrierData.length > 0 ? `${languageBarrierData[0].count} leads` : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Barrier Rate</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {safePercentage(languageBarrierData.reduce((sum, lang) => sum + lang.count, 0), summaryMetrics.totalLeads)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                  

                    {/* Language Barrier Details Table */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-orange-600/5 rounded-2xl blur-lg"></div>
                      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
                        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 px-6 py-4 border-b border-white/10 rounded-t-2xl">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg">
                              <UserGroupIcon className="h-5 w-5 text-white" />
                            </div>
                            Language Barrier Breakdown
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead>
                                <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm">
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Language
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Number of Leads
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Percentage
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Impact Level
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100/50">
                                {languageBarrierData.map((language, index) => (
                                  <tr key={language.language} className="hover:bg-red-50/30 transition-colors duration-200">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center space-x-3">
                                        <div 
                                          className="w-4 h-4 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        ></div>
                                        <div className="text-sm font-bold text-gray-900">{language.language}</div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold text-red-800 bg-red-100 border border-red-200 shadow-sm">
                                        {language.count}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-sm font-bold text-gray-900">
                                        {language.percentage.toFixed(1)}%
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                                        language.percentage >= 20 ? 'bg-red-100 text-red-800' :
                                        language.percentage >= 10 ? 'bg-orange-100 text-orange-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {language.percentage >= 20 ? 'High' :
                                         language.percentage >= 10 ? 'Medium' : 'Low'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>


                  </>
                )}

                {/* Productivity Stats Component */}
                <ProductivityStatsComponent />

              </div>
            )}

            {/* Productivity Filters Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 via-green-600/5 to-teal-600/5 rounded-2xl blur-lg"></div>
              <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Productivity Date Range Filter */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CalendarDaysIcon className="h-4 w-4 text-emerald-500" />
                      Productivity Date Range
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(DATE_RANGES).map(([key, label]) => (
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
                          {(key !== 'all' && key !== 'last60days') && label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Productivity Date Range Picker */}
                    {showProductivityCustomRange && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
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
                          <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <ChartBarIcon className="h-4 w-4 text-emerald-500" />
                        Productivity Info
                      </label>
                      <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/50">
                        <p className="text-xs text-emerald-700 font-medium mb-1">
                          {getProductivityDisplayName()}
                        </p>
                        <p className="text-xs text-gray-600">
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
      </div>
    </div>
  );
}
