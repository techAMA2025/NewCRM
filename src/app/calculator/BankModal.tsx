import React from 'react'

interface Bank {
  id: string
  bankName: string
  loanType: string
  loanAmount: string
}

interface BankModalProps {
  onClose: () => void
  onAddBank: (bank: Bank) => void
  calculatorType: 'settle' | 'billcut'
}

const BankModal: React.FC<BankModalProps> = ({ onClose, onAddBank, calculatorType }) => {
  const [bank, setBank] = React.useState<Bank>({
    id: `bank-${Date.now()}`,
    bankName: '',
    loanType: '',
    loanAmount: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddBank(bank)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Add Bank Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bank Name
            </label>
            <input
              type="text"
              value={bank.bankName}
              onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Loan Type
            </label>
            <select
              value={bank.loanType}
              onChange={(e) => setBank({ ...bank, loanType: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Select type</option>
              <option value="Personal Loan">Personal Loan</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Business Loan">Business Loan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {bank.loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount'}
            </label>
            <input
              type="text"
              value={bank.loanAmount}
              onChange={(e) => setBank({ ...bank, loanAmount: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="₹"
              required
            />
            <p className="mt-1 text-xs text-amber-400">Please enter numbers only (no commas)</p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Add Bank
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BankModal 