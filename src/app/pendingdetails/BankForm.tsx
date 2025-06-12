import React, { useState } from 'react';
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
  const getLabelText = (fieldType: string, loanType: string) => {
    if (fieldType === 'accountNumber') {
      return loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number';
    } else if (fieldType === 'loanAmount') {
      return loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount';
    }
    return '';
  };

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
        <div>
          <label htmlFor={`bank-${bank.id}-name`} className="block text-sm font-medium text-gray-400 mb-1">Bank Name</label>
          <input
            id={`bank-${bank.id}-name`}
            type="text"
            value={bank.bankName}
            onChange={(e) => onUpdate(bank.id, 'bankName', e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor={`bank-${bank.id}-loanType`} className="block text-sm font-medium text-gray-400 mb-1">Loan Type</label>
          <select
            id={`bank-${bank.id}-loanType`}
            value={bank.loanType}
            onChange={(e) => onUpdate(bank.id, 'loanType', e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Loan Type</option>
            <option value="Personal Loan">Personal Loan</option>
            <option value="Car Loan">Car Loan</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Business Loan">Business Loan</option>
            <option value="Education Loan">Education Loan</option>
            <option value="Gold Loan">Gold Loan</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label 
            htmlFor={`bank-${bank.id}-accountNumber`}
            className="block text-sm font-medium text-gray-400 mb-1"
          >
            {getLabelText('accountNumber', bank.loanType)}
          </label>
          <input
            id={`bank-${bank.id}-accountNumber`}
            type="text"
            value={bank.accountNumber}
            onChange={(e) => onUpdate(bank.id, 'accountNumber', e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label 
            htmlFor={`bank-${bank.id}-amount`}
            className="block text-sm font-medium text-gray-400 mb-1"
          >
            {getLabelText('loanAmount', bank.loanType)}
          </label>
          <input
            id={`bank-${bank.id}-amount`}
            type="text"
            value={bank.loanAmount}
            onChange={(e) => onUpdate(bank.id, 'loanAmount', e.target.value)}
            placeholder="₹"
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default BankForm; 