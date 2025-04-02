import React from 'react';
import InputField from './InputField';

interface BankFormProps {
  bank: {
    id: string;
    bankName: string;
    loanType: string;
    accountNumber: string;
    loanAmount: string;
  };
  onUpdate: (bankId: string, field: string, value: string) => void;
  onRemove: (bankId: string) => void;
}

const BankForm = ({ bank, onUpdate, onRemove }: BankFormProps) => {
  return (
    <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 relative">
      <button
        type="button"
        onClick={() => onRemove(bank.id)}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-400"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id={`bank-${bank.id}-name`}
          label="Bank Name"
          value={bank.bankName}
          onChange={(value) => onUpdate(bank.id, 'bankName', value)}
        />
        <InputField
          id={`bank-${bank.id}-account`}
          label="Account Number"
          value={bank.accountNumber}
          onChange={(value) => onUpdate(bank.id, 'accountNumber', value)}
        />
        <div>
          <label htmlFor={`bank-${bank.id}-type`} className="block text-sm font-medium text-gray-400 mb-1">
            Loan Type
          </label>
          <select
            id={`bank-${bank.id}-type`}
            value={bank.loanType || ''}
            onChange={(e) => onUpdate(bank.id, 'loanType', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
        <InputField
          id={`bank-${bank.id}-amount`}
          label="Loan Amount"
          value={bank.loanAmount}
          onChange={(value) => onUpdate(bank.id, 'loanAmount', value)}
          placeholder="₹"
        />
      </div>
    </div>
  );
};

export default BankForm; 