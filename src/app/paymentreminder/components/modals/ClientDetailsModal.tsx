'use client';

import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { PaymentRecordModal } from './PaymentRecordModal';

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
  approved_by: string;
  dueDate: Timestamp;
}

type PaymentRequest = {
  clientId: string;
  clientName: string;
  dueAmount: number;
  dueDate: Timestamp;
  monthNumber: number;
  notes: string;
  paidAmount: number;
  payment_status: string;
  requestDate: Timestamp;
  requestedAmount: number;
  requestedBy: string;
}

interface ClientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  monthlyPayments: MonthlyPayment[];
  paymentHistory: PaymentHistory[];
  paymentRequests: PaymentRequest[];
  onRecordPayment: (monthNumber: number, amount: number) => void;
  formatDate: (timestamp?: Timestamp) => string;
  paymentDialogOpen: boolean;
  setPaymentDialogOpen: (open: boolean) => void;
  paymentFormData: {
    amount: number;
    monthNumber: number;
    paymentMethod: string;
    transactionId: string;
    notes: string;
  };
  setPaymentFormData: (data: any) => void;
  handleRecordPayment: () => Promise<void>;
}

export function ClientDetailsModal({
  open,
  onOpenChange,
  client,
  monthlyPayments,
  paymentHistory,
  paymentRequests,
  onRecordPayment,
  formatDate,
  paymentDialogOpen,
  setPaymentDialogOpen,
  paymentFormData,
  setPaymentFormData,
  handleRecordPayment
}: ClientDetailsModalProps) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90%] w-[1200px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{client?.clientName}</DialogTitle>
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
                        <dd className="text-base">{client?.clientEmail}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                        <dd className="text-base">{client?.clientPhone}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                        <dd className="text-base">{formatDate(client?.startDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Monthly Fee</dt>
                        <dd className="text-base">₹{client?.monthlyFees.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Total Amount</dt>
                        <dd className="text-base">₹{client?.totalPaymentAmount.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Paid Amount</dt>
                        <dd className="text-base">₹{client?.paidAmount.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Pending Amount</dt>
                        <dd className="text-base">₹{client?.pendingAmount.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Advance Balance</dt>
                        <dd className="text-base">₹{(client?.advanceBalance ?? 0).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Payment Progress</dt>
                        <dd className="text-base">{client?.paymentsCompleted}/{client?.tenure} months</dd>
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
                                    onClick={() => onRecordPayment(
                                      payment.monthNumber,
                                      payment.dueAmount - payment.paidAmount
                                    )}
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
                    
                    {/* Payment Requests Section */}
                    {paymentRequests.length > 0 && (
                      <>
                        <h3 className="text-lg font-medium mt-8 mb-4">Your Payment Requests</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>
                                <th className="text-left p-2 border-b">Month</th>
                                <th className="text-left p-2 border-b">Request Date</th>
                                <th className="text-right p-2 border-b">Requested Amount</th>
                                <th className="text-center p-2 border-b">Status</th>
                                <th className="text-left p-2 border-b">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentRequests
                                .sort((a, b) => b.requestDate.toMillis() - a.requestDate.toMillis())
                                .map((request, index) => (
                                  <tr key={index} className="hover:bg-muted/50">
                                    <td className="p-2 border-b">Month {request.monthNumber}</td>
                                    <td className="p-2 border-b">{formatDate(request.requestDate)}</td>
                                    <td className="p-2 border-b text-right">₹{request.requestedAmount.toLocaleString()}</td>
                                    <td className="p-2 border-b text-center">
                                      <span className={`px-2 py-1 rounded text-xs 
                                        ${request.payment_status === 'approved' ? 'bg-green-100 text-green-800' : 
                                          request.payment_status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                          'bg-red-100 text-red-800'}`}>
                                        {request.payment_status.charAt(0).toUpperCase() + request.payment_status.slice(1)}
                                      </span>
                                    </td>
                                    <td className="p-2 border-b">{request.notes || '-'}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Record of all payment requests and their status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left p-2 border-b">Request Date</th>
                            <th className="text-left p-2 border-b">Month</th>
                            <th className="text-right p-2 border-b">Amount</th>
                            <th className="text-center p-2 border-b">Status</th>
                            <th className="text-left p-2 border-b">Requested By</th>
                            <th className="text-left p-2 border-b">Approved By</th>
                            <th className="text-left p-2 border-b">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...paymentHistory]
                            .sort((a, b) => b.requestDate.toMillis() - a.requestDate.toMillis())
                            .map((payment, index) => (
                              <tr key={index} className="hover:bg-muted/50">
                                <td className="p-2 border-b">{formatDate(payment.requestDate)}</td>
                                <td className="p-2 border-b">Month {payment.monthNumber}</td>
                                <td className="p-2 border-b text-right">₹{payment.requestedAmount.toLocaleString()}</td>
                                <td className="p-2 border-b text-center">
                                  <span className={`px-2 py-1 rounded text-xs 
                                    ${payment.payment_status === 'approved' ? 'bg-green-100 text-green-800' : 
                                      payment.payment_status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                      'bg-yellow-100 text-yellow-800'}`}>
                                    {payment.payment_status === 'Not approved' ? 'Pending Approval' : 
                                     payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)}
                                  </span>
                                </td>
                                <td className="p-2 border-b">{payment.requestedBy || '-'}</td>
                                <td className="p-2 border-b">{payment.approved_by || '-'}</td>
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

            {/* <div className="mt-6">
              <Button 
                className="w-full"
                onClick={() => onRecordPayment(1, client?.monthlyFees || 0)}
              >
                Record New Payment
              </Button>
            </div> */}
          </div>
        </DialogContent>
      </Dialog>

      <PaymentRecordModal 
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        clientName={client?.clientName}
        formData={paymentFormData}
        setFormData={setPaymentFormData}
        onSubmit={handleRecordPayment}
      />
    </>
  );
} 