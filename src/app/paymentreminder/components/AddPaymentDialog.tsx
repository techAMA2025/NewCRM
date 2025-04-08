import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ClientPayment, MonthlyPayment, NewPaymentFormData } from "../types";

interface AddPaymentDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  client: ClientPayment | null;
  selectedMonth: MonthlyPayment | null;
  newPayment: NewPaymentFormData;
  setNewPayment: (payment: NewPaymentFormData) => void;
  onSave: () => Promise<void>;
  loading: boolean;
}

export default function AddPaymentDialog({
  open,
  setOpen,
  client,
  selectedMonth,
  newPayment,
  setNewPayment,
  onSave,
  loading
}: AddPaymentDialogProps) {
  if (!client) return null;
  
  const handleChange = (field: keyof NewPaymentFormData, value: any) => {
    setNewPayment({
      ...newPayment,
      [field]: value
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-gray-800 text-white border-gray-700 max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            {selectedMonth 
              ? `Payment for Month ${selectedMonth.monthNumber}` 
              : 'Add Advance Payment'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div>
            <p className="text-gray-300 mb-2">Client: <span className="text-white">{client.clientName}</span></p>
            {selectedMonth && (
              <p className="text-gray-300 mb-2">
                Due Amount: <span className="text-white">
                  ₹{selectedMonth.dueAmount - (selectedMonth.paidAmount || 0)}
                </span>
              </p>
            )}
          </div>
          
          {selectedMonth && (
            <div className="space-y-3">
              <Label htmlFor="payment-type">Payment Type</Label>
              <RadioGroup 
                id="payment-type" 
                value={newPayment.type} 
                onValueChange={(value: 'full' | 'partial') => handleChange('type', value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="font-normal cursor-pointer">Full Payment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial" id="partial" />
                  <Label htmlFor="partial" className="font-normal cursor-pointer">Partial Payment</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          <div className="space-y-3">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="100"
              value={newPayment.amount.toString()}
              onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select 
              value={newPayment.paymentMethod} 
              onValueChange={(value) => handleChange('paymentMethod', value)}
            >
              <SelectTrigger id="payment-method" className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="transaction-id">Transaction ID/Reference</Label>
            <Input
              id="transaction-id"
              value={newPayment.transactionId}
              onChange={(e) => handleChange('transactionId', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Optional"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="payment-date">Payment Date</Label>
            <Input
              id="payment-date"
              type="date"
              value={format(newPayment.date, 'yyyy-MM-dd')}
              onChange={(e) => handleChange('date', new Date(e.target.value))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={newPayment.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white resize-none h-[80px]"
              placeholder="Optional payment notes"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={newPayment.amount <= 0 || loading}
            className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white"
          >
            {loading ? 'Processing...' : 'Save Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 