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

  // Move fetchClients outside useEffect and make it memoized with useCallback
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
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

  // Update the function to fetch payment history with correct case sensitivity
  const fetchPaymentHistory = useCallback(async (clientId: any) => {
    try {
      if (!clientId) return;
      
      // Query the monthly_pay_req collection for approved payments
      // Note the lowercase "approved" to match the database value
      const q = query(
        collection(db, 'monthly_pay_req'),
        where('clientId', '==', clientId),
        where('payment_status', '==', 'approved')
      );
      
      const querySnapshot = await getDocs(q);
      const approvedPayments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Approved payments found:', approvedPayments.length); // Debugging
      setPaymentHistory(approvedPayments as PaymentHistory[]);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  }, [db]);

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

      // Add to monthly_pay_req collection
      await addDoc(collection(db, 'monthly_pay_req'), {
        clientId: selectedClient.clientId,
        clientName: selectedClient.clientName,
        monthNumber: paymentFormData.monthNumber,
        dueDate: monthlyPayments.find(m => m.monthNumber === paymentFormData.monthNumber)?.dueDate || Timestamp.now(),
        dueAmount: monthlyPayments.find(m => m.monthNumber === paymentFormData.monthNumber)?.dueAmount || 0,
        paidAmount: monthlyPayments.find(m => m.monthNumber === paymentFormData.monthNumber)?.paidAmount || 0,
        requestedAmount: paymentFormData.amount,
        notes: paymentFormData.notes || '',
        requestDate: Timestamp.now(),
        payment_status: "Not approved",
        requestedBy: requestedBy
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
      
      toast.success('Payment request sent successfully');
    } catch (error) {
      console.error('Error sending payment request:', error);
      toast.error('Failed to send payment request');
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
                                  <td className="p-2 border-b text-right">₹{(client.monthlyFees || 0).toLocaleString()}</td>
                                  <td className="p-2 border-b text-right">
                                    ₹{(client.paidAmount || 0).toLocaleString()} / ₹{(client.totalPaymentAmount || 0).toLocaleString()}
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
                                      <p className="font-medium">₹{(client.monthlyFees || 0).toLocaleString()}/month</p>
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

      <ClientDetailsModal
        open={clientDetailsOpen}
        onOpenChange={setClientDetailsOpen}
        client={selectedClient}
        monthlyPayments={monthlyPayments}
        paymentHistory={paymentHistory}
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
    </div>
  );
}
