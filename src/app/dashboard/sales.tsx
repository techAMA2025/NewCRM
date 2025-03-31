"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
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
  PieChart,
  Pie,
  Cell,
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

export default function SalesDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [targetData, setTargetData] = useState<TargetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Replace dummy data with real lead data
  const [totalLeads, setTotalLeads] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);
  const [leadsChartData, setLeadsChartData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);

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
    'Unknown': '#6366f1', // indigo-500 (fallback)
  }), []);

  useEffect(() => {
    // Get user details from localStorage
    const storedUserName = localStorage.getItem("userName");
    const storedUserEmail = localStorage.getItem("userEmail");
    
    if (storedUserName && storedUserEmail) {
      setUserName(storedUserName);
      setUserEmail(storedUserEmail);
      
      // Fetch target data for this specific user based on userName
      fetchTargetDataByUserName(storedUserName);
      
      // Fetch lead data for this specific user
      fetchLeadData(storedUserName);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchTargetDataByUserName = async (userName: string) => {
    try {
      console.log(`Fetching targets for user: ${userName}`);
      
      // Query targets collection where userName matches the current user's name
      const targetsQuery = query(
        collection(db, "targets"),
        where("userName", "==", userName)
      );
      
      const querySnapshot = await getDocs(targetsQuery);
      console.log("Query snapshot size:", querySnapshot.size);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data() as TargetData;
        console.log("Target data found:", data);
        setTargetData(data);
      } else {
        console.log("No target data found for this user");
        
        // Check if there are any targets in the collection at all
        const allTargetsSnapshot = await getDocs(collection(db, "targets"));
        console.log("Total targets in collection:", allTargetsSnapshot.size);
        
        if (allTargetsSnapshot.size > 0) {
          console.log("Available userNames in targets:");
          allTargetsSnapshot.forEach(doc => {
            console.log(doc.data().userName);
          });
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
      console.log(`Fetching leads for user: ${userName}`);
      
      // Query leads assigned to the current user
      const leadsQuery = query(
        collection(db, "crm_leads"),
        where("assignedTo", "==", userName)
      );
      
      const querySnapshot = await getDocs(leadsQuery);
      console.log("Leads query snapshot size:", querySnapshot.size);
      
      if (!querySnapshot.empty) {
        // Count total leads and converted leads
        let totalCount = querySnapshot.size;
        let convertedCount = 0;
        
        // For monthly breakdown
        const monthlyData: { [key: string]: { total: number, converted: number } } = {};
        
        // For status breakdown
        const statusCounts: { [key: string]: number } = {};
        
        querySnapshot.forEach(doc => {
          const leadData = doc.data();
          
          // Check if lead is converted
          if (leadData.convertedToClient === true || leadData.status === "Converted") {
            convertedCount++;
          }
          
          // Get month from timestamp
          let date;
          if (leadData.timestamp) {
            date = leadData.timestamp.toDate ? leadData.timestamp.toDate() : new Date(leadData.timestamp);
          } else {
            date = new Date(); // Fallback
          }
          
          const month = date.toLocaleString('default', { month: 'short' });
          
          // Initialize month data if not exists
          if (!monthlyData[month]) {
            monthlyData[month] = { total: 0, converted: 0 };
          }
          
          // Increment counts
          monthlyData[month].total += 1;
          
          if (leadData.convertedToClient === true || leadData.status === "Converted") {
            monthlyData[month].converted += 1;
          }
          
          // Track status counts
          const status = leadData.status || "Unknown";
          if (!statusCounts[status]) {
            statusCounts[status] = 0;
          }
          statusCounts[status] += 1;
        });
        
        // Transform monthly data to chart format
        const formattedChartData = Object.keys(monthlyData).map(month => ({
          name: month,
          total: monthlyData[month].total,
          converted: monthlyData[month].converted
        }));
        
        // Transform status data to pie chart format
        const formattedStatusData = Object.keys(statusCounts).map(status => ({
          name: status,
          value: statusCounts[status]
        }));
        
        // Sort by month (approximation, works for common use cases)
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        formattedChartData.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
        
        setTotalLeads(totalCount);
        setConvertedLeads(convertedCount);
        setLeadsChartData(formattedChartData);
        setStatusData(formattedStatusData);
        
        console.log("Lead data processed:", { totalCount, convertedCount, monthlyData, statusCounts });
      } else {
        console.log("No leads found for this user");
        // Set empty chart data
        setLeadsChartData([]);
        setStatusData([]);
      }
    } catch (error) {
      console.error("Error fetching lead data:", error);
    }
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
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Sales Dashboard for {targetData.userName}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Collection Target</CardTitle>
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
              <CardTitle className="text-gray-100">Converted Leads Target</CardTitle>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Lead Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      fill={chartColors.primary}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={statusColors[entry.name as keyof typeof statusColors] || statusColors['Unknown']} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#e5e5e5' }}
                      formatter={(value, name, props) => [`${value} leads`, props.payload.name]}
                    />
                    <Legend formatter={(value) => (
                      <span style={{ color: '#e5e5e5' }}>{value}</span>
                    )} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center h-full flex flex-col items-center justify-center">
                  <div className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                    No Lead Data Available
                  </div>
                  <p className="text-sm text-gray-400">
                    No leads have been assigned to you yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Lead Conversion</CardTitle>
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
