import React, { useState } from 'react';
import { doc, updateDoc, setDoc, collection, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import BankForm from './BankForm';

interface EditClientDetailsModalProps {
  clientData: any;
  onClose: () => void;
  onSave: () => void;
  onSaveComplete?: (updatedClient: any) => void;
}

const EditClientDetailsModal = ({ clientData: initialClientData, onClose, onSave, onSaveComplete }: EditClientDetailsModalProps) => {
  const [clientData, setClientData] = useState<any>({...initialClientData});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setClientData((prevData: any) => ({
      ...prevData,
      [field]: value
    }));
  };

  // Handle adding a bank
  const handleAddBank = () => {
    const newBank = {
      id: `bank-${Date.now()}`,
      bankName: '',
      loanType: '',
      accountNumber: '',
      loanAmount: ''
    };
    
    setClientData((prevData: any) => ({
      ...prevData,
      banks: [...(prevData.banks || []), newBank]
    }));
  };

  // Handle updating a bank
  const handleUpdateBank = (bankId: string, field: string, value: string) => {
    setClientData((prevData: any) => ({
      ...prevData,
      banks: (prevData.banks || []).map((bank: any) => 
        bank.id === bankId ? { ...bank, [field]: value } : bank
      )
    }));
  };

  // Handle removing a bank
  const handleRemoveBank = (bankId: string) => {
    setClientData((prevData: any) => ({
      ...prevData,
      banks: (prevData.banks || []).filter((bank: any) => bank.id !== bankId)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Get a reference to the client document
      const clientRef = doc(db, 'clients', clientData.id);
      
      // Create an update object without the 'id' field
      const { id, ...updateData } = clientData;
      
      // Update the client document
      await updateDoc(clientRef, updateData);
      
      // Create payment schedule in clients_payments collection
      if (clientData.startDate && clientData.tenure && clientData.monthlyFees) {
        try {
          await createPaymentSchedule(
            clientData.id,
            clientData.name || '',
            clientData.email || '',
            clientData.phone || '',
            clientData.startDate,
            parseInt(clientData.tenure.toString()),
            parseFloat(clientData.monthlyFees.toString()),
          );
          console.log("Payment schedule created successfully");
        } catch (error) {
          console.error("Error creating payment schedule:", error);
          // Continue with the rest of the process even if payment schedule creation fails
        }
      }
      
      // If onSaveComplete is provided, call it with the updated client data
      if (onSaveComplete) {
        onSaveComplete(clientData);
      }
      
      setSaveSuccess(true);
      setTimeout(() => {
        onSave();
      }, 1500);
    } catch (err) {
      console.error('Error updating client:', err);
      setSaveError('Error saving client details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Function to create payment schedule for a client
  const createPaymentSchedule = async (
    clientId: string,
    clientName: string,
    clientEmail: string,
    clientPhone: string,
    startDate: string,
    tenure: number,
    monthlyFees: number,
  ) => {
    try {
      // Create a reference to the client's payment document
      const paymentDocRef = doc(db, 'clients_payments', clientId);
      
      // Parse the start date
      const start = new Date(startDate);
      
      // Calculate the week number of the month
      const getWeekOfMonth = (date: Date) => {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const weekNumber = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
        return weekNumber;
      };
      
      // Get week number for categorization
      const weekNumber = getWeekOfMonth(start);
      
      // Set the main document with client info and payment metadata
      await setDoc(paymentDocRef, {
        clientId: clientId,
        clientName: clientName,
        clientEmail: clientEmail, 
        clientPhone: clientPhone,
        startDate: start,
        tenure: tenure,
        monthlyFees: monthlyFees,
        weekOfMonth: weekNumber,
        totalPaymentAmount: monthlyFees * tenure,
        paidAmount: 0,
        pendingAmount: monthlyFees * tenure,
        paymentsCompleted: 0,
        paymentsPending: tenure,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      // Create a batch to handle multiple write operations
      const batch = writeBatch(db);
      
      // Create a subcollection for each month's payment
      for (let i = 0; i < tenure; i++) {
        // Calculate the payment date (same day of month as start date)
        const paymentDate = new Date(start);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        
        // Create a unique ID for this month's payment
        const monthId = `month_${i + 1}`;
        
        // Create a reference to the subcollection document
        const monthPaymentRef = doc(
          collection(db, 'clients_payments', clientId, 'monthly_payments'),
          monthId
        );
        
        // Set the month payment data
        batch.set(monthPaymentRef, {
          monthNumber: i + 1,
          dueDate: paymentDate,
          dueAmount: monthlyFees,
          status: 'pending',
          paymentMethod: '',
          transactionId: '',
          notes: '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      
      // Commit the batch
      await batch.commit();
      
      console.log(`Created payment schedule for client ${clientId} with ${tenure} months`);
    } catch (error) {
      console.error("Error creating payment schedule:", error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              Edit Client Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {saveSuccess && (
            <div className="mb-4 bg-green-900 border border-green-700 text-green-100 p-3 rounded-md">
              Client details updated successfully!
            </div>
          )}

          {saveError && (
            <div className="mb-4 bg-red-900 border border-red-700 text-red-100 p-3 rounded-md">
              {saveError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Client Status Information */}
              <div>
                <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Client Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-400">Status</label>
                    <input
                      id="status"
                      type="text"
                      value={clientData.status || ''}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      readOnly
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-400">Assigned To</label>
                    <input
                      id="assignedTo"
                      type="text"
                      value={clientData.assignedTo || ''}
                      onChange={(e) => handleFieldChange('assignedTo', e.target.value)}
                      readOnly
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="source" className="block text-sm font-medium text-gray-400">Source</label>
                    <input
                      id="source"
                      type="text"
                      value={clientData.source || ''}
                      onChange={(e) => handleFieldChange('source', e.target.value)}
                      readOnly
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-400">Name*</label>
                    <input
                      id="name"
                      type="text"
                      value={clientData.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      required
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={clientData.email || ''}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-400">Phone*</label>
                    <input
                      id="phone"
                      type="text"
                      value={clientData.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      required
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="aadharNumber" className="block text-sm font-medium text-gray-400">Aadhar Number</label>
                    <input
                      id="aadharNumber"
                      type="text"
                      value={clientData.aadharNumber || ''}
                      onChange={(e) => handleFieldChange('aadharNumber', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-400">City</label>
                    <input
                      id="city"
                      type="text"
                      value={clientData.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="occupation" className="block text-sm font-medium text-gray-400">Occupation</label>
                    <input
                      id="occupation"
                      type="text"
                      value={clientData.occupation || ''}
                      onChange={(e) => handleFieldChange('occupation', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="personalLoanDues" className="block text-sm font-medium text-gray-400">Personal Loan Dues</label>
                    <input
                      id="personalLoanDues"
                      type="text"
                      value={clientData.personalLoanDues || ''}
                      onChange={(e) => handleFieldChange('personalLoanDues', e.target.value)}
                      placeholder="₹"
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="creditCardDues" className="block text-sm font-medium text-gray-400">Credit Card Dues</label>
                    <input
                      id="creditCardDues"
                      type="text"
                      value={clientData.creditCardDues || ''}
                      onChange={(e) => handleFieldChange('creditCardDues', e.target.value)}
                      placeholder="₹"
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-400">Monthly Income</label>
                    <input
                      id="monthlyIncome"
                      type="text"
                      value={clientData.monthlyIncome || ''}
                      onChange={(e) => handleFieldChange('monthlyIncome', e.target.value)}
                      placeholder="₹"
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Details */}
              <div>
                <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Fee Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="tenure" className="block text-sm font-medium text-gray-400">Tenure (months)</label>
                    <input
                      id="tenure"
                      type="text"
                      value={clientData.tenure || ''}
                      onChange={(e) => handleFieldChange('tenure', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="monthlyFees" className="block text-sm font-medium text-gray-400">Monthly Fees</label>
                    <input
                      id="monthlyFees"
                      type="text"
                      value={clientData.monthlyFees || ''}
                      onChange={(e) => handleFieldChange('monthlyFees', e.target.value)}
                      placeholder="₹"
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-400">Start Date of Service</label>
                    <input
                      id="startDate"
                      type="date"
                      value={clientData.startDate || ''}
                      onChange={(e) => handleFieldChange('startDate', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">Bank Details</h3>
                  <button
                    type="button"
                    onClick={handleAddBank}
                    className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Bank
                  </button>
                </div>

                {clientData.banks && clientData.banks.length > 0 ? (
                  <div className="space-y-4">
                    {clientData.banks.map((bank: any) => (
                      <BankForm
                        key={bank.id}
                        bank={bank}
                        onUpdate={handleUpdateBank}
                        onRemove={handleRemoveBank}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 text-center text-gray-400">
                    No bank details added yet. Click "Add Bank" to add bank information.
                  </div>
                )}
              </div>

              {/* Notes & Remarks */}
              <div>
                <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Notes & Remarks</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-400">Client Message/Query</label>
                    <textarea
                      id="remarks"
                      value={clientData.remarks || ''}
                      onChange={(e) => handleFieldChange('remarks', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="queries" className="block text-sm font-medium text-gray-400">Client Queries</label>
                    <textarea
                      id="queries"
                      value={clientData.queries || ''}
                      onChange={(e) => handleFieldChange('queries', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="salesNotes" className="block text-sm font-medium text-gray-400">Sales Notes</label>
                    <textarea
                      id="salesNotes"
                      value={clientData.salesNotes || ''}
                      onChange={(e) => handleFieldChange('salesNotes', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {saving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditClientDetailsModal; 