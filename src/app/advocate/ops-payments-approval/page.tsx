'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiAlertTriangle, FiPhone, FiUser, FiX, FiEdit, FiTrash2, FiSearch, FiFilter, FiDollarSign, FiSun, FiMoon } from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';
import { collection, getDocs, doc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar';
import { useRouter } from 'next/navigation';

interface OpsPayment {
  id: string;
  name: string;
  phoneNumber: string;
  amount: string;
  source: string;
  type: string;
  miscellaneousDetails?: string;
  submittedBy: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  edited_by?: string | null;
  edited_at?: string;
}

export default function OpsPaymentsApprovalPage() {
  const [opsPaymentRequests, setOpsPaymentRequests] = useState<OpsPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [confirmingRequest, setConfirmingRequest] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [deletingRequest, setDeletingRequest] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('current');
  const [typeFilter, setTypeFilter] = useState('all');
  const [submittedByFilter, setSubmittedByFilter] = useState('all');
  const [uniqueSubmitters, setUniqueSubmitters] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check user authentication and role
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    setUserRole(role);
    setUserName(name);

    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    setIsDarkMode(shouldUseDark);
    
    if (shouldUseDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Redirect if user is not admin, overlord, or advocate
    if (role !== 'admin' && role !== 'overlord' && role !== 'advocate') {
      router.push('/dashboard');
      return;
    }

    // Fetch ops payment requests
    fetchOpsPaymentRequests();
  }, [router]);

  useEffect(() => {
    // Extract unique submitters from ops payment requests
    const submitters = [...new Set(opsPaymentRequests.map(req => req.submittedBy))].sort();
    setUniqueSubmitters(submitters);
  }, [opsPaymentRequests]);

  const fetchOpsPaymentRequests = async () => {
    try {
      setLoading(true);
      const opsPaymentsRef = collection(db, 'ops_payments');
      const opsPaymentsSnap = await getDocs(opsPaymentsRef);
      
      const requests = opsPaymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OpsPayment[];
      
      setOpsPaymentRequests(requests);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching ops payment requests:', err);
      setError('Failed to load ops payment requests');
      setLoading(false);
    }
  };

  const initiateApproval = (requestId: string) => {
    setConfirmingRequest(requestId);
  };

  const cancelApproval = () => {
    setConfirmingRequest(null);
  };

  const handleApprove = async (requestId: string) => {
    try {
      if (!userName) {
        setError('User information not found');
        return;
      }

      const paymentRef = doc(db, 'ops_payments', requestId);
      await updateDoc(paymentRef, {
        status: 'approved',
        approvedBy: userName,
        approvedAt: new Date().toISOString()
      });

      // Update the local state
      setOpsPaymentRequests(opsPaymentRequests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved', approvedBy: userName, approvedAt: new Date().toISOString() } 
          : req
      ));
      
      // Clear the confirming state
      setConfirmingRequest(null);
    } catch (err) {
      console.error('Error approving ops payment:', err);
      setError('Failed to approve ops payment');
      setConfirmingRequest(null);
    }
  };

  const initiateReject = (requestId: string) => {
    setRejectingRequest(requestId);
  };

  const cancelReject = () => {
    setRejectingRequest(null);
  };

  const handleReject = async (requestId: string) => {
    try {
      if (!userName) {
        setError('User information not found');
        return;
      }

      const paymentRef = doc(db, 'ops_payments', requestId);
      await updateDoc(paymentRef, {
        status: 'rejected',
        rejectedBy: userName,
        rejectedAt: new Date().toISOString()
      });

      // Update the local state
      setOpsPaymentRequests(opsPaymentRequests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'rejected', rejectedBy: userName, rejectedAt: new Date().toISOString() } 
          : req
      ));
      
      // Clear the rejecting state
      setRejectingRequest(null);
    } catch (err) {
      console.error('Error rejecting ops payment:', err);
      setError('Failed to reject ops payment');
      setRejectingRequest(null);
    }
  };

  const initiateEdit = (requestId: string, currentAmount: string) => {
    setEditingRequest(requestId);
    setEditAmount(currentAmount);
  };

  const cancelEdit = () => {
    setEditingRequest(null);
    setEditAmount('');
  };

  const handleEdit = async (requestId: string) => {
    try {
      if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      const newAmount = Number(editAmount);

      const paymentRef = doc(db, 'ops_payments', requestId);
      await updateDoc(paymentRef, {
        amount: newAmount.toString(),
        edited_by: userName,
        edited_at: new Date().toISOString()
      });

      // Update the local state
      setOpsPaymentRequests(opsPaymentRequests.map(req => 
        req.id === requestId 
          ? { ...req, amount: newAmount.toString(), edited_by: userName, edited_at: new Date().toISOString() } 
          : req
      ));
      
      // Clear the editing state
      setEditingRequest(null);
      setEditAmount('');
    } catch (err) {
      console.error('Error editing ops payment:', err);
      setError('Failed to edit ops payment amount');
      setEditingRequest(null);
    }
  };

  const initiateDelete = (requestId: string) => {
    setDeletingRequest(requestId);
  };

  const cancelDelete = () => {
    setDeletingRequest(null);
  };

  const handleDelete = async (requestId: string) => {
    try {
      // Delete the ops payment request from Firestore
      const paymentRef = doc(db, 'ops_payments', requestId);
      await deleteDoc(paymentRef);

      // Update the local state by removing the deleted request
      setOpsPaymentRequests(opsPaymentRequests.filter(req => req.id !== requestId));
      
      // Clear the deleting state
      setDeletingRequest(null);
    } catch (err) {
      console.error('Error deleting ops payment request:', err);
      setError('Failed to delete ops payment request');
      setDeletingRequest(null);
    }
  };

  const filteredRequests = useMemo(() => {
    return opsPaymentRequests.filter(request => {
      const matchesSearch = 
        request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.phoneNumber.includes(searchTerm) ||
        request.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSource = sourceFilter === 'all' || request.source === sourceFilter;
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesSubmittedBy = submittedByFilter === 'all' || request.submittedBy === submittedByFilter;
      const matchesType = typeFilter === 'all' || request.type === typeFilter;
      
      let matchesDate = true;
      const requestDate = new Date(request.timestamp);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
      const sevenDaysAgo = new Date(today.setDate(today.getDate() - 7));
      
      if (dateFilter === 'last7days') {
        matchesDate = requestDate >= sevenDaysAgo;
      } else if (dateFilter === 'last30days') {
        matchesDate = requestDate >= thirtyDaysAgo;
      }

      // Add month filter logic
      let matchesMonth = true;
      if (monthFilter !== 'all') {
        const currentDate = new Date();
        const requestMonth = requestDate.getMonth();
        const requestYear = requestDate.getFullYear();
        
        if (monthFilter === 'current') {
          // Current month
          matchesMonth = 
            requestMonth === currentDate.getMonth() && 
            requestYear === currentDate.getFullYear();
        } else {
          // Specific month selected in format "month-year" (e.g., "3-2023")
          const [selectedMonth, selectedYear] = monthFilter.split('-').map(Number);
          matchesMonth = 
            requestMonth === selectedMonth && 
            requestYear === selectedYear;
        }
      }

      return matchesSearch && matchesSource && matchesStatus && matchesDate && matchesMonth && matchesType && matchesSubmittedBy;
    });
  }, [opsPaymentRequests, searchTerm, sourceFilter, statusFilter, dateFilter, monthFilter, typeFilter, submittedByFilter]);

  // Calculate total amount for filtered requests (excluding rejected)
  const totalAmount = useMemo(() => {
    return filteredRequests
      .filter(request => request.status !== 'rejected')
      .reduce((total, request) => total + Number(request.amount), 0);
  }, [filteredRequests]);

  const pendingRequests = filteredRequests
    .filter(req => req.status === 'pending')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
  const approvedRequests = filteredRequests
    .filter(req => req.status === 'approved')
    .sort((a, b) => new Date(b.approvedAt!).getTime() - new Date(a.approvedAt!).getTime());

  const rejectedRequests = filteredRequests
    .filter(req => req.status === 'rejected')
    .sort((a, b) => new Date(b.rejectedAt!).getTime() - new Date(a.rejectedAt!).getTime());

  if (userRole !== 'admin' && userRole !== 'overlord' && userRole !== 'advocate') {
    return null; // Don't render anything while redirecting
  }

  const renderSidebar = () => {
    if (userRole === 'advocate') {
      return <AdvocateSidebar />;
    } else if (userRole === 'overlord') {
      return <OverlordSidebar />;
    } else {
      return <AdminSidebar />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-700/30 dark:text-emerald-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-400';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-700/30 dark:text-amber-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Client visit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-700/30 dark:text-blue-400';
      case 'Arbitration':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-700/30 dark:text-purple-400';
      case 'Fees':
        return 'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-400';
      case 'Miscellaneous':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400';
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      return newMode;
    });
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900 dark:to-violet-900">
      {renderSidebar()}
      <div className="flex-1 overflow-auto p-6">
        <div className="w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-purple-800 dark:text-purple-200 flex items-center">
                <BiRupee className="mr-3" />
                Ops Payment Approval Requests
              </h1>
              <p className="text-purple-600 dark:text-purple-300 text-sm mt-1">Manage operational payment requests</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleDarkMode}
                className="bg-white dark:bg-purple-800/50 rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 border border-purple-200 dark:border-purple-700 group"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <FiSun className="text-purple-600 dark:text-purple-300 group-hover:text-amber-500 transition-colors" size={18} />
                ) : (
                  <FiMoon className="text-purple-600 dark:text-purple-300 group-hover:text-indigo-500 transition-colors" size={18} />
                )}
              </button>
              
              <div className="bg-white dark:bg-purple-800/50 rounded-xl px-4 py-2 shadow-sm">
                <span className="text-purple-600 dark:text-purple-300 text-xs">Total Requests: </span>
                <span className="text-purple-800 dark:text-white font-semibold">{filteredRequests.length}</span>
              </div>
              <div className="bg-white dark:bg-purple-800/50 rounded-xl px-4 py-2 shadow-sm">
                <span className="text-purple-600 dark:text-purple-300 text-xs">Total Amount: </span>
                <span className="text-purple-800 dark:text-white font-semibold">₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-white dark:bg-purple-800/50 rounded-xl px-4 py-2 shadow-sm">
                <span className="text-purple-600 dark:text-purple-300 text-xs">Pending: </span>
                <span className="text-purple-800 dark:text-white font-semibold">{pendingRequests.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-purple-800/30 rounded-2xl p-4 mb-6 shadow-lg border border-purple-200 dark:border-purple-700">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 text-sm" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, type, or submitted by..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-purple-900 dark:text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={submittedByFilter}
                  onChange={(e) => setSubmittedByFilter(e.target.value)}
                  className="bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl px-3 py-2 text-sm text-purple-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Submitters</option>
                  {uniqueSubmitters.map(submitter => (
                    <option key={submitter} value={submitter}>{submitter}</option>
                  ))}
                </select>
                
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl px-3 py-2 text-sm text-purple-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  <option value="Client visit">Client visit</option>
                  <option value="Arbitration">Arbitration</option>
                  <option value="Fees">Fees</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
                
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl px-3 py-2 text-sm text-purple-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Sources</option>
                  <option value="credsettlee">Cred Settle</option>
                  <option value="ama">AMA</option>
                  <option value="settleloans">Settle Loans</option>
                  <option value="billcut">Bill Cut</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl px-3 py-2 text-sm text-purple-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl px-3 py-2 text-sm text-purple-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {generateMonthOptions()}
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl px-3 py-2 text-sm text-purple-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Time</option>
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            <div className="mt-3 flex flex-wrap gap-2">
              {searchTerm && (
                <span className="bg-purple-100 dark:bg-purple-700 text-purple-800 dark:text-purple-200 border border-purple-300 px-2 py-1 rounded-full text-xs">
                  Search: {searchTerm}
                </span>
              )}
              {submittedByFilter !== 'all' && (
                <span className="bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 border border-blue-300 px-2 py-1 rounded-full text-xs">
                  Submitted by: {submittedByFilter}
                </span>
              )}
              {typeFilter !== 'all' && (
                <span className="bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-200 border border-green-300 px-2 py-1 rounded-full text-xs">
                  Type: {typeFilter}
                </span>
              )}
              {sourceFilter !== 'all' && (
                <span className="bg-indigo-100 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 border border-indigo-300 px-2 py-1 rounded-full text-xs">
                  Source: {sourceFilter === 'credsettlee' ? 'Cred Settle' : 
                          sourceFilter === 'ama' ? 'AMA' :
                          sourceFilter === 'settleloans' ? 'Settle Loans' :
                          sourceFilter === 'billcut' ? 'Bill Cut' : sourceFilter}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="bg-emerald-100 dark:bg-emerald-700 text-emerald-800 dark:text-emerald-200 border border-emerald-300 px-2 py-1 rounded-full text-xs">
                  Status: {statusFilter}
                </span>
              )}
              {monthFilter !== 'all' && monthFilter !== 'current' && (
                <span className="bg-orange-100 dark:bg-orange-700 text-orange-800 dark:text-orange-200 border border-orange-300 px-2 py-1 rounded-full text-xs">
                  Month: {(() => {
                    const months = [
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ];
                    const [month, year] = monthFilter.split('-').map(Number);
                    return `${months[month]} ${year}`;
                  })()}
                </span>
              )}
              {dateFilter !== 'all' && (
                <span className="bg-yellow-100 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 border border-yellow-300 px-2 py-1 rounded-full text-xs">
                  Date: {dateFilter === 'last7days' ? 'Last 7 Days' : 'Last 30 Days'}
                </span>
              )}
            </div>
          </div>
        
          {error && (
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500 text-red-800 dark:text-red-200 px-4 py-3 rounded-xl mb-6 flex items-center">
              <FiAlertTriangle className="mr-2" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : opsPaymentRequests.length === 0 ? (
            <div className="bg-white dark:bg-purple-800/30 rounded-2xl shadow-lg p-8 text-center border border-purple-200 dark:border-purple-700">
              <p className="text-purple-600 dark:text-purple-300">No ops payment requests found</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pending Requests */}
              <div>
                <h2 className="text-xl font-bold text-purple-800 dark:text-purple-200 mb-4 flex items-center">
                  <span className="bg-amber-100 dark:bg-amber-700/50 text-amber-800 dark:text-amber-300 border border-amber-300 px-3 py-1 rounded-full text-sm font-medium mr-3">
                    Pending
                  </span>
                  Pending Requests ({pendingRequests.length})
                </h2>
                
                {pendingRequests.length === 0 ? (
                  <div className="bg-white dark:bg-purple-800/30 rounded-2xl shadow-lg p-8 text-center border border-purple-200 dark:border-purple-700">
                    <p className="text-purple-600 dark:text-purple-300">No pending requests</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {pendingRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-purple-800/30 rounded-2xl shadow-lg overflow-hidden border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-500 transition-colors relative"
                      >
                        <div className="p-6">
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center flex-wrap gap-2 mb-3">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">{request.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.type)}`}>
                                  {request.type}
                                </span>
                                <span className="bg-purple-100 dark:bg-purple-700/50 text-purple-800 dark:text-purple-300 border border-purple-300 px-2 py-1 rounded-full text-xs font-medium">
                                  {request.source === 'credsettlee' ? 'Cred Settle' :
                                   request.source === 'ama' ? 'AMA' :
                                   request.source === 'settleloans' ? 'Settle Loans' :
                                   request.source === 'billcut' ? 'Bill Cut' :
                                   request.source || 'Not specified'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <p className="text-purple-700 dark:text-purple-300 flex items-center">
                                    <FiPhone className="mr-2 text-purple-500" />
                                    {request.phoneNumber}
                                  </p>
                                  <p className="text-purple-700 dark:text-purple-300 flex items-center">
                                    <FiUser className="mr-2 text-purple-500" />
                                    Submitted by: {request.submittedBy}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-purple-600 dark:text-purple-400 flex items-center">
                                    <span className="mr-2">🕒</span>
                                    {new Date(request.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              {request.type === 'Miscellaneous' && request.miscellaneousDetails && (
                                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-600 rounded-xl">
                                  <p className="text-purple-700 dark:text-purple-300 font-medium mb-1 text-sm">Miscellaneous Details:</p>
                                  <p className="text-purple-900 dark:text-white text-sm">{request.miscellaneousDetails}</p>
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="bg-purple-100 dark:bg-purple-700/50 rounded-xl p-4 inline-block">
                                <p className="text-xs text-purple-600 dark:text-purple-300 mb-1">Amount</p>
                                <p className="text-2xl font-bold text-purple-900 dark:text-white flex items-center">
                                  <BiRupee className="mr-1" />
                                  {request.amount}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-600">
                            {request.edited_by && request.edited_at && (
                              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <p className="text-purple-700 dark:text-purple-300 text-xs">
                                    <span className="text-purple-600 dark:text-purple-400">Last edited by:</span>{' '}
                                    {request.edited_by}
                                  </p>
                                  <p className="text-purple-700 dark:text-purple-300 text-xs">
                                    <span className="text-purple-600 dark:text-purple-400">Last edited at:</span>{' '}
                                    {new Date(request.edited_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => initiateEdit(request.id, request.amount)}
                                className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-600 dark:hover:bg-purple-700 text-purple-800 dark:text-white px-4 py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                              >
                                <FiEdit className="mr-2" />
                                Edit Amount
                              </button>
                              <button
                                onClick={() => initiateApproval(request.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                              >
                                <FiCheck className="mr-2" />
                                Approve
                              </button>
                              <button
                                onClick={() => initiateReject(request.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                              >
                                <FiX className="mr-2" />
                                Reject
                              </button>
                              <button
                                onClick={() => initiateDelete(request.id)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                              >
                                <FiTrash2 className="mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Confirmation Modals */}
                        {confirmingRequest === request.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-purple-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-purple-200 dark:border-purple-600">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">Confirm Approval</h3>
                                <button 
                                  onClick={cancelApproval}
                                  className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-purple-700 dark:text-purple-300 mb-4">
                                  Are you sure you want to approve this ops payment request?
                                </p>
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl">
                                  <p className="text-purple-900 dark:text-white font-medium mb-2">{request.name}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm mb-1">Amount: ₹{request.amount}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm mb-1">Type: {request.type}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm">Submitted by: {request.submittedBy}</p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelApproval}
                                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleApprove(request.id)}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors flex items-center"
                                >
                                  <FiCheck className="mr-2" />
                                  Approve
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {rejectingRequest === request.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-purple-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-purple-200 dark:border-purple-600">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">Confirm Rejection</h3>
                                <button 
                                  onClick={cancelReject}
                                  className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-purple-700 dark:text-purple-300 mb-4">
                                  Are you sure you want to reject this ops payment request?
                                </p>
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl">
                                  <p className="text-purple-900 dark:text-white font-medium mb-2">{request.name}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm mb-1">Amount: ₹{request.amount}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm mb-1">Type: {request.type}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm">Submitted by: {request.submittedBy}</p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelReject}
                                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleReject(request.id)}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors flex items-center"
                                >
                                  <FiX className="mr-2" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {editingRequest === request.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-purple-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-purple-200 dark:border-purple-600">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">Edit Amount</h3>
                                <button 
                                  onClick={cancelEdit}
                                  className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-purple-700 dark:text-purple-300 mb-4">
                                  Edit the payment amount for:
                                </p>
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl mb-4">
                                  <p className="text-purple-900 dark:text-white font-medium mb-2">{request.name}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm">Type: {request.type}</p>
                                </div>
                                
                                <div>
                                  <label htmlFor="amount" className="block text-purple-700 dark:text-purple-300 mb-2">Payment Amount (₹)</label>
                                  <input
                                    type="number"
                                    id="amount"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl px-4 py-2 text-purple-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    min="0"
                                    step="any"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelEdit}
                                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleEdit(request.id)}
                                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors flex items-center"
                                >
                                  <FiCheck className="mr-2" />
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {deletingRequest === request.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-purple-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-purple-200 dark:border-purple-600">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">Delete Request</h3>
                                <button 
                                  onClick={cancelDelete}
                                  className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-purple-700 dark:text-purple-300 mb-4">
                                  Are you sure you want to delete this ops payment request? This action cannot be undone.
                                </p>
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl">
                                  <p className="text-purple-900 dark:text-white font-medium mb-2">{request.name}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm mb-1">Amount: ₹{request.amount}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm">Status: {request.status}</p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelDelete}
                                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleDelete(request.id)}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors flex items-center"
                                >
                                  <FiTrash2 className="mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approved Requests */}
              <div>
                <h2 className="text-xl font-bold text-purple-800 dark:text-purple-200 mb-4 flex items-center">
                  <span className="bg-emerald-100 dark:bg-emerald-700/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 px-3 py-1 rounded-full text-sm font-medium mr-3">
                    Approved
                  </span>
                  Approved Requests ({approvedRequests.length})
                </h2>
                
                {approvedRequests.length === 0 ? (
                  <div className="bg-white dark:bg-purple-800/30 rounded-2xl shadow-lg p-8 text-center border border-purple-200 dark:border-purple-700">
                    <p className="text-purple-600 dark:text-purple-300">No approved requests</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {approvedRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-purple-800/30 rounded-2xl shadow-lg overflow-hidden border border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-500 transition-colors relative"
                      >
                        <div className="p-6">
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center flex-wrap gap-2 mb-3">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">{request.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                  Approved
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.type)}`}>
                                  {request.type}
                                </span>
                                <span className="bg-purple-100 dark:bg-purple-700/50 text-purple-800 dark:text-purple-300 border border-purple-300 px-2 py-1 rounded-full text-xs font-medium">
                                  {request.source === 'credsettlee' ? 'Cred Settle' :
                                   request.source === 'ama' ? 'AMA' :
                                   request.source === 'settleloans' ? 'Settle Loans' :
                                   request.source === 'billcut' ? 'Bill Cut' :
                                   request.source || 'Not specified'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <p className="text-purple-700 dark:text-purple-300 flex items-center">
                                    <FiPhone className="mr-2 text-purple-500" />
                                    {request.phoneNumber}
                                  </p>
                                  <p className="text-purple-700 dark:text-purple-300 flex items-center">
                                    <FiUser className="mr-2 text-purple-500" />
                                    Submitted by: {request.submittedBy}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-purple-600 dark:text-purple-400 flex items-center">
                                    <span className="mr-2">🕒</span>
                                    {new Date(request.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              {request.type === 'Miscellaneous' && request.miscellaneousDetails && (
                                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-600 rounded-xl">
                                  <p className="text-purple-700 dark:text-purple-300 font-medium mb-1 text-sm">Miscellaneous Details:</p>
                                  <p className="text-purple-900 dark:text-white text-sm">{request.miscellaneousDetails}</p>
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="bg-emerald-100 dark:bg-emerald-700/50 rounded-xl p-4 inline-block">
                                <p className="text-xs text-emerald-600 dark:text-emerald-300 mb-1">Amount</p>
                                <p className="text-2xl font-bold text-emerald-900 dark:text-white flex items-center">
                                  <BiRupee className="mr-1" />
                                  {request.amount}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-600">
                            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 mb-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <p className="text-emerald-700 dark:text-emerald-300 text-xs">
                                  <span className="text-emerald-600 dark:text-emerald-400">Approved by:</span>{' '}
                                  {request.approvedBy}
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-300 text-xs">
                                  <span className="text-emerald-600 dark:text-emerald-400">Approved at:</span>{' '}
                                  {request.approvedAt && new Date(request.approvedAt).toLocaleString()}
                                </p>
                                {request.edited_by && request.edited_at && (
                                  <>
                                    <p className="text-emerald-700 dark:text-emerald-300 text-xs">
                                      <span className="text-emerald-600 dark:text-emerald-400">Last edited by:</span>{' '}
                                      {request.edited_by}
                                    </p>
                                    <p className="text-emerald-700 dark:text-emerald-300 text-xs">
                                      <span className="text-emerald-600 dark:text-emerald-400">Last edited at:</span>{' '}
                                      {new Date(request.edited_at).toLocaleString()}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => initiateEdit(request.id, request.amount)}
                                className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-600 dark:hover:bg-purple-700 text-purple-800 dark:text-white px-4 py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                              >
                                <FiEdit className="mr-2" />
                                Edit Amount
                              </button>
                              <button
                                onClick={() => initiateDelete(request.id)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                              >
                                <FiTrash2 className="mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Edit and Delete Modals (similar to pending section) */}
                        {editingRequest === request.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-purple-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-purple-200 dark:border-purple-600">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">Edit Amount</h3>
                                <button 
                                  onClick={cancelEdit}
                                  className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-purple-700 dark:text-purple-300 mb-4">
                                  Edit the payment amount for:
                                </p>
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl mb-4">
                                  <p className="text-purple-900 dark:text-white font-medium mb-2">{request.name}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm">Type: {request.type}</p>
                                </div>
                                
                                <div>
                                  <label htmlFor="amount" className="block text-purple-700 dark:text-purple-300 mb-2">Payment Amount (₹)</label>
                                  <input
                                    type="number"
                                    id="amount"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full bg-purple-50 dark:bg-purple-700/50 border border-purple-200 dark:border-purple-600 rounded-xl px-4 py-2 text-purple-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    min="0"
                                    step="any"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelEdit}
                                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleEdit(request.id)}
                                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors flex items-center"
                                >
                                  <FiCheck className="mr-2" />
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {deletingRequest === request.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-purple-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-purple-200 dark:border-purple-600">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">Delete Request</h3>
                                <button 
                                  onClick={cancelDelete}
                                  className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-purple-700 dark:text-purple-300 mb-4">
                                  Are you sure you want to delete this ops payment request? This action cannot be undone.
                                </p>
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl">
                                  <p className="text-purple-900 dark:text-white font-medium mb-2">{request.name}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm mb-1">Amount: ₹{request.amount}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm">Status: {request.status}</p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelDelete}
                                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleDelete(request.id)}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors flex items-center"
                                >
                                  <FiTrash2 className="mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rejected Requests */}
              <div>
                <h2 className="text-xl font-bold text-purple-800 dark:text-purple-200 mb-4 flex items-center">
                  <span className="bg-red-100 dark:bg-red-700/50 text-red-800 dark:text-red-300 border border-red-300 px-3 py-1 rounded-full text-sm font-medium mr-3">
                    Rejected
                  </span>
                  Rejected Requests ({rejectedRequests.length})
                </h2>
                
                {rejectedRequests.length === 0 ? (
                  <div className="bg-white dark:bg-purple-800/30 rounded-2xl shadow-lg p-8 text-center border border-purple-200 dark:border-purple-700">
                    <p className="text-purple-600 dark:text-purple-300">No rejected requests</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {rejectedRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-purple-800/30 rounded-2xl shadow-lg overflow-hidden border border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-500 transition-colors relative"
                      >
                        <div className="p-6">
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center flex-wrap gap-2 mb-3">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">{request.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                  Rejected
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.type)}`}>
                                  {request.type}
                                </span>
                                <span className="bg-purple-100 dark:bg-purple-700/50 text-purple-800 dark:text-purple-300 border border-purple-300 px-2 py-1 rounded-full text-xs font-medium">
                                  {request.source === 'credsettlee' ? 'Cred Settle' :
                                   request.source === 'ama' ? 'AMA' :
                                   request.source === 'settleloans' ? 'Settle Loans' :
                                   request.source === 'billcut' ? 'Bill Cut' :
                                   request.source || 'Not specified'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <p className="text-purple-700 dark:text-purple-300 flex items-center">
                                    <FiPhone className="mr-2 text-purple-500" />
                                    {request.phoneNumber}
                                  </p>
                                  <p className="text-purple-700 dark:text-purple-300 flex items-center">
                                    <FiUser className="mr-2 text-purple-500" />
                                    Submitted by: {request.submittedBy}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-purple-600 dark:text-purple-400 flex items-center">
                                    <span className="mr-2">🕒</span>
                                    {new Date(request.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              {request.type === 'Miscellaneous' && request.miscellaneousDetails && (
                                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-600 rounded-xl">
                                  <p className="text-purple-700 dark:text-purple-300 font-medium mb-1 text-sm">Miscellaneous Details:</p>
                                  <p className="text-purple-900 dark:text-white text-sm">{request.miscellaneousDetails}</p>
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="bg-red-100 dark:bg-red-700/50 rounded-xl p-4 inline-block">
                                <p className="text-xs text-red-600 dark:text-red-300 mb-1">Amount</p>
                                <p className="text-2xl font-bold text-red-900 dark:text-white flex items-center">
                                  <BiRupee className="mr-1" />
                                  {request.amount}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-600">
                            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 mb-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <p className="text-red-700 dark:text-red-300 text-xs">
                                  <span className="text-red-600 dark:text-red-400">Rejected by:</span>{' '}
                                  {request.rejectedBy}
                                </p>
                                <p className="text-red-700 dark:text-red-300 text-xs">
                                  <span className="text-red-600 dark:text-red-400">Rejected at:</span>{' '}
                                  {request.rejectedAt && new Date(request.rejectedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => initiateDelete(request.id)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                              >
                                <FiTrash2 className="mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        {deletingRequest === request.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-purple-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-purple-200 dark:border-purple-600">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-purple-900 dark:text-white">Delete Request</h3>
                                <button 
                                  onClick={cancelDelete}
                                  className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-purple-700 dark:text-purple-300 mb-4">
                                  Are you sure you want to delete this ops payment request? This action cannot be undone.
                                </p>
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl">
                                  <p className="text-purple-900 dark:text-white font-medium mb-2">{request.name}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm mb-1">Amount: ₹{request.amount}</p>
                                  <p className="text-purple-700 dark:text-purple-300 text-sm">Status: {request.status}</p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelDelete}
                                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleDelete(request.id)}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors flex items-center"
                                >
                                  <FiTrash2 className="mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const generateMonthOptions = () => {
  const options = [];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Add "All Months" option
  options.push(<option key="all" value="all">All Months</option>);
  
  // Add "Current Month" option
  options.push(<option key="current" value="current">Current Month</option>);
  
  // Add previous months (up to 12 months back)
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  for (let i = 0; i < 12; i++) {
    let month = currentMonth - i;
    let year = currentYear;
    
    if (month < 0) {
      month += 12;
      year -= 1;
    }
    
    const value = `${month}-${year}`;
    const label = `${months[month]} ${year}`;
    options.push(<option key={value} value={value}>{label}</option>);
  }
  
  return options;
};
