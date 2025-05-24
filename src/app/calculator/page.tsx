'use client'

import React, { useState } from 'react'
import SalesSidebar from '@/components/navigation/SalesSidebar'
import { FaCalculator } from 'react-icons/fa'

const CalculatorPage = () => {
  // State for Settle Loans Calculator
  const [totalAmountSettle, setTotalAmountSettle] = useState('')
  const [signUpFees, setSignUpFees] = useState('3000')
  const [tenure, setTenure] = useState('5')

  // State for Billcut Calculator
  const [totalAmountBillcut, setTotalAmountBillcut] = useState('')

  // Calculations for Settle Loans
  const calculateSettleLoans = () => {
    const total = parseFloat(totalAmountSettle.replace(/,/g, '')) || 0
    const settlement = total * 0.5
    const netPayToBank = total * 0.4
    const ourFees = total * 0.1
    const monthlyFees = ourFees / parseInt(tenure)

    return {
      settlement,
      netPayToBank,
      ourFees,
      monthlyFees
    }
  }

  // Calculations for Billcut
  const calculateBillcut = () => {
    const total = parseFloat(totalAmountBillcut.replace(/,/g, '')) || 0
    const settlement = total * 0.5
    const netPayToBank = total * 0.35
    const ourFees = total * 0.15
    const signUpFees = total * 0.02

    return {
      settlement,
      netPayToBank,
      ourFees,
      signUpFees
    }
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num))
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
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Settle Loans Calculator</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount</label>
                <input
                  type="text"
                  value={totalAmountSettle}
                  onChange={(e) => setTotalAmountSettle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter total amount"
                />
              </div>
             
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

              <div className="mt-6 space-y-3">
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
          </div>

          {/* Billcut Calculator */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Billcut Calculator</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount</label>
                <input
                  type="text"
                  value={totalAmountBillcut}
                  onChange={(e) => setTotalAmountBillcut(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter total amount"
                />
              </div>

              <div className="mt-6 space-y-3">
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
                  <span className="text-gray-600 dark:text-gray-400">Sign Up Fees (2%)</span>
                  <span className="font-semibold text-gray-800 dark:text-white">₹{formatNumber(billcutResults.signUpFees)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalculatorPage
