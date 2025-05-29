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
    // Helper function to normalize bank names
    const normalizeBankName = (bankName: string): string => {
      if (!bankName) return 'Unknown';
      
      // Remove extra spaces and convert to uppercase for comparison
      const normalized = bankName.trim().toUpperCase().replace(/\s+/g, ' ');
      
      // Comprehensive bank name mappings with more precise patterns
      const bankMappings: { [key: string]: RegExp[] } = {
        'ICICI BANK': [/ICICI?.*(?:BANK)?/i, /ICIC.*(?:BANK)?/i],
        'AXIS BANK': [/AXIS.*(?:BANK)?/i],
        'HDFC BANK': [/HDFC.*(?:BANK)?/i],
        'STATE BANK OF INDIA': [/^(?:STATE.*BANK|SBI)/i],
        'RBL BANK': [/^RBL(?:\s*\(?BAJAJ\)?)?/i, /RBL.*(?:BANK)?/i],
        'IDFC FIRST BANK': [/IDFC.*(?:FIRST|FIRSTBANK)?/i],
        'KOTAK MAHINDRA BANK': [/KOTAK.*(?:MAHINDRA)?.*(?:BANK)?/i, /KOTAKMAHINDRA(?:BANK)?/i],
        'YES BANK': [/YES.*(?:BANK)?/i],
        'BANK OF BARODA': [/^(?:BANK\s*OF\s*BARODA|BOB)(?:\s*(?:BANK|ONE\s*CARD|\(ONE\s*CARD\))?)?/i],
        'INDUSIND BANK': [/INDUS(?:I|L)ND.*(?:BANK)?/i],
        'DBS BANK': [/DBS.*(?:BANK)?/i],
        'STANDARD CHARTERED BANK': [/STANDARD.*(?:CHARTERED).*(?:BANK)?/i],
        'FEDERAL BANK': [/FEDERAL.*(?:BANK|\(ONECARD\))?/i],
        'SOUTH INDIAN BANK': [/(?:THE\s*)?SOUTH.*INDIAN.*(?:BANK|LTD)?/i],
        'AU SMALL FINANCE BANK': [/AU.*(?:SMALL|BANK|FINANCE)/i],
        'CATHOLIC SYRIAN BANK': [/(?:THE\s*)?CATHOLIC.*SYRIAN.*(?:BANK)?/i],
        'PUNJAB NATIONAL BANK': [/PUNJAB.*NATIONAL.*(?:BANK)?/i],
        'UNION BANK': [/^UNION.*(?:BANK)?/i],
        'NORTH EAST SMALL FINANCE BANK': [/NORTH.*EAST.*(?:SMALL|FINANCE|BANK)?/i],
        'ADITYA BIRLA FINANCE': [/ADITYA.*(?:BIRLA|SHRIRAM).*(?:FINANCE|CAPITAL|NIRA|LTD|SMFG)?/i],
        'BAJAJ FINANCE': [/BAJAJ.*(?:FINANCE|FINSERV|LIMITED)?/i],
        'HERO FINCORP': [/HERO.*(?:FINCORP|FINCROP|LTD)?/i],
        'POONAWALLA FINCORP': [/POONAWALLA.*(?:FINCORP)?/i],
        'L&T FINANCE': [/L.*(?:&|AND).*T.*(?:FINANCE)?/i],
        'CHOLAMANDALAM': [/CHOL(?:A|E)?MANDALAM/i],
        'PIRAMAL FINANCE': [/PIRAMAL.*(?:FINANCE|HOUSING)?/i],
        'TATA CAPITAL': [/TATA.*(?:CAPITAL)?/i],
        'MUTHOOT FINANCE': [/MUTHOOT.*(?:FINANCE)?/i],
        'NORTHERN ARC CAPITAL': [/NORTHERN.*(?:ARC|AMERICAN|EARLY|SMART\s*COIN).*(?:CAPITAL|LTD)?/i],
        'KISETSU SAISON FINANCE': [/KIS[E]?TSU.*(?:SAISON|CRED|KREDITBEE|MONEY\s*VIEW)?/i],
        'SMFG INDIA CREDIT': [/SMFG.*(?:INDIA|HSBC|CREDIT|COMPANY|MONEYVIEW|NBFC)?/i],
        'ONE CARD': [/ONE\s*CARD.*(?:BOB)?/i],
        'EARLY SALARY (FIBE)': [/(?:EARLY.*SALARY|FIBE).*(?:SERVICES|PVT|FIBE)?/i],
        'MONEY VIEW': [/MONEY.*VIEW/i],
        'PAYU FINANCE': [/PAY.*U.*(?:FINANCE|INDIA|IIFL|KREDITBE|MONEYVIEW)?/i],
        'KRAZYBEE SERVICES': [/KRA[Z]?Y.*BEE.*(?:SERVICES|PRIVATE)?/i],
        'CLIX CAPITAL': [/CLIX.*(?:CAPITAL|CAPTAIL)?/i],
        'VIVRITI CAPITAL': [/VI[V|F](?:RITI|IFI).*(?:CAPITAL|INDIA|POONAWALLA|LIMITED)?/i],
        'INCRED FINANCE': [/INCRED.*(?:FINANCE|FINALCAL|FINANCIALE)?/i],
        'NDX P2P': [/NDX.*(?:P2P|PRIVATE)?/i],
        'SI CREVA CAPITAL': [/SI.*CREVA.*(?:CAPITAL|VIVIFI)?/i],
        'AKARA CAPITAL': [/AKARA.*(?:CAPITAL)?/i],
        'CAPFLOAT': [/CAPFLOAT/i],
        'ZYPE FINANCE': [/ZYPE.*(?:FINANCE)?/i],
        'TRUE CREDITS': [/TRUE.*(?:CREDITS|BALANCE|PRIVATE)?/i],
        'UNI FINANCE': [/UNI(?:CARD|FINZ)?/i],
        'KREDITBEE': [/KREDIT.*BEE.*(?:KHATA)?/i],
        'KISSHT': [/KISSHT/i],
        'MOBIKWIK': [/MOBI(?:KWIK|QUICK)/i],
        'JUPITER (CSB)': [/JUPITER.*(?:CSB)?/i],
        'SMICC': [/SMICC/i],
        'WHIZDM FINANCE': [/WHIZDM.*(?:FINANCE)?/i],
        'BANDHAN BANK': [/BANDHAN.*(?:BANK)?/i],
        'LENDING KARD': [/LENDING.*KARD/i],
        'UPMOVE CAPITAL': [/UPMOVE.*(?:CAPITAL)?/i],
        'STASHFIN': [/STASHFIN/i],
        'NEW TAP': [/NEW.*TAP/i],
        'CASHE': [/CASHE/i],
        'GROWW': [/GROW[W]?/i],
        'RK BANSAL': [/RK.*BANSAL/i],
        'FINC FRIENDS': [/FINC.*FRIENDS.*(?:SAYYAM)?/i],
        'PAYRUPKIR': [/PAYRUPKIR/i],
        'RING': [/^RING$/i],
        'FINNABLE': [/FINNABLE/i],
        'PHOENIX ARC': [/PHOENIX.*(?:ARC|HDFC|PRIVATE)?/i],
        'AXIOM FINANCE': [/AXIOM.*(?:FINANCE|SERVICES)?/i],
        'WORTGAGE FINANCE': [/WORTGAGE.*(?:FINANCE)?/i],
        'INDIFI': [/INDIFI/i],
        'KISTUK': [/KISTUK/i],
        'TRUEBALANCE': [/TRUEBALANCE/i],
        'SNAPMINT FINANCIAL': [/SNAPMINT.*(?:FINANCIAL)?/i],
        'AMICA FINANCE': [/AMICA.*(?:FINANCE)?/i],
        'PREFR (HFC)': [/PREFR.*(?:HFC)?/i]
      };

      // Check each bank mapping against the normalized name
      for (const [standardName, patterns] of Object.entries(bankMappings)) {
        if (patterns.some(pattern => pattern.test(normalized))) {
          return standardName;
        }
      }

      // Special case for handling "Unknown" variations
      if (normalized === '' || normalized === 'UNKNOWN') {
        return 'Unknown';
      }

      // If no match found, return the trimmed original name
      return bankName.trim();
    };

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
        const normalizedBankName = normalizeBankName(bank.bankName || 'Unknown');
        if (!bankMap.has(normalizedBankName)) {
          bankMap.set(normalizedBankName, {
            bankName: normalizedBankName,
            totalLoans: 0,
            totalAmount: 0,
            loanTypes: {}
          });
        }
        const stats = bankMap.get(normalizedBankName)!;
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
            <div className="h-[600px] relative">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">Number of Loans by Bank</h3>
              <div className="absolute inset-0 top-12">
                <div className="h-full overflow-y-auto custom-scrollbar pr-2">
                  <div style={{ height: `${Math.max(600, bankStats.length * 40)}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={bankStats}
                        layout="vertical"
                        margin={{ top: 5, right: 50, left: 120, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          type="number" 
                          stroke="#9CA3AF"
                          tickFormatter={(value) => value.toLocaleString()}
                        />
                        <YAxis 
                          dataKey="bankName" 
                          type="category" 
                          stroke="#9CA3AF"
                          width={110}
                          tick={{ fontSize: 12 }}
                          interval={0}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F3F4F6'
                          }}
                          formatter={(value: number) => [`${value.toLocaleString()} loans`, 'Total Loans']}
                          cursor={{ fill: '#374151', opacity: 0.2 }}
                        />
                        <Bar 
                          dataKey="totalLoans" 
                          fill="#3B82F6" 
                          name="Total Loans"
                          radius={[0, 4, 4, 0]}
                        >
                          <LabelList 
                            dataKey="totalLoans" 
                            position="right" 
                            fill="#9CA3AF"
                            formatter={(value: number) => value.toLocaleString()}
                            style={{ fontSize: '11px' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Amount Bar Chart */}
            <div className="h-[600px] relative">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">Total Loan Amount by Bank</h3>
              <div className="absolute inset-0 top-12">
                <div className="h-full overflow-y-auto custom-scrollbar pr-2">
                  <div style={{ height: `${Math.max(600, bankStats.length * 40)}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={bankStats}
                        layout="vertical"
                        margin={{ top: 5, right: 50, left: 120, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          type="number" 
                          stroke="#9CA3AF"
                          tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`}
                        />
                        <YAxis 
                          dataKey="bankName" 
                          type="category" 
                          stroke="#9CA3AF"
                          width={110}
                          tick={{ fontSize: 12 }}
                          interval={0}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F3F4F6'
                          }}
                          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Total Amount']}
                          cursor={{ fill: '#374151', opacity: 0.2 }}
                        />
                        <Bar 
                          dataKey="totalAmount" 
                          fill="#10B981" 
                          name="Total Amount"
                          radius={[0, 4, 4, 0]}
                        >
                          <LabelList 
                            dataKey="totalAmount" 
                            position="right" 
                            fill="#9CA3AF"
                            formatter={(value: number) => `₹${(value / 1000000).toFixed(1)}M`}
                            style={{ fontSize: '11px' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Add custom scrollbar styles */}
            <style jsx global>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #1F2937;
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #4B5563;
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #6B7280;
              }
            `}</style>

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


