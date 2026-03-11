"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, collectionGroup } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// Import cache and performance utilities
import { salesCache, salesAnalyticsCache, salesTargetsCache, salesTasksCache, generateCacheKey } from './sales/utils/cache';
import { salesPerfMonitor, preloadCriticalResources, debounce } from './sales/utils/performance';

interface TargetData {
  amountCollectedTarget: number;
  amountCollected: number;
  convertedLeadsTarget: number;
  convertedLeads: number;
  userId: string;
  userName: string;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

// Updated chart data with better colors for dark mode
const monthlyData = [
  { name: "Jan", amount: 12000 },
  { name: "Feb", amount: 19000 },
  { name: "Mar", amount: 17000 },
  { name: "Apr", amount: 22000 },
  { name: "May", amount: 28000 },
  { name: "Jun", amount: 32000 },
];

const leadsData = [
  { name: "Jan", converted: 12, total: 45 },
  { name: "Feb", converted: 19, total: 50 },
  { name: "Mar", converted: 15, total: 40 },
  { name: "Apr", converted: 22, total: 55 },
  { name: "May", converted: 28, total: 60 },
  { name: "Jun", converted: 25, total: 52 },
];

// Custom chart colors for dark mode
const chartColors = {
  primary: "#6366f1",  // Indigo
  secondary: "#10b981", // Emerald
  accent: "#f97316",   // Orange
  background: "#121212",
  text: "#e5e5e5",
  grid: "#333333",
};

// Define interface for task data
interface Task {
  id: string;
  assignedBy: string;
  assignedTo: string;
  assigneeName: string;
  title: string;
  description: string;
  status: string;
  createdAt: any;
}

// Add interface for detailed analytics
interface LeadAnalytics {
  totalLeads: number;
  leadsNeedingWork: number;
  convertedLeads: number;
  callbackLeads: number;
  interestedLeads: number;
  notInterestedLeads: number;
  notAnsweringLeads: number;
  loanRequiredLeads: number;
  shortLoanLeads: number;
  cibilIssueLeads: number;
  closedLeads: number;
  statusDistribution: { status: string; count: number; percentage: number }[];
  sourceDistribution: { source: string; count: number; percentage: number }[];
  cityDistribution: { city: string; count: number; percentage: number }[];
  monthlyTrend: { month: string; total: number; converted: number }[];
  conversionRate: number;
  averageResponseTime: number;
}

// Add this function before the component definition
function getCurrentMonth(): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[new Date().getMonth()];
}

export default function SalesDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [targetData, setTargetData] = useState<TargetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Add state for current month and year
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // Replace dummy data with real lead data
  const [totalLeads, setTotalLeads] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);
  const [leadsChartData, setLeadsChartData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);

  // Add state for tracking available months for filtering
  const [availableMonths, setAvailableMonths] = useState<{month: string, year: number}[]>([]);

  // Add state for detailed analytics
  const [leadAnalytics, setLeadAnalytics] = useState<LeadAnalytics | null>(null);
  const [allLeads, setAllLeads] = useState<any[]>([]);

  // Add state for Billcut analytics
  const [billcutAnalytics, setBillcutAnalytics] = useState<LeadAnalytics | null>(null);
  const [allBillcutLeads, setAllBillcutLeads] = useState<any[]>([]);



  // Add state for tasks
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);

  // Add state for target trend
  const [targetTrendData, setTargetTrendData] = useState<any[]>([]);

  // Add state for analytics source selection
  const [analyticsSource, setAnalyticsSource] = useState<'AMA' | 'Billcut'>('AMA');

  // Cache management state
  const [cacheSize, setCacheSize] = useState(0);
  
  // Use refs to track loading states and prevent infinite re-renders
  const targetsLoaded = useRef(false);
  const leadsLoaded = useRef(false);
  const billcutLeadsLoaded = useRef(false);
  const tasksLoaded = useRef(false);
  const monthsLoaded = useRef(false);

  useEffect(() => {
    // Start performance monitoring
    salesPerfMonitor.start('sales-dashboard-initial-load');
    salesPerfMonitor.start('critical-resources-preload');
    
    // Preload critical resources
    preloadCriticalResources();
    salesPerfMonitor.end('critical-resources-preload');

    // Get user details from localStorage
    const storedUserName = localStorage.getItem("userName");
    const storedUserEmail = localStorage.getItem("userEmail");
    
    if (storedUserName && storedUserEmail) {
      setUserName(storedUserName);
      setUserEmail(storedUserEmail);
      
      // Fetch all data for this user
      fetchData(storedUserName);
    } else {
      setIsLoading(false);
      salesPerfMonitor.safeEnd('sales-dashboard-initial-load');
    }

    return () => {
      salesPerfMonitor.safeEnd('sales-dashboard-initial-load');
    };
  }, []); // Empty dependency array to run only once

  // New effect to refetch data when month/year changes
  useEffect(() => {
    if (userName && !isLoading) {
      // Reset the loaded flags when month/year changes to force refetch
      targetsLoaded.current = false;
      leadsLoaded.current = false;
      billcutLeadsLoaded.current = false;
      
      // Clear the specific cache for the new month/year
      const targetsCacheKey = generateCacheKey.targets(userName, currentMonth, currentYear);
      const leadsCacheKey = generateCacheKey.leads(userName, currentMonth, currentYear);
      const billcutCacheKey = generateCacheKey.billcutLeads(userName, currentMonth, currentYear);
      
      salesTargetsCache.delete(targetsCacheKey);
      salesAnalyticsCache.delete(leadsCacheKey);
      salesAnalyticsCache.delete(billcutCacheKey);
      
      // Use Promise.all to fetch data in parallel
      Promise.all([
        fetchTargetDataByUserName(userName),
        fetchLeadData(userName),
        fetchBillcutLeadData(userName)
      ]).catch(error => {
        console.error("Error fetching data on month/year change:", error);
      });
    }
  }, [currentMonth, currentYear, userName, isLoading]); // Added isLoading to prevent calls during initial load

  // New function to fetch all data types
  const fetchData = useCallback(async (userName: string) => {
    try {
      setIsLoading(true);
      
      // Fetch all data in parallel for better performance
      await Promise.all([
        fetchTargetDataByUserName(userName),
        fetchLeadData(userName),
        fetchBillcutLeadData(userName),
        fetchTaskData(userName),
        fetchAvailableMonths(userName)
      ]);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
      salesPerfMonitor.safeEnd('sales-dashboard-initial-load');
    }
  }, []);

  // New function to get available months with lead data
  const fetchAvailableMonths = useCallback(async (userName: string) => {
    if (monthsLoaded.current) {
      return;
    }
    
    salesPerfMonitor.start('available-months-load');
    
    try {
      const monthsCacheKey = generateCacheKey.availableMonths(userName);
      
      // Check cache first
      const cachedMonths = salesCache.get<{month: string, year: number}[]>(monthsCacheKey);
      if (cachedMonths) {
        setAvailableMonths(cachedMonths);
        monthsLoaded.current = true;
        salesPerfMonitor.end('available-months-load');
        return;
      }
      
      // Query all leads assigned to the current user (AMA leads)
      const leadsQuery = query(
        collection(db, "ama_leads"),
        where("assigned_to", "==", userName)
      );
      
      // Query all Billcut leads assigned to the current user
      const billcutLeadsQuery = query(
        collection(db, "billcutLeads"),
        where("assigned_to", "==", userName)
      );
      
      const [leadsSnapshot, billcutSnapshot] = await Promise.all([
        getDocs(leadsQuery),
        getDocs(billcutLeadsQuery)
      ]);
      
      // Track unique month/year combinations
      const monthsSet = new Set<string>();
      const monthsArray: {month: string, year: number}[] = [];
      
      // Process AMA leads
      leadsSnapshot.forEach(doc => {
        const leadData = doc.data();
        
        // Get month from synced_at (preferred) or date or timestamp
        let date;
        if (leadData.synced_at) {
          date = leadData.synced_at.toDate ? leadData.synced_at.toDate() : new Date(leadData.synced_at);
        } else if (leadData.date) {
          date = new Date(leadData.date);
        } else if (leadData.timestamp) {
          date = leadData.timestamp.toDate ? leadData.timestamp.toDate() : new Date(leadData.timestamp);
        } else {
          date = new Date(); // Fallback
        }
        
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const key = `${month}_${year}`;
        
        if (!monthsSet.has(key)) {
          monthsSet.add(key);
          monthsArray.push({ month, year });
        }
      });
      
      // Process Billcut leads
      billcutSnapshot.forEach(doc => {
        const leadData = doc.data();
        
        // Get month from date or synced_date
        let date;
        if (leadData.date) {
          date = new Date(leadData.date);
        } else if (leadData.synced_date) {
          date = leadData.synced_date.toDate ? leadData.synced_date.toDate() : new Date(leadData.synced_date);
        } else {
          date = new Date(); // Fallback
        }
        
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const key = `${month}_${year}`;
        
        if (!monthsSet.has(key)) {
          monthsSet.add(key);
          monthsArray.push({ month, year });
        }
      });
      
      // Sort by year and month
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthsArray.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });
      
      // Add current month if not in list
      const currentMonthKey = `${currentMonth}_${currentYear}`;
      if (!monthsSet.has(currentMonthKey)) {
        monthsArray.unshift({ month: currentMonth, year: currentYear });
      }
      
      // Cache the months data
      salesCache.set(monthsCacheKey, monthsArray);
      
      setAvailableMonths(monthsArray);
      monthsLoaded.current = true;
      salesPerfMonitor.end('available-months-load');
      
    } catch (error) {
      console.error("Error fetching available months:", error);
      salesPerfMonitor.safeEnd('available-months-load');
    }
  }, [currentMonth, currentYear]);

  const fetchTargetDataByUserName = useCallback(async (userName: string) => {
    if (targetsLoaded.current) {
      return;
    }
    
    salesPerfMonitor.start('targets-data-load');
    
    try {
      const targetsCacheKey = generateCacheKey.targets(userName, currentMonth, currentYear);
      
      // Check cache first
      const cachedTargets = salesTargetsCache.get<TargetData>(targetsCacheKey);
      if (cachedTargets) {
        setTargetData(cachedTargets);
        // We still need to fetch trend data even if current month is cached
      }
      
      // Query all targets for this user using collectionGroup
      const allTargetsQuery = query(
        collectionGroup(db, "sales_targets"),
        where("userName", "==", userName)
      );
      
      const querySnapshot = await getDocs(allTargetsQuery);
      
      if (!querySnapshot.empty) {
        const trendData: any[] = [];
        let currentMonthTarget: TargetData | null = null;
        
        querySnapshot.forEach(doc => {
          const data = doc.data() as TargetData;
          // The parent document ID of "sales_targets" subcollection is "Month_Year"
          const monthYearId = doc.ref.parent.parent?.id;
          
          if (monthYearId) {
            const [month, year] = monthYearId.split('_');
            trendData.push({
              name: month,
              year: parseInt(year),
              target: data.amountCollectedTarget || 0,
              collected: data.amountCollected || 0,
              monthIndex: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month)
            });
            
            if (month === currentMonth && parseInt(year) === currentYear) {
              currentMonthTarget = data;
            }
          }
        });
        
        // Sort trend data chronologically
        trendData.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.monthIndex - b.monthIndex;
        });
        
        setTargetTrendData(trendData);
        
        if (currentMonthTarget) {
          setTargetData(currentMonthTarget);
          salesTargetsCache.set(targetsCacheKey, currentMonthTarget);
        } else {
          setTargetData(null);
        }
      } else {
        setTargetTrendData([]);
        setTargetData(null);
      }
      
      targetsLoaded.current = true;
      salesPerfMonitor.end('targets-data-load');
      
    } catch (error) {
      console.error("Error fetching target data:", error);
      salesPerfMonitor.safeEnd('targets-data-load');
    }
  }, [currentMonth, currentYear]);

  const fetchLeadData = useCallback(async (userName: string) => {
    if (leadsLoaded.current) {
      return;
    }
    
    salesPerfMonitor.start('leads-data-load');
    
    try {
      const leadsCacheKey = generateCacheKey.leads(userName, currentMonth, currentYear);
      
      // Check cache first
      const cachedLeads = salesAnalyticsCache.get<{
        allLeads: any[];
        totalLeads: number;
        convertedLeads: number;
        leadsChartData: any[];
        statusData: { name: string; value: number }[];
        leadAnalytics: LeadAnalytics | null;
      }>(leadsCacheKey);
      
      if (cachedLeads) {
        setAllLeads(cachedLeads.allLeads);
        setTotalLeads(cachedLeads.totalLeads);
        setConvertedLeads(cachedLeads.convertedLeads);
        setLeadsChartData(cachedLeads.leadsChartData);
        setStatusData(cachedLeads.statusData);
        setLeadAnalytics(cachedLeads.leadAnalytics);
        leadsLoaded.current = true;
        salesPerfMonitor.end('leads-data-load');
        return;
      }
      
      // Query leads assigned to the current user from both collections
      const amaLeadsQuery = query(
        collection(db, "ama_leads"),
        where("assigned_to", "==", userName)
      );
      
      const billcutLeadsQuery = query(
        collection(db, "billcutLeads"),
        where("assigned_to", "==", userName)
      );
      
      const [amaSnapshot, billcutSnapshot] = await Promise.all([
        getDocs(amaLeadsQuery),
        getDocs(billcutLeadsQuery)
      ]);
      
      const allLeadsData: any[] = [];
      
      // Process AMA Leads
      amaSnapshot.forEach(doc => {
        allLeadsData.push({ id: doc.id, ...doc.data(), source_type: 'ama' });
      });
      
      // Process Billcut Leads
      billcutSnapshot.forEach(doc => {
        allLeadsData.push({ id: doc.id, ...doc.data(), source_type: 'billcut' });
      });
      
      if (allLeadsData.length > 0) {
        // Count total leads and converted leads for the selected month
        let totalCount = 0;
        let convertedCount = 0;
        
        // For status breakdown
        const statusCounts: { [key: string]: number } = {};
        
        // Monthly data for chart
        const monthlyData: { [key: string]: { total: number, converted: number } } = {};
        
        // Process each lead document
        allLeadsData.forEach((leadData) => {
          // Get date from appropriate fields based on source
          let date;
          if (leadData.source_type === 'ama') {
            if (leadData.synced_at) {
              date = leadData.synced_at.toDate ? leadData.synced_at.toDate() : new Date(leadData.synced_at);
            } else if (leadData.date) {
              date = new Date(leadData.date);
            } else if (leadData.timestamp) {
              date = leadData.timestamp.toDate ? leadData.timestamp.toDate() : new Date(leadData.timestamp);
            } else {
              date = new Date();
            }
          } else { // billcut
            if (leadData.synced_date) {
              date = leadData.synced_date.toDate ? leadData.synced_date.toDate() : new Date(leadData.synced_date);
            } else if (leadData.date) {
              date = new Date(leadData.date);
            } else {
              date = new Date();
            }
          }
          
          const leadMonth = date.toLocaleString('default', { month: 'short' });
          const leadYear = date.getFullYear();
          
          // Initialize month in monthly data if not exists
          if (!monthlyData[leadMonth]) {
            monthlyData[leadMonth] = { total: 0, converted: 0 };
          }
          
          // Always add to monthly chart data regardless of filter
          monthlyData[leadMonth].total += 1;
          
          // Conversion logic based on source
          let isConverted = false;
          if (leadData.source_type === 'ama') {
            isConverted = leadData.status === "Converted";
          } else {
            isConverted = leadData.category === "Converted" || leadData.status === "Converted";
          }
          
          if (isConverted) {
            monthlyData[leadMonth].converted += 1;
          }
          
          // ONLY count for current month metrics if matching filter
          if (leadMonth === currentMonth && leadYear === currentYear) {
            totalCount++;
            
            if (isConverted) {
              convertedCount++; 
            }
            
            // Track status counts for current month
            const status = leadData.status || leadData.category || "Unknown";
            if (!statusCounts[status]) {
              statusCounts[status] = 0;
            }
            statusCounts[status] += 1;
          }
        });
        
        // Transform monthly data to chart format and sort properly
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedChartData = Object.keys(monthlyData).map(month => ({
          name: month,
          total: monthlyData[month].total,
          converted: monthlyData[month].converted
        }));
        
        // Sort by month
        formattedChartData.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
        
        // Transform status data to pie chart format
        const formattedStatusData = Object.keys(statusCounts).map(status => ({
          name: status,
          value: statusCounts[status]
        }));
        
        // Set all state at once to prevent multiple re-renders
        setAllLeads(allLeadsData);
        setTotalLeads(totalCount);
        setConvertedLeads(convertedCount);
        setLeadsChartData(formattedChartData);
        setStatusData(formattedStatusData);
        
        // Calculate detailed analytics
        calculateDetailedAnalytics(allLeadsData);
        
        // Cache the leads data
        const leadsDataToCache = {
          allLeads: allLeadsData,
          totalLeads: totalCount,
          convertedLeads: convertedCount,
          leadsChartData: formattedChartData,
          statusData: formattedStatusData,
          leadAnalytics: null // Will be set by calculateDetailedAnalytics
        };
        salesAnalyticsCache.set(leadsCacheKey, leadsDataToCache);
        
      } else {
        // Set all empty states at once
        setAllLeads([]);
        setTotalLeads(0);
        setConvertedLeads(0);
        setLeadsChartData([]);
        setStatusData([]);
        setLeadAnalytics(null);
        
        // Cache empty data
        salesAnalyticsCache.set(leadsCacheKey, {
          allLeads: [],
          totalLeads: 0,
          convertedLeads: 0,
          leadsChartData: [],
          statusData: [],
          leadAnalytics: null
        });
      }
      
      leadsLoaded.current = true;
      salesPerfMonitor.end('leads-data-load');
      
    } catch (error) {
      console.error("Error fetching lead data:", error);
      salesPerfMonitor.safeEnd('leads-data-load');
    }
  }, [currentMonth, currentYear]);

  // New function to calculate detailed analytics
  const calculateDetailedAnalytics = useCallback((leads: any[]) => {
    if (!leads || leads.length === 0) {
      setLeadAnalytics(null);
      return;
    }

    const totalLeads = leads.length;
    
    // Status counts
    const statusCounts: { [key: string]: number } = {};
    const sourceCounts: { [key: string]: number } = {};
    const cityCounts: { [key: string]: number } = {};
    const monthlyTrend: { [key: string]: { total: number; converted: number } } = {};
    
    let convertedLeads = 0;
    let callbackLeads = 0;
    let interestedLeads = 0;
    let notInterestedLeads = 0;
    let notAnsweringLeads = 0;
    let loanRequiredLeads = 0;
    let shortLoanLeads = 0;
    let cibilIssueLeads = 0;
    let closedLeads = 0;
    let leadsNeedingWork = 0;

    leads.forEach(lead => {
      const status = lead.status || lead.category || 'No Status';
      const source = lead.source_database || lead.source || 'Unknown';
      const city = lead.city || lead.City || 'Unknown';
      
      // Count statuses
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      cityCounts[city] = (cityCounts[city] || 0) + 1;
      
      // Count specific statuses
      const isConverted = status === 'Converted' || lead.convertedToClient === true;
      if (isConverted) {
        convertedLeads++;
      }
      if (status === 'Callback') {
        callbackLeads++;
      }
      if (status === 'Interested') {
        interestedLeads++;
      }
      if (status === 'Not Interested') {
        notInterestedLeads++;
      }
      if (status === 'Not Answering') {
        notAnsweringLeads++;
      }
      if (status === 'Loan Required') {
        loanRequiredLeads++;
      }
      if (status === 'Short Loan') {
        shortLoanLeads++;
      }
      if (status === 'Cibil Issue') {
        cibilIssueLeads++;
      }
      if (status === 'Closed Lead') {
        closedLeads++;
      }
      if (status === 'No Status' || !status || status === '') {
        leadsNeedingWork++;
      }
      
      // Monthly trend
      let date;
      if (lead.source_type === 'ama') {
        if (lead.synced_at) {
          date = lead.synced_at.toDate ? lead.synced_at.toDate() : new Date(lead.synced_at);
        } else if (lead.date) {
          date = new Date(lead.date);
        } else if (lead.timestamp) {
          date = lead.timestamp.toDate ? lead.timestamp.toDate() : new Date(lead.timestamp);
        } else {
          date = new Date();
        }
      } else { // billcut
        if (lead.synced_date) {
          date = lead.synced_date.toDate ? lead.synced_date.toDate() : new Date(lead.synced_date);
        } else if (lead.date) {
          date = new Date(lead.date);
        } else {
          date = new Date();
        }
      }
      
      const monthKey = date.toLocaleString('default', { month: 'short' });
      if (!monthlyTrend[monthKey]) {
        monthlyTrend[monthKey] = { total: 0, converted: 0 };
      }
      monthlyTrend[monthKey].total += 1;
      if (isConverted) {
        monthlyTrend[monthKey].converted += 1;
      }
    });

    // Transform to arrays and sort
    const statusDistribution = Object.entries(statusCounts)
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / totalLeads) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const sourceDistribution = Object.entries(sourceCounts)
      .map(([source, count]) => ({
        source,
        count,
        percentage: Math.round((count / totalLeads) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const cityDistribution = Object.entries(cityCounts)
      .map(([city, count]) => ({
        city,
        count,
        percentage: Math.round((count / totalLeads) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 cities

    const monthlyTrendArray = Object.entries(monthlyTrend)
      .map(([month, data]) => ({
        month,
        total: data.total,
        converted: data.converted
      }))
      .sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    const analytics: LeadAnalytics = {
      totalLeads,
      leadsNeedingWork,
      convertedLeads,
      callbackLeads,
      interestedLeads,
      notInterestedLeads,
      notAnsweringLeads,
      loanRequiredLeads,
      shortLoanLeads,
      cibilIssueLeads,
      closedLeads,
      statusDistribution,
      sourceDistribution,
      cityDistribution,
      monthlyTrend: monthlyTrendArray,
      conversionRate,
      averageResponseTime: 0 // TODO: Calculate based on timestamps
    };

    setLeadAnalytics(analytics);
    
    // Update cache with analytics data
    if (userName) {
      const leadsCacheKey = generateCacheKey.leads(userName, currentMonth, currentYear);
      const cachedLeads = salesAnalyticsCache.get<{
        allLeads: any[];
        totalLeads: number;
        convertedLeads: number;
        leadsChartData: any[];
        statusData: { name: string; value: number }[];
        leadAnalytics: LeadAnalytics | null;
      }>(leadsCacheKey);
      if (cachedLeads) {
        cachedLeads.leadAnalytics = analytics;
        salesAnalyticsCache.set(leadsCacheKey, cachedLeads);
      }
    }
  }, [userName, currentMonth, currentYear]);

  const fetchTaskData = useCallback(async (userName: string) => {
    if (tasksLoaded.current) {
      return;
    }
    
    salesPerfMonitor.start('tasks-data-load');
    
    try {
      const tasksCacheKey = generateCacheKey.tasks(userName);
      
      // Check cache first
      const cachedTasks = salesTasksCache.get<Task[]>(tasksCacheKey);
      if (cachedTasks) {
        setAssignedTasks(cachedTasks);
        tasksLoaded.current = true;
        salesPerfMonitor.end('tasks-data-load');
        return;
      }
      
      // Query tasks assigned to the current user
      const tasksQuery = query(
        collection(db, "tasks"),
        where("assigneeName", "==", userName)
      );
      
      const querySnapshot = await getDocs(tasksQuery);
      
      const tasksList: Task[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        tasksList.push({
          id: doc.id,
          assignedBy: data.assignedBy,
          assignedTo: data.assignedTo,
          assigneeName: data.assigneeName,
          title: data.title,
          description: data.description,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });
      
      // Sort tasks by creation date (newest first)
      tasksList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Cache the tasks data
      salesTasksCache.set(tasksCacheKey, tasksList);
      
      setAssignedTasks(tasksList);
      tasksLoaded.current = true;
      salesPerfMonitor.end('tasks-data-load');

    } catch (error) {
      console.error("Error fetching task data:", error);
      salesPerfMonitor.safeEnd('tasks-data-load');
    }
  }, []);

  // Function to mark a task as completed
  const markTaskAsCompleted = async (taskId: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: 'completed'
      });
      
      // Update the local state to reflect the change
      setAssignedTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'completed' } 
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Add a handler for month selection
  const handleMonthYearChange = useCallback((monthYear: string) => {
    const [month, year] = monthYear.split('_');
    setCurrentMonth(month);
    setCurrentYear(parseInt(year));
  }, []);

  // Debounced version to prevent rapid successive calls
  const debouncedMonthYearChange = useMemo(
    () => debounce(handleMonthYearChange, 300),
    [handleMonthYearChange]
  );

  // New function to fetch Billcut leads data
  const fetchBillcutLeadData = useCallback(async (userName: string) => {
    if (billcutLeadsLoaded.current) {
      return;
    }
    
    salesPerfMonitor.start('billcut-leads-load');
    
    try {
      const billcutCacheKey = generateCacheKey.billcutLeads(userName, currentMonth, currentYear);
      
      // Check cache first
      const cachedBillcutLeads = salesAnalyticsCache.get<{
        allBillcutLeads: any[];
        billcutAnalytics: LeadAnalytics | null;
      }>(billcutCacheKey);
      
      if (cachedBillcutLeads) {
        setAllBillcutLeads(cachedBillcutLeads.allBillcutLeads);
        setBillcutAnalytics(cachedBillcutLeads.billcutAnalytics);
        billcutLeadsLoaded.current = true;
        salesPerfMonitor.end('billcut-leads-load');
        return;
      }
      
      // Query billcut leads assigned to the current user
      const billcutLeadsQuery = query(
        collection(db, "billcutLeads"),
        where("assigned_to", "==", userName)
      );
      
      const querySnapshot = await getDocs(billcutLeadsQuery);
      
      if (!querySnapshot.empty) {
        // Store all billcut leads for analytics
        const allBillcutLeadsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter leads for the selected month and year
        const filteredLeads = allBillcutLeadsData.filter((lead: any) => {
          let date;
          if (lead.date) {
            date = new Date(lead.date);
          } else if (lead.synced_date) {
            date = lead.synced_date.toDate ? lead.synced_date.toDate() : new Date(lead.synced_date);
          } else {
            date = new Date();
          }
          
          const leadMonth = date.toLocaleString('default', { month: 'short' });
          const leadYear = date.getFullYear();
          
          return leadMonth === currentMonth && leadYear === currentYear;
        });
        
        // Set state and calculate analytics
        setAllBillcutLeads(allBillcutLeadsData);
        calculateBillcutDetailedAnalytics(filteredLeads);
        
        // Cache the billcut leads data
        salesAnalyticsCache.set(billcutCacheKey, {
          allBillcutLeads: allBillcutLeadsData,
          billcutAnalytics: null // Will be set by calculateBillcutDetailedAnalytics
        });
        
      } else {
        // Set empty states
        setAllBillcutLeads([]);
        setBillcutAnalytics(null);
        
        // Cache empty data
        salesAnalyticsCache.set(billcutCacheKey, {
          allBillcutLeads: [],
          billcutAnalytics: null
        });
      }
      
      billcutLeadsLoaded.current = true;
      salesPerfMonitor.end('billcut-leads-load');
      
    } catch (error) {
      console.error("Error fetching billcut lead data:", error);
      salesPerfMonitor.safeEnd('billcut-leads-load');
    }
  }, [currentMonth, currentYear]);

  // New function to calculate detailed analytics for Billcut leads
  const calculateBillcutDetailedAnalytics = useCallback((leads: any[]) => {
    if (!leads || leads.length === 0) {
      setBillcutAnalytics(null);
      return;
    }

    const totalLeads = leads.length;
    
    // Status counts (using category field for Billcut leads)
    const statusCounts: { [key: string]: number } = {};
    const sourceCounts: { [key: string]: number } = {};
    const cityCounts: { [key: string]: number } = {};
    const monthlyTrend: { [key: string]: { total: number; converted: number } } = {};
    
    let convertedLeads = 0;
    let callbackLeads = 0;
    let interestedLeads = 0;
    let notInterestedLeads = 0;
    let notAnsweringLeads = 0;
    let loanRequiredLeads = 0;
    let shortLoanLeads = 0;
    let cibilIssueLeads = 0;
    let closedLeads = 0;
    let leadsNeedingWork = 0;

    leads.forEach((lead: any) => {
      const status = lead.category || 'No Status';
      const source = 'Bill Cut Campaign';
      const city = lead.address || 'Unknown';
      
      // Count statuses
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      cityCounts[city] = (cityCounts[city] || 0) + 1;
      
      // Count specific statuses
      if (status === 'Converted') {
        convertedLeads++;
      }
      if (status === 'Callback') {
        callbackLeads++;
      }
      if (status === 'Interested') {
        interestedLeads++;
      }
      if (status === 'Not Interested') {
        notInterestedLeads++;
      }
      if (status === 'Not Answering') {
        notAnsweringLeads++;
      }
      if (status === 'Loan Required') {
        loanRequiredLeads++;
      }
      if (status === 'Short Loan') {
        shortLoanLeads++;
      }
      if (status === 'Cibil Issue') {
        cibilIssueLeads++;
      }
      if (status === 'Closed Lead') {
        closedLeads++;
      }
      if (status === 'No Status' || !status || status === '') {
        leadsNeedingWork++;
      }
      
      // Monthly trend (for the filtered data, this will only be current month)
      let date;
      if (lead.date) {
        date = new Date(lead.date);
      } else if (lead.synced_date) {
        date = lead.synced_date.toDate ? lead.synced_date.toDate() : new Date(lead.synced_date);
      } else {
        date = new Date();
      }
      
      const monthKey = date.toLocaleString('default', { month: 'short' });
      if (!monthlyTrend[monthKey]) {
        monthlyTrend[monthKey] = { total: 0, converted: 0 };
      }
      monthlyTrend[monthKey].total++;
      
      if (status === 'Converted') {
        monthlyTrend[monthKey].converted++;
      }
    });

    // Transform to arrays and sort
    const statusDistribution = Object.entries(statusCounts)
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / totalLeads) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const sourceDistribution = Object.entries(sourceCounts)
      .map(([source, count]) => ({
        source,
        count,
        percentage: Math.round((count / totalLeads) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const cityDistribution = Object.entries(cityCounts)
      .map(([city, count]) => ({
        city,
        count,
        percentage: Math.round((count / totalLeads) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 cities

    const monthlyTrendArray = Object.entries(monthlyTrend)
      .map(([month, data]) => ({
        month,
        total: data.total,
        converted: data.converted
      }))
      .sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    const analytics: LeadAnalytics = {
      totalLeads,
      leadsNeedingWork,
      convertedLeads,
      callbackLeads,
      interestedLeads,
      notInterestedLeads,
      notAnsweringLeads,
      loanRequiredLeads,
      shortLoanLeads,
      cibilIssueLeads,
      closedLeads,
      statusDistribution,
      sourceDistribution,
      cityDistribution,
      monthlyTrend: monthlyTrendArray,
      conversionRate,
      averageResponseTime: 0 // TODO: Calculate based on timestamps
    };

    setBillcutAnalytics(analytics);
    
    // Update cache with analytics data
    if (userName) {
      const billcutCacheKey = generateCacheKey.billcutLeads(userName, currentMonth, currentYear);
      const cachedBillcutLeads = salesAnalyticsCache.get<{
        allBillcutLeads: any[];
        billcutAnalytics: LeadAnalytics | null;
      }>(billcutCacheKey);
      if (cachedBillcutLeads) {
        cachedBillcutLeads.billcutAnalytics = analytics;
        salesAnalyticsCache.set(billcutCacheKey, cachedBillcutLeads);
      }
    }
  }, [userName, currentMonth, currentYear]);

  // Cache management functions
  const clearAllCache = useCallback(() => {
    salesCache.clear();
    salesAnalyticsCache.clear();
    salesTargetsCache.clear();
    salesTasksCache.clear();
    setCacheSize(0);
  }, []);

  const refreshAllData = useCallback(() => {
    clearAllCache();
    // Reset all loaded flags
    targetsLoaded.current = false;
    leadsLoaded.current = false;
    billcutLeadsLoaded.current = false;
    tasksLoaded.current = false;
    monthsLoaded.current = false;
    // Force refresh by triggering re-renders
    window.location.reload();
  }, [clearAllCache]);

  // Update cache size display
  useEffect(() => {
    const totalSize = salesCache.size() + salesAnalyticsCache.size() + salesTargetsCache.size() + salesTasksCache.size();
    setCacheSize(totalSize);
  }, [targetData, allLeads, allBillcutLeads, assignedTasks, availableMonths]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-100">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 rounded-full border-4 border-t-indigo-500 border-gray-700 animate-spin mb-4"></div>
        <span>Loading...</span>
      </div>
    </div>;
  }

  if (!userName) {
    return <div className="p-6 bg-gray-900 text-gray-100 min-h-screen">Please login to view your sales dashboard</div>;
  }

  if (!targetData) {
    return (
      <div className="p-6 bg-gray-900 text-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-indigo-400">No targets found for {userName}</h1>
        <p className="text-gray-300">Please contact your administrator to set up your sales targets.</p>
        <p className="mt-4 text-sm text-gray-500">Debug info: Logged in as {userName} ({userEmail})</p>
      </div>
    );
  }

  const amountCollected = targetData.amountCollected || 0;
  const amountPercentage = Math.round((amountCollected / targetData.amountCollectedTarget) * 100);
  
  // Calculate leads percentage using target data
  const actualConvertedLeads = targetData.convertedLeads || 0;
  const leadsPercentage = Math.round((actualConvertedLeads / targetData.convertedLeadsTarget) * 100);

  return (
    <div className="p-4 sm:p-6 bg-gray-900 text-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Sales Dashboard for {targetData?.userName}
              {(leadAnalytics || billcutAnalytics) && (
                <span className="text-sm sm:text-lg text-gray-400 block sm:inline mt-1 sm:mt-0 sm:ml-2">
                  ({analyticsSource} Data)
                </span>
              )}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Cache management controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllCache}
                className="text-[10px] sm:text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-md transition-colors"
                title="Clear cache"
              >
                🗑️ Clear
              </button>
              <button
                onClick={refreshAllData}
                className="text-[10px] sm:text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded-md transition-colors"
                title="Refresh all data"
              >
                🔄 Refresh
              </button>
            </div>
            
            {/* Month selector */}
            <div className="flex items-center space-x-2 ml-auto sm:ml-0">
              <select
                id="monthSelector"
                className="bg-gray-800 border border-gray-700 text-white rounded-md px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm"
                value={`${currentMonth}_${currentYear}`}
                onChange={(e) => debouncedMonthYearChange(e.target.value)}
              >
                {availableMonths.map(({ month, year }) => (
                  <option key={`${month}_${year}`} value={`${month}_${year}`}>
                    {month} {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Target Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100 text-lg">Collection Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold mb-3 text-indigo-400">₹{amountCollected.toLocaleString()} 
                <span className="text-gray-400 text-lg sm:text-xl"> / ₹{targetData.amountCollectedTarget?.toLocaleString() || '0'}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${amountPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs sm:text-sm text-gray-400">{amountPercentage}% of target achieved</p>
            </CardContent>
          </Card>
 
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100 text-lg">Converted Leads Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold mb-3 text-emerald-400">{actualConvertedLeads} 
                <span className="text-gray-400 text-lg sm:text-xl"> / {targetData.convertedLeadsTarget || '0'}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${leadsPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs sm:text-sm text-gray-400">{leadsPercentage}% of target achieved</p>
            </CardContent>
          </Card>
        </div>

        {/* Comprehensive Analytics Section */}


        {/* Additional Analytics Sections */}


        {/* Tasks Section */}
        <div className="mb-8">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Your Assigned Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignedTasks.length > 0 ? (
                  assignedTasks.map(task => (
                    <div key={task.id} className="border-b border-gray-700 pb-3 hover:bg-gray-800/50 p-3 rounded-lg transition-all duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="font-medium text-white text-sm sm:text-base">{task.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full ${
                            task.status === 'completed' 
                              ? 'bg-green-900/50 text-green-200 border border-green-700/50' 
                              : 'bg-yellow-900/50 text-yellow-200 border border-yellow-700/50'
                          }`}>
                            {task.status}
                          </span>
                          {task.status !== 'completed' && (
                            <button
                              onClick={() => markTaskAsCompleted(task.id)}
                              className="px-2 py-1 text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                      <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span>Assigned by: {task.assignedBy}</span>
                        <span>{new Date(task.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No tasks assigned to you</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100 text-base sm:text-lg">Lead Conversion Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leadsChartData.length > 0 ? leadsChartData : leadsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="name" stroke={chartColors.text} tick={{fontSize: 10}} />
                  <YAxis stroke={chartColors.text} tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#e5e5e5', fontSize: '12px' }}
                    itemStyle={{ color: '#e5e5e5' }}
                  />
                  <Legend wrapperStyle={{ color: chartColors.text, fontSize: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="converted" 
                    stroke={chartColors.primary} 
                    strokeWidth={2}
                    dot={{ stroke: chartColors.primary, strokeWidth: 1, r: 3, fill: chartColors.primary }}
                    activeDot={{ stroke: chartColors.primary, strokeWidth: 1, r: 5, fill: '#1e1e1e' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke={chartColors.secondary} 
                    strokeWidth={2}
                    dot={{ stroke: chartColors.secondary, strokeWidth: 1, r: 3, fill: chartColors.secondary }}
                    activeDot={{ stroke: chartColors.secondary, strokeWidth: 1, r: 5, fill: '#1e1e1e' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
 
          {/* Target vs Collected Amount Chart */}
          {targetData && (
            <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-purple-500/10 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-100 text-base sm:text-lg">Target vs Collected Amount</CardTitle>
              </CardHeader>
              <CardContent className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={targetTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="name" stroke={chartColors.text} tick={{fontSize: 10}} />
                    <YAxis stroke={chartColors.text} tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#e5e5e5', fontSize: '12px' }}
                      itemStyle={{ color: '#e5e5e5' }}
                      formatter={(value: number) => `₹${value.toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ color: chartColors.text, fontSize: '10px' }} />
                    <Bar dataKey="target" fill={chartColors.primary} name="Target Amount" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" fill={chartColors.secondary} name="Collected Amount" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="mt-6 text-center text-xs text-gray-600">
          <div className="inline-block px-3 py-1 rounded-full bg-gray-800">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
