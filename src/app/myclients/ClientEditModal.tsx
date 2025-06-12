'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { FaTimes, FaSave, FaExclamationTriangle, FaPlus } from 'react-icons/fa';

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
  altPhone: string;
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
        altPhone: client.altPhone || '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { name: string; value: string }) => {
    if ('target' in e) {
      // This is a regular DOM event
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      // This is a direct {name, value} object
      const { name, value } = e;
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center overflow-y-auto">
      <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              Edit Client: {client.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <FaTimes className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-800 text-red-100 rounded-md">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-800 text-green-100 rounded-md">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
              <FormSection title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    id="name"
                    label="Full Name"
                    value={formData.name || ''}
                    onChange={(value) => handleChange({ name: 'name', value })}
                    required
                  />
                  <InputField
                    id="email"
                    label="Email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(value) => handleChange({ name: 'email', value })}
                    required
                  />
                  <InputField
                    id="phone"
                    label="Phone"
                    value={formData.phone || ''}
                    onChange={(value) => handleChange({ name: 'phone', value })}
                    type="tel"
                    required
                  />
                  <InputField
                    id="altPhone"
                    label="Alternate Phone"
                    value={formData.altPhone || ''}
                    onChange={(value) => handleChange({ name: 'altPhone', value })}
                    type="tel"
                  />
                  <InputField
                    id="city"
                    label="City"
                    value={formData.city || ''}
                    onChange={(value) => handleChange({ name: 'city', value })}
                  />
                  <InputField
                    id="occupation"
                    label="Occupation"
                    value={formData.occupation || ''}
                    onChange={(value) => handleChange({ name: 'occupation', value })}
                  />
                  <InputField
                    id="aadharNumber"
                    label="Aadhar Number"
                    value={formData.aadharNumber || ''}
                    onChange={(value) => handleChange({ name: 'aadharNumber', value })}
                  />
                  <InputField
                    id="status"
                    label="Status"
                    value={formData.status || ''}
                    onChange={(value) => handleChange({ name: 'status', value })}
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="Converted">Converted</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </InputField>
                  <InputField
                    id="source_database"
                    label="Source"
                    value={formData.source_database || ''}
                    onChange={(value) => handleChange({ name: 'source_database', value })}
                    required
                  >
                    <option value="">Select Source</option>
                    <option value="credsettlee">Cred Settle</option>
                    <option value="ama">AMA</option>
                    <option value="settleloans">Settle Loans</option>
                    <option value="billcut">Bill Cut</option>
                  </InputField>
                </div>
              </FormSection>

              <FormSection title="Financial Information">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    id="monthlyIncome"
                    label="Monthly Income"
                    value={formData.monthlyIncome || ''}
                    onChange={(value) => handleChange({ name: 'monthlyIncome', value })}
                    placeholder="₹"
                  />
                  <InputField
                    id="monthlyFees"
                    label="Monthly Fees"
                    value={formData.monthlyFees || ''}
                    onChange={(value) => handleChange({ name: 'monthlyFees', value })}
                    placeholder="₹"
                  />
                  <InputField
                    id="creditCardDues"
                    label="Credit Card Dues"
                    value={formData.creditCardDues || ''}
                    onChange={(value) => handleChange({ name: 'creditCardDues', value })}
                    placeholder="₹"
                  />
                  <InputField
                    id="personalLoanDues"
                    label="Personal Loan Dues"
                    value={formData.personalLoanDues || ''}
                    onChange={(value) => handleChange({ name: 'personalLoanDues', value })}
                    placeholder="₹"
                  />
                  <InputField
                    id="tenure"
                    label="Tenure"
                    value={formData.tenure || ''}
                    onChange={(value) => handleChange({ name: 'tenure', value })}
                  />
                </div>
              </FormSection>

              <FormSection title="Bank Information">
                <div className="space-y-4">
                  {banks.map((bank, index) => (
                    <BankForm
                      key={bank.id}
                      bank={bank}
                      onUpdate={(field, value) => handleBankChange(index, field as keyof Bank, value)}
                      onRemove={() => removeBank(index)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addBank}
                    className="mt-5 inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FaPlus className="-ml-1 mr-1 h-4 w-4" />
                    Add Bank
                  </button>
                </div>
              </FormSection>

              <FormSection title="Additional Information">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Client Remarks
                    </label>
                    <textarea
                      name="remarks"
                      value={formData.remarks || ''}
                      onChange={(e) => handleChange({ name: 'remarks', value: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Client Queries
                    </label>
                    <textarea
                      name="queries"
                      value={formData.queries || ''}
                      onChange={(e) => handleChange({ name: 'queries', value: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Sales Notes
                    </label>
                    <textarea
                      name="salesNotes"
                      value={formData.salesNotes || ''}
                      onChange={(e) => handleChange({ name: 'salesNotes', value: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                  </div>
                </div>
              </FormSection>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                      {/* Spinner SVG */}
                    </div>
                    Saving...
                  </span>
                ) : (
                  <>
                    <FaSave className="mr-2" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Add these new components
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

const FormSection = ({ title, children }: FormSectionProps) => (
  <div>
    <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">{title}</h3>
    <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
      {children}
    </div>
  </div>
);

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
}

const InputField = ({ id, label, value, onChange, type = 'text', required = false, placeholder, children }: InputFieldProps) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-400">{label}</label>
    {children ? (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        required={required}
      >
        {children}
      </select>
    ) : (
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        required={required}
        placeholder={placeholder}
      />
    )}
  </div>
);

interface BankFormProps {
  bank: Bank;
  onUpdate: (field: keyof Bank, value: string) => void;
  onRemove: () => void;
}

const BankForm = ({ bank, onUpdate, onRemove }: BankFormProps) => (
  <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
    <div className="flex justify-between items-center mb-2">
      <h5 className="font-medium dark:text-white">Bank #{bank.id}</h5>
      <button
        type="button"
        onClick={onRemove}
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
          onChange={(e) => onUpdate('bankName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Loan Type
        </label>
        <select
          value={bank.loanType || ''}
          onChange={(e) => onUpdate('loanType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Select type</option>
          <option value="Personal Loan">Personal Loan</option>
          <option value="Home Loan">Home Loan</option>
          <option value="Car Loan">Car Loan</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Business Loan">Business Loan</option>
          <option value="Education Loan">Education Loan</option>
          <option value="Gold Loan">Gold Loan</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {bank.loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number'}
        </label>
        <input
          type="text"
          value={bank.accountNumber || ''}
          onChange={(e) => onUpdate('accountNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {bank.loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount'} (₹)
        </label>
        <input
          type="text"
          value={bank.loanAmount || ''}
          onChange={(e) => onUpdate('loanAmount', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
    </div>
  </div>
); 