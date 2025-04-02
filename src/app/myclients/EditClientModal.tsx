import React, { useState, useEffect } from 'react'
import { Lead } from './types/lead'

interface EditClientModalProps {
  lead: Lead
  saving: boolean
  saveError: string | null
  saveSuccess: boolean
  onClose: () => void
  onSave: (lead: Lead) => void
  onAddBank: () => void
  onUpdateBank: (bankId: string, field: string, value: string) => void
  onRemoveBank: (bankId: string) => void
}

const EditClientModal = ({ 
  lead: initialLead, 
  saving, 
  saveError, 
  saveSuccess, 
  onClose, 
  onSave, 
  onAddBank, 
  onUpdateBank, 
  onRemoveBank 
}: EditClientModalProps) => {
  // Create a state copy of the lead to track changes
  const [lead, setLead] = useState<Lead>({...initialLead});
  
  // Update local lead state when initialLead changes
  useEffect(() => {
    setLead({...initialLead});
  }, [initialLead]);
  
  // Handle field changes
  const handleFieldChange = (field: keyof Lead, value: any) => {
    setLead(prevLead => ({
      ...prevLead,
      [field]: value
    }));
  };

  // Handle adding a bank locally
  const handleAddBank = () => {
    const newBank = {
      id: `bank-${Date.now()}`,
      bankName: '',
      loanType: '',
      accountNumber: '',
      loanAmount: ''
    };
    
    setLead(prevLead => ({
      ...prevLead,
      banks: [...(prevLead.banks || []), newBank]
    }));
  };

  // Handle updating a bank locally
  const handleUpdateBank = (bankId: string, field: string, value: string) => {
    setLead(prevLead => ({
      ...prevLead,
      banks: (prevLead.banks || []).map(bank => 
        bank.id === bankId ? { ...bank, [field]: value } : bank
      )
    }));
  };

  // Handle removing a bank locally
  const handleRemoveBank = (bankId: string) => {
    setLead(prevLead => ({
      ...prevLead,
      banks: (prevLead.banks || []).filter(bank => bank.id !== bankId)
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Log the lead object to see what's being sent
    console.log('Submitting lead:', lead);
    onSave(lead);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              {lead.id.startsWith('new-') ? 'Add New Client' : 'Edit Client Details'}
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
              Client saved successfully!
            </div>
          )}

          {saveError && (
            <div className="mb-4 bg-red-900 border border-red-700 text-red-100 p-3 rounded-md">
              {saveError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Personal Information */}
              <FormSection title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    id="name"
                    label="Name*"
                    value={lead.name || ''}
                    onChange={(value) => handleFieldChange('name', value)}
                    required
                  />
                  <InputField
                    id="email"
                    label="Email"
                    type="email"
                    value={lead.email || ''}
                    onChange={(value) => handleFieldChange('email', value)}
                  />
                  <InputField
                    id="phone"
                    label="Phone*"
                    value={lead.phone || ''}
                    onChange={(value) => handleFieldChange('phone', value)}
                    required
                  />
                  <InputField
                    id="city"
                    label="City"
                    value={lead.city || ''}
                    onChange={(value) => handleFieldChange('city', value)}
                  />
                  <InputField
                    id="occupation"
                    label="Occupation"
                    value={lead.occupation || ''}
                    onChange={(value) => handleFieldChange('occupation', value)}
                  />
                  <InputField
                    id="aadharNumber"
                    label="Aadhar Card Number"
                    value={lead.aadharNumber || ''}
                    onChange={(value) => handleFieldChange('aadharNumber', value)}
                  />
                </div>
              </FormSection>

              {/* Financial Information */}
              <FormSection title="Financial Information">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    id="personalLoanDues"
                    label="Personal Loan Dues"
                    value={lead.personalLoanDues || ''}
                    onChange={(value) => handleFieldChange('personalLoanDues', value)}
                    placeholder="₹"
                  />
                  <InputField
                    id="creditCardDues"
                    label="Credit Card Dues"
                    value={lead.creditCardDues || ''}
                    onChange={(value) => handleFieldChange('creditCardDues', value)}
                    placeholder="₹"
                  />
                  <InputField
                    id="monthlyIncome"
                    label="Monthly Income"
                    value={lead.monthlyIncome || ''}
                    onChange={(value) => handleFieldChange('monthlyIncome', value)}
                    placeholder="₹"
                  />
                </div>
              </FormSection>

              {/* Fee Details */}
              <FormSection title="Fee Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    id="tenure"
                    label="Tenure (months)"
                    type="number"
                    value={lead.tenure || ''}
                    onChange={(value) => handleFieldChange('tenure', value)}
                  />
                  <InputField
                    id="monthlyFees"
                    label="Monthly Fees"
                    value={lead.monthlyFees || ''}
                    onChange={(value) => handleFieldChange('monthlyFees', value)}
                    placeholder="₹"
                  />
                  <InputField
                    id="startDate"
                    label="Start Date of Service"
                    type="date"
                    value={lead.startDate || ''}
                    onChange={(value) => handleFieldChange('startDate', value)}
                  />
                </div>
              </FormSection>

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

                {lead.banks && lead.banks.length > 0 ? (
                  <div className="space-y-4">
                    {lead.banks.map((bank: any) => (
                      <BankForm 
                        key={bank.id}
                        bank={bank}
                        onUpdate={handleUpdateBank}
                        onRemove={handleRemoveBank}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 text-center">
                    <p className="text-gray-400">No bank details added yet. Click "Add Bank" to add details.</p>
                  </div>
                )}
              </div>

              {/* Notes & Remarks */}
              <FormSection title="Notes & Remarks">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-400">Client Message/Query</label>
                    <textarea
                      id="remarks"
                      value={lead.remarks || ''}
                      onChange={(e) => handleFieldChange('remarks', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="salesNotes" className="block text-sm font-medium text-gray-400">Sales Notes</label>
                    <textarea
                      id="salesNotes"
                      value={lead.salesNotes || ''}
                      onChange={(e) => handleFieldChange('salesNotes', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
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
                  ) : 'Save Client'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface FormSectionProps {
  title: string
  children: React.ReactNode
}

const FormSection = ({ title, children }: FormSectionProps) => (
  <div>
    <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">{title}</h3>
    <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
      {children}
    </div>
  </div>
)

interface InputFieldProps {
  id: string
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}

const InputField = ({ id, label, value, onChange, type = 'text', required = false, placeholder }: InputFieldProps) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-400">{label}</label>
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      required={required}
      placeholder={placeholder}
    />
  </div>
)

interface BankFormProps {
  bank: any
  onUpdate: (bankId: string, field: string, value: string) => void
  onRemove: (bankId: string) => void
}

const BankForm = ({ bank, onUpdate, onRemove }: BankFormProps) => (
  <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
    <div className="flex justify-between items-center mb-3">
      <h4 className="text-sm font-medium text-gray-300">Bank Information</h4>
      <button
        type="button"
        onClick={() => onRemove(bank.id)}
        className="text-red-400 hover:text-red-300"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor={`bankName-${bank.id}`} className="block text-sm font-medium text-gray-400">Bank Name</label>
        <input
          type="text"
          id={`bankName-${bank.id}`}
          value={bank.bankName || ''}
          onChange={(e) => onUpdate(bank.id, 'bankName', e.target.value)}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor={`loanType-${bank.id}`} className="block text-sm font-medium text-gray-400">Loan Type</label>
        <select
          id={`loanType-${bank.id}`}
          value={bank.loanType || ''}
          onChange={(e) => onUpdate(bank.id, 'loanType', e.target.value)}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select Type</option>
          <option value="Personal Loan">Personal Loan</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Home Loan">Home Loan</option>
          <option value="Auto Loan">Auto Loan</option>
          <option value="Business Loan">Business Loan</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label 
          htmlFor={`accountNumber-${bank.id}`} 
          className="block text-sm font-medium text-gray-400"
        >
          {bank.loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number'}
        </label>
        <input
          type="text"
          id={`accountNumber-${bank.id}`}
          value={bank.accountNumber || ''}
          onChange={(e) => onUpdate(bank.id, 'accountNumber', e.target.value)}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label 
          htmlFor={`loanAmount-${bank.id}`} 
          className="block text-sm font-medium text-gray-400"
        >
          {bank.loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount'}
        </label>
        <input
          type="text"
          id={`loanAmount-${bank.id}`}
          value={bank.loanAmount || ''}
          onChange={(e) => onUpdate(bank.id, 'loanAmount', e.target.value)}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="₹"
        />
      </div>
    </div>
  </div>
)

export default EditClientModal