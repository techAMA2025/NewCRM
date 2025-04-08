import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { ClientPayment, MonthlyPayment, PaymentHistory } from "../types";
import { formatIndianCurrency } from "@/lib/utils/formatting";

interface ClientCardProps {
  client: ClientPayment;
  viewMode: 'list' | 'grid';
  isExpanded: boolean;
  onExpand: () => void;
  monthlyPayments: MonthlyPayment[];
  paymentHistory: PaymentHistory[];
  onAddPayment: (client: ClientPayment, month?: MonthlyPayment) => void;
  getFilteredPayments: (payments: MonthlyPayment[]) => MonthlyPayment[];
  hasOverduePayments: (clientId: string) => boolean;
  hasPartialPayments: (clientId: string) => boolean;
  differenceInMonths: (date1: Date, date2: Date) => number;
  isSameDay: (date1: Date, date2: Date) => boolean;
}

export default function ClientCard({
  client,
  viewMode,
  isExpanded,
  onExpand,
  monthlyPayments,
  paymentHistory,
  onAddPayment,
  getFilteredPayments,
  hasOverduePayments,
  hasPartialPayments,
  differenceInMonths,
  isSameDay
}: ClientCardProps) {
  // Calculate payment progress
  const progressPercentage = client.tenure > 0 
    ? Math.min(100, Math.round((client.paymentsCompleted / client.tenure) * 100))
    : 0;
    
  // Get client status
  const getClientStatus = () => {
    if (hasOverduePayments(client.id)) return { label: "Overdue", variant: "destructive", className: "bg-red-700" };
    if (hasPartialPayments(client.id)) return { label: "Partial", variant: "outline", className: "border-amber-500 text-amber-400" };
    if (client.pendingAmount === 0 && client.tenure > 0) return { label: "Paid", variant: "outline", className: "border-green-500 text-green-400" };
    return { label: "Pending", variant: "outline", className: "border-blue-500 text-blue-400" };
  };
  
  const status = getClientStatus();
    
  return (
    <Card className={`shadow-md border-gray-700 ${viewMode === 'list' ? 'w-full' : ''} 
      bg-gradient-to-br from-gray-800 to-gray-850 hover:from-gray-750 hover:to-gray-800 transition-colors`}>
      <CardHeader className="pb-2 space-y-2">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              {client.clientName}
              <Badge variant={status.variant as any} className={status.className}>{status.label}</Badge>
            </CardTitle>
            
            <div className="flex gap-3 text-sm text-gray-400">
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                <span>{client.clientEmail}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-3 w-3 mr-1" />
                <span>{client.clientPhone}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right shrink-0">
            <span className="text-xs text-gray-400">Started on:</span>
            <div className="text-sm text-white">{format(client.startDate, 'dd MMM yyyy')}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-400">Paid / Total</div>
            <div className="text-white font-medium">
              {formatIndianCurrency(client.paidAmount)} / {formatIndianCurrency(client.paidAmount + client.pendingAmount)}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-400">Progress</div>
            <div className="text-white font-medium">
              {client.paymentsCompleted} / {client.tenure} months ({progressPercentage}%)
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              progressPercentage >= 100 
                ? 'bg-gradient-to-r from-green-500 to-green-400' 
                : 'bg-gradient-to-r from-purple-500 to-pink-400'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Buttons */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-750 hover:text-white"
            onClick={onExpand}
          >
            {isExpanded ? 'Hide Details' : 'View Details'}
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
          
          <Button 
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white"
            onClick={() => onAddPayment(client)}
          >
            Add Payment
          </Button>
        </div>
        
        {/* Expanded view with monthly payments and payment history */}
        {isExpanded && (
          <div className="mt-2 border-t border-gray-700 pt-4">
            <div className="grid gap-4">
              {/* Monthly Payments Section */}
              <div>
                <h3 className="text-md font-medium text-white mb-2 flex items-center">
                  <span>Monthly Payments</span>
                </h3>
                {monthlyPayments.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Month</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Due Date</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Amount</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Status</th>
                          <th className="text-right py-2 px-3 text-gray-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredPayments(monthlyPayments).map((payment) => (
                          <tr key={payment.id} className="border-t border-gray-700 hover:bg-gray-750">
                            <td className="py-2 px-3">Month {payment.monthNumber}</td>
                            <td className="py-2 px-3">{format(payment.dueDate, 'dd MMM yyyy')}</td>
                            <td className="py-2 px-3">{formatIndianCurrency(payment.dueAmount)}</td>
                            <td className="py-2 px-3">
                              {payment.status === 'paid' && <Badge className="bg-green-700">Paid</Badge>}
                              {payment.status === 'partial' && <Badge className="bg-blue-700">{formatIndianCurrency(payment.paidAmount || 0)} Paid</Badge>}
                              {payment.status === 'pending' && <Badge className="bg-amber-700">Pending</Badge>}
                              {payment.status === 'overdue' && <Badge className="bg-red-700">Overdue</Badge>}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {(payment.status === 'pending' || payment.status === 'partial' || payment.status === 'overdue') && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs border-gray-600 hover:bg-gray-700"
                                  onClick={() => onAddPayment(client, payment)}
                                >
                                  Add Payment
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No payment records found.</p>
                )}
              </div>
              
              {/* Payment History Section */}
              <div>
                <h3 className="text-md font-medium text-white mb-2">Payment History</h3>
                {paymentHistory.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Date</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Amount</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Method</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Type</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} className="border-t border-gray-700 hover:bg-gray-750">
                            <td className="py-2 px-3">{format(payment.date, 'dd MMM yyyy')}</td>
                            <td className="py-2 px-3">{formatIndianCurrency(payment.amount)}</td>
                            <td className="py-2 px-3">
                              {payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1).replace('_', ' ')}
                              {payment.transactionId && <div className="text-xs text-gray-500">#{payment.transactionId}</div>}
                            </td>
                            <td className="py-2 px-3">
                              {payment.type === 'full' && 'Full Payment'}
                              {payment.type === 'partial' && 'Partial Payment'}
                              {payment.type === 'advance' && 'Advance Payment'}
                              {payment.monthNumber > 0 && <div className="text-xs text-gray-500">Month {payment.monthNumber}</div>}
                            </td>
                            <td className="py-2 px-3 text-gray-300">{payment.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No payment history found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 