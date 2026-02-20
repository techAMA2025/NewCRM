'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import AssistantSidebar from '@/components/navigation/AssistantSidebar';
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar';

interface Settlement {
  loanAmount: string;
  bankName: string;
  status?: string;
  source?: string;
  settlementAmount?: string;
  clientId?: string;
  bankId?: string;
  [key: string]: any;
}

interface OpsPayment {
  amount: string;
  source: string;
  type: string;
  [key: string]: any;
}

interface Bank {
  name: string;
  [key: string]: any;
}

interface ClientBank {
  id: string;
  bankName: string;
  loanAmount: string;
  [key: string]: any;
}

interface ClientDoc {
  banks: ClientBank[];
  [key: string]: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const normalizeBankName = (bankName: string): string => {
  if (!bankName) return 'Unknown';
  const normalized = bankName.trim().toUpperCase().replace(/\s+/g, ' ');

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
    'MINTIFI': [/MINTIFI/i],
    'KISTUK': [/KISTUK/i],
    'TRUEBALANCE': [/TRUEBALANCE/i],
    'SNAPMINT FINANCIAL': [/SNAPMINT.*(?:FINANCIAL)?/i],
    'AMICA FINANCE': [/AMICA.*(?:FINANCE)?/i],
    'PREFR (HFC)': [/PREFR.*(?:HFC)?/i],
  };

  for (const [standardName, patterns] of Object.entries(bankMappings)) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return standardName;
    }
  }

  if (normalized === '' || normalized === 'UNKNOWN') return 'Unknown';
  return bankName.trim();
};

export default function SettlementAnalysis() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  // State variables for metrics
  const [totalSettledAmount, setTotalSettledAmount] = useState<number>(0);
  const [billcutSettledAmount, setBillcutSettledAmount] = useState<number>(0);
  const [amaSettledAmount, setAmaSettledAmount] = useState<number>(0);
  const [totalRevenueFromSettlement, setTotalRevenueFromSettlement] = useState<number>(0);
  const [banksDistribution, setBanksDistribution] = useState<Array<{ name: string; count: number }>>([]);
  const [bankSettlementPercentage, setBankSettlementPercentage] = useState<Array<{ name: string; percentage: number }>>([]);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    setUserRole(storedRole || '');

    if (
      storedRole !== 'admin' &&
      storedRole !== 'overlord' &&
      storedRole !== 'assistant' &&
      storedRole !== 'advocate'
    ) {
      router.push('/dashboard');
      return;
    }

    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    const fetchAnalyticsData = async () => {
      try {
        // Fetch settlements
        const settlementsSnapshot = await getDocs(collection(db, 'settlements'));
        const settlementsData = settlementsSnapshot.docs.map((doc) => doc.data() as Settlement);

        // Calculate Total Amount Settled & Breakdown
        let totalSettled = 0;
        let billcutSettled = 0;
        let amaSettled = 0;

        settlementsData.forEach((settlement) => {
          if (settlement.status?.trim().toLowerCase() !== 'settled') return;

          const amount = parseFloat(settlement.loanAmount?.replace(/[^0-9.-]+/g, '') || '0');
          if (!isNaN(amount)) {
            const source = settlement.source?.toLowerCase().trim();

            if (source === 'billcut') {
              billcutSettled += amount;
            } else {
              amaSettled += amount;
            }

            totalSettled += amount;
          }
        });
        setTotalSettledAmount(totalSettled);
        setBillcutSettledAmount(billcutSettled);
        setAmaSettledAmount(amaSettled);

        // Fetch ops_payments
        const opsPaymentsSnapshot = await getDocs(collection(db, 'ops_payments'));
        const opsPaymentsData = opsPaymentsSnapshot.docs.map((doc) => doc.data() as OpsPayment);

        // Calculate Total Revenue from Settlement
        let totalRevenue = 0;
        opsPaymentsData.forEach((payment) => {
          if (payment.source === 'billcut' && payment.type === 'Success Fees') {
            const amount = parseFloat(payment.amount?.replace(/[^0-9.-]+/g, '') || '0');
            if (!isNaN(amount)) {
              totalRevenue += amount;
            }
          }
        });
        setTotalRevenueFromSettlement(totalRevenue);

        // Fetch banks
        const banksSnapshot = await getDocs(collection(db, 'banks'));
        const banksData = banksSnapshot.docs.map((doc) => doc.data() as Bank);

        // Map to store total settlement amount per bank
        const bankAmountMap = new Map<string, number>();

        // Initialize map with all banks from the banks collection
        banksData.forEach((bank) => {
          if (bank.name) {
            const normalizedBankName = normalizeBankName(bank.name);
            bankAmountMap.set(normalizedBankName, 0);
          }
        });

        // Iterate through settlements and sum up amounts for matching banks
        settlementsData.forEach((settlement) => {
          if (settlement.status?.trim().toLowerCase() !== 'settled') return;

          const rawBankName = settlement.bankName || 'Unknown';
          const normalizedName = normalizeBankName(rawBankName);
          const amount = parseFloat(settlement.loanAmount?.replace(/[^0-9.-]+/g, '') || '0');

          if (!isNaN(amount)) {
            if (bankAmountMap.has(normalizedName)) {
              bankAmountMap.set(normalizedName, (bankAmountMap.get(normalizedName) || 0) + amount);
            }
          }
        });

        const sortedBanks = Array.from(bankAmountMap.entries())
          .map(([name, count]) => ({ name, count }))
          .filter((item) => item.count > 0)
          .sort((a, b) => b.count - a.count);

        setBanksDistribution(sortedBanks);

        // ---- Bank-wise Average Settlement Percentage ----
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clientsMap = new Map<string, ClientBank[]>();
        clientsSnapshot.docs.forEach((doc) => {
          const data = doc.data() as ClientDoc;
          clientsMap.set(doc.id, data.banks || []);
        });

        const bankPercentages = new Map<string, number[]>();

        settlementsData.forEach((settlement) => {
          if (settlement.status?.trim().toLowerCase() !== 'settled') return;
          if (!settlement.settlementAmount || !settlement.clientId || !settlement.bankId) return;

          const settlementAmt = parseFloat(settlement.settlementAmount?.replace(/[^0-9.-]+/g, '') || '0');
          if (isNaN(settlementAmt) || settlementAmt <= 0) return;

          const clientBanks = clientsMap.get(settlement.clientId);
          if (!clientBanks) return;

          const matchingBank = clientBanks.find((b) => b.id === settlement.bankId);
          if (!matchingBank) return;

          const originalLoanAmt = parseFloat(matchingBank.loanAmount?.replace(/[^0-9.-]+/g, '') || '0');
          if (isNaN(originalLoanAmt) || originalLoanAmt <= 0) return;

          const percentage = (settlementAmt / originalLoanAmt) * 100;
          if (percentage > 200) return;

          const normalizedName = normalizeBankName(settlement.bankName || 'Unknown');

          if (!bankPercentages.has(normalizedName)) {
            bankPercentages.set(normalizedName, []);
          }
          bankPercentages.get(normalizedName)!.push(percentage);
        });

        const avgPercentages = Array.from(bankPercentages.entries())
          .map(([name, percentages]) => ({
            name,
            percentage: Math.round((percentages.reduce((sum, p) => sum + p, 0) / percentages.length) * 10) / 10,
          }))
          .sort((a, b) => a.percentage - b.percentage);

        setBankSettlementPercentage(avgPercentages);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [authChecked]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex">
      {userRole === 'admin' ? (
        <AdminSidebar />
      ) : userRole === 'assistant' ? (
        <AssistantSidebar />
      ) : userRole === 'advocate' ? (
        <AdvocateSidebar />
      ) : (
        <OverlordSidebar />
      )}
      <div className="flex-1 p-5 bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-100 mb-6 border-b border-gray-700 pb-3">
          Settlement Analysis
        </h1>

        {/* Settlement Analytics Section */}
        {userRole === 'overlord' && (
          <div className="bg-gray-800 rounded-lg shadow-2xl p-5 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-5 text-gray-100">Settlement Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
                <h3 className="text-base font-medium text-gray-200 mb-2">Total Amount Settled (Billcut)</h3>
                <p className="text-xl font-bold text-teal-400">₹{billcutSettledAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Source: billcut</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
                <h3 className="text-base font-medium text-gray-200 mb-2">Total Amount Settled (AMA)</h3>
                <p className="text-xl font-bold text-orange-400">₹{amaSettledAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Source: Other</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
                <h3 className="text-base font-medium text-gray-200 mb-2">Total Amount Settled</h3>
                <p className="text-xl font-bold text-green-400">₹{totalSettledAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">All Settlements</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
                <h3 className="text-base font-medium text-gray-200 mb-2">Total Revenue from Settlement</h3>
                <p className="text-xl font-bold text-blue-400">₹{totalRevenueFromSettlement.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Billcut Success Fees</p>
              </div>
            </div>
          </div>
        )}

        {/* Banks Distribution Section */}
        {userRole === 'overlord' && (
          <div className="bg-gray-800 rounded-lg shadow-2xl p-5 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-5 text-gray-100">Banks Distribution</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={banksDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                    label={{
                      value: 'Amount (in Lakhs)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#9CA3AF',
                      style: { textAnchor: 'middle' },
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6',
                    }}
                    cursor={{ fill: '#374151', opacity: 0.2 }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#ffffff' }}
                    formatter={(value) => <span style={{ color: '#ffffff' }}>{value}</span>}
                  />
                  <Bar dataKey="count" name="Settled Amount" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="count"
                      position="top"
                      fill="#ffffff"
                      fontSize={12}
                      formatter={(value: number) => `₹${(value / 100000).toFixed(1)}L`}
                    />
                    {banksDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bank-wise Average Settlement Percentage */}
        <div className="bg-gray-800 rounded-lg shadow-2xl p-5 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-5 text-gray-100">Bank-wise Avg Settlement %</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankSettlementPercentage} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tickFormatter={(value) => `${value}%`}
                  label={{
                    value: 'Avg Settlement %',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9CA3AF',
                    style: { textAnchor: 'middle' },
                  }}
                />
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6',
                  }}
                  cursor={{ fill: '#374151', opacity: 0.2 }}
                />
                <Legend
                  wrapperStyle={{ color: '#ffffff' }}
                  formatter={(value) => <span style={{ color: '#ffffff' }}>{value}</span>}
                />
                <Bar dataKey="percentage" name="Avg Settlement %" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="percentage"
                    position="top"
                    fill="#ffffff"
                    fontSize={11}
                    formatter={(value: number) => `${value}%`}
                  />
                  {bankSettlementPercentage.map((entry, index) => (
                    <Cell key={`cell-pct-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
