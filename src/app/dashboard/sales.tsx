"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
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

interface TargetData {
  amountCollectedTarget: number;
  amountCollected: number;
  convertedLeadsTarget: number;
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

  // Create a mapping of status to color based on your application's color scheme
  const statusColors = useMemo(() => ({
    'Interested': '#059669', // green-600
    'Not Interested': '#dc2626', // red-600
    'Not Answering': '#ea580c', // orange-600
    'Callback': '#ca8a04', // yellow-600
    'Converted': '#10b981', // emerald-500
    'Loan Required': '#9333ea', // purple-600
    'Cibil Issue': '#e11d48', // rose-600
    'Closed Lead': '#4b5563', // gray-600
    'No Status': '#6366f1', // indigo-500
    'Unknown': '#6366f1', // indigo-500 (fallback)
  }), []);

  // Add state for tasks
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);

  useEffect(() => {
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
    }
  }, []);

  // New effect to refetch data when month/year changes
  useEffect(() => {
    if (userName) {
      fetchTargetDataByUserName(userName);
      fetchLeadData(userName);
    }
  }, [currentMonth, currentYear, userName]);

  // New function to fetch all data types
  const fetchData = async (userName: string) => {
    try {
      setIsLoading(true);
      
      // Fetch target data
      await fetchTargetDataByUserName(userName);
      
      // Fetch lead data
      await fetchLeadData(userName);
      
      // Fetch tasks assigned to this user
      await fetchTaskData(userName);
      
      // Get available months for filtering
      await fetchAvailableMonths(userName);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // New function to get available months with lead data
  const fetchAvailableMonths = async (userName: string) => {
    try {
      // Query all leads assigned to the current user
      const leadsQuery = query(
        collection(db, "crm_leads"),
        where("assignedTo", "==", userName)
      );
      
      const querySnapshot = await getDocs(leadsQuery);
      
      // Track unique month/year combinations
      const monthsSet = new Set<string>();
      const monthsArray: {month: string, year: number}[] = [];
      
      querySnapshot.forEach(doc => {
        const leadData = doc.data();
        
        // Get month from timestamp
        let date;
        if (leadData.timestamp) {
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
      
      setAvailableMonths(monthsArray);
    } catch (error) {
      console.error("Error fetching available months:", error);
    }
  };

  const fetchTargetDataByUserName = async (userName: string) => {
    try {
      
      // Create the monthly document ID
      const monthDocId = `${currentMonth}_${currentYear}`;
      
      // First get the monthly document to see if it exists
      const monthlyDocRef = doc(db, "targets", monthDocId);
      const monthlyDocSnap = await getDoc(monthlyDocRef);
      
      if (monthlyDocSnap.exists()) {
        
        // Query the subcollection for this user
        const salesTargetsQuery = query(
          collection(db, "targets", monthDocId, "sales_targets"),
          where("userName", "==", userName)
        );
        
        const querySnapshot = await getDocs(salesTargetsQuery);
        
        if (!querySnapshot.empty) {
          // Found user's target in subcollection
          const targetDoc = querySnapshot.docs[0];
          const data = targetDoc.data() as TargetData;
          setTargetData(data);
        } else {
          
          // Try finding by userId instead if userName doesn't match
          const salesTargetsAltQuery = collection(db, "targets", monthDocId, "sales_targets");
          const altQuerySnapshot = await getDocs(salesTargetsAltQuery);
          
          // Loop through all targets
          let foundTarget = false;
          altQuerySnapshot.forEach(doc => {
            const data = doc.data();
            // Check if this looks like the right user (case-insensitive comparison)
            if (data.userName && 
                data.userName.toLowerCase().includes(userName.toLowerCase())) {
              setTargetData(data as TargetData);
              foundTarget = true;
            }
          });
          
          if (!foundTarget) {
            console.log("No target found for this user at all");
          }
        }
      } else {
        console.log(`Monthly document ${monthDocId} does not exist`);
        
        // Try checking previous month if we're early in current month
        if (new Date().getDate() <= 5) {
          const prevMonthIndex = new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1;
          const prevMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][prevMonthIndex];
          const prevYear = new Date().getMonth() === 0 ? currentYear - 1 : currentYear;
          
          
          const prevMonthDocRef = doc(db, "targets", `${prevMonth}_${prevYear}`);
          const prevMonthDocSnap = await getDoc(prevMonthDocRef);
          
          if (prevMonthDocSnap.exists()) {
            // Query the subcollection for this user in previous month
            const prevSalesTargetsQuery = query(
              collection(db, "targets", `${prevMonth}_${prevYear}`, "sales_targets"),
              where("userName", "==", userName)
            );
            
            const prevQuerySnapshot = await getDocs(prevSalesTargetsQuery);
            
            if (!prevQuerySnapshot.empty) {
              const prevTargetDoc = prevQuerySnapshot.docs[0];
              const prevData = prevTargetDoc.data() as TargetData;
              setTargetData(prevData);
            }
          }
        }
        
        // As a fallback, check for old-style targets
        const legacyTargetsQuery = query(
          collection(db, "targets"),
          where("userName", "==", userName)
        );
        
        const legacyQuerySnapshot = await getDocs(legacyTargetsQuery);
        
        if (!legacyQuerySnapshot.empty) {
          const legacyDoc = legacyQuerySnapshot.docs[0];
          const legacyData = legacyDoc.data() as TargetData;
          setTargetData(legacyData);
        }
      }
    } catch (error) {
      console.error("Error fetching target data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadData = async (userName: string) => {
    try {
      
      // Query leads assigned to the current user
      const leadsQuery = query(
        collection(db, "crm_leads"),
        where("assignedTo", "==", userName)
      );
      
      const querySnapshot = await getDocs(leadsQuery);
      
      if (!querySnapshot.empty) {
        // Store all leads for analytics
        const allLeadsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllLeads(allLeadsData);
        
        // Count total leads and converted leads for the selected month
        let totalCount = 0;
        let convertedCount = 0;
        
        // For status breakdown
        const statusCounts: { [key: string]: number } = {};
        
        // Monthly data for chart
        const monthlyData: { [key: string]: { total: number, converted: number } } = {};
        
        // Process each lead document
        let leadIndex = 0;
        querySnapshot.forEach((doc) => {
          const leadData = doc.data();
          
          // Get date from timestamp
          let date;
          if (leadData.timestamp) {
            date = leadData.timestamp.toDate ? leadData.timestamp.toDate() : new Date(leadData.timestamp);
          } else {
            date = new Date(); // Fallback
          }
          
          const leadMonth = date.toLocaleString('default', { month: 'short' });
          const leadYear = date.getFullYear();
          
          // Initialize month in monthly data if not exists
          if (!monthlyData[leadMonth]) {
            monthlyData[leadMonth] = { total: 0, converted: 0 };
          }
          
          // Always add to monthly chart data regardless of filter
          monthlyData[leadMonth].total += 1;
          
          const isConverted = leadData.convertedToClient === true || leadData.status === "Converted";
          
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
            const status = leadData.status || "Unknown";
            if (!statusCounts[status]) {
              statusCounts[status] = 0;
            }
            statusCounts[status] += 1;
          } else {
          }
          leadIndex++;
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
        
        // CRITICAL FIX: Force the same conversion value for all data pieces
        // This ensures every widget uses the same number
        setTotalLeads(totalCount);
        setConvertedLeads(convertedCount);
        setLeadsChartData(formattedChartData);
        setStatusData(formattedStatusData);
        
        // Calculate detailed analytics
        calculateDetailedAnalytics(allLeadsData);
        
      } else {
        setTotalLeads(0);
        setConvertedLeads(0);
        setLeadsChartData([]);
        setStatusData([]);
        setAllLeads([]);
        setLeadAnalytics(null);
      }
    } catch (error) {
      console.error("Error fetching lead data:", error);
    }
  };

  // New function to calculate detailed analytics
  const calculateDetailedAnalytics = (leads: any[]) => {
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
    let cibilIssueLeads = 0;
    let closedLeads = 0;
    let leadsNeedingWork = 0;

    leads.forEach(lead => {
      const status = lead.status || 'No Status';
      const source = lead.source_database || 'Unknown';
      const city = lead.city || lead.City || 'Unknown';
      
      // Count statuses
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      cityCounts[city] = (cityCounts[city] || 0) + 1;
      
      // Count specific statuses
      if (status === 'Converted' || lead.convertedToClient === true) {
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
      if (lead.timestamp) {
        date = lead.timestamp.toDate ? lead.timestamp.toDate() : new Date(lead.timestamp);
      } else {
        date = new Date();
      }
      
      const monthKey = date.toLocaleString('default', { month: 'short' });
      if (!monthlyTrend[monthKey]) {
        monthlyTrend[monthKey] = { total: 0, converted: 0 };
      }
      monthlyTrend[monthKey].total++;
      
      if (status === 'Converted' || lead.convertedToClient === true) {
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
  };

  const fetchTaskData = async (userName: string) => {
    try {
      
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
      
      setAssignedTasks(tasksList);

    } catch (error) {
      console.error("Error fetching task data:", error);
    }
  };
  
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
  const handleMonthYearChange = (monthYear: string) => {
    const [month, year] = monthYear.split('_');
    setCurrentMonth(month);
    setCurrentYear(parseInt(year));
  };

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
  
  // Calculate leads percentage using real data
  const leadsPercentage = Math.round((convertedLeads / targetData.convertedLeadsTarget) * 100);

  return (
    <div className="p-6 bg-gray-900 text-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Sales Dashboard for {targetData?.userName}
          </h1>
          
          {/* Month selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="monthSelector" className="text-sm text-gray-400">
              Select Month:
            </label>
            <select
              id="monthSelector"
              className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
              value={`${currentMonth}_${currentYear}`}
              onChange={(e) => handleMonthYearChange(e.target.value)}
            >
              {availableMonths.map(({ month, year }) => (
                <option key={`${month}_${year}`} value={`${month}_${year}`}>
                  {month} {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Target Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Collection Target ({currentMonth} {currentYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3 text-indigo-400">₹{amountCollected.toLocaleString()} 
                <span className="text-gray-400 text-xl"> / ₹{targetData.amountCollectedTarget.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${amountPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{amountPercentage}% of target achieved</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Converted Leads Target ({currentMonth} {currentYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3 text-emerald-400">{convertedLeads} 
                <span className="text-gray-400 text-xl"> / {targetData.convertedLeadsTarget}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${leadsPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{leadsPercentage}% of target achieved</p>
            </CardContent>
          </Card>
        </div>

        {/* Comprehensive Analytics Section */}
        {leadAnalytics && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">Lead Analytics Overview</h2>
            
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <Card className="border-0 bg-gradient-to-br from-red-800 to-red-900 shadow-xl">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-400">{leadAnalytics.leadsNeedingWork}</div>
                  <p className="text-sm text-gray-300">Need Work</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 bg-gradient-to-br from-yellow-800 to-yellow-900 shadow-xl">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-400">{leadAnalytics.callbackLeads}</div>
                  <p className="text-sm text-gray-300">Callbacks</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 bg-gradient-to-br from-green-800 to-green-900 shadow-xl">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-400">{leadAnalytics.interestedLeads}</div>
                  <p className="text-sm text-gray-300">Interested</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 bg-gradient-to-br from-emerald-800 to-emerald-900 shadow-xl">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-emerald-400">{leadAnalytics.convertedLeads}</div>
                  <p className="text-sm text-gray-300">Converted</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 bg-gradient-to-br from-purple-800 to-purple-900 shadow-xl">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-400">{leadAnalytics.loanRequiredLeads}</div>
                  <p className="text-sm text-gray-300">Loan Required</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 bg-gradient-to-br from-blue-800 to-blue-900 shadow-xl">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-400">{leadAnalytics.conversionRate}%</div>
                  <p className="text-sm text-gray-300">Conversion Rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution Table */}
            <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl mb-6">
              <CardHeader>
                <CardTitle className="text-gray-100">Lead Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Progress
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {leadAnalytics.statusDistribution.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-750 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: statusColors[item.status as keyof typeof statusColors] || statusColors['Unknown'] }}
                              ></div>
                              <span className="text-sm font-medium text-gray-200">{item.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item.percentage}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${item.percentage}%`,
                                  backgroundColor: statusColors[item.status as keyof typeof statusColors] || statusColors['Unknown']
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

           
          </div>
        )}

        {/* Additional Analytics Sections */}
        {leadAnalytics && (
          <div className="mb-8">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-gray-100">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Total Leads</span>
                      <span className="text-lg font-bold text-blue-400">{leadAnalytics.totalLeads}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Conversion Rate</span>
                      <span className="text-lg font-bold text-green-400">{leadAnalytics.conversionRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Active Pipeline</span>
                      <span className="text-lg font-bold text-yellow-400">
                        {leadAnalytics.interestedLeads + leadAnalytics.callbackLeads + leadAnalytics.leadsNeedingWork}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Success Rate</span>
                      <span className="text-lg font-bold text-purple-400">
                        {leadAnalytics.totalLeads > 0 ? Math.round(((leadAnalytics.convertedLeads + leadAnalytics.interestedLeads) / leadAnalytics.totalLeads) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-gray-100">Lead Quality Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">High Quality</span>
                      <span className="text-lg font-bold text-emerald-400">
                        {leadAnalytics.interestedLeads + leadAnalytics.convertedLeads}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Needs Follow-up</span>
                      <span className="text-lg font-bold text-orange-400">
                        {leadAnalytics.callbackLeads + leadAnalytics.leadsNeedingWork}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Requires Action</span>
                      <span className="text-lg font-bold text-red-400">
                        {leadAnalytics.loanRequiredLeads + leadAnalytics.cibilIssueLeads}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Closed/Rejected</span>
                      <span className="text-lg font-bold text-gray-400">
                        {leadAnalytics.notInterestedLeads + leadAnalytics.closedLeads}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-gray-100">Workload Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Immediate Action</span>
                      <span className="text-lg font-bold text-red-400">{leadAnalytics.leadsNeedingWork}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Scheduled Callbacks</span>
                      <span className="text-lg font-bold text-yellow-400">{leadAnalytics.callbackLeads}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">In Progress</span>
                      <span className="text-lg font-bold text-blue-400">{leadAnalytics.interestedLeads}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Completed</span>
                      <span className="text-lg font-bold text-green-400">{leadAnalytics.convertedLeads}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Callback Details Section */}
            <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl mb-6">
              <CardHeader>
                <CardTitle className="text-gray-100">Callback Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-200 mb-4">Callback Statistics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-750 rounded-lg">
                        <span className="text-sm text-gray-300">Total Callbacks</span>
                        <span className="text-xl font-bold text-yellow-400">{leadAnalytics.callbackLeads}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-750 rounded-lg">
                        <span className="text-sm text-gray-300">Callback Rate</span>
                        <span className="text-xl font-bold text-blue-400">
                          {leadAnalytics.totalLeads > 0 ? Math.round((leadAnalytics.callbackLeads / leadAnalytics.totalLeads) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-750 rounded-lg">
                        <span className="text-sm text-gray-300">Pending Follow-ups</span>
                        <span className="text-xl font-bold text-orange-400">
                          {leadAnalytics.callbackLeads + leadAnalytics.leadsNeedingWork}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-200 mb-4">Quick Actions</h4>
                    <div className="space-y-3">
                      <div className="w-full p-3 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 rounded-lg font-medium">
                        View All Callbacks ({leadAnalytics.callbackLeads})
                      </div>
                      <div className="w-full p-3 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg font-medium">
                        Leads Needing Work ({leadAnalytics.leadsNeedingWork})
                      </div>
                      <div className="w-full p-3 bg-green-600/20 border border-green-500/30 text-green-300 rounded-lg font-medium">
                        High Priority Leads ({leadAnalytics.interestedLeads})
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lead Source Performance */}
            <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl mb-6">
              <CardHeader>
                <CardTitle className="text-gray-100">Lead Source Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Total Leads
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Converted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Conversion Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Quality Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {leadAnalytics.sourceDistribution.slice(0, 5).map((item, index) => {
                        const sourceLeads = allLeads.filter(lead => (lead.source_database || 'Unknown') === item.source);
                        const convertedCount = sourceLeads.filter(lead => 
                          lead.status === 'Converted' || lead.convertedToClient === true
                        ).length;
                        const interestedCount = sourceLeads.filter(lead => lead.status === 'Interested').length;
                        const conversionRate = item.count > 0 ? Math.round((convertedCount / item.count) * 100) : 0;
                        const qualityScore = item.count > 0 ? Math.round(((convertedCount + interestedCount) / item.count) * 100) : 0;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-750 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-200">{item.source}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {item.count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {convertedCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                conversionRate >= 20 ? 'bg-green-900 text-green-200' :
                                conversionRate >= 10 ? 'bg-yellow-900 text-yellow-200' :
                                'bg-red-900 text-red-200'
                              }`}>
                                {conversionRate}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                qualityScore >= 50 ? 'bg-green-900 text-green-200' :
                                qualityScore >= 30 ? 'bg-yellow-900 text-yellow-200' :
                                'bg-red-900 text-red-200'
                              }`}>
                                {qualityScore}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                    <div key={task.id} className="border-b border-gray-700 pb-3 hover:bg-gray-750 p-2 rounded transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">{task.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            task.status === 'completed' 
                              ? 'bg-green-900 text-green-200' 
                              : 'bg-yellow-900 text-yellow-200'
                          }`}>
                            {task.status}
                          </span>
                          {task.status !== 'completed' && (
                            <button
                              onClick={() => markTaskAsCompleted(task.id)}
                              className="ml-2 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                            >
                              Mark Complete
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
              <CardTitle className="text-gray-100">Lead Conversion Trend ({currentMonth} {currentYear})</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leadsChartData.length > 0 ? leadsChartData : leadsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="name" stroke={chartColors.text} />
                  <YAxis stroke={chartColors.text} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                  />
                  <Legend wrapperStyle={{ color: chartColors.text }} />
                  <Line 
                    type="monotone" 
                    dataKey="converted" 
                    stroke={chartColors.primary} 
                    strokeWidth={3}
                    dot={{ stroke: chartColors.primary, strokeWidth: 2, r: 4, fill: chartColors.primary }}
                    activeDot={{ stroke: chartColors.primary, strokeWidth: 2, r: 6, fill: '#1e1e1e' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke={chartColors.secondary} 
                    strokeWidth={3}
                    dot={{ stroke: chartColors.secondary, strokeWidth: 2, r: 4, fill: chartColors.secondary }}
                    activeDot={{ stroke: chartColors.secondary, strokeWidth: 2, r: 6, fill: '#1e1e1e' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Trend Chart */}
          {leadAnalytics && (
            <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-100">Monthly Lead Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadAnalytics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="month" stroke={chartColors.text} />
                    <YAxis stroke={chartColors.text} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#e5e5e5' }}
                      itemStyle={{ color: '#e5e5e5' }}
                    />
                    <Legend wrapperStyle={{ color: chartColors.text }} />
                    <Bar dataKey="total" fill={chartColors.primary} name="Total Leads" />
                    <Bar dataKey="converted" fill={chartColors.secondary} name="Converted" />
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
