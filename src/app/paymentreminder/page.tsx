'use client';

import { useState, useEffect } from 'react';
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
  orderBy 
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
  amount: number;
  createdAt: Timestamp;
  date: Timestamp;
  monthNumber: number;
  notes: string;
  paymentMethod: string;
  transactionId: string;
  type: 'full' | 'partial';
}

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

  // Fetch all clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsRef = collection(db, 'clients_payments');
        const clientsSnapshot = await getDocs(clientsRef);
        const clientsList: Client[] = [];
        
        clientsSnapshot.forEach((doc) => {
          clientsList.push({ clientId: doc.id, ...doc.data() } as Client);
        });
        
        setClients(clientsList);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to load clients');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClients();
  }, []);

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

  const fetchPaymentHistory = async (clientId: string) => {
    try {
      const historyRef = collection(db, `clients_payments/${clientId}/payment_history`);
      const historyQuery = query(historyRef, orderBy('date', 'desc'));
      const historySnapshot = await getDocs(historyQuery);
      
      const historyList: PaymentHistory[] = [];
      historySnapshot.forEach((doc) => {
        historyList.push(doc.data() as PaymentHistory);
      });
      
      setPaymentHistory(historyList);
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
  };

  const handleRecordPayment = async () => {
    try {
      if (!selectedClient || !paymentFormData.amount) {
        toast.error('Invalid payment data');
        return;
      }

      const monthRef = doc(
        db, 
        `clients_payments/${selectedClient.clientId}/monthly_payments`, 
        `month_${paymentFormData.monthNumber}`
      );

      const monthDoc = await getDoc(monthRef);
      const currentPaidAmount = monthDoc.exists() ? (monthDoc.data().paidAmount || 0) : 0;
      const newPaidAmount = currentPaidAmount + paymentFormData.amount;

      await updateDoc(monthRef, {
        paidAmount: newPaidAmount,
        status: newPaidAmount >= monthDoc.data()?.dueAmount ? 'paid' : 'partial',
        paymentMethod: paymentFormData.paymentMethod,
        transactionId: paymentFormData.transactionId || '',
        updatedAt: Timestamp.now()
      });

      // Add to payment history
      await addDoc(collection(db, `clients_payments/${selectedClient.clientId}/payment_history`), {
        amount: paymentFormData.amount,
        monthNumber: paymentFormData.monthNumber,
        paymentMethod: paymentFormData.paymentMethod,
        transactionId: paymentFormData.transactionId || '',
        notes: paymentFormData.notes || '',
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
        type: newPaidAmount >= monthDoc.data()?.dueAmount ? 'full' : 'partial'
      });

      // Update client document
      const clientRef = doc(db, 'clients_payments', selectedClient.clientId);
      await updateDoc(clientRef, {
        paidAmount: selectedClient.paidAmount + paymentFormData.amount,
        pendingAmount: selectedClient.pendingAmount - paymentFormData.amount,
        paymentsCompleted: newPaidAmount >= monthDoc.data()?.dueAmount ? 
          selectedClient.paymentsCompleted + 1 : 
          selectedClient.paymentsCompleted,
        updatedAt: Timestamp.now()
      });

      // Reset form and refresh data
      setPaymentDialogOpen(false);
      setPaymentFormData({
        amount: 0,
        monthNumber: 1,
        paymentMethod: 'cash',
        transactionId: '',
        notes: ''
      });
      
      // Refresh data
      fetchMonthlyPayments(selectedClient.clientId);
      fetchPaymentHistory(selectedClient.clientId);
      
      toast.success('Payment recorded successfully');
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  // Filter clients based on search and week
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientPhone.includes(searchQuery) ||
      client.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesWeek = weekFilter === null || client.weekOfMonth === weekFilter;
    
    return matchesSearch && matchesWeek;
  });

  // Group clients by week of month
  const clientsByWeek = filteredClients.reduce((acc, client) => {
    const week = client.weekOfMonth;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(client);
    return acc;
  }, {} as Record<number, Client[]>);

  // Format date
  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Not set';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  return (
    <div className="flex">
      <AdvocateSidebar />
      
      <div className="flex-1">
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold mb-6">Payment Reminder System</h1>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search clients by name, email or phone..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={weekFilter?.toString() || ''} onValueChange={(value) => setWeekFilter(value ? parseInt(value) : null)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All weeks</SelectItem>
                <SelectItem value="1">Week 1</SelectItem>
                <SelectItem value="2">Week 2</SelectItem>
                <SelectItem value="3">Week 3</SelectItem>
                <SelectItem value="4">Week 4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading clients...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <Card>
                    <CardHeader>
                      <CardTitle>All Clients ({filteredClients.length})</CardTitle>
                      <CardDescription>
                        Overview of all client payment statuses
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {filteredClients.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                          <h3 className="mt-2 text-lg font-medium">No clients found</h3>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your search or filter criteria
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>
                                <th className="text-left p-2 border-b">Client Name</th>
                                <th className="text-left p-2 border-b">Phone</th>
                                <th className="text-left p-2 border-b">Week</th>
                                <th className="text-right p-2 border-b">Monthly Fee</th>
                                <th className="text-right p-2 border-b">Paid / Total</th>
                                <th className="text-right p-2 border-b">Status</th>
                                <th className="text-center p-2 border-b">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredClients.map((client) => (
                                <tr key={client.clientId} className="hover:bg-muted/50">
                                  <td className="p-2 border-b">{client.clientName}</td>
                                  <td className="p-2 border-b">{client.clientPhone}</td>
                                  <td className="p-2 border-b">Week {client.weekOfMonth}</td>
                                  <td className="p-2 border-b text-right">₹{client.monthlyFees.toLocaleString()}</td>
                                  <td className="p-2 border-b text-right">
                                    ₹{client.paidAmount.toLocaleString()} / ₹{client.totalPaymentAmount.toLocaleString()}
                                  </td>
                                  <td className="p-2 border-b text-right">
                                    <span className={`px-2 py-1 rounded text-xs 
                                      ${client.paymentsCompleted === client.tenure ? 'bg-green-100 text-green-800' : 
                                        client.paymentsCompleted > 0 ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-red-100 text-red-800'}`}>
                                      {client.paymentsCompleted === client.tenure ? 'Completed' : 
                                       client.paymentsCompleted > 0 ? 'Partial' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="p-2 border-b text-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleClientSelect(client)}
                                    >
                                      View Details
                                    </Button>
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
                      <Card key={week}>
                        <CardHeader>
                          <CardTitle>Week {week} Clients ({clientsByWeek[week]?.length || 0})</CardTitle>
                          <CardDescription>
                            Clients with payments due in week {week}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {!clientsByWeek[week] || clientsByWeek[week].length === 0 ? (
                            <p className="text-center py-4 text-muted-foreground">No clients found for week {week}</p>
                          ) : (
                            <div className="space-y-2">
                              {clientsByWeek[week].map(client => (
                                <div 
                                  key={client.clientId} 
                                  className="p-3 rounded border hover:bg-muted/50 cursor-pointer"
                                  onClick={() => handleClientSelect(client)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium">{client.clientName}</h4>
                                      <p className="text-sm text-muted-foreground">{client.clientPhone}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">₹{client.monthlyFees.toLocaleString()}/month</p>
                                      <p className="text-sm">
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

      <Dialog open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
        <DialogContent className="max-w-[90%] w-[1200px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedClient?.clientName}</DialogTitle>
            <DialogDescription>Client Details and Payment History</DialogDescription>
          </DialogHeader>
          
          <div className="mt-6">
            <Tabs defaultValue="details">
              <TabsList className="mb-4">
                <TabsTrigger value="details">Client Details</TabsTrigger>
                <TabsTrigger value="schedule">Payment Schedule</TabsTrigger>
                <TabsTrigger value="history">Payment History</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                        <dd className="text-base">{selectedClient?.clientEmail}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                        <dd className="text-base">{selectedClient?.clientPhone}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                        <dd className="text-base">{formatDate(selectedClient?.startDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Monthly Fee</dt>
                        <dd className="text-base">₹{selectedClient?.monthlyFees.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Total Amount</dt>
                        <dd className="text-base">₹{selectedClient?.totalPaymentAmount.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Paid Amount</dt>
                        <dd className="text-base">₹{selectedClient?.paidAmount.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Pending Amount</dt>
                        <dd className="text-base">₹{selectedClient?.pendingAmount.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Advance Balance</dt>
                        <dd className="text-base">₹{selectedClient?.advanceBalance.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Payment Progress</dt>
                        <dd className="text-base">{selectedClient?.paymentsCompleted}/{selectedClient?.tenure} months</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left p-2 border-b">Month</th>
                            <th className="text-left p-2 border-b">Due Date</th>
                            <th className="text-right p-2 border-b">Due Amount</th>
                            <th className="text-right p-2 border-b">Paid Amount</th>
                            <th className="text-center p-2 border-b">Status</th>
                            <th className="text-center p-2 border-b">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyPayments.map((payment) => (
                            <tr key={payment.monthNumber} className="hover:bg-muted/50">
                              <td className="p-2 border-b">Month {payment.monthNumber}</td>
                              <td className="p-2 border-b">{formatDate(payment.dueDate)}</td>
                              <td className="p-2 border-b text-right">₹{payment.dueAmount.toLocaleString()}</td>
                              <td className="p-2 border-b text-right">₹{payment.paidAmount.toLocaleString()}</td>
                              <td className="p-2 border-b text-center">
                                <span className={`px-2 py-1 rounded text-xs 
                                  ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                    payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'}`}>
                                  {payment.status === 'paid' ? 'Paid' : 
                                   payment.status === 'partial' ? 'Partial' : 'Pending'}
                                </span>
                              </td>
                              <td className="p-2 border-b text-center">
                                {payment.status !== 'paid' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setPaymentFormData({
                                        ...paymentFormData,
                                        monthNumber: payment.monthNumber,
                                        amount: payment.dueAmount - payment.paidAmount
                                      });
                                      setPaymentDialogOpen(true);
                                    }}
                                  >
                                    Pay
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Record of all payments made</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left p-2 border-b">Date</th>
                            <th className="text-left p-2 border-b">Month</th>
                            <th className="text-right p-2 border-b">Amount</th>
                            <th className="text-left p-2 border-b">Method</th>
                            <th className="text-left p-2 border-b">Transaction ID</th>
                            <th className="text-left p-2 border-b">Type</th>
                            <th className="text-left p-2 border-b">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.map((payment, index) => (
                            <tr key={index} className="hover:bg-muted/50">
                              <td className="p-2 border-b">{formatDate(payment.date)}</td>
                              <td className="p-2 border-b">Month {payment.monthNumber}</td>
                              <td className="p-2 border-b text-right">₹{payment.amount.toLocaleString()}</td>
                              <td className="p-2 border-b capitalize">{payment.paymentMethod}</td>
                              <td className="p-2 border-b">{payment.transactionId || '-'}</td>
                              <td className="p-2 border-b capitalize">{payment.type}</td>
                              <td className="p-2 border-b">{payment.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Button 
                className="w-full"
                onClick={() => setPaymentDialogOpen(true)}
              >
                Record New Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentRecordModal 
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        clientName={selectedClient?.clientName}
        formData={paymentFormData}
        setFormData={setPaymentFormData}
        onSubmit={handleRecordPayment}
      />
    </div>
  );
}
