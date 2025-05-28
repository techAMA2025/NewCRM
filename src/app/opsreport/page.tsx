'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
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
  LabelList,
} from 'recharts';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';

interface BankStats {
  bankName: string;
  totalLoans: number;
  totalAmount: number;
  loanTypes: { [key: string]: number };
}

interface Client {
  alloc_adv: string;
  alloc_adv_secondary: string;
  adv_status: string;
  city: string;
  source_database: string;
  monthlyIncome: string;
  occupation: string;
  creditCardDues: string;
  personalLoanDues: string;
  banks: Array<{
    loanAmount: string;
    bankName: string;
    loanType: string;
  }>;
}

interface AdvocateStats {
  id: string;
  name: string;
  totalClients: number;
  active: number;
  notResponding: number;
  dropped: number;
  totalLoanAmount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function OpsReport() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [advocateStats, setAdvocateStats] = useState<AdvocateStats[]>([]);
  const [cityStats, setCityStats] = useState<any[]>([]);
  const [sourceStats, setSourceStats] = useState<any[]>([]);
  const [statusStats, setStatusStats] = useState<any[]>([]);
  const [bankStats, setBankStats] = useState<BankStats[]>([]);
  const [monthlyIncomeStats, setMonthlyIncomeStats] = useState<any[]>([]);
  const [occupationStats, setOccupationStats] = useState<any[]>([]);
  const [totalDebtStats, setTotalDebtStats] = useState({
    totalCreditCardDues: 0,
    totalPersonalLoanDues: 0,
    totalBankLoans: 0
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientsData = querySnapshot.docs.map(doc => doc.data() as Client);
        setClients(clientsData);
        processData(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const processData = (clientsData: Client[]) => {
    // Process advocate statistics
    const advocateMap = new Map<string, AdvocateStats>();
    clientsData.forEach(client => {
      const adv = client.alloc_adv;
      if (!advocateMap.has(adv)) {
        advocateMap.set(adv, {
          id: `adv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: adv,
          totalClients: 0,
          active: 0,
          notResponding: 0,
          dropped: 0,
          totalLoanAmount: 0,
        });
      }
      const stats = advocateMap.get(adv)!;
      stats.totalClients++;
      if (client.adv_status === 'Active') stats.active++;
      if (client.adv_status === 'Not Responding') stats.notResponding++;
      if (client.adv_status === 'Dropped') stats.dropped++;
      
      // Calculate total loan amount
      client.banks?.forEach(bank => {
        const amount = parseFloat(bank.loanAmount.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(amount)) {
          stats.totalLoanAmount += amount;
        }
      });
    });
    setAdvocateStats(Array.from(advocateMap.values()));

    // Process bank statistics
    const bankMap = new Map<string, BankStats>();
    clientsData.forEach(client => {
      client.banks?.forEach(bank => {
        const bankName = bank.bankName || 'Unknown';
        if (!bankMap.has(bankName)) {
          bankMap.set(bankName, {
            bankName,
            totalLoans: 0,
            totalAmount: 0,
            loanTypes: {}
          });
        }
        const stats = bankMap.get(bankName)!;
        stats.totalLoans++;
        
        const amount = parseFloat(bank.loanAmount.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(amount)) {
          stats.totalAmount += amount;
        }

        const loanType = bank.loanType || 'Unknown';
        stats.loanTypes[loanType] = (stats.loanTypes[loanType] || 0) + 1;
      });
    });
    setBankStats(Array.from(bankMap.values()).sort((a, b) => b.totalLoans - a.totalLoans));

    // Process city statistics
    const cityMap = new Map();
    clientsData.forEach(client => {
      const city = client.city || 'Unknown';
      if (!cityMap.has(city)) {
        cityMap.set(city, { name: city, count: 0 });
      }
      cityMap.get(city).count++;
    });
    setCityStats(Array.from(cityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)); // Show top 15 cities

    // Process source database statistics
    const sourceMap = new Map();
    clientsData.forEach(client => {
      const source = client.source_database || 'Unknown';
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { name: source, count: 0 });
      }
      sourceMap.get(source).count++;
    });
    setSourceStats(Array.from(sourceMap.values()));

    // Process status statistics
    const statusMap = new Map();
    clientsData.forEach(client => {
      const status = client.adv_status || 'Unknown';
      if (!statusMap.has(status)) {
        statusMap.set(status, { name: status, count: 0 });
      }
      statusMap.get(status).count++;
    });
    setStatusStats(Array.from(statusMap.values()));

    // Process total debt statistics
    let totalStats = {
      totalCreditCardDues: 0,
      totalPersonalLoanDues: 0,
      totalBankLoans: 0
    };

    clientsData.forEach(client => {
      // Process credit card dues
      const creditCardDues = typeof client.creditCardDues === 'string' 
        ? parseFloat(client.creditCardDues.replace(/[^0-9.-]+/g, '')) 
        : 0;
      if (!isNaN(creditCardDues)) {
        totalStats.totalCreditCardDues += creditCardDues;
      }

      // Process personal loan dues
      const personalLoanDues = typeof client.personalLoanDues === 'string'
        ? parseFloat(client.personalLoanDues.replace(/[^0-9.-]+/g, ''))
        : 0;
      if (!isNaN(personalLoanDues)) {
        totalStats.totalPersonalLoanDues += personalLoanDues;
      }

      // Process bank loans
      client.banks?.forEach(bank => {
        if (typeof bank.loanAmount === 'string') {
          const amount = parseFloat(bank.loanAmount.replace(/[^0-9.-]+/g, ''));
          if (!isNaN(amount)) {
            totalStats.totalBankLoans += amount;
          }
        }
      });
    });
    setTotalDebtStats(totalStats);

    // Process monthly income statistics
    const incomeRanges = {
      '0-25K': 0,
      '25K-50K': 0,
      '50K-75K': 0,
      '75K-100K': 0,
      '100K+': 0
    };

    clientsData.forEach(client => {
      const income = typeof client.monthlyIncome === 'string'
        ? parseFloat(client.monthlyIncome.replace(/[^0-9.-]+/g, ''))
        : 0;
      
      if (!isNaN(income)) {
        if (income <= 25000) incomeRanges['0-25K']++;
        else if (income <= 50000) incomeRanges['25K-50K']++;
        else if (income <= 75000) incomeRanges['50K-75K']++;
        else if (income <= 100000) incomeRanges['75K-100K']++;
        else incomeRanges['100K+']++;
      }
    });

    setMonthlyIncomeStats(Object.entries(incomeRanges).map(([range, count]) => ({
      range,
      count
    })));

    // Helper function to normalize occupation
    const normalizeOccupation = (occupation: string): string => {
      const normalized = occupation.trim().toUpperCase();
      
      // Group business-related occupations
      if (['SELF EMPOLYEE', 'BUSINESS', 'BUSNIESS', 'SELF EMPLOYED', 'SELF-EMPLOYED'].includes(normalized)) {
        return 'Business';
      }
      
      // Group job-related occupations
      if (['JOB'].includes(normalized)) {
        return 'Job';
      }
      
      return occupation; // Return original if no grouping applies
    };

    // Process occupation statistics
    const occupationMap = new Map();
    clientsData.forEach(client => {
      if (typeof client.occupation === 'string') {
        const normalizedOccupation = normalizeOccupation(client.occupation);
        if (!occupationMap.has(normalizedOccupation)) {
          occupationMap.set(normalizedOccupation, { name: normalizedOccupation, count: 0 });
        }
        occupationMap.get(normalizedOccupation).count++;
      } else {
        // Handle unknown/undefined occupation
        const unknown = 'Unknown';
        if (!occupationMap.has(unknown)) {
          occupationMap.set(unknown, { name: unknown, count: 0 });
        }
        occupationMap.get(unknown).count++;
      }
    });
    setOccupationStats(Array.from(occupationMap.values()));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex">
      <OverlordSidebar />
      <div className="flex-1 p-6 bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-100 mb-8 border-b border-gray-700 pb-4">
          Operations Analytics Dashboard
        </h1>

        {/* Advocate Performance Section */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-gray-100">Advocate Performance</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={advocateStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend wrapperStyle={{ color: '#F3F4F6' }} />
                <Bar dataKey="active" fill="#3B82F6" name="Active" />
                <Bar dataKey="notResponding" fill="#10B981" name="Not Responding" />
                <Bar dataKey="dropped" fill="#EF4444" name="Dropped" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bank Analytics Section */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-gray-100">Bank-wise Distribution</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Loans Bar Chart */}
            <div className="h-[400px]">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">Number of Loans by Bank</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bankStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="bankName" 
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: number) => [`${value} loans`, 'Total Loans']}
                  />
                  <Bar dataKey="totalLoans" fill="#3B82F6" name="Total Loans">
                    <LabelList dataKey="totalLoans" position="top" fill="#9CA3AF" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Total Amount Bar Chart */}
            <div className="h-[400px]">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">Total Loan Amount by Bank</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bankStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="bankName" 
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Total Amount']}
                  />
                  <Bar dataKey="totalAmount" fill="#10B981" name="Total Amount">
                    <LabelList 
                      dataKey="totalAmount" 
                      position="top" 
                      fill="#9CA3AF"
                      formatter={(value: number) => `₹${(value / 1000000).toFixed(1)}M`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Loan Types Distribution */}
            <div className="h-[400px] lg:col-span-2">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">Loan Types Distribution by Bank</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bankStats.map(bank => ({
                    bankName: bank.bankName,
                    ...bank.loanTypes
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="bankName" 
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#F3F4F6' }} />
                  {Object.keys(bankStats[0]?.loanTypes || {}).map((loanType, index) => (
                    <Bar 
                      key={loanType} 
                      dataKey={loanType} 
                      stackId="a" 
                      fill={COLORS[index % COLORS.length]} 
                      name={loanType}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* City and Source Distribution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* City Distribution - Changed to Horizontal Bar Chart */}
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100">City Distribution</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cityStats}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#9CA3AF"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Source Database Distribution */}
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100">Source Database Distribution</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {sourceStats.map((entry, index) => (
                      <Cell key={`source-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#F3F4F6' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-gray-100">Client Status Overview</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statusStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend wrapperStyle={{ color: '#F3F4F6' }} />
                <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Debt Overview */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-gray-100">Total Debt Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
              <h3 className="text-lg font-medium text-gray-200 mb-2">Credit Card Dues</h3>
              <p className="text-2xl font-bold text-red-400">₹{totalDebtStats.totalCreditCardDues.toLocaleString()}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
              <h3 className="text-lg font-medium text-gray-200 mb-2">Personal Loan Dues</h3>
              <p className="text-2xl font-bold text-orange-400">₹{totalDebtStats.totalPersonalLoanDues.toLocaleString()}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
              <h3 className="text-lg font-medium text-gray-200 mb-2">Total Bank Loans</h3>
              <p className="text-2xl font-bold text-yellow-400">₹{totalDebtStats.totalBankLoans.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Monthly Income and Occupation Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Monthly Income Distribution */}
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100">Monthly Income Distribution</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyIncomeStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="range" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" name="Number of Clients" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Occupation Distribution */}
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100">Occupation Distribution</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupationStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label
                  >
                    {occupationStats.map((entry, index) => (
                      <Cell key={`occupation-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#F3F4F6' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {advocateStats.map((advocate) => (
            <div key={advocate.id} className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-indigo-500">
              <h3 className="text-lg font-semibold mb-2 text-gray-100">{advocate.name}</h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  Total Clients: <span className="font-medium text-indigo-400">{advocate.totalClients}</span>
                </p>
                <p className="text-sm text-gray-300">
                  Total Loan Amount: <span className="font-medium text-green-400">₹{advocate.totalLoanAmount.toLocaleString()}</span>
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full border border-green-700">
                    Active: {advocate.active}
                  </span>
                  <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full border border-yellow-700">
                    Not Responding: {advocate.notResponding}
                  </span>
                  <span className="px-3 py-1 bg-red-900/50 text-red-300 rounded-full border border-red-700">
                    Dropped: {advocate.dropped}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
