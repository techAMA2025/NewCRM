'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { FaTimes, FaSave, FaExclamationTriangle } from 'react-icons/fa';

// Define the Bank type to match Firebase structure
interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
}

// Define the Client type to match Firebase structure
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  city: string;
  lastModified: any; // Timestamp from Firebase
  creditCardDues: string;
  personalLoanDues: string;
  monthlyIncome: string;
  monthlyFees: string;
  assignedTo: string;
  assignedToId: string;
  alloc_adv: string;
  alloc_adv_at: any; // Timestamp from Firebase
  banks: Bank[];
  remarks: string;
  queries: string;
  salesNotes: string;
  source_database: string;
  tenure: string;
  occupation: string;
  aadharNumber: string;
  convertedFromLead: boolean;
  convertedAt: any; // Timestamp from Firebase
  leadId: string;
  startDate: string;
  message: string;
}

interface ClientEditModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onClientUpdated: () => void;
}

export default function ClientEditModal({ client, isOpen, onClose, onClientUpdated }: ClientEditModalProps) {
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [banks, setBanks] = useState<Bank[]>([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client) {
      // Initialize form data with client data
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        status: client.status,
        city: client.city,
        creditCardDues: client.creditCardDues,
        personalLoanDues: client.personalLoanDues,
        monthlyIncome: client.monthlyIncome,
        monthlyFees: client.monthlyFees,
        remarks: client.remarks,
        queries: client.queries,
        salesNotes: client.salesNotes,
        source_database: client.source_database || '',
        tenure: client.tenure,
        occupation: client.occupation,
        aadharNumber: client.aadharNumber,
        message: client.message
      });

      // Initialize banks
      setBanks(client.banks || []);
    }
  }, [isOpen, client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (index: number, field: keyof Bank, value: string) => {
    const updatedBanks = [...banks];
    updatedBanks[index] = {
      ...updatedBanks[index],
      [field]: value
    };
    setBanks(updatedBanks);
  };

  const addBank = () => {
    setBanks([...banks, { id: Date.now().toString(), bankName: '', accountNumber: '', loanType: '', loanAmount: '' }]);
  };

  const removeBank = (index: number) => {
    const updatedBanks = [...banks];
    updatedBanks.splice(index, 1);
    setBanks(updatedBanks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Filter out any undefined values and create a clean object
      const cleanedFormData = Object.entries(formData).reduce((acc, [key, value]) => {
        // Only include properties that have defined values
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      // Create updated client data with current timestamp
      const updatedClientData = {
        ...cleanedFormData,
        // Make sure banks array doesn't contain undefined values
        banks: banks.map(bank => ({
          id: bank.id || Date.now().toString(),
          bankName: bank.bankName || '',
          accountNumber: bank.accountNumber || '',
          loanType: bank.loanType || '',
          loanAmount: bank.loanAmount || ''
        })),
        lastModified: new Date()
      };
      
      // Update client document in Firestore
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, updatedClientData);
      
      setSuccess('Client information updated successfully!');
      setTimeout(() => {
        onClientUpdated();
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error updating client:', error);
      setError('Failed to update client information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Edit Client: {client.name}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-8rem)]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
              <FaExclamationTriangle className="mr-2" /> {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information Section */}
              <div className="col-span-2">
                <h4 className="text-lg font-semibold mb-3 border-b pb-2 dark:text-white">
                  Personal Information
                </h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Aadhar Number
                  </label>
                  <input
                    type="text"
                    name="aadharNumber"
                    value={formData.aadharNumber || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="Converted">Converted</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Source
                  </label>
                  <select
                    name="source_database"
                    value={formData.source_database || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Source</option>
                    <option value="credsettlee">Cred Settle</option>
                    <option value="ama">AMA</option>
                    <option value="settleloans">Settle Loans</option>
                    <option value="billcut">Bill Cut</option>
                  </select>
                </div>
              </div>
              
              {/* Financial Information Section */}
              <div className="col-span-2">
                <h4 className="text-lg font-semibold mt-4 mb-3 border-b pb-2 dark:text-white">
                  Financial Information
                </h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Income (₹)
                  </label>
                  <input
                    type="text"
                    name="monthlyIncome"
                    value={formData.monthlyIncome || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Fees (₹)
                  </label>
                  <input
                    type="text"
                    name="monthlyFees"
                    value={formData.monthlyFees || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Credit Card Dues (₹)
                  </label>
                  <input
                    type="text"
                    name="creditCardDues"
                    value={formData.creditCardDues || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Personal Loan Dues (₹)
                  </label>
                  <input
                    type="text"
                    name="personalLoanDues"
                    value={formData.personalLoanDues || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tenure
                  </label>
                  <input
                    type="text"
                    name="tenure"
                    value={formData.tenure || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              {/* Bank Information Section */}
              <div className="col-span-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold mt-4 mb-3 border-b pb-2 dark:text-white">
                    Bank Information
                  </h4>
                  <button
                    type="button"
                    onClick={addBank}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Add Bank
                  </button>
                </div>
                
                {banks.map((bank, index) => (
                  <div key={bank.id || index} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium dark:text-white">Bank #{index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeBank(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTimes />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={bank.bankName || ''}
                          onChange={(e) => handleBankChange(index, 'bankName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={bank.accountNumber || ''}
                          onChange={(e) => handleBankChange(index, 'accountNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Loan Type
                        </label>
                        <input
                          type="text"
                          value={bank.loanType || ''}
                          onChange={(e) => handleBankChange(index, 'loanType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Loan Amount (₹)
                        </label>
                        <input
                          type="text"
                          value={bank.loanAmount || ''}
                          onChange={(e) => handleBankChange(index, 'loanAmount', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Notes Section */}
              <div className="col-span-2">
                <h4 className="text-lg font-semibold mt-4 mb-3 border-b pb-2 dark:text-white">
                  Additional Information
                </h4>
              </div>
              
              <div className="col-span-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={formData.remarks || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client Queries
                  </label>
                  <textarea
                    name="queries"
                    value={formData.queries || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sales Notes
                  </label>
                  <textarea
                    name="salesNotes"
                    value={formData.salesNotes || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  ></textarea>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <FaSave className="mr-2" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 