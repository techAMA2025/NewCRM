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
import { collection, getDocs, query, where, Timestamp, QueryConstraint, doc, getDoc } from 'firebase/firestore';
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
| 'Converted' | 'Loan Required' | 'Cibil Issue' | 'Closed Lead' | 'No Status';
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
  
  // Update state for sales analytics to include proper monthly data
  const [salesAnalytics, setSalesAnalytics] = useState({
    totalTargetAmount: 0,
    totalCollectedAmount: 0,
    monthlyRevenue: [0, 0, 0, 0, 0, 0], // Will hold actual monthly data
    conversionRate: 0,
    avgDealSize: 0
  });
  
  // Add state for salesperson selection
  const [salespeople, setSalespeople] = useState<{id: string, name: string}[]>([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);
  const [individualSalesData, setIndividualSalesData] = useState<{
    name: string;
    targetAmount: number;
    collectedAmount: number;
    conversionRate: number;
    monthlyData: number[];
  } | null>(null);
  
  // Add state for CRM leads salesperson filter
  const [selectedLeadsSalesperson, setSelectedLeadsSalesperson] = useState<string | null>(null);
  
  // Add state for client analytics
  const [clientAnalytics, setClientAnalytics] = useState({
    totalClients: 0,
    statusDistribution: { Active: 0, Pending: 0, Inactive: 0, Converted: 0 },
    topAdvocates: [] as {name: string, clientCount: number}[],
    loanTypeDistribution: {} as Record<string, number>,
    sourceDistribution: {} as Record<string, number>,
    cityDistribution: {} as Record<string, number>,
    totalLoanAmount: 0,
    avgLoanAmount: 0
  });

  // Add state for payment analytics
  const [paymentAnalytics, setPaymentAnalytics] = useState({
    totalPaymentsAmount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
    completionRate: 0,
    clientCount: 0,
    paymentMethodDistribution: {} as Record<string, number>,
    monthlyPaymentsData: [0, 0, 0, 0, 0, 0],
    paymentTypeDistribution: {
      full: 0,
      partial: 0
    }
  });

  // Add state for current month's payment data
  const [currentMonthPayments, setCurrentMonthPayments] = useState({
    collected: 0,
    pending: 0
  });

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
        
        // Add salesperson filter if selected
        if (selectedLeadsSalesperson) {
          leadsQuery = query(leadsQuery, where('assignedTo', '==', selectedLeadsSalesperson));
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
          'No Status': { settleloans: 0, credsettlee: 0, ama: 0 },
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
                statusCounts['No Status'][mappedSource as SourceKey]++;
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
  }, [startDate, endDate, isFilterApplied, selectedLeadsSalesperson]);

  // Modify the fetchSalesAnalytics useEffect
  useEffect(() => {
    const fetchSalesAnalytics = async () => {
      try {
        // Fetch all target documents
        const targetsCollection = collection(db, 'targets');
        const targetsSnapshot = await getDocs(targetsCollection);
        
        let totalTarget = 0;
        
        // Initialize monthly data (last 6 months)
        const monthlyData = [0, 0, 0, 0, 0, 0];
        const currentMonth = new Date().getMonth();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const last6MonthsLabels = [];
        
        // Create labels for the last 6 months
        for (let i = 5; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12;
          last6MonthsLabels.unshift(monthNames[monthIndex]);
        }
        
        // Process each target document
        targetsSnapshot.forEach((doc) => {
          const targetData = doc.data();
          
          // Sum up targets
          totalTarget += targetData.amountCollectedTarget || 0;
        });
        
        // Fetch payments data for total revenue and average deal size
        const paymentsCollection = collection(db, 'payments');
        const paymentsSnapshot = await getDocs(paymentsCollection);
        
        let totalCollected = 0;
        let totalPayments = 0;
        
        paymentsSnapshot.forEach((doc) => {
          const paymentData = doc.data();
          // Handle amount as string by parsing to number
          if (paymentData.amount) {
            const amount = parseFloat(paymentData.amount);
            if (!isNaN(amount)) {
              totalCollected += amount;
              totalPayments++;
              
              // If the payment has a timestamp string, add to monthly data
              if (paymentData.timestamp) {
                const paymentDate = new Date(paymentData.timestamp);
                if (paymentDate instanceof Date && !isNaN(paymentDate.getTime())) {
                  const paymentMonth = paymentDate.getMonth();
                  const monthDiff = (paymentMonth - currentMonth + 12) % 12;
                  
                  if (monthDiff <= 5) {
                    const index = 5 - monthDiff;
                    monthlyData[index] += amount;
                  }
                }
              }
            }
          }
        });
        
        // Fetch leads data for conversion rate
        const leadsCollection = collection(db, 'crm_leads');
        const leadsSnapshot = await getDocs(leadsCollection);
        
        let totalLeads = 0;
        let convertedLeads = 0;
        
        leadsSnapshot.forEach((doc) => {
          const leadData = doc.data();
          totalLeads++;
          
          if (leadData.status === 'Converted') {
            convertedLeads++;
          }
        });
        
        // Calculate average deal size and conversion rate
        const avgDealSize = totalPayments > 0 ? Math.round(totalCollected / totalPayments) : 0;
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
        
        // Set the sales analytics state with actual monthly data
        setSalesAnalytics({
          totalTargetAmount: totalTarget,
          totalCollectedAmount: totalCollected,
          monthlyRevenue: monthlyData,
          conversionRate: conversionRate,
          avgDealSize: avgDealSize
        });
        
        // Update the labels to show actual month names
        salesData.labels = last6MonthsLabels;
        salesData.datasets[0].data = monthlyData;
        
        console.log("Monthly revenue data:", monthlyData);
        console.log("Month labels:", last6MonthsLabels);
        console.log("Total revenue (from payments):", totalCollected);
        console.log("Total payments count:", totalPayments);
        console.log("Total leads:", totalLeads);
        console.log("Converted leads:", convertedLeads);
        console.log("Conversion rate:", conversionRate + "%");
        
      } catch (error) {
        console.error("Error fetching sales analytics:", error);
      }
    };
    
    fetchSalesAnalytics();
  }, []);

  // Add useEffect to fetch all salespeople
  useEffect(() => {
    const fetchSalespeople = async () => {
      try {
        // Query all targets to get salespeople data
        const targetsCollection = collection(db, 'targets');
        const targetsSnapshot = await getDocs(targetsCollection);
        
        const salespeople: {id: string, name: string}[] = [];
        
        targetsSnapshot.forEach((doc) => {
          const targetData = doc.data();
          if (targetData.userName) {
            salespeople.push({
              id: doc.id,
              name: targetData.userName
            });
          }
        });
        
        // Sort alphabetically by name
        salespeople.sort((a, b) => a.name.localeCompare(b.name));
        
        setSalespeople(salespeople);
      } catch (error) {
        console.error("Error fetching salespeople:", error);
      }
    };
    
    fetchSalespeople();
  }, []);
  
  // Add useEffect to fetch individual salesperson data when selected
  useEffect(() => {
    const fetchIndividualSalesData = async () => {
      if (!selectedSalesperson) {
        setIndividualSalesData(null);
        return;
      }
      
      try {
        // Get the target document for the selected salesperson
        const targetRef = doc(db, 'targets', selectedSalesperson);
        const targetSnap = await getDoc(targetRef);
        
        if (targetSnap.exists()) {
          const targetData = targetSnap.data();
          const targetAmount = targetData.amountCollectedTarget || 0;
          const collectedAmount = targetData.amountCollected || 0;
          const conversionRate = targetAmount > 0 ? Math.round((collectedAmount / targetAmount) * 100) : 0;
          
          // Get leads data to generate monthly data
          const leadsQuery = query(
            collection(db, 'crm_leads'),
            where('assignedTo', '==', targetData.userName)
          );
          const leadsSnapshot = await getDocs(leadsQuery);
          
          // Group leads by month
          const monthlyData: { [key: number]: number } = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
          
          leadsSnapshot.forEach((doc) => {
            const leadData = doc.data();
            
            if (leadData.convertedToClient === true || leadData.status === 'Converted') {
              // Get the month from timestamp
              let date;
              if (leadData.convertedAt) {
                date = leadData.convertedAt.toDate ? leadData.convertedAt.toDate() : new Date(leadData.convertedAt);
              } else if (leadData.timestamp) {
                date = leadData.timestamp.toDate ? leadData.timestamp.toDate() : new Date(leadData.timestamp);
              } else {
                date = new Date();
              }
              
              // Get month (0-based)
              const month = date.getMonth();
              // Only consider last 6 months
              const currentMonth = new Date().getMonth();
              
              // Convert to our 0-5 scale (with 5 being current month)
              const relativeMonth = (month - currentMonth + 12) % 12;
              if (relativeMonth <= 5) {
                // Calculate index (5 = current month, 0 = 5 months ago)
                const index = 5 - relativeMonth;
                monthlyData[index] = (monthlyData[index] || 0) + 1;
              }
            }
          });
          
          // Create data for the chart
          const monthlyValues = Object.values(monthlyData);
          
          setIndividualSalesData({
            name: targetData.userName,
            targetAmount: targetAmount,
            collectedAmount: collectedAmount,
            conversionRate: conversionRate,
            monthlyData: monthlyValues
          });
        }
      } catch (error) {
        console.error("Error fetching individual sales data:", error);
      }
    };
    
    fetchIndividualSalesData();
  }, [selectedSalesperson]);
  
  // Handle salesperson selection change
  const handleSalespersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSalesperson(value !== "all" ? value : null);
  };

  // Handle salesperson selection change for leads filter
  const handleLeadsSalespersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedLeadsSalesperson(value !== "all" ? value : null);
  };
  
  // Update the getChartData function to use actual labels and data
  const getChartData = () => {
    const currentMonth = new Date().getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6MonthsLabels = [];
    
    // Create labels for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6MonthsLabels.unshift(monthNames[monthIndex]);
    }

    if (selectedSalesperson && individualSalesData) {
      // Return individual data with actual month labels
      return {
        labels: last6MonthsLabels,
        datasets: [
          {
            label: `${individualSalesData.name}'s Conversions`,
            data: individualSalesData.monthlyData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4,
            fill: true,
          },
        ],
      };
    } else {
      // Return overall data (only showing actual data, no simulated values)
      return {
        labels: last6MonthsLabels,
        datasets: [
          {
            label: 'Monthly Revenue',
            data: salesAnalytics.monthlyRevenue, // Use actual data from state
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4,
            fill: true,
          },
        ],
      };
    }
  };
  
  // Get analytics stats based on selection
  const getAnalyticsStats = () => {
    if (selectedSalesperson && individualSalesData) {
      return {
        totalCollectedAmount: individualSalesData.collectedAmount,
        totalTargetAmount: individualSalesData.targetAmount,
        conversionRate: individualSalesData.conversionRate,
        avgDealSize: individualSalesData.collectedAmount > 0 ? individualSalesData.collectedAmount : 0,
        // Add revenue achievement percentage
        revenueAchievementPercentage: individualSalesData.targetAmount > 0 
          ? Math.min(Math.round((individualSalesData.collectedAmount / individualSalesData.targetAmount) * 100), 100)
          : 0
      };
    } else {
      return {
        ...salesAnalytics,
        // Add revenue achievement percentage
        revenueAchievementPercentage: salesAnalytics.totalTargetAmount > 0 
          ? Math.min(Math.round((salesAnalytics.totalCollectedAmount / salesAnalytics.totalTargetAmount) * 100), 100)
          : 0
      };
    }
  };
  
  const analyticsStats = getAnalyticsStats();

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
        data: salesAnalytics.monthlyRevenue, // Use actual data from state
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
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

  // Prepare data for conversion analytics chart - converted vs non-converted leads
  const convertedLeadsData = {
    labels: ['Settleloans', 'Credsettlee', 'AMA'],
    datasets: [
      {
        label: 'Converted Leads',
        data: leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data || [0, 0, 0],
        backgroundColor: [
          'rgba(52, 191, 163, 0.9)',  // Teal for Settleloans
          'rgba(79, 70, 229, 0.9)',   // Indigo for Credsettlee
          'rgba(249, 115, 22, 0.9)',  // Orange for AMA
        ],
        borderColor: [
          'rgba(52, 191, 163, 1)',
          'rgba(79, 70, 229, 1)',
          'rgba(249, 115, 22, 1)',
        ],
        borderWidth: 1,
      },
      {
        label: 'Non-Converted Leads',
        // Calculate non-converted leads for each source
        data: [
          sourceTotals.settleloans - (leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data[0] || 0),
          sourceTotals.credsettlee - (leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data[1] || 0),
          sourceTotals.ama - (leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data[2] || 0)
        ],
        backgroundColor: [
          'rgba(52, 191, 163, 0.2)',  // Lighter Teal for Settleloans
          'rgba(79, 70, 229, 0.2)',   // Lighter Indigo for Credsettlee
          'rgba(249, 115, 22, 0.2)',  // Lighter Orange for AMA
        ],
        borderColor: [
          'rgba(52, 191, 163, 0.6)',
          'rgba(79, 70, 229, 0.6)',
          'rgba(249, 115, 22, 0.6)',
        ],
        borderWidth: 1,
      }
    ]
  };
  
  // Horizontal bar chart options with stacked bars
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
      },
      tooltip: {
        callbacks: {
          footer: (tooltipItems: any) => {
            const sourceIndex = tooltipItems[0].dataIndex;
            const totalLeads = sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama;
            const sourceTotal = [sourceTotals.settleloans, sourceTotals.credsettlee, sourceTotals.ama][sourceIndex];
            const convertedLeads = leadsBySourceData.datasets.find(d => d.label === 'Converted')?.data[sourceIndex] || 0;
            const conversionRate = sourceTotal > 0 ? (convertedLeads / sourceTotal * 100).toFixed(1) : '0';
            return `Conversion Rate: ${conversionRate}%`;
          }
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
  };

  // Add useEffect to fetch client analytics
  useEffect(() => {
    const fetchClientAnalytics = async () => {
      try {
        const clientsCollection = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsCollection);
        
        const analytics = {
          totalClients: 0,
          statusDistribution: { Active: 0, Pending: 0, Inactive: 0, Converted: 0 },
          advocateCount: {} as Record<string, number>,
          loanTypeDistribution: {} as Record<string, number>,
          sourceDistribution: {} as Record<string, number>,
          cityDistribution: {} as Record<string, number>,
          totalLoanAmount: 0,
          loanCount: 0
        };
        
        clientsSnapshot.forEach((doc) => {
          const client = doc.data();
          analytics.totalClients++;
          
          // Count by status
          const status = client.adv_status || client.status || 'Pending';
          if (analytics.statusDistribution[status as keyof typeof analytics.statusDistribution] !== undefined) {
            analytics.statusDistribution[status as keyof typeof analytics.statusDistribution]++;
          } else {
            analytics.statusDistribution[status as keyof typeof analytics.statusDistribution] = 1;
          }
          
          // Count by advocate
          const advocate = client.alloc_adv || 'Unassigned';
          analytics.advocateCount[advocate] = (analytics.advocateCount[advocate] || 0) + 1;
          
          // Count by source
          const source = client.source || 'Unknown';
          analytics.sourceDistribution[source] = (analytics.sourceDistribution[source] || 0) + 1;
          
          // Count by city
          const city = client.city || 'Unknown';
          analytics.cityDistribution[city] = (analytics.cityDistribution[city] || 0) + 1;
          
          // Count loan types and sum loan amounts
          if (client.banks && Array.isArray(client.banks)) {
            client.banks.forEach((bank: any) => {
              const loanType = bank.loanType || 'Unknown';
              analytics.loanTypeDistribution[loanType] = (analytics.loanTypeDistribution[loanType] || 0) + 1;
              
              // Enhanced parsing of loan amount to handle various Indian number formats
              if (bank.loanAmount) {
                // Convert to string to ensure consistent handling
                const amountStr = String(bank.loanAmount);
                
                // Handle various formats with a staged approach
                let amount: number;
                
                // Try different parsing approaches in sequence
                
                // 1. Direct parse if it's already a number
                if (typeof bank.loanAmount === 'number') {
                  amount = bank.loanAmount;
                }
                // 2. Handle "lakh" and "crore" text representations
                else if (amountStr.toLowerCase().includes('lakh')) {
                  const match = amountStr.match(/(\d+(\.\d+)?)/);
                  amount = match ? parseFloat(match[0]) * 100000 : NaN;
                }
                else if (amountStr.toLowerCase().includes('crore')) {
                  const match = amountStr.match(/(\d+(\.\d+)?)/);
                  amount = match ? parseFloat(match[0]) * 10000000 : NaN;
                }
                // 3. Try direct parsing for clean numbers
                else {
                  amount = parseFloat(amountStr);
                }
                
                // 4. If still NaN, try removing all non-digit characters except decimal point
                if (isNaN(amount)) {
                  // Handle Indian format like "1,23,456.78" - remove commas first
                  const cleanedStr = amountStr
                    .replace(/[₹Rs.,\s]/g, '') // Remove rupee symbols, commas, spaces
                    .replace(/^0+/, ''); // Remove leading zeros
                  
                  amount = parseFloat(cleanedStr);
                }
                
                // Log problematic values to console for debugging
                if (isNaN(amount)) {
                  console.log('Could not parse loan amount:', bank.loanAmount);
                } else {
                  analytics.totalLoanAmount += amount;
                  analytics.loanCount++;
                }
              }
            });
          }
        });
        
        // Sort advocates by client count to get top advocates
        const topAdvocates = Object.entries(analytics.advocateCount)
          .map(([name, clientCount]) => ({ name, clientCount }))
          .sort((a, b) => b.clientCount - a.clientCount)
          .slice(0, 5);
        
        // Calculate average loan amount
        const avgLoanAmount = analytics.loanCount > 0 
          ? Math.round(analytics.totalLoanAmount / analytics.loanCount) 
          : 0;
        
        setClientAnalytics({
          totalClients: analytics.totalClients,
          statusDistribution: analytics.statusDistribution,
          topAdvocates,
          loanTypeDistribution: analytics.loanTypeDistribution,
          sourceDistribution: analytics.sourceDistribution,
          cityDistribution: analytics.cityDistribution,
          totalLoanAmount: analytics.totalLoanAmount,
          avgLoanAmount
        });
        
        // Prepare data for charts
        const statusLabels = Object.keys(analytics.statusDistribution);
        const statusData = statusLabels.map(key => analytics.statusDistribution[key as keyof typeof analytics.statusDistribution]);
        
        const sourceLabels = Object.keys(analytics.sourceDistribution).slice(0, 5);
        const sourceData = sourceLabels.map(key => analytics.sourceDistribution[key]);
        
        const loanTypeLabels = Object.keys(analytics.loanTypeDistribution);
        const loanTypeData = loanTypeLabels.map(key => analytics.loanTypeDistribution[key]);
        
        // Update chart data for admin analytics
        setAdminChartData({
          labels: statusLabels,
          datasets: [
            {
              label: 'Clients by Status',
              data: statusData,
              backgroundColor: [
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(54, 162, 235, 0.6)',
              ],
            }
          ],
        });
        
        setLoanTypeData({
          labels: loanTypeLabels,
          datasets: [
            {
              data: loanTypeData,
              backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
              ],
              borderWidth: 1,
            },
          ],
        });
        
      } catch (error) {
        console.error("Error fetching client analytics:", error);
      }
    };
    
    fetchClientAnalytics();
  }, []);
  
  // Add state for admin chart data
  const [adminChartData, setAdminChartData] = useState({
    labels: ['Active', 'Pending', 'Inactive', 'Converted'],
    datasets: [
      {
        label: 'Clients by Status',
        data: [0, 0, 0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(54, 162, 235, 0.6)',
        ],
      }
    ],
  });
  
  // Add state for loan type distribution
  const [loanTypeData, setLoanTypeData] = useState({
    labels: ['Personal Loan', 'Business Loan', 'Home Loan', 'Other'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  });

  // Modify the fetchPaymentAnalytics useEffect
  useEffect(() => {
    const fetchPaymentAnalytics = async () => {
      try {
        const paymentsCollection = collection(db, 'clients_payments');
        const paymentsSnapshot = await getDocs(paymentsCollection);
        
        const analytics = {
          totalPaymentsAmount: 0,
          totalPaidAmount: 0,
          totalPendingAmount: 0,
          clientCount: 0,
          paymentMethodDistribution: {} as Record<string, number>,
          monthlyPaymentsData: [0, 0, 0, 0, 0, 0],
          paymentTypeDistribution: {
            full: 0,
            partial: 0
          }
        };

        // Get current month's start and end dates
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Track current month's payments
        let currentMonthCollected = 0;
        let currentMonthPending = 0;
        
        // Process each client payment document
        paymentsSnapshot.forEach((clientDoc) => {
          const clientPayment = clientDoc.data();
          analytics.clientCount++;
          
          // Add to total analytics
          analytics.totalPaymentsAmount += clientPayment.totalPaymentAmount || 0;
          analytics.totalPaidAmount += clientPayment.paidAmount || 0;
          analytics.totalPendingAmount += clientPayment.pendingAmount || 0;

          // Calculate current month's data
          // Each client has a monthlyFees amount
          const monthlyFees = clientPayment.monthlyFees || 0;
          
          // Check if this is a current client based on startDate
          if (clientPayment.startDate) {
            const startDate = clientPayment.startDate.toDate ? 
              clientPayment.startDate.toDate() : new Date(clientPayment.startDate);
            
            // If client started before or during current month
            if (startDate <= currentMonthEnd) {
              // Add to pending amount for current month
              currentMonthPending += monthlyFees;
              
              // If they've made payments, subtract from pending and add to collected
              if (clientPayment.paymentsCompleted > 0) {
                const thisMonthPaid = Math.min(monthlyFees, clientPayment.paidAmount || 0);
                currentMonthCollected += thisMonthPaid;
                currentMonthPending -= thisMonthPaid;
              }
            }
          }

          // Add to payment type distribution
          if (clientPayment.paymentsCompleted > 0) {
            if (clientPayment.paidAmount < monthlyFees) {
              analytics.paymentTypeDistribution.partial++;
            } else {
              analytics.paymentTypeDistribution.full++;
            }
          }
        });
        
        // Calculate completion rate
        const completionRate = analytics.totalPaymentsAmount > 0 
          ? Math.round((analytics.totalPaidAmount / analytics.totalPaymentsAmount) * 100) 
          : 0;
        
        setPaymentAnalytics({
          ...analytics,
          completionRate
        });
        
        // Update current month's payment data
        setCurrentMonthPayments({
          collected: currentMonthCollected,
          pending: currentMonthPending
        });
        
        console.log("Payment Analytics:", {
          totalPayments: analytics.totalPaymentsAmount,
          totalPaid: analytics.totalPaidAmount,
          totalPending: analytics.totalPendingAmount,
          clientCount: analytics.clientCount,
          currentMonth: {
            collected: currentMonthCollected,
            pending: currentMonthPending,
          },
          completionRate
        });
        
      } catch (error) {
        console.error("Error fetching payment analytics:", error);
      }
    };
    
    fetchPaymentAnalytics();
  }, []);

  // Prepare payment method chart data
  const paymentMethodData = {
    labels: Object.keys(paymentAnalytics.paymentMethodDistribution),
    datasets: [
      {
        data: Object.values(paymentAnalytics.paymentMethodDistribution),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare monthly payment trend data
  const monthlyPaymentData = {
    labels: (() => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const last6MonthsLabels = [];
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        last6MonthsLabels.unshift(monthNames[monthIndex]);
      }
      return last6MonthsLabels;
    })(),
    datasets: [
      {
        label: 'Monthly Payment Collection',
        data: paymentAnalytics.monthlyPaymentsData,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Payment types data for doughnut chart
  const paymentTypesData = {
    labels: ['Full Payments', 'Partial Payments'],
    datasets: [
      {
        data: [
          paymentAnalytics.paymentTypeDistribution.full,
          paymentAnalytics.paymentTypeDistribution.partial
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="p-6 min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>

      <div className="flex flex-col gap-6">
        {/* Sales Analytics Section */}
        <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white">
                {selectedSalesperson && individualSalesData
                  ? `${individualSalesData.name}'s Sales Performance`
                  : 'Overall Sales Analytics'
                }
              </CardTitle>
              
              {/* Salesperson Dropdown */}
              <div className="flex items-center">
                <label htmlFor="salesperson" className="mr-2 text-gray-300">View:</label>
                <select
                  id="salesperson"
                  className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSalesperson || "all"}
                  onChange={handleSalespersonChange}
                >
                  <option value="all">All Salespeople</option>
                  {salespeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Fixed metric cards with better alignments */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Revenue Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full">
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-blue-300 font-medium text-sm uppercase tracking-wider mb-2">
                      {selectedSalesperson ? 'Revenue Collected' : 'Total Revenue'}
                    </h3>
                    <div className="flex items-baseline space-x-2 mb-3">
                      <p className="text-3xl font-bold text-white">₹{(analyticsStats.totalCollectedAmount).toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-400">
                        {selectedSalesperson ? 'collected' : 'total'}
                      </p>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{analyticsStats.revenueAchievementPercentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-teal-400 rounded-full" 
                          style={{ width: `${analyticsStats.revenueAchievementPercentage}%` }}
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
                      {selectedSalesperson ? 'Personal Target' : 'Total Target'}
                    </h3>
                    <div className="flex items-baseline space-x-2 mb-3">
                      <p className="text-3xl font-bold text-white">₹{(analyticsStats.totalTargetAmount).toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-400">
                        {selectedSalesperson ? 'assigned' : 'total'}
                      </p>
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
                      <p className="text-3xl font-bold text-white">{analyticsStats.conversionRate}%</p>
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
                            strokeDashoffset={`${28 * 2 * Math.PI * (1 - analyticsStats.conversionRate / 100)}`}
                            className="text-green-500"
                          />
                        </svg>
                        <span className="absolute text-sm font-bold text-white">{analyticsStats.conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400"></div>
                </div>

                {/* Avg Deal Size Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full">
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-amber-300 font-medium text-sm uppercase tracking-wider mb-2">
                      {selectedSalesperson ? 'Total Collections' : 'Avg. Deal Size'}
                    </h3>
                    <div className="flex items-baseline space-x-2 mb-3">
                      <p className="text-3xl font-bold text-white">₹{(analyticsStats.avgDealSize).toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-400">
                        {selectedSalesperson ? 'per client' : 'average'}
                      </p>
                    </div>
                    
                    {/* Removed the deal size visualization */}
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

              {/* CRM Leads Analytics Section with Table and Pie Chart */}
              <div className="mt-8 flex flex-col md:flex-row gap-6">
                {/* Left side: Table with filters */}
                <div className="md:w-2/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-blue-100">CRM Leads Analytics</h3>
                    
                    {/* Add salesperson filter dropdown */}
                    <div className="flex items-center">
                      <label htmlFor="lead-salesperson" className="mr-2 text-gray-300">Salesperson:</label>
                      <select
                        id="lead-salesperson"
                        className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedLeadsSalesperson || "all"}
                        onChange={handleLeadsSalespersonChange}
                      >
                        <option value="all">All Salespeople</option>
                        {salespeople.map((person) => (
                          <option key={person.id} value={person.name}>
                            {person.name}
                          </option>
                        ))}
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
              <CardTitle className="text-white">Client & Advocate Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column: Client status distribution */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-200 mb-4">Client Status Distribution</h3>
                  <div className="h-64">
                    <Bar data={adminChartData} options={{
                      ...options,
                      indexAxis: 'y' as const,
                      plugins: {
                        ...options.plugins,
                        title: {
                          display: true,
                          text: 'Clients by Status',
                          color: 'rgba(255, 255, 255, 0.8)',
                        },
                      },
                    }} />
                  </div>
                  
                  {/* Client stats cards */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-gradient-to-br from-blue-900/80 to-blue-800/60 p-4 rounded-lg border border-blue-700/30 shadow-md">
                      <p className="text-blue-300 text-sm font-medium">Total Clients</p>
                      <p className="text-2xl font-bold text-white">{clientAnalytics.totalClients}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-900/80 to-green-800/60 p-4 rounded-lg border border-green-700/30 shadow-md">
                      <p className="text-green-300 text-sm font-medium">Active Clients</p>
                      <p className="text-2xl font-bold text-white">{clientAnalytics.statusDistribution.Active || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900/80 to-purple-800/60 p-4 rounded-lg border border-purple-700/30 shadow-md">
                      <p className="text-purple-300 text-sm font-medium">Avg. Loan Amount</p>
                      <p className="text-2xl font-bold text-white">₹{clientAnalytics.avgLoanAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-900/80 to-amber-800/60 p-4 rounded-lg border border-amber-700/30 shadow-md">
                      <p className="text-amber-300 text-sm font-medium">Total Loan Amount</p>
                      <p className="text-2xl font-bold text-white">₹{clientAnalytics.totalLoanAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
                
                {/* Right column: Loan type distribution and top advocates */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-200 mb-4">Loan Type Distribution</h3>
                  <div className="h-64">
                    <Pie data={loanTypeData} options={{
                      ...pieOptions,
                      plugins: {
                        ...pieOptions.plugins,
                        title: {
                          display: true,
                          text: 'Loans by Type',
                          color: 'rgba(255, 255, 255, 0.8)',
                        },
                      },
                    }} />
                  </div>
                  
                  {/* Top advocates section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-blue-200 mb-3">Top Advocates</h3>
                    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-900/80 to-purple-900/80">
                            <th className="py-3 px-4 text-left text-sm font-semibold text-blue-100">Advocate Name</th>
                            <th className="py-3 px-4 text-right text-sm font-semibold text-blue-100">Clients</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientAnalytics.topAdvocates.map((advocate, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-gray-800/40" : "bg-gray-800/60"}>
                              <td className="py-2.5 px-4 text-sm text-gray-200">{advocate.name}</td>
                              <td className="py-2.5 px-4 text-sm text-right text-gray-200">
                                <span className="px-2 py-1 bg-blue-900/40 rounded-md text-blue-200">
                                  {advocate.clientCount}
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
            </CardContent>
          </Card>
        </div>

        {/* Update the Advocate Analytics Section */}
        <div className="w-full">
          <Card className="bg-gray-800 border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Payment Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Payment metrics row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-900/80 to-blue-800/60 p-4 rounded-lg border border-blue-700/30 shadow-md">
                  <p className="text-blue-300 text-sm font-medium">Total Clients</p>
                  <p className="text-2xl font-bold text-white">{paymentAnalytics.clientCount}</p>
                </div>
                <div className="bg-gradient-to-br from-green-900/80 to-green-800/60 p-4 rounded-lg border border-green-700/30 shadow-md">
                  <p className="text-green-300 text-sm font-medium">This Month's Collection</p>
                  <p className="text-2xl font-bold text-white">₹{currentMonthPayments.collected.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-green-300 mt-1">Total: ₹{paymentAnalytics.totalPaidAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-900/80 to-amber-800/60 p-4 rounded-lg border border-amber-700/30 shadow-md">
                  <p className="text-amber-300 text-sm font-medium">This Month's Pending</p>
                  <p className="text-2xl font-bold text-white">₹{currentMonthPayments.pending.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-amber-300 mt-1">Total: ₹{paymentAnalytics.totalPendingAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/80 to-purple-800/60 p-4 rounded-lg border border-purple-700/30 shadow-md">
                  <p className="text-purple-300 text-sm font-medium">Collection Rate</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-white">{paymentAnalytics.completionRate}%</p>
                    <div className="ml-2 h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" 
                        style={{ width: `${paymentAnalytics.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Monthly payment trends */}
                <div className="md:w-1/2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-xl">
                  <h3 className="text-lg font-semibold text-blue-200 mb-3">Monthly Collection Trends</h3>
                  <div className="h-64">
                    <Line 
                      data={monthlyPaymentData} 
                      options={{
                        ...options,
                        plugins: {
                          ...options.plugins,
                          title: {
                            display: true,
                            text: 'Payment Collections (Last 6 Months)',
                            color: 'rgba(255, 255, 255, 0.8)',
                          },
                        },
                      }} 
                    />
                  </div>
                </div>

                {/* Payment methods and types */}
                <div className="md:w-1/2 flex flex-col gap-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-xl flex-1">
                    <h3 className="text-lg font-semibold text-blue-200 mb-3">Payment Methods</h3>
                    <div className="h-48">
                      <Pie 
                        data={paymentMethodData} 
                        options={{
                          ...pieOptions,
                          plugins: {
                            ...pieOptions.plugins,
                            title: {
                              display: true,
                              text: 'Payment Methods Distribution',
                              color: 'rgba(255, 255, 255, 0.8)',
                            },
                          },
                        }} 
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-xl flex-1">
                    <h3 className="text-lg font-semibold text-blue-200 mb-3">Payment Types</h3>
                    <div className="flex">
                      <div className="h-40 w-40">
                        <Pie 
                          data={paymentTypesData} 
                          options={{
                            ...pieOptions,
                            cutout: '50%', // Make it a doughnut chart
                            plugins: {
                              ...pieOptions.plugins,
                              title: {
                                display: false,
                              },
                            },
                          }} 
                        />
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="grid grid-cols-1 gap-2 w-full">
                          <div className="flex items-center justify-between bg-blue-900/30 p-2 rounded-lg">
                            <span className="text-blue-300">Full Payments:</span>
                            <span className="font-semibold text-white">{paymentAnalytics.paymentTypeDistribution.full}</span>
                          </div>
                          <div className="flex items-center justify-between bg-yellow-900/30 p-2 rounded-lg">
                            <span className="text-yellow-300">Partial Payments:</span>
                            <span className="font-semibold text-white">{paymentAnalytics.paymentTypeDistribution.partial}</span>
                          </div>
                          <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                            <span className="text-gray-300">Total Transactions:</span>
                            <span className="font-semibold text-white">
                              {paymentAnalytics.paymentTypeDistribution.full + paymentAnalytics.paymentTypeDistribution.partial}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
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
