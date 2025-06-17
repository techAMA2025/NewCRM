'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import BillcutSidebar from '@/components/navigation/BillcutSidebar';
import { FiSearch, FiDownload, FiFilter } from 'react-icons/fi';

interface Payment {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  timestamp: string;
  amount: string;
}

const BillcutPaymentReport = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('userRole') || '';
    setUserRole(role);

    // Fetch payments data
    const fetchPayments = async () => {
      try {
        const paymentsRef = collection(db, 'payments');
        const q = query(paymentsRef, where('source', '==', 'billcut'));
        const querySnapshot = await getDocs(q);
        
        const paymentsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            clientName: data.clientName || '',
            clientPhone: data.clientPhone || '',
            clientEmail: data.clientEmail || '',
            timestamp: data.timestamp || '',
            amount: data.amount || ''
          };
        });
        
        setPayments(paymentsData);
        setFilteredPayments(paymentsData);
      } catch (error) {
        console.error('Error fetching payments:', error);
      }
    };

    fetchPayments();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...payments];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.clientName.toLowerCase().includes(searchLower) ||
        payment.clientEmail.toLowerCase().includes(searchLower) ||
        payment.clientPhone.includes(searchTerm)
      );
    }

    // Apply date range filter
    if (startDate) {
      filtered = filtered.filter(payment => 
        new Date(payment.timestamp) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(payment => 
        new Date(payment.timestamp) <= new Date(endDate)
      );
    }

    setFilteredPayments(filtered);
  }, [searchTerm, startDate, endDate, payments]);

  // Calculate total amount
  const totalAmount = filteredPayments.reduce((sum, payment) => 
    sum + parseFloat(payment.amount), 0
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Client Name', 'Phone', 'Email', 'Date', 'Amount'];
    const csvData = filteredPayments.map(payment => [
      payment.clientName,
      payment.clientPhone,
      payment.clientEmail,
      formatDate(payment.timestamp),
      payment.amount
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `billcut-payments-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {userRole === 'overlord' ? <OverlordSidebar /> : <BillcutSidebar />}
      
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Billcut Payment Report</h1>
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FiDownload className="mr-2" />
              Export CSV
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Total Amount</h3>
              <p className="text-2xl font-bold text-blue-700">₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600">Total Payments</h3>
              <p className="text-2xl font-bold text-green-700">{filteredPayments.length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <FiFilter className="mr-2" />
                Filters
              </button>
            </div>

            {/* Date Range Filters */}
            {isFilterOpen && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.clientPhone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.clientEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* No Results Message */}
          {filteredPayments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No payments found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillcutPaymentReport;
