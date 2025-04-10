'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PaymentFormData {
  amount: number;
  monthNumber: number;
  notes?: string;
}

interface PaymentRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  formData: {
    amount: number;
    monthNumber: number;
    paymentMethod: string;
    transactionId: string;
    notes: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    amount: number;
    monthNumber: number;
    paymentMethod: string;
    transactionId: string;
    notes: string;
  }>>;
  onSubmit: () => void;
}

export function PaymentRecordModal({
  open,
  onOpenChange,
  clientName,
  formData,
  setFormData,
  onSubmit
}: PaymentRecordModalProps) {
  const updateFormData = (field: keyof PaymentFormData, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Payment</DialogTitle>
          <DialogDescription>
            {clientName ? `Send payment request for ${clientName}` : 'Send payment request'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Amount*</label>
            <Input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => updateFormData('amount', parseFloat(e.target.value) || 0)}
              required
              min={0}
              step={0.01}
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Notes (Optional)
            </label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder="Add any additional notes"
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setFormData({
                amount: 0,
                monthNumber: 1,
                paymentMethod: 'cash',
                transactionId: '',
                notes: ''
              });
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={!formData.amount}
          >
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 