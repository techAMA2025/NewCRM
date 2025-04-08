'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy, updateDoc, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { Phone, Mail, Calendar, AlertCircle, Plus, CreditCard, FileText, Filter, X, IndianRupee, Search, ArrowUpDown, Grid3X3, List, ChevronLeft, ChevronRight } from 'lucide-react';
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import FilterToolbar from './components/FilterToolbar';
import ClientCard from './components/ClientCard';
import PaginationControls from './components/PaginationControls';
import AddPaymentDialog from './components/AddPaymentDialog';
import { 
  ClientPayment, 
  MonthlyPayment, 
  PaymentHistory, 
  ToastMessage,
  NewPaymentFormData
} from './types';

// Helper function for Indian currency format
const formatIndianCurrency = (amount: number): string => {
  // Convert to Indian format (XX,XX,XXX)
  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
  
  return `₹${formatter.format(amount)}`;
};

// Helper function to format large amounts in Indian style (lakhs/crores)
const formatIndianMetric = (amount: number): string => {
  if (amount >= 10000000) { // 1 crore
    return `${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) { // 1 lakh
    return `${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) { // 1 thousand
    return `${(amount / 1000).toFixed(2)} K`;
  }
  return amount.toString();
};

export default function PaymentReminderPage() {
  // Add toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [monthlyPaymentsData, setMonthlyPaymentsData] = useState<{[clientId: string]: MonthlyPayment[]}>({});
  const [paymentHistory, setPaymentHistory] = useState<{[clientId: string]: PaymentHistory[]}>({});
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Payment dialog state
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<ClientPayment | null>(null);
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState<MonthlyPayment | null>(null);
  const [newPayment, setNewPayment] = useState<NewPaymentFormData>({
    amount: 0,
    paymentMethod: 'cash',
    transactionId: '',
    notes: '',
    type: 'full',
    monthNumber: 0,
    date: new Date()
  });

  // New state for client management
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [clientsPerPage, setClientsPerPage] = useState<number>(10);
  const [sortField, setSortField] = useState<string>('clientName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterPaid, setFilterPaid] = useState<string | null>(null);

  // Custom toast function
  const showToast = (title: string, description: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, description, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };
  
  // Remove toast function
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch client payments data
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsSnapshot = await getDocs(collection(db, 'clients_payments'));
        const clientsData: ClientPayment[] = [];
        
        for (const doc of clientsSnapshot.docs) {
          const data = doc.data();
          
          clientsData.push({
            id: doc.id,
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            clientPhone: data.clientPhone,
            startDate: data.startDate.toDate(),
            tenure: data.tenure,
            monthlyFees: data.monthlyFees,
            paidAmount: data.paidAmount || 0,
            pendingAmount: data.pendingAmount || 0,
            paymentsCompleted: data.paymentsCompleted || 0,
            paymentsPending: data.paymentsPending || 0,
            advanceBalance: data.advanceBalance || 0,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            weekOfMonth: data.weekOfMonth || 0
          });
        }
        
        setClientPayments(clientsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setLoading(false);
      }
    };
    
    fetchClients();
  }, []);

  const fetchMonthlyPayments = async (clientId: string) => {
    try {
      const paymentsQuery = query(
        collection(db, `clients_payments/${clientId}/monthly_payments`),
        orderBy('monthNumber')
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData: MonthlyPayment[] = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          dueAmount: data.dueAmount,
          dueDate: data.dueDate.toDate(),
          monthNumber: data.monthNumber,
          paidAmount: data.paidAmount || 0,
          status: data.status,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          updatedAt: data.updatedAt.toDate()
        };
      });
      
      setMonthlyPaymentsData(prev => ({
        ...prev,
        [clientId]: paymentsData
      }));
      
    } catch (error) {
      console.error('Error fetching monthly payments:', error);
    }
  };

  const fetchPaymentHistory = async (clientId: string) => {
    try {
      const historyQuery = query(
        collection(db, `clients_payments/${clientId}/payment_history`),
        orderBy('date', 'desc')
      );
      
      const historySnapshot = await getDocs(historyQuery);
      if (historySnapshot.empty) {
        // Initialize with an empty array if there's no data
        setPaymentHistory(prev => ({
          ...prev,
          [clientId]: []
        }));
        return;
      }
      
      const historyData: PaymentHistory[] = historySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          amount: data.amount,
          date: data.date.toDate(),
          paymentMethod: data.paymentMethod || '',
          transactionId: data.transactionId || '',
          notes: data.notes || '',
          type: data.type,
          monthNumber: data.monthNumber,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });
      
      setPaymentHistory(prev => ({
        ...prev,
        [clientId]: historyData
      }));
    } catch (error) {
      console.error('Error fetching payment history:', error);
      // Initialize with an empty array on error
      setPaymentHistory(prev => ({
        ...prev,
        [clientId]: []
      }));
    }
  };

  const handleAddPayment = (client: ClientPayment, month?: MonthlyPayment) => {
    setSelectedClient(client);
    
    if (month) {
      setSelectedPaymentMonth(month);
      setNewPayment(prev => ({
        ...prev,
        amount: month.dueAmount - (month.paidAmount || 0),
        type: 'full',
        monthNumber: month.monthNumber
      }));
    } else {
      setSelectedPaymentMonth(null);
      setNewPayment(prev => ({
        ...prev,
        amount: 0,
        type: 'advance',
        monthNumber: 0
      }));
    }
    
    setShowAddPaymentDialog(true);
  };

  const savePayment = async () => {
    if (!selectedClient) return;

    try {
      setLoading(true);
      
      // Reference to client document
      const clientDocRef = doc(db, "clients_payments", selectedClient.id);
      let updatedClient = { ...selectedClient };
      
      // Create payment transaction record
      const paymentData: any = {
        amount: newPayment.amount,
        date: Timestamp.fromDate(newPayment.date),
        paymentMethod: newPayment.paymentMethod,
        transactionId: newPayment.transactionId,
        notes: newPayment.notes,
        type: newPayment.type,
        createdAt: serverTimestamp()
      };
      
      // If this is a monthly payment (not advance)
      if (selectedPaymentMonth) {
        paymentData.monthNumber = selectedPaymentMonth.monthNumber;
        
        // Reference to month document
        const monthRef = doc(db, `clients_payments/${selectedClient.id}/monthly_payments`, selectedPaymentMonth.id!);
        
        // Determine new status and paid amount based on payment type
        let status = selectedPaymentMonth.status;
        let paidAmount = selectedPaymentMonth.paidAmount || 0;
        let remainingDueAmount = selectedPaymentMonth.dueAmount;
        let isPaid = false;
        
        if (newPayment.type === 'full') {
          status = 'paid';
          paidAmount = selectedPaymentMonth.dueAmount;
          remainingDueAmount = 0;
          isPaid = true;
        } else if (newPayment.type === 'partial') {
          paidAmount += newPayment.amount;
          remainingDueAmount = selectedPaymentMonth.dueAmount - paidAmount;
          
          // If the paid amount equals or exceeds the due amount, mark as paid
          if (paidAmount >= selectedPaymentMonth.dueAmount) {
            status = 'paid';
            isPaid = true;
          } else {
            status = 'partial';
          }
        }
        
        // Update the monthly payment document
        await updateDoc(monthRef, {
          status: status,
          paidAmount: paidAmount,
          dueAmount: remainingDueAmount,
          paymentMethod: newPayment.paymentMethod,
          transactionId: newPayment.transactionId,
          updatedAt: serverTimestamp()
        });
        
        // Update client totals
        const paidDifference = newPayment.amount;
            
        const newPaidAmount = selectedClient.paidAmount + paidDifference;
        const newPendingAmount = selectedClient.pendingAmount - paidDifference;
        const newPaymentsCompleted = isPaid 
          ? selectedClient.paymentsCompleted + 1 
          : selectedClient.paymentsCompleted;
        const newPaymentsPending = isPaid 
          ? selectedClient.paymentsPending - 1 
          : selectedClient.paymentsPending;
        
        await updateDoc(clientDocRef, {
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount,
          paymentsCompleted: newPaymentsCompleted,
          paymentsPending: newPaymentsPending,
          updatedAt: serverTimestamp()
        });
        
        updatedClient = {
          ...updatedClient,
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount,
          paymentsCompleted: newPaymentsCompleted,
          paymentsPending: newPaymentsPending
        };
        
        // Update local state for the monthly payment
        setMonthlyPaymentsData(prev => {
          const updatedPayments = [...prev[selectedClient.id]];
          const index = updatedPayments.findIndex(p => p.id === selectedPaymentMonth.id);
          
          if (index !== -1) {
            updatedPayments[index] = {
              ...updatedPayments[index],
              status: status,
              paidAmount: paidAmount,
              dueAmount: remainingDueAmount,
              paymentMethod: newPayment.paymentMethod,
              transactionId: newPayment.transactionId,
              updatedAt: new Date()
            };
          }
          
          return {
            ...prev,
            [selectedClient.id]: updatedPayments
          };
        });
      } else {
        // This is an advance payment
        const newAdvanceBalance = (selectedClient.advanceBalance || 0) + newPayment.amount;
        
        await updateDoc(clientDocRef, {
          advanceBalance: newAdvanceBalance,
          updatedAt: serverTimestamp()
        });
        
        updatedClient = {
          ...updatedClient,
          advanceBalance: newAdvanceBalance
        };
      }
      
      // Create payment history record
      await addDoc(
        collection(db, `clients_payments/${selectedClient.id}/payment_history`),
        paymentData
      );
      
      // Update client in local state
      setClientPayments(prev => {
        const clientIndex = prev.findIndex(c => c.id === selectedClient.id);
        if (clientIndex !== -1) {
          const newClients = [...prev];
          newClients[clientIndex] = updatedClient;
          return newClients;
        }
        return prev;
      });
      
      // Refresh payment history
      await fetchPaymentHistory(selectedClient.id);
      
      setShowAddPaymentDialog(false);
      showToast(
        "Payment Recorded",
        `Successfully recorded payment of ₹${newPayment.amount}`
      );
      
      // Reset payment form
      setNewPayment({
        amount: 0,
        paymentMethod: 'cash',
        transactionId: '',
        notes: '',
        type: 'full',
        monthNumber: 0,
        date: new Date()
      });
      
    } catch (error) {
      console.error("Error saving payment:", error);
      showToast(
        "Error",
        "Failed to record payment. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium">Partial</Badge>;
      case 'pending':
        return <Badge className="bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-gradient-to-r from-red-600 to-red-500 text-white font-medium">Overdue</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-gray-600 to-gray-500 text-white font-medium">{status}</Badge>;
    }
  };

  const handleExpandClient = async (clientId: string) => {
    try {
      // Toggle expanded state
      if (expandedClient === clientId) {
        setExpandedClient(null);
      } else {
        setExpandedClient(clientId);
        
        // Set loading for this specific operation
        setLoading(true);
        
        // Fetch monthly payments if not already loaded
        if (!monthlyPaymentsData[clientId]) {
          await fetchMonthlyPayments(clientId);
        }
        
        // Always fetch fresh payment history when expanding
        await fetchPaymentHistory(clientId);
      }
    } catch (error) {
      console.error("Error expanding client details:", error);
      showToast(
        "Error",
        "Failed to load client details. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Add this useEffect to load payment history for the initially expanded client
  useEffect(() => {
    if (expandedClient && !paymentHistory[expandedClient]) {
      fetchPaymentHistory(expandedClient);
    }
  }, [expandedClient]);

  const getFilteredPayments = (payments: MonthlyPayment[]) => {
    if (!statusFilter) return payments;
    
    return payments.filter(payment => 
      payment.status.toLowerCase() === statusFilter.toLowerCase()
    );
  };

  const getPaymentStatusSummary = (client: ClientPayment) => {
    if (!monthlyPaymentsData[client.id]) return null;
    
    const payments = monthlyPaymentsData[client.id];
    const paid = payments.filter(p => p.status.toLowerCase() === 'paid').length;
    const partial = payments.filter(p => p.status.toLowerCase() === 'partial').length;
    const pending = payments.filter(p => p.status.toLowerCase() === 'pending').length;
    const overdue = payments.filter(p => p.status.toLowerCase() === 'overdue').length;
    
    return (
      <div className="flex gap-2 flex-wrap">
        {paid > 0 && <Badge className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white font-medium">{paid} Paid</Badge>}
        {partial > 0 && <Badge className="bg-gradient-to-r from-blue-700 to-blue-600 text-white font-medium">{partial} Partial</Badge>}
        {pending > 0 && <Badge className="bg-gradient-to-r from-amber-700 to-amber-600 text-white font-medium">{pending} Pending</Badge>}
        {overdue > 0 && <Badge className="bg-gradient-to-r from-red-700 to-red-600 text-white font-medium">{overdue} Overdue</Badge>}
      </div>
    );
  };

  // Function to filter, sort and paginate clients
  const getFilteredClients = () => {
    // First filter by search query
    let filteredClients = clientPayments.filter(client => {
      const matchesSearch = searchQuery === '' ||
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clientPhone.includes(searchQuery);
      
      // Filter by status if selected
      const matchesStatus = !statusFilter || 
        (statusFilter === 'overdue' && hasOverduePayments(client.id)) ||
        (statusFilter === 'partial' && hasPartialPayments(client.id)) ||
        (statusFilter === 'pending' && client.paymentsPending > 0) ||
        (statusFilter === 'completed' && client.paymentsPending === 0);
      
      // Filter by payment progress if selected
      const matchesPaid = !filterPaid ||
        (filterPaid === 'fullypaid' && client.pendingAmount === 0) ||
        (filterPaid === 'partiallypaid' && client.paidAmount > 0 && client.pendingAmount > 0) ||
        (filterPaid === 'notpaid' && client.paidAmount === 0);
      
      return matchesSearch && matchesStatus && matchesPaid;
    });
    
    // Then sort
    filteredClients.sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      switch (sortField) {
        case 'clientName':
          valueA = a.clientName.toLowerCase();
          valueB = b.clientName.toLowerCase();
          break;
        case 'pendingAmount':
          valueA = a.pendingAmount;
          valueB = b.pendingAmount;
          break;
        case 'paidAmount':
          valueA = a.paidAmount;
          valueB = b.paidAmount;
          break;
        case 'progress':
          valueA = a.paymentsCompleted / a.tenure;
          valueB = b.paymentsCompleted / b.tenure;
          break;
        case 'startDate':
          valueA = a.startDate.getTime();
          valueB = b.startDate.getTime();
          break;
        default:
          valueA = a.clientName.toLowerCase();
          valueB = b.clientName.toLowerCase();
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredClients;
  };
  
  // Calculate pagination
  const filteredClients = getFilteredClients();
  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * clientsPerPage,
    currentPage * clientsPerPage
  );
  
  // Check if client has overdue payments
  const hasOverduePayments = (clientId: string) => {
    if (!monthlyPaymentsData[clientId]) return false;
    return monthlyPaymentsData[clientId].some(payment => 
      payment.status.toLowerCase() === 'overdue'
    );
  };
  
  // Check if client has partial payments
  const hasPartialPayments = (clientId: string) => {
    if (!monthlyPaymentsData[clientId]) return false;
    return monthlyPaymentsData[clientId].some(payment => 
      payment.status.toLowerCase() === 'partial'
    );
  };
  
  // Helper function to handle sort changes
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  // Add calculated fields for current due amounts
  const getCurrentDateMetrics = (client: ClientPayment, payments: MonthlyPayment[]) => {
    const today = new Date();
    let dueUntilToday = 0;
    let paidUntilToday = 0;
    let pendingUntilToday = 0;
    
    // If we have the monthly payment data
    if (payments && payments.length > 0) {
      // Calculate amounts based on payment schedule
      payments.forEach(payment => {
        // Only consider payments that are due on or before today
        if (isBefore(payment.dueDate, today) || isSameDay(payment.dueDate, today)) {
          dueUntilToday += payment.dueAmount;
          
          if (payment.status.toLowerCase() === 'paid') {
            paidUntilToday += payment.dueAmount;
          } else if (payment.status.toLowerCase() === 'partial' && payment.paidAmount) {
            paidUntilToday += payment.paidAmount;
            pendingUntilToday += (payment.dueAmount - payment.paidAmount);
          } else {
            pendingUntilToday += payment.dueAmount;
          }
        }
      });
    } else {
      // Fallback calculation if we don't have detailed payment data
      // Calculate how many months have passed since start date
      const startDate = client.startDate;
      let monthsPassed = differenceInMonths(today, startDate);
      monthsPassed = Math.min(monthsPassed + 1, client.tenure); // Include current month
      monthsPassed = Math.max(0, monthsPassed); // Ensure non-negative
      
      dueUntilToday = client.monthlyFees * monthsPassed;
      paidUntilToday = Math.min(client.paidAmount, dueUntilToday);
      pendingUntilToday = dueUntilToday - paidUntilToday;
    }
    
    return {
      dueUntilToday,
      paidUntilToday,
      pendingUntilToday,
      percentPaidOfDue: dueUntilToday > 0 ? (paidUntilToday / dueUntilToday) * 100 : 0
    };
  };
  
  // Function to check if dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };
  
  // Add differenceInMonths function
  const differenceInMonths = (date1: Date, date2: Date) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    let months = (d1.getFullYear() - d2.getFullYear()) * 12;
    months -= d2.getMonth();
    months += d1.getMonth();
    return months <= 0 ? 0 : months;
  };
  
  // Function to get payment status badge based on current metrics
  const getCurrentPaymentStatusBadge = (client: ClientPayment) => {
    // Get current metrics based on monthly payments if available
    const metrics = monthlyPaymentsData[client.id] 
      ? getCurrentDateMetrics(client, monthlyPaymentsData[client.id])
      : { dueUntilToday: 0, paidUntilToday: 0, pendingUntilToday: 0, percentPaidOfDue: 0 };
    
    if (metrics.dueUntilToday === 0) {
      // No payments due yet
      return <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">Not Due Yet</Badge>;
    } else if (metrics.pendingUntilToday === 0) {
      // All payments due until today are paid
      return <Badge className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">Current</Badge>;
    } else if (metrics.paidUntilToday > 0) {
      // Some payments made, but still pending
      return <Badge className="bg-gradient-to-r from-amber-600 to-amber-500 text-white">Partially Paid</Badge>;
    } else {
      // Nothing paid of what's due
      return <Badge className="bg-gradient-to-r from-red-600 to-red-500 text-white">Overdue</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex bg-gray-900 text-white">
        <AdvocateSidebar />
        <div className="flex items-center justify-center min-h-screen flex-grow">Loading payments data...</div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-900 text-white relative">
      <AdvocateSidebar />
      <div className="flex-grow p-4 overflow-auto bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mb-4">
            Payment Management System
          </h1>
          
          {/* Client management toolbar */}
          <FilterToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            filterPaid={filterPaid}
            setFilterPaid={setFilterPaid}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSort={handleSort}
            viewMode={viewMode}
            setViewMode={setViewMode}
            clientsPerPage={clientsPerPage}
            setClientsPerPage={setClientsPerPage}
            setCurrentPage={setCurrentPage}
          />
          
          {/* Results summary */}
          <div className="text-gray-400 mb-4">
            Showing {paginatedClients.length} of {filteredClients.length} clients
            {searchQuery && <span> matching "{searchQuery}"</span>}
            {statusFilter && <span> with status "{statusFilter}"</span>}
            {filterPaid && <span> that are "{filterPaid}"</span>}
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Clients display - either grid or list view */}
          {paginatedClients.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
              : "space-y-4"
            }>
              {paginatedClients.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  viewMode={viewMode}
                  isExpanded={expandedClient === client.id}
                  onExpand={() => handleExpandClient(client.id)}
                  monthlyPayments={monthlyPaymentsData[client.id] || []}
                  paymentHistory={paymentHistory[client.id] || []}
                  onAddPayment={handleAddPayment}
                  getFilteredPayments={getFilteredPayments}
                  hasOverduePayments={hasOverduePayments}
                  hasPartialPayments={hasPartialPayments}
                  differenceInMonths={differenceInMonths}
                  isSameDay={isSameDay}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800 to-gray-850 shadow-lg">
              <AlertCircle className="mx-auto mb-2 text-gray-400" size={24} />
              <p className="text-gray-300">No clients found matching your criteria.</p>
              {(searchQuery || statusFilter || filterPaid) && (
                <Button 
                  variant="outline" 
                  className="mt-4 bg-gray-700 border-gray-600 text-white"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter(null);
                    setFilterPaid(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              clientsPerPage={clientsPerPage}
            />
          )}
        </div>
      </div>
      
      {/* Custom Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`p-4 rounded-lg shadow-lg flex items-start justify-between min-w-[300px] animate-slide-up ${
              toast.type === 'success' ? 'bg-gradient-to-r from-emerald-700 to-emerald-600' : 
              toast.type === 'error' ? 'bg-gradient-to-r from-red-700 to-red-600' : 'bg-gradient-to-r from-blue-700 to-blue-600'
            }`}
          >
            <div>
              <h4 className="font-medium text-white">{toast.title}</h4>
              <p className="text-sm text-gray-200">{toast.description}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-gray-300 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      
      {/* Add Payment Dialog */}
      <AddPaymentDialog 
        open={showAddPaymentDialog}
        setOpen={setShowAddPaymentDialog}
        client={selectedClient}
        selectedMonth={selectedPaymentMonth}
        newPayment={newPayment}
        setNewPayment={setNewPayment}
        onSave={savePayment}
        loading={loading}
      />
    </div>
  );
}

// Add this CSS at the end of the file or in your global CSS
const styles = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease forwards;
}

/* Define the extra color classes */
.from-gray-850 { --tw-gradient-from: #141418; }
.to-gray-850 { --tw-gradient-to: #141418; }
.bg-gray-850 { background-color: #141418; }
.bg-gray-825 { background-color: #18181c; }
.bg-gray-775 { background-color: #222228; }
.bg-gray-750 { background-color: #252530; }
.hover\\:bg-gray-750:hover { background-color: #252530; }
.border-gray-650 { border-color: #3d3d45; }
`;