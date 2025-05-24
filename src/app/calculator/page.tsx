'use client'

import React, { useState } from 'react'
import SalesSidebar from '@/components/navigation/SalesSidebar'
import { FaCalculator, FaPlus, FaTrash } from 'react-icons/fa'
import BankModal from './BankModal'

interface Bank {
  id: string
  bankName: string
  loanType: string
  loanAmount: string
}

const CalculatorPage = () => {
  // State for modals
  const [showSettleBankModal, setShowSettleBankModal] = useState(false)
  const [showBillcutBankModal, setShowBillcutBankModal] = useState(false)

  // State for banks
  const [settleBanks, setSettleBanks] = useState<Bank[]>([])
  const [billcutBanks, setBillcutBanks] = useState<Bank[]>([])

  // State for tenure and sign up fees
  const [tenure, setTenure] = useState('5')
  const [settleSignUpFees, setSettleSignUpFees] = useState('3000')

  // Calculations for Settle Loans
  const calculateSettleLoans = () => {
    const total = settleBanks.reduce((sum, bank) => {
      return sum + (parseFloat(bank.loanAmount.replace(/,/g, '')) || 0)
    }, 0)

    const signUpFees = parseFloat(settleSignUpFees.replace(/,/g, '')) || 0
    const settlement = total * 0.5
    const netPayToBank = total * 0.4
    const ourFees = total * 0.1
    const monthlyFees = ourFees / parseInt(tenure)

    return {
      total,
      signUpFees,
      settlement,
      netPayToBank,
      ourFees,
      monthlyFees
    }
  }

  // Calculations for Billcut
  const calculateBillcut = () => {
    const total = billcutBanks.reduce((sum, bank) => {
      return sum + (parseFloat(bank.loanAmount.replace(/,/g, '')) || 0)
    }, 0)

    // Calculate sign up fees based on total amount
    const signUpFees = total < 400000 ? 8000 : total * 0.02
    const settlement = total * 0.5
    const netPayToBank = total * 0.35
    const ourFees = total * 0.15

    return {
      total,
      settlement,
      netPayToBank,
      ourFees,
      signUpFees
    }
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num))
  }

  const handleAddSettleBank = (bank: Bank) => {
    setSettleBanks(prev => [...prev, bank])
  }

  const handleAddBillcutBank = (bank: Bank) => {
    setBillcutBanks(prev => [...prev, bank])
  }

  const handleRemoveSettleBank = (bankId: string) => {
    setSettleBanks(prev => prev.filter(bank => bank.id !== bankId))
  }

  const handleRemoveBillcutBank = (bankId: string) => {
    setBillcutBanks(prev => prev.filter(bank => bank.id !== bankId))
  }

  const settleResults = calculateSettleLoans()
  const billcutResults = calculateBillcut()

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <SalesSidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white flex items-center">
          <FaCalculator className="mr-3" />
          Financial Calculators
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Settle Loans Calculator */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Settle Loans Calculator</h2>
              <button
                onClick={() => setShowSettleBankModal(true)}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <FaPlus className="mr-2" />
                Add Bank
              </button>
            </div>

            {/* Banks List */}
            <div className="mb-6 space-y-3">
              {settleBanks.map(bank => (
                <div key={bank.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{bank.bankName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {bank.loanType} - ₹{formatNumber(parseFloat(bank.loanAmount))}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveSettleBank(bank.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              {settleBanks.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No banks added yet. Click "Add Bank" to get started.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenure (Months)</label>
                <input
                  type="number"
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sign Up Fees</label>
                <input
                  type="text"
                  value={settleSignUpFees}
                  onChange={(e) => setSettleSignUpFees(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="₹"
                />
                <p className="mt-1 text-xs text-amber-400">Please enter numbers only (no commas)</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(settleResults.total)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Sign Up Fees</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(settleResults.signUpFees)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Settlement (50%)</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(settleResults.settlement)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Net Pay to Bank (40%)</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(settleResults.netPayToBank)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Our Fees (10%)</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(settleResults.ourFees)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Monthly Fees</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(settleResults.monthlyFees)}</span>
              </div>
            </div>
          </div>

          {/* Billcut Calculator */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Billcut Calculator</h2>
              <button
                onClick={() => setShowBillcutBankModal(true)}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <FaPlus className="mr-2" />
                Add Bank
              </button>
            </div>

            {/* Banks List */}
            <div className="mb-6 space-y-3">
              {billcutBanks.map(bank => (
                <div key={bank.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{bank.bankName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {bank.loanType} - ₹{formatNumber(parseFloat(bank.loanAmount))}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveBillcutBank(bank.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              {billcutBanks.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No banks added yet. Click "Add Bank" to get started.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(billcutResults.total)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Settlement (50%)</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(billcutResults.settlement)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Net Pay to Bank (35%)</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(billcutResults.netPayToBank)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Our Fees (15%)</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(billcutResults.ourFees)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">
                  Sign Up Fees {billcutResults.total < 400000 ? '(₹8,000 flat)' : '(2%)'}
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(billcutResults.signUpFees)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Modals */}
        {showSettleBankModal && (
          <BankModal
            onClose={() => setShowSettleBankModal(false)}
            onAddBank={handleAddSettleBank}
            calculatorType="settle"
          />
        )}
        {showBillcutBankModal && (
          <BankModal
            onClose={() => setShowBillcutBankModal(false)}
            onAddBank={handleAddBillcutBank}
            calculatorType="billcut"
          />
        )}
      </div>
    </div>
  )
}

export default CalculatorPage
