'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  addDoc, 
  Timestamp, 
  query, 
  where, 
  orderBy,
  or
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar';
import { ClientDetailsModal } from '@/app/paymentreminder/components/modals/ClientDetailsModal';
import { PaymentRecordModal } from './components/modals/PaymentRecordModal';
import { ClientEditModal } from '@/app/paymentreminder/components/modals/ClientEditModal';
import FilterBar from './components/FilterBar';

type Client = {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  monthlyFees: number;
  totalPaymentAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentsCompleted: number;
  paymentsPending: number;
  weekOfMonth: number;
  advanceBalance: number;
  startDate: Timestamp;
  tenure: number;
  createdAt?: Timestamp;
  allocationType?: 'primary' | 'secondary';
  expectedPaymentDate?: Timestamp;
}

type MonthlyPayment = {
  monthNumber: number;
  dueAmount: number;
  paidAmount: number;
  dueDate: Timestamp;
  status: 'paid' | 'pending' | 'partial';
  reminderSent: boolean;
  reminderDate: Timestamp | null;
}

type PaymentHistory = {
  id: string;
  clientId: string;
  clientName: string;
  monthNumber: number;
  requestedAmount: number;
  dueAmount: number;
  paidAmount: number;
  notes: string;
  requestDate: Timestamp;
  payment_status: string;
  requestedBy: string;
  dueDate: Timestamp;
}

// Update the PaymentRequest type definition
type PaymentRequest = {
  id: string;
  clientId: string;
  clientName: string;
  monthNumber: number;
  requestedAmount: number;
  dueAmount: number;
  paidAmount: number;
  notes: string;
  requestDate: Timestamp;
  payment_status: string;
  requestedBy: string;
  dueDate: Timestamp; // Make dueDate required instead of optional
}

// Define the type for weekly filter
type WeeklyFilter = {
  status: string | null;
  amount: string | null;
};

export default function PaymentReminderPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [weekFilter, setWeekFilter] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    monthNumber: 1,
    paymentMethod: 'cash',
    transactionId: '',
    notes: '',
  });
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [clientPaymentRequests, setClientPaymentRequests] = useState<PaymentRequest[]>([]);

  // New state variables for enhanced filtering
  const [filterPaid, setFilterPaid] = useState<string | null>(null);
  const [amountFilter, setAmountFilter] = useState<string | null>(null);
  const [dueFilter, setDueFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<string | null>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [clientEditOpen, setClientEditOpen] = useState(false);

  // Update the state to use the type
  const [weeklyFilters, setWeeklyFilters] = useState<Record<number, WeeklyFilter>>({
    1: { status: null, amount: null },
    2: { status: null, amount: null },
    3: { status: null, amount: null },
    4: { status: null, amount: null },
  });

  // Update the initial allocFilter state to 'primary' instead of null
  const [allocFilter, setAllocFilter] = useState<string | null>('primary');

  // Move fetchClients outside useEffect and make it memoized with useCallback
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current advocate username from localStorage
      const currentAdvocate = localStorage.getItem('userName');
      if (!currentAdvocate) {
        setClients([]);
        setLoading(false);
        return;
      }
      
      // First, query the clients collection to find allocated clients
      const clientsQuery = query(
        collection(db, 'clients'),
        or(
          where('alloc_adv', '==', currentAdvocate),
          where('alloc_adv_secondary', '==', currentAdvocate)
        )
      );
      
      const clientsSnapshot = await getDocs(clientsQuery);
      const allocatedClients = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        alloc_adv: doc.data().alloc_adv,
        alloc_adv_secondary: doc.data().alloc_adv_secondary
      }));
      
      const allocatedClientIds = allocatedClients.map(client => client.id);
      
      if (allocatedClientIds.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }
      
      // Now fetch the corresponding client payment details
      const clientsList: Client[] = [];
      
      // Need to fetch in batches if there are many allocated clients
      // Firestore "in" queries are limited to 10 values
      const batchSize = 10;
      for (let i = 0; i < allocatedClientIds.length; i += batchSize) {
        const batch = allocatedClientIds.slice(i, i + batchSize);
        const paymentsQuery = query(
          collection(db, 'clients_payments'),
          where('clientId', 'in', batch)
        );
        
        const paymentsSnapshot = await getDocs(paymentsQuery);
        paymentsSnapshot.forEach((doc) => {
          // Find the allocation type for this client
          const clientAllocation = allocatedClients.find(client => client.id === doc.id);
          const allocationType = clientAllocation?.alloc_adv === currentAdvocate ? 'primary' : 'secondary';
          
          clientsList.push({ 
            clientId: doc.id, 
            ...doc.data(),
            allocationType // Add allocation type to client data
          } as Client);
        });
      }
      
      setClients(clientsList);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  // Remove the duplicate implementation inside useEffect
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Function to fetch payment requests
  const fetchPaymentRequests = useCallback(async () => {
    try {
      const currentUser = localStorage.getItem('userName');
      if (!currentUser) return;

      const q = query(
        collection(db, 'monthly_pay_req'),
        where('requestedBy', '==', currentUser)
      );
      
      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PaymentRequest));
      
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    }
  }, []);

  // Add the payment requests fetch to your useEffect
  useEffect(() => {
    fetchClients();
    fetchPaymentRequests();
  }, [fetchClients, fetchPaymentRequests]);

  // Fetch monthly payments for selected client
  const fetchMonthlyPayments = async (clientId: string) => {
    try {
      setMonthlyPayments([]);
      const paymentsList: MonthlyPayment[] = [];
      
      // Get client doc to check tenure
      const clientDoc = await getDoc(doc(db, 'clients_payments', clientId));
      const clientData = clientDoc.data();
      const tenure = clientData?.tenure || 0;
      
      // Fetch each month's payment
      for (let i = 1; i <= tenure; i++) {
        const monthRef = doc(db, `clients_payments/${clientId}/monthly_payments`, `month_${i}`);
        const monthDoc = await getDoc(monthRef);
        
        if (monthDoc.exists()) {
          const monthData = monthDoc.data();
          paymentsList.push({
            monthNumber: monthData.monthNumber,
            dueAmount: monthData.dueAmount || 0,
            paidAmount: monthData.paidAmount || 0,
            dueDate: monthData.dueDate,
            status: monthData.status as 'paid' | 'pending' | 'partial',
            reminderSent: monthData.reminderSent || false,
            reminderDate: monthData.reminderDate || null
          });
        } else {
          // If the month document doesn't exist, create a default entry
          paymentsList.push({
            monthNumber: i,
            dueAmount: clientData?.monthlyFees || 0,
            paidAmount: 0,
            dueDate: Timestamp.fromDate(new Date()), // You might want to calculate this based on start date
            status: 'pending',
            reminderSent: false,
            reminderDate: null
          });
        }
      }
      
      setMonthlyPayments(paymentsList.sort((a, b) => a.monthNumber - b.monthNumber));
    } catch (error) {
      console.error('Error fetching monthly payments:', error);
      toast.error('Failed to load payment details');
    }
  };

  // Update the fetchPaymentHistory function to fetch from the correct subcollection
  const fetchPaymentHistory = async (clientId: string) => {
    try {
      const paymentHistoryRef = collection(db, `clients_payments/${clientId}/payment_history`);
      const historySnapshot = await getDocs(paymentHistoryRef);
      
      const historyData = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentHistory[];
      
      setPaymentHistory(historyData);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history');
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setClientDetailsOpen(true);
    fetchMonthlyPayments(client.clientId);
    fetchPaymentHistory(client.clientId);
    // Filter payment requests for this client
    const filteredRequests = paymentRequests.filter(
      request => request.clientId === client.clientId
    );
    setClientPaymentRequests(filteredRequests);
  };

  const handleRecordPayment = async () => {
    try {
      if (!selectedClient || !paymentFormData.amount) {
        toast.error('Invalid payment data');
        return;
      }

      // Get the current user's name from localStorage
      const requestedBy = localStorage.getItem('userName') || 'Unknown User';

      // Add to payment_history subcollection with "Not approved" status
      await addDoc(collection(db, `clients_payments/${selectedClient.clientId}/payment_history`), {
        clientId: selectedClient.clientId,
        clientName: selectedClient.clientName,
        monthNumber: paymentFormData.monthNumber,
        dueDate: monthlyPayments.find(m => m.monthNumber === paymentFormData.monthNumber)?.dueDate || Timestamp.now(),
        dueAmount: monthlyPayments.find(m => m.monthNumber === paymentFormData.monthNumber)?.dueAmount || 0,
        paidAmount: monthlyPayments.find(m => m.monthNumber === paymentFormData.monthNumber)?.paidAmount || 0,
        requestedAmount: paymentFormData.amount,
        notes: paymentFormData.notes || '',
        requestDate: Timestamp.now(),
        payment_status: "Not approved", // Payment needs approval from overlord
        requestedBy: requestedBy,
        approved_by: "" // Will be filled when approved
      });

      // Reset form and close dialog
      setPaymentDialogOpen(false);
      setPaymentFormData({
        amount: 0,
        monthNumber: 1,
        paymentMethod: 'cash',
        transactionId: '',
        notes: ''
      });
      
      // Refresh payment history to show the new request
      if (selectedClient) {
        fetchPaymentHistory(selectedClient.clientId);
      }
      
      toast.success('Payment request sent successfully');
    } catch (error) {
      console.error('Error sending payment request:', error);
      toast.error('Failed to send payment request');
    }
  };

  // Date range handler
  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Enhanced filtering logic
  const filteredClients = clients.filter(client => {
    // Existing search filter
    const matchesSearch = 
      client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientPhone.includes(searchQuery) ||
      client.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Existing week filter
    const matchesWeek = weekFilter === null || client.weekOfMonth === weekFilter;
    
    // New payment status filter
    const matchesPaymentStatus = !filterPaid || 
      (filterPaid === 'fullypaid' && client.paymentsCompleted === client.tenure) ||
      (filterPaid === 'partiallypaid' && client.paymentsCompleted > 0 && client.paymentsCompleted < client.tenure) ||
      (filterPaid === 'notpaid' && client.paymentsCompleted === 0);
    
    // New amount filter
    const matchesAmount = !amountFilter ||
      (amountFilter === 'high' && client.monthlyFees > 10000) ||
      (amountFilter === 'medium' && client.monthlyFees >= 5000 && client.monthlyFees <= 10000) ||
      (amountFilter === 'low' && client.monthlyFees < 5000);
      
    // New date range filter
    const matchesDateRange = (!startDate && !endDate) || 
      (client.startDate && 
        (!startDate || new Date(client.startDate.seconds * 1000) >= startDate) &&
        (!endDate || new Date(client.startDate.seconds * 1000) <= endDate));
    
    // Due filter implementation
    let matchesDueFilter = true;
    if (dueFilter) {
      const now = new Date();
      const clientStartDate = client.startDate ? new Date(client.startDate.seconds * 1000) : null;
      
      if (clientStartDate) {
        const oneDay = 24 * 60 * 60 * 1000;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
        const startOfNextWeek = new Date(endOfWeek);
        startOfNextWeek.setDate(endOfWeek.getDate() + 1);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        switch (dueFilter) {
          case 'overdue':
            matchesDueFilter = clientStartDate < today;
            break;
          case 'thisweek':
            matchesDueFilter = clientStartDate >= today && clientStartDate <= endOfWeek;
            break;
          case 'nextweek':
            matchesDueFilter = clientStartDate >= startOfNextWeek && clientStartDate <= endOfNextWeek;
            break;
          case 'thismonth':
            matchesDueFilter = clientStartDate >= today && clientStartDate <= endOfMonth;
            break;
          default:
            matchesDueFilter = true;
        }
      } else {
        matchesDueFilter = false;
      }
    }
    
    // Allocation filter
    const matchesAllocation = !allocFilter || 
      (allocFilter === 'primary' && client.allocationType === 'primary') ||
      (allocFilter === 'secondary' && client.allocationType === 'secondary');
    
    return matchesSearch && matchesWeek && matchesPaymentStatus && 
           matchesAmount && matchesDateRange && matchesDueFilter && matchesAllocation;
  });

  // Apply sorting
  const sortedClients = [...filteredClients];
  if (sortBy) {
    sortedClients.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.clientName.localeCompare(b.clientName);
        case 'name-desc':
          return b.clientName.localeCompare(a.clientName);
        case 'amount-asc':
          return (a.monthlyFees || 0) - (b.monthlyFees || 0);
        case 'amount-desc':
          return (b.monthlyFees || 0) - (a.monthlyFees || 0);
        case 'due-asc':
          return (a.startDate?.seconds || 0) - (b.startDate?.seconds || 0);
        case 'due-desc':
          return (b.startDate?.seconds || 0) - (a.startDate?.seconds || 0);
        case 'date-asc':
          return ((a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        case 'date-desc':
          return ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        default:
          return 0;
      }
    });
  }

  // Function to update filters for a specific week
  const updateWeekFilter = (week: number, filterType: string, value: string | null) => {
    setWeeklyFilters((prev: any)=> ({
      ...prev,
      [week]: {
        ...prev[week],
        [filterType]: value === 'all' ? null : value
      }
    }));
  };

  // Update clientsByWeek to use week-specific filters
  const clientsByWeek = sortedClients.reduce((acc, client) => {
    const week = client.weekOfMonth;
    if (!acc[week]) {
      acc[week] = [];
    }
    
    // Apply week-specific filters
    const weekFilter = weeklyFilters[week] as WeeklyFilter;
    let includeClient = true;
    
    // Filter by payment status
    if (weekFilter && weekFilter.status) {
      if (weekFilter.status === 'completed' && client.paymentsCompleted !== client.tenure) {
        includeClient = false;
      } else if (weekFilter.status === 'partial' && 
                (client.paymentsCompleted === 0 || client.paymentsCompleted === client.tenure)) {
        includeClient = false;
      } else if (weekFilter.status === 'pending' && client.paymentsCompleted > 0) {
        includeClient = false;
      }
    }
    
    // Filter by amount
    if (weekFilter && weekFilter.amount && includeClient) {
      if (weekFilter.amount === 'high' && client.monthlyFees <= 10000) {
        includeClient = false;
      } else if (weekFilter.amount === 'medium' && 
                (client.monthlyFees < 5000 || client.monthlyFees > 10000)) {
        includeClient = false;
      } else if (weekFilter.amount === 'low' && client.monthlyFees >= 5000) {
        includeClient = false;
      }
    }
    
    if (includeClient) {
      acc[week].push(client);
    }
    
    return acc;
  }, {} as Record<number, Client[]>);

  // Format date
  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Not set';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  // Add this to refresh client data after an update
  const handleClientUpdate = useCallback(() => {
    fetchClients();
    if (selectedClient) {
      // Refresh the selected client data
      const clientRef = doc(db, 'clients_payments', selectedClient.clientId);
      getDoc(clientRef).then((docSnap) => {
        if (docSnap.exists()) {
          setSelectedClient({ clientId: docSnap.id, ...docSnap.data() } as Client);
        }
      });
    }
  }, [fetchClients, selectedClient]);

  // Add a new function to handle expected payment date changes
  const handleExpectedPaymentDateChange = async (clientId: string, date: Date) => {
    try {
      const clientRef = doc(db, 'clients_payments', clientId);
      await updateDoc(clientRef, {
        expectedPaymentDate: Timestamp.fromDate(date)
      });
      
      // Update the local state to reflect the change
      setClients(prevClients => 
        prevClients.map(client => 
          client.clientId === clientId 
            ? { ...client, expectedPaymentDate: Timestamp.fromDate(date) } 
            : client
        )
      );
      
      toast.success('Expected payment date updated successfully');
    } catch (error) {
      console.error('Error updating expected payment date:', error);
      toast.error('Failed to update expected payment date');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-950">
      <AdvocateSidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-8 px-4 md:px-6">
          <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Payment Reminder System</h1>
          
          <FilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            weekFilter={weekFilter}
            setWeekFilter={setWeekFilter}
            filterPaid={filterPaid}
            setFilterPaid={setFilterPaid}
            amountFilter={amountFilter}
            setAmountFilter={setAmountFilter}
            dueFilter={dueFilter}
            setDueFilter={setDueFilter}
            startDate={startDate}
            endDate={endDate}
            setDateRange={handleDateRangeChange}
            sortBy={sortBy}
            setSortBy={setSortBy}
            setCurrentPage={setCurrentPage}
            allocFilter={allocFilter}
            setAllocFilter={setAllocFilter}
          />
          
          {loading ? (
            <div className="flex justify-center items-center h-64 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <span className="ml-2 font-medium text-gray-300">Loading clients...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 mt-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-6 rounded-lg bg-gray-800/80 p-1 backdrop-blur-sm">
                  <TabsTrigger value="overview" className="text-sm font-medium">Overview</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-sm font-medium">Weekly View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <Card className="border-0 bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-b border-gray-700">
                      <CardTitle className="text-blue-300">All Clients ({sortedClients.length})</CardTitle>
                      <CardDescription className="text-gray-400">
                        Overview of all client payment statuses
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {sortedClients.length === 0 ? (
                        <div className="text-center py-12">
                          <AlertCircle className="mx-auto h-12 w-12 text-gray-500" />
                          <h3 className="mt-4 text-lg font-medium text-gray-300">No clients found</h3>
                          <p className="mt-2 text-sm text-gray-400">
                            Try adjusting your search or filter criteria
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-800/50">
                                <th className="text-left p-4 font-medium text-gray-300 border-b border-gray-700">Date</th>
                                <th className="text-left p-4 font-medium text-gray-300 border-b border-gray-700">Client Name</th>
                                <th className="text-left p-4 font-medium text-gray-300 border-b border-gray-700">Phone</th>
                                <th className="text-left p-4 font-medium text-gray-300 border-b border-gray-700">Allocation</th>
                                <th className="text-left p-4 font-medium text-gray-300 border-b border-gray-700">Week</th>
                                <th className="text-right p-4 font-medium text-gray-300 border-b border-gray-700">Monthly Fee</th>
                                <th className="text-right p-4 font-medium text-gray-300 border-b border-gray-700">Paid / Total</th>
                                <th className="text-right p-4 font-medium text-gray-300 border-b border-gray-700">Status</th>
                                <th className="text-left p-4 font-medium text-gray-300 border-b border-gray-700">Expected Payment Date</th>
                                <th className="text-center p-4 font-medium text-gray-300 border-b border-gray-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedClients.map((client) => (
                                <tr key={client.clientId} className="transition-colors hover:bg-blue-900/10">
                                  <td className="p-4 border-b border-gray-800 text-gray-400">
                                    {client.createdAt ? formatDate(client.createdAt) : 'Not available'}
                                  </td>
                                  <td className="p-4 border-b border-gray-800 text-gray-200">{client.clientName.toUpperCase()}</td>
                                  <td className="p-4 border-b border-gray-800 text-gray-400">{client.clientPhone}</td>
                                  <td className="p-4 border-b border-gray-800">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block
                                      ${client.allocationType === 'primary' 
                                        ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-700/50' 
                                        : 'bg-pink-900/30 text-pink-300 border border-pink-700/50'}`}>
                                      {client.allocationType === 'primary' ? 'Primary' : 'Secondary'}
                                    </span>
                                  </td>
                                  <td className="p-4 border-b border-gray-800 text-gray-400">Week {client.weekOfMonth}</td>
                                  <td className="p-4 border-b border-gray-800 text-right font-medium text-gray-200">₹{(client.monthlyFees || 0).toLocaleString()}</td>
                                  <td className="p-4 border-b border-gray-800 text-right text-gray-400">
                                    ₹{(client.paidAmount || 0).toLocaleString()} / ₹{(client.totalPaymentAmount || 0).toLocaleString()}
                                  </td>
                                  <td className="p-4 border-b border-gray-800 text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium 
                                      ${client.paymentsCompleted === client.tenure ? 'bg-green-900/40 text-green-300' : 
                                        client.paymentsCompleted > 0 ? 'bg-yellow-900/40 text-yellow-300' : 
                                        'bg-red-900/40 text-red-300'}`}>
                                      {client.paymentsCompleted === client.tenure ? 'Completed' : 
                                       client.paymentsCompleted > 0 ? 'Partial' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="p-4 border-b border-gray-800 text-center">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="bg-gray-800 hover:bg-purple-900/20 text-purple-400 border-purple-900"
                                        >
                                          {client.expectedPaymentDate 
                                            ? formatDate(client.expectedPaymentDate)
                                            : "Set Date"}
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-gray-900 border-gray-700">
                                        <DialogHeader>
                                          <DialogTitle className="text-gray-200">Set Expected Payment Date</DialogTitle>
                                          <DialogDescription className="text-gray-400">
                                            Choose the expected date of payment for {client.clientName}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                          <Input
                                            type="date"
                                            className="bg-gray-800 border-gray-700 text-gray-200"
                                            defaultValue={client.expectedPaymentDate 
                                              ? new Date(client.expectedPaymentDate.seconds * 1000).toISOString().split('T')[0]
                                              : new Date().toISOString().split('T')[0]
                                            }
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                handleExpectedPaymentDateChange(client.clientId, new Date(e.target.value));
                                              }
                                            }}
                                          />
                                        </div>
                                        <DialogFooter>
                                          <Button 
                                            type="button" 
                                            variant="outline"
                                            onClick={() => document.querySelector('[data-state="open"]')?.dispatchEvent(
                                              new KeyboardEvent('keydown', { key: 'Escape' })
                                            )}
                                          >
                                            Close
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </td>
                                  <td className="p-4 border-b border-gray-800 text-center">
                                    <div className="flex gap-2 justify-center">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleClientSelect(client)}
                                        className="bg-gray-800 hover:bg-blue-900/20 text-blue-400 border-blue-900"
                                      >
                                        View Details
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          setSelectedClient(client);
                                          setClientEditOpen(true);
                                        }}
                                        className="bg-gray-800 hover:bg-green-900/20 text-green-400 border-green-900"
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="weekly">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(week => (
                      <Card key={week} className="border-0 shadow-lg rounded-xl overflow-hidden bg-gray-800/80 backdrop-blur-sm">
                        <CardHeader className={`bg-gradient-to-r border-b border-gray-700
                          ${week === 1 ? 'from-blue-900/20 to-indigo-900/20' : 
                           week === 2 ? 'from-purple-900/20 to-pink-900/20' : 
                           week === 3 ? 'from-green-900/20 to-teal-900/20' : 
                           'from-orange-900/20 to-amber-900/20'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className={`
                                ${week === 1 ? 'text-blue-300' : 
                                 week === 2 ? 'text-purple-300' : 
                                 week === 3 ? 'text-green-300' : 
                                 'text-orange-300'}`}
                              >
                                Week {week} Clients ({clientsByWeek[week]?.length || 0})
                              </CardTitle>
                              <CardDescription className="text-gray-400">
                                Clients with payments due in week {week}
                              </CardDescription>
                            </div>
                            </div>

                            
                            <div className="flex gap-2">
                              <Select
                                value={weeklyFilters[week].status || undefined}
                                onValueChange={(value) => updateWeekFilter(week, 'status', value || null)}
                              >
                                <SelectTrigger className={`w-[130px] h-8 text-xs
                                  ${week === 1 ? 'border-blue-800 bg-blue-950/30' : 
                                   week === 2 ? 'border-purple-800 bg-purple-950/30' : 
                                   week === 3 ? 'border-green-800 bg-green-950/30' : 
                                   'border-orange-800 bg-orange-950/30'}`}
                              >
                                <SelectValue placeholder="Payment Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="partial">Partial</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={weeklyFilters[week].amount || undefined}
                              onValueChange={(value) => updateWeekFilter(week, 'amount', value || null)}
                            >
                              <SelectTrigger className={`w-[130px] h-8 text-xs
                                ${week === 1 ? 'border-blue-800 bg-blue-950/30' : 
                                 week === 2 ? 'border-purple-800 bg-purple-950/30' : 
                                 week === 3 ? 'border-green-800 bg-green-950/30' : 
                                 'border-orange-800 bg-orange-950/30'}`}
                              >
                                <SelectValue placeholder="Fee Amount" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Amounts</SelectItem>
                                <SelectItem value="high">High ({'>'}₹10,000)</SelectItem>
                                <SelectItem value="medium">Medium (₹5,000-₹10,000)</SelectItem>
                                <SelectItem value="low">Low ({'<'}₹5,000)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-4">
                          {!clientsByWeek[week] || clientsByWeek[week].length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3
                                ${week === 1 ? 'bg-blue-900/30' : 
                                 week === 2 ? 'bg-purple-900/30' : 
                                 week === 3 ? 'bg-green-900/30' : 
                                 'bg-orange-900/30'}`}
                              >
                                <AlertCircle className={`h-6 w-6 
                                  ${week === 1 ? 'text-blue-300' : 
                                   week === 2 ? 'text-purple-300' : 
                                   week === 3 ? 'text-green-300' : 
                                   'text-orange-300'}`} 
                                />
                              </div>
                              <p className="text-gray-400">No clients found for week {week}</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {clientsByWeek[week].map(client => (
                                <div 
                                  key={client.clientId} 
                                  className={`p-4 rounded-lg border transition-all cursor-pointer
                                    ${week === 1 ? 'hover:bg-blue-900/10 border-blue-900/30' : 
                                     week === 2 ? 'hover:bg-purple-900/10 border-purple-900/30' : 
                                     week === 3 ? 'hover:bg-green-900/10 border-green-900/30' : 
                                     'hover:bg-orange-900/10 border-orange-900/30'}`}
                                  onClick={() => handleClientSelect(client)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-gray-200">{client.clientName}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                          ${client.allocationType === 'primary' 
                                            ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-700/50' 
                                            : 'bg-pink-900/30 text-pink-300 border border-pink-700/50'}`}>
                                          {client.allocationType === 'primary' ? 'Primary' : 'Secondary'}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-400 mt-1">{client.clientPhone}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className={`font-medium 
                                        ${week === 1 ? 'text-blue-400' : 
                                         week === 2 ? 'text-purple-400' : 
                                         week === 3 ? 'text-green-400' : 
                                         'text-orange-400'}`}
                                      >
                                        ₹{(client.monthlyFees || 0).toLocaleString()}/month
                                      </p>
                                      <p className="text-sm text-gray-400 mt-1">
                                        {client.paymentsCompleted}/{client.tenure} payments
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      <ClientDetailsModal
        open={clientDetailsOpen}
        onOpenChange={setClientDetailsOpen}
        client={selectedClient}
        monthlyPayments={monthlyPayments}
        paymentHistory={paymentHistory as any}
        paymentRequests={clientPaymentRequests}
        onRecordPayment={(monthNumber, amount) => {
          setPaymentFormData({
            ...paymentFormData,
            monthNumber,
            amount
          });
          setPaymentDialogOpen(true);
        }}
        formatDate={formatDate}
        paymentDialogOpen={paymentDialogOpen}
        setPaymentDialogOpen={setPaymentDialogOpen}
        paymentFormData={paymentFormData}
        setPaymentFormData={setPaymentFormData}
        handleRecordPayment={handleRecordPayment}
      />

      <PaymentRecordModal 
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        clientName={selectedClient?.clientName}
        formData={paymentFormData}
        setFormData={setPaymentFormData}
        onSubmit={handleRecordPayment}
      />
      
      <ClientEditModal
        open={clientEditOpen}
        onOpenChange={setClientEditOpen}
        client={selectedClient}
        onClientUpdate={handleClientUpdate}
      />
    </div>
  );
}
