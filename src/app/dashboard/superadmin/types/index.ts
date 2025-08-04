// Define type for status and source keys
export type StatusKey = 'Interested' | 'Not Interested' | 'Not Answering' | 'Callback' 
| 'Converted' | 'Loan Required' | 'Cibil Issue' | 'Closed Lead' | 'Language Barrier' | 'Future Potential' | 'No Status';

export type SourceKey = 'settleloans' | 'credsettlee' | 'ama' | 'billcut';

// Define the dataset type for the chart
export type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor: string;
};

// Leads data structure
export type LeadsBySourceData = {
  labels: string[];
  datasets: ChartDataset[];
};

export type SourceTotals = {
  settleloans: number;
  credsettlee: number;
  ama: number;
  billcut: number;
};

// Sales analytics types
export type SalesAnalytics = {
  totalTargetAmount: number;
  totalCollectedAmount: number;
  monthlyRevenue: number[];
  conversionRate: number;
  avgDealSize: number;
};

export type Salesperson = {
  id: string;
  name: string;
};

export type IndividualSalesData = {
  name: string;
  targetAmount: number;
  collectedAmount: number;
  conversionRate: number;
  monthlyData: number[];
} | null;

// Client analytics types
export type ClientAnalytics = {
  totalClients: number;
  statusDistribution: { Active: number; Pending: number; Inactive: number; Converted: number };
  topAdvocates: { name: string; clientCount: number }[];
  loanTypeDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  cityDistribution: Record<string, number>;
  totalLoanAmount: number;
  avgLoanAmount: number;
};

// Payment analytics types
export type PaymentAnalytics = {
  totalPaymentsAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  completionRate: number;
  clientCount: number;
  paymentMethodDistribution: Record<string, number>;
  monthlyPaymentsData: number[];
  paymentTypeDistribution: {
    full: number;
    partial: number;
  };
};

export type CurrentMonthPayments = {
  collected: number;
  pending: number;
};

// Filter state types
export type DateFilter = {
  startDate: string;
  endDate: string;
  isFilterApplied: boolean;
};

// Analytics stats derived type
export type AnalyticsStats = {
  totalCollectedAmount: number;
  totalTargetAmount: number;
  conversionRate: number;
  avgDealSize: number;
  revenueAchievementPercentage: number;
}; 