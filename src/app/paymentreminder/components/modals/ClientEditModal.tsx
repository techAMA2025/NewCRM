import { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
}

type ClientEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onClientUpdate: () => void;
};

export function ClientEditModal({ open, onOpenChange, client, onClientUpdate }: ClientEditModalProps) {
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [loading, setLoading] = useState(false);
  const [startDateStr, setStartDateStr] = useState('');

  useEffect(() => {
    if (client) {
      // Convert Timestamp to string for date input
      const startDate = client.startDate ? 
        new Date(client.startDate.seconds * 1000) : new Date();
      
      const dateStr = startDate.toISOString().split('T')[0];
      setStartDateStr(dateStr);

      setFormData({
        clientName: client.clientName,
        clientEmail: client.clientEmail,
        clientPhone: client.clientPhone,
        monthlyFees: client.monthlyFees,
        weekOfMonth: client.weekOfMonth,
        advanceBalance: client.advanceBalance,
        tenure: client.tenure
      });
    }
  }, [client]);

  const handleChange = (field: string, value: string | number) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = async () => {
    if (!client) return;
    
    try {
      setLoading(true);
      
      // Convert string date to Timestamp
      const startDateTimestamp = startDateStr ? 
        Timestamp.fromDate(new Date(startDateStr)) : 
        client.startDate;
      
      // Get the potentially updated monthly fees and tenure
      const updatedMonthlyFees = formData.monthlyFees || client.monthlyFees;
      const updatedTenure = formData.tenure || client.tenure;
      
      // Calculate total payment amount based on monthly fees and tenure
      const totalPaymentAmount = updatedMonthlyFees * updatedTenure;
      
      // Calculate pending amount
      const pendingAmount = totalPaymentAmount - (client.paidAmount || 0);
      
      // Calculate payment pending count
      const paymentsPending = updatedTenure - (client.paymentsCompleted || 0);
      
      // Create an update object with safely handled values
      const updateData = {
        clientName: formData.clientName || client.clientName,
        clientEmail: formData.clientEmail || client.clientEmail,
        clientPhone: formData.clientPhone || client.clientPhone,
        monthlyFees: updatedMonthlyFees,
        weekOfMonth: formData.weekOfMonth || client.weekOfMonth,
        advanceBalance: (formData.advanceBalance !== undefined) ? formData.advanceBalance : (client.advanceBalance || 0),
        startDate: startDateTimestamp,
        tenure: updatedTenure,
        totalPaymentAmount: totalPaymentAmount,
        pendingAmount: pendingAmount,
        paymentsPending: paymentsPending
      };
      
      // Update the client document
      const clientRef = doc(db, 'clients_payments', client.clientId);
      await updateDoc(clientRef, updateData);
      
      // Update monthly payments if monthly fee has changed
      if (updatedMonthlyFees !== client.monthlyFees) {
        // Update each month's payment record in the subcollection
        const updatePromises = [];
        
        for (let i = 1; i <= updatedTenure; i++) {
          const monthRef = doc(db, `clients_payments/${client.clientId}/monthly_payments`, `month_${i}`);
          
          // First check if the document exists
          const monthDoc = await getDoc(monthRef);
          
          if (monthDoc.exists()) {
            // Get the existing data 
            const monthData = monthDoc.data();
            
            // Calculate the new pending amount based on the new monthly fee
            // and the amount already paid for this month
            const paidAmount = monthData.paidAmount || 0;
            const dueAmount = updatedMonthlyFees;
            
            // Determine the new status based on paid amount
            let status = 'pending';
            if (paidAmount >= dueAmount) {
              status = 'paid';
            } else if (paidAmount > 0) {
              status = 'partial';
            }
            
            // Update the month document
            updatePromises.push(
              updateDoc(monthRef, {
                dueAmount: dueAmount,
                status: status
              })
            );
          } else {
            // If the month document doesn't exist, create it
            const newMonthData = {
              monthNumber: i,
              dueAmount: updatedMonthlyFees,
              paidAmount: 0,
              dueDate: Timestamp.fromDate(new Date()), // You might want to calculate this based on start date
              status: 'pending',
              reminderSent: false,
              reminderDate: null
            };
            
            updatePromises.push(
              setDoc(monthRef, newMonthData)
            );
          }
        }
        
        // Wait for all updates to complete
        await Promise.all(updatePromises);
      }
      
      toast.success('Client information updated successfully');
      onOpenChange(false);
      onClientUpdate();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border border-gray-700 shadow-lg max-w-4xl w-full rounded-xl text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-400">Edit Client Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={formData.clientName || ''}
                onChange={(e) => handleChange('clientName', e.target.value)}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail || ''}
                onChange={(e) => handleChange('clientEmail', e.target.value)}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                value={formData.clientPhone || ''}
                onChange={(e) => handleChange('clientPhone', e.target.value)}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="monthlyFees">Monthly Fee (₹)</Label>
              <Input
                id="monthlyFees"
                type="number"
                value={formData.monthlyFees || ''}
                onChange={(e) => handleChange('monthlyFees', parseFloat(e.target.value))}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weekOfMonth">Week of Month</Label>
              <Select 
                value={formData.weekOfMonth?.toString() || ''}
                onValueChange={(value) => handleChange('weekOfMonth', parseInt(value))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="1">Week 1</SelectItem>
                  <SelectItem value="2">Week 2</SelectItem>
                  <SelectItem value="3">Week 3</SelectItem>
                  <SelectItem value="4">Week 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tenure">Tenure (months)</Label>
              <Input
                id="tenure"
                type="number"
                value={formData.tenure || ''}
                onChange={(e) => handleChange('tenure', parseInt(e.target.value))}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            
            {/* <div className="space-y-2">
              <Label htmlFor="advanceBalance">Advance Balance (₹)</Label>
              <Input
                id="advanceBalance"
                type="number"
                value={formData.advanceBalance || ''}
                onChange={(e) => handleChange('advanceBalance', parseFloat(e.target.value))}
                className="bg-gray-700 border-gray-600"
              />
            </div> */}
            
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Client'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
