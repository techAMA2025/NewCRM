'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiAlertTriangle, FiMail, FiPhone, FiUser, FiX, FiEdit, FiTrash2, FiSearch, FiFilter } from 'react-icons/fi';
import { collection, getDocs, doc, updateDoc, query, where, deleteDoc, getDoc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import BillcutSidebar from '@/components/navigation/BillcutSidebar';
import { useRouter } from 'next/navigation';

export default function PaymentRequestsPage() {
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [confirmingRequest, setConfirmingRequest] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [deletingRequest, setDeletingRequest] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('current');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    // Check user authentication and role
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    setUserRole(role);
    setUserName(name);

    // Set source filter to billcut if user is billcut role
    if (role === 'billcut') {
      setSourceFilter('billcut');
    }

    // Redirect if user is not admin, overlord, or billcut
    if (role !== 'admin' && role !== 'overlord' && role !== 'billcut') {
      router.push('/dashboard');
      return;
    }

    // Fetch payment requests
    fetchPaymentRequests();
  }, [router]);

  const fetchPaymentRequests = async () => {
    try {
      setLoading(true);
      const paymentsRef = collection(db, 'payments');
      let paymentsQuery;

      // If user is billcut, only fetch billcut payments
      if (userRole === 'billcut') {
        paymentsQuery = query(paymentsRef, where('source', '==', 'billcut'));
      } else {
        paymentsQuery = paymentsRef;
      }

      const paymentsSnap = await getDocs(paymentsQuery);
      
      const requests = paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPaymentRequests(requests);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payment requests:', err);
      setError('Failed to load payment requests');
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

      const paymentRef = doc(db, 'payments', requestId);
      await updateDoc(paymentRef, {
        status: 'approved',
        approvedBy: userName,
        approvedAt: new Date().toISOString()
      });

      // Get the payment request data
      const request = paymentRequests.find(req => req.id === requestId);
      
      if (request && request.salesPersonName) {
        // Update the salesperson's target with the new amount collected
        await updateSalesTargetForApprovedPayment(request.salesPersonName, Number(request.amount));
      }

      // Update the local state
      setPaymentRequests(paymentRequests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved', approvedBy: userName, approvedAt: new Date().toISOString() } 
          : req
      ));
      
      // Clear the confirming state
      setConfirmingRequest(null);
    } catch (err) {
      console.error('Error approving payment:', err);
      setError('Failed to approve payment');
      setConfirmingRequest(null);
    }
  };

  // Helper function to update sales target when a payment is approved
  const updateSalesTargetForApprovedPayment = async (salesPersonName: string, amount: number) => {
    try {
      // Get current month and year
      const date = new Date();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = months[date.getMonth()];
      const currentYear = date.getFullYear();
      
      // Create the monthly document ID
      const monthDocId = `${currentMonth}_${currentYear}`;
      
      // Check if the monthly document exists
      const monthlyDocRef = doc(db, "targets", monthDocId);
      const monthlyDocSnap = await getDoc(monthlyDocRef);
      
      if (monthlyDocSnap.exists()) {
        // Find the salesperson in the subcollection
        const salesTargetsQuery = query(
          collection(db, "targets", monthDocId, "sales_targets"),
          where("userName", "==", salesPersonName)
        );
        
        const salesTargetsSnap = await getDocs(salesTargetsQuery);
        
        if (!salesTargetsSnap.empty) {
          // Found target record, update it
          const targetDoc = salesTargetsSnap.docs[0];
          const targetRef = doc(db, "targets", monthDocId, "sales_targets", targetDoc.id);
          
          // Get current amount collected
          const targetData = targetDoc.data();
          const currentAmount = targetData.amountCollected || 0;
          
          // Update with the new amount
          await updateDoc(targetRef, {
            amountCollected: currentAmount + amount,
            updatedAt: new Date().toISOString()
          });
          
          console.log(`Updated ${salesPersonName}'s target: added ${amount}`);
        } else {
          // No target found for this salesperson, create one
          console.log(`Creating new target for ${salesPersonName}`);
          
          // Try to get user data from users collection
          let userId = '';
          try {
            const usersQuery = query(
              collection(db, "users"),
              where("firstName", "==", salesPersonName.split(' ')[0])
            );
            const usersSnap = await getDocs(usersQuery);
            if (!usersSnap.empty) {
              userId = usersSnap.docs[0].id;
            }
          } catch (e) {
            console.error("Error finding user:", e);
          }
          
          // Create new target in subcollection
          await addDoc(collection(db, "targets", monthDocId, "sales_targets"), {
            userId: userId || 'unknown',
            userName: salesPersonName,
            amountCollected: amount,
            amountCollectedTarget: 0,
            convertedLeadsTarget: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userName || 'system'
          });
        }
      } else {
        // Monthly document doesn't exist, create it with metadata
        console.log(`Creating new monthly document ${monthDocId}`);
        
        await setDoc(monthlyDocRef, {
          month: currentMonth,
          year: currentYear,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: userName || 'system'
        });
        
        // Try to get user data
        let userId = '';
        try {
          const usersQuery = query(
            collection(db, "users"),
            where("firstName", "==", salesPersonName.split(' ')[0])
          );
          const usersSnap = await getDocs(usersQuery);
          if (!usersSnap.empty) {
            userId = usersSnap.docs[0].id;
          }
        } catch (e) {
          console.error("Error finding user:", e);
        }
        
        // Create new target in subcollection
        await addDoc(collection(db, "targets", monthDocId, "sales_targets"), {
          userId: userId || 'unknown',
          userName: salesPersonName,
          amountCollected: amount,
          amountCollectedTarget: 0,
          convertedLeadsTarget: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: userName || 'system'
        });
      }
    } catch (error) {
      console.error('Error updating sales target:', error);
      throw error;
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

      // Get the original request before updating
      const request = paymentRequests.find(req => req.id === requestId);
      const oldAmount = request ? Number(request.amount) : 0;
      const newAmount = Number(editAmount);

      const paymentRef = doc(db, 'payments', requestId);
      await updateDoc(paymentRef, {
        amount: newAmount, // Store as number instead of string
        edited_by: userName,
        edited_at: new Date().toISOString()
      });

      // If this is an approved payment, update the target collection with the difference
      if (request && request.status === 'approved' && request.salesPersonName) {
        await updateSalesTargetForEditedPayment(
          request.salesPersonName, 
          oldAmount, 
          newAmount
        );
      }

      // Update the local state
      setPaymentRequests(paymentRequests.map(req => 
        req.id === requestId 
          ? { ...req, amount: newAmount, edited_by: userName, edited_at: new Date().toISOString() } 
          : req
      ));
      
      // Clear the editing state
      setEditingRequest(null);
      setEditAmount('');
    } catch (err) {
      console.error('Error editing payment:', err);
      setError('Failed to edit payment amount');
      setEditingRequest(null);
    }
  };

  // Helper function to update sales target when a payment is edited
  const updateSalesTargetForEditedPayment = async (salesPersonName: string, oldAmount: number, newAmount: number) => {
    try {
      // Calculate the difference (can be positive or negative)
      const amountDifference = newAmount - oldAmount;
      
      // If there's no change, we can exit early
      if (amountDifference === 0) return;
      
      // Get current month and year
      const date = new Date();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = months[date.getMonth()];
      const currentYear = date.getFullYear();
      
      // Create the monthly document ID
      const monthDocId = `${currentMonth}_${currentYear}`;
      
      // Find the salesperson's target record
      const monthlyDocRef = doc(db, "targets", monthDocId);
      const monthlyDocSnap = await getDoc(monthlyDocRef);
      
      if (monthlyDocSnap.exists()) {
        // Find the salesperson in the subcollection
        const salesTargetsQuery = query(
          collection(db, "targets", monthDocId, "sales_targets"),
          where("userName", "==", salesPersonName)
        );
        
        const salesTargetsSnap = await getDocs(salesTargetsQuery);
        
        if (!salesTargetsSnap.empty) {
          // Found the target document, update it with the difference
          const targetDoc = salesTargetsSnap.docs[0];
          const targetRef = doc(db, "targets", monthDocId, "sales_targets", targetDoc.id);
          
          // Get current amount collected
          const targetData = targetDoc.data();
          const currentAmount = targetData.amountCollected || 0;
          
          // Update with the difference
          await updateDoc(targetRef, {
            amountCollected: currentAmount + amountDifference,
            updatedAt: new Date().toISOString()
          });
          
          console.log(`Updated ${salesPersonName}'s target: adjusted by ${amountDifference}`);
        } else {
          // No target found for this salesperson, create one (rare case)
          console.warn(`No target found for ${salesPersonName} during edit, creating new one`);
          await updateSalesTargetForApprovedPayment(salesPersonName, newAmount);
        }
      } else {
        // Monthly document doesn't exist (rare case for an approved payment)
        console.warn(`No monthly document found during edit, creating new one`);
        await updateSalesTargetForApprovedPayment(salesPersonName, newAmount);
      }
    } catch (error) {
      console.error('Error updating sales target during edit:', error);
      throw error;
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
      // Get the payment request data before deleting
      const request = paymentRequests.find(req => req.id === requestId);
      
      // Delete the payment request from Firestore
      const paymentRef = doc(db, 'payments', requestId);
      await deleteDoc(paymentRef);

      // If this was an approved request, update the salesperson's target
      if (request && request.status === 'approved' && request.salesPersonName) {
        await updateSalesTargetForDeletedPayment(request.salesPersonName, Number(request.amount));
      }

      // Update the local state by removing the deleted request
      setPaymentRequests(paymentRequests.filter(req => req.id !== requestId));
      
      // Clear the deleting state
      setDeletingRequest(null);
    } catch (err) {
      console.error('Error deleting payment request:', err);
      setError('Failed to delete payment request');
      setDeletingRequest(null);
    }
  };

  // Helper function to update sales target when a payment is deleted
  const updateSalesTargetForDeletedPayment = async (salesPersonName: string, amount: number) => {
    try {
      // Get current month and year
      const date = new Date();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = months[date.getMonth()];
      const currentYear = date.getFullYear();
      
      // Create the monthly document ID
      const monthDocId = `${currentMonth}_${currentYear}`;
      
      // Check if the monthly document exists
      const monthlyDocRef = doc(db, "targets", monthDocId);
      const monthlyDocSnap = await getDoc(monthlyDocRef);
      
      if (monthlyDocSnap.exists()) {
        // Find the salesperson in the subcollection
        const salesTargetsQuery = query(
          collection(db, "targets", monthDocId, "sales_targets"),
          where("userName", "==", salesPersonName)
        );
        
        const salesTargetsSnap = await getDocs(salesTargetsQuery);
        
        if (!salesTargetsSnap.empty) {
          // Found the target document, reduce the amount collected
          const targetDoc = salesTargetsSnap.docs[0];
          const targetRef = doc(db, "targets", monthDocId, "sales_targets", targetDoc.id);
          
          // Get current amount collected
          const targetData = targetDoc.data();
          const currentAmount = targetData.amountCollected || 0;
          
          // Calculate new amount, ensuring it doesn't go below zero
          const newAmount = Math.max(0, currentAmount - amount);
          
          // Update with the new amount
          await updateDoc(targetRef, {
            amountCollected: newAmount,
            updatedAt: new Date().toISOString()
          });
          
          console.log(`Updated ${salesPersonName}'s target: removed ${amount}`);
        } else {
          console.warn(`No target found for ${salesPersonName} during deletion`);
        }
      } else {
        console.warn(`No monthly document found during deletion`);
      }
    } catch (error) {
      console.error('Error updating sales target for deleted payment:', error);
      throw error;
    }
  };

  const filteredRequests = useMemo(() => {
    return paymentRequests.filter(request => {
      const matchesSearch = 
        request.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.clientPhone.includes(searchTerm) ||
        request.salesPersonName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSource = sourceFilter === 'all' || request.source === sourceFilter;
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      // Add request type filter logic
      const isAdvocateRequest = !!request.reasonOfPayment;
      const matchesRequestType = 
        requestTypeFilter === 'all' || 
        (requestTypeFilter === 'advocate' && isAdvocateRequest) ||
        (requestTypeFilter === 'salesperson' && !isAdvocateRequest);
      
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

      return matchesSearch && matchesSource && matchesStatus && matchesDate && matchesMonth && matchesRequestType;
    });
  }, [paymentRequests, searchTerm, sourceFilter, statusFilter, dateFilter, monthFilter, requestTypeFilter]);

  const pendingRequests = filteredRequests
    .filter(req => req.status === 'pending')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
  const approvedRequests = filteredRequests
    .filter(req => req.status === 'approved')
    .sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());

  if (userRole !== 'admin' && userRole !== 'overlord' && userRole !== 'billcut') {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {userRole === 'overlord' ? <OverlordSidebar /> : 
       userRole === 'admin' ? <AdminSidebar /> : 
       userRole === 'billcut' ? <BillcutSidebar /> : null}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Payment Approval Requests</h1>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800 rounded-lg px-4 py-2">
                <span className="text-gray-400 text-sm">Total Requests: </span>
                <span className="text-white font-semibold">{paymentRequests.length}</span>
              </div>
              <div className="bg-gray-800 rounded-lg px-4 py-2">
                <span className="text-gray-400 text-sm">Pending: </span>
                <span className="text-white font-semibold">{pendingRequests.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, or sales person..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={requestTypeFilter}
                  onChange={(e) => setRequestTypeFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Request Types</option>
                  <option value="salesperson">Salesperson Requests</option>
                  <option value="advocate">Advocate Requests</option>
                </select>
                
                {userRole !== 'billcut' && (
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Sources</option>
                    <option value="credsettlee">Cred Settle</option>
                    <option value="ama">AMA</option>
                    <option value="settleloans">Settle Loans</option>
                    <option value="billcut">Bill Cut</option>
                  </select>
                )}

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>

                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {generateMonthOptions()}
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {searchTerm && (
                <span className="bg-blue-900/50 text-blue-300 border border-blue-500 px-3 py-1 rounded-full text-sm">
                  Search: {searchTerm}
                </span>
              )}
              {requestTypeFilter !== 'all' && (
                <span className="bg-indigo-900/50 text-indigo-300 border border-indigo-500 px-3 py-1 rounded-full text-sm capitalize">
                  Type: {requestTypeFilter}
                </span>
              )}
              {sourceFilter !== 'all' && (
                <span className="bg-purple-900/50 text-purple-300 border border-purple-500 px-3 py-1 rounded-full text-sm capitalize">
                  Source: {sourceFilter === 'credsettlee' ? 'Cred Settle' : 
                          sourceFilter === 'ama' ? 'AMA' :
                          sourceFilter === 'settleloans' ? 'Settle Loans' :
                          sourceFilter === 'billcut' ? 'Bill Cut' : sourceFilter}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="bg-green-900/50 text-green-300 border border-green-500 px-3 py-1 rounded-full text-sm capitalize">
                  Status: {statusFilter}
                </span>
              )}
              {monthFilter !== 'all' && (
                <span className="bg-orange-900/50 text-orange-300 border border-orange-500 px-3 py-1 rounded-full text-sm">
                  Month: {monthFilter === 'current' ? 'Current Month' : (() => {
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
                <span className="bg-yellow-900/50 text-yellow-300 border border-yellow-500 px-3 py-1 rounded-full text-sm">
                  Date: {dateFilter === 'last7days' ? 'Last 7 Days' : 'Last 30 Days'}
                </span>
              )}
            </div>
          </div>
        
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-center">
              <FiAlertTriangle className="mr-2" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            </div>
          ) : paymentRequests.length === 0 ? (
            <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-400">No payment requests found</p>
            </div>
          ) : (
            <div className="space-y-10">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="bg-yellow-900/50 text-yellow-300 border border-yellow-500 px-3 py-1 rounded-full text-sm font-medium mr-3">
                    Pending
                  </span>
                  Pending Requests ({pendingRequests.length})
                </h2>
                
                {pendingRequests.length === 0 ? (
                  <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <p className="text-gray-400">No pending requests</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {pendingRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden border ${request.reasonOfPayment 
                          ? 'border-purple-700 hover:border-purple-600' 
                          : 'border-gray-700 hover:border-gray-600'} transition-colors`}
                      >
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <h3 className="text-xl font-semibold text-white">{request.clientName}</h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  request.status === 'approved' 
                                    ? 'bg-green-900/50 text-green-300 border border-green-500'
                                    : 'bg-yellow-900/50 text-yellow-300 border border-yellow-500'
                                }`}>
                                  {request.status === 'approved' ? 'Approved' : 'Pending'}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  request.reasonOfPayment 
                                    ? 'bg-purple-900/50 text-purple-300 border border-purple-500'
                                    : 'bg-blue-900/50 text-blue-300 border border-blue-500'
                                }`}>
                                  {request.reasonOfPayment ? 'Advocate' : 'Salesperson'}
                                </span>
                                <span className="bg-blue-900/50 text-blue-300 border border-blue-500 px-3 py-1 rounded-full text-sm font-medium capitalize">
                                  {request.source === 'credsettlee' ? 'Cred Settle' :
                                   request.source === 'ama' ? 'AMA' :
                                   request.source === 'settleloans' ? 'Settle Loans' :
                                   request.source === 'billcut' ? 'Bill Cut' :
                                   request.source || 'Not specified'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <p className="text-gray-300 flex items-center">
                                    <FiMail className="mr-2" />
                                    {request.clientEmail}
                                  </p>
                                  <p className="text-gray-300 flex items-center">
                                    <FiPhone className="mr-2" />
                                    {request.clientPhone}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-gray-400 flex items-center">
                                    <FiUser className="mr-2" />
                                    Requested by: {request.salesPersonName}
                                  </p>
                                  <p className="text-gray-400 flex items-center">
                                    <span className="mr-2">🕒</span>
                                    {new Date(request.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              {request.reasonOfPayment && (
                                <div className="mt-3 p-3 bg-purple-900/20 border border-purple-800 rounded-lg">
                                  <p className="text-purple-300 font-medium mb-1">Reason for Payment:</p>
                                  <p className="text-white">{request.reasonOfPayment}</p>
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="bg-gray-900 rounded-lg p-4 inline-block">
                                <p className="text-sm text-gray-400 mb-1">Amount</p>
                                <p className="text-2xl font-bold text-white">₹{request.amount}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            {request.edited_by && request.edited_at && (
                              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <p className="text-gray-300 text-sm">
                                    <span className="text-gray-400">Last edited by:</span>{' '}
                                    {request.edited_by}
                                  </p>
                                  <p className="text-gray-300 text-sm">
                                    <span className="text-gray-400">Last edited at:</span>{' '}
                                    {new Date(request.edited_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex space-x-3">
                              <button
                                onClick={() => initiateEdit(request.id, request.amount)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <FiEdit className="mr-2" />
                                Edit Amount
                              </button>
                              <button
                                onClick={() => initiateApproval(request.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <FiCheck className="mr-2" />
                                Approve Payment
                              </button>
                              <button
                                onClick={() => initiateDelete(request.id)}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <FiTrash2 className="mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        {confirmingRequest === request.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto shadow-2xl border border-gray-700">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-white">Confirm Payment Approval</h3>
                                <button 
                                  onClick={cancelApproval}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-gray-300 mb-4">
                                  Are you sure you want to approve the payment request for:
                                </p>
                                <div className="bg-gray-900 p-4 rounded-lg">
                                  <p className="text-white font-medium mb-2">{request.clientName}</p>
                                  <p className="text-gray-400 text-sm mb-2">Amount: <span className="text-white">₹{request.amount}</span></p>
                                  <p className="text-gray-400 text-sm">Requested by: <span className="text-white">{request.salesPersonName}</span></p>
                                  <p className="text-gray-400 text-sm">Source: <span className="text-white capitalize">
                                    {request.source || 'Not specified'}
                                  </span></p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelApproval}
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleApprove(request.id)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
                                >
                                  <FiCheck className="mr-2" />
                                  Confirm Approval
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {editingRequest === request.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto shadow-2xl border border-gray-700">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-white">Edit Payment Amount</h3>
                                <button 
                                  onClick={cancelEdit}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-gray-300 mb-4">
                                  Edit the payment amount for:
                                </p>
                                <div className="bg-gray-900 p-4 rounded-lg mb-4">
                                  <p className="text-white font-medium mb-2">{request.clientName}</p>
                                  <p className="text-gray-400 text-sm">Requested by: <span className="text-white">{request.salesPersonName}</span></p>
                                  <p className="text-gray-400 text-sm">Source: <span className="text-white capitalize">
                                    {request.source || 'Not specified'}
                                  </span></p>
                                </div>
                                
                                <div className="mb-4">
                                  <label htmlFor="amount" className="block text-gray-300 mb-2">Payment Amount (₹)</label>
                                  <input
                                    type="number"
                                    id="amount"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                    step="any"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelEdit}
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleEdit(request.id)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                                >
                                  <FiCheck className="mr-2" />
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {deletingRequest === request.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto shadow-2xl border border-gray-700">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-white">Delete Payment Request</h3>
                                <button 
                                  onClick={cancelDelete}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-gray-300 mb-4">
                                  Are you sure you want to delete this payment request? This action cannot be undone.
                                </p>
                                <div className="bg-gray-900 p-4 rounded-lg">
                                  <p className="text-white font-medium mb-2">{request.clientName}</p>
                                  <p className="text-gray-400 text-sm mb-2">Amount: <span className="text-white">₹{request.amount}</span></p>
                                  <p className="text-gray-400 text-sm">Status: <span className="text-white capitalize">{request.status}</span></p>
                                  <p className="text-gray-400 text-sm">Source: <span className="text-white capitalize">
                                    {request.source || 'Not specified'}
                                  </span></p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelDelete}
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleDelete(request.id)}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                                >
                                  <FiTrash2 className="mr-2" />
                                  Delete Request
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

              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="bg-green-900/50 text-green-300 border border-green-500 px-3 py-1 rounded-full text-sm font-medium mr-3">
                    Approved
                  </span>
                  Approved Requests ({approvedRequests.length})
                </h2>
                
                {approvedRequests.length === 0 ? (
                  <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <p className="text-gray-400">No approved requests</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {approvedRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden border ${request.reasonOfPayment 
                          ? 'border-purple-700 hover:border-purple-600' 
                          : 'border-gray-700 hover:border-gray-600'} transition-colors`}
                      >
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <h3 className="text-xl font-semibold text-white">{request.clientName}</h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  request.status === 'approved' 
                                    ? 'bg-green-900/50 text-green-300 border border-green-500'
                                    : 'bg-yellow-900/50 text-yellow-300 border border-yellow-500'
                                }`}>
                                  {request.status === 'approved' ? 'Approved' : 'Pending'}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  request.reasonOfPayment 
                                    ? 'bg-purple-900/50 text-purple-300 border border-purple-500'
                                    : 'bg-blue-900/50 text-blue-300 border border-blue-500'
                                }`}>
                                  {request.reasonOfPayment ? 'Advocate' : 'Salesperson'}
                                </span>
                                <span className="bg-blue-900/50 text-blue-300 border border-blue-500 px-3 py-1 rounded-full text-sm font-medium capitalize">
                                  {request.source === 'credsettlee' ? 'Cred Settle' :
                                   request.source === 'ama' ? 'AMA' :
                                   request.source === 'settleloans' ? 'Settle Loans' :
                                   request.source === 'billcut' ? 'Bill Cut' :
                                   request.source || 'Not specified'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <p className="text-gray-300 flex items-center">
                                    <FiMail className="mr-2" />
                                    {request.clientEmail}
                                  </p>
                                  <p className="text-gray-300 flex items-center">
                                    <FiPhone className="mr-2" />
                                    {request.clientPhone}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-gray-400 flex items-center">
                                    <FiUser className="mr-2" />
                                    Requested by: {request.salesPersonName}
                                  </p>
                                  <p className="text-gray-400 flex items-center">
                                    <span className="mr-2">🕒</span>
                                    {new Date(request.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              {request.reasonOfPayment && (
                                <div className="mt-3 p-3 bg-purple-900/20 border border-purple-800 rounded-lg">
                                  <p className="text-purple-300 font-medium mb-1">Reason for Payment:</p>
                                  <p className="text-white">{request.reasonOfPayment}</p>
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="bg-gray-900 rounded-lg p-4 inline-block">
                                <p className="text-sm text-gray-400 mb-1">Amount</p>
                                <p className="text-2xl font-bold text-white">₹{request.amount}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="bg-gray-900/50 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <p className="text-gray-300 text-sm">
                                  <span className="text-gray-400">Approved by:</span>{' '}
                                  {request.approvedBy}
                                </p>
                                <p className="text-gray-300 text-sm">
                                  <span className="text-gray-400">Approved at:</span>{' '}
                                  {new Date(request.approvedAt).toLocaleString()}
                                </p>
                                {request.edited_by && request.edited_at && (
                                  <>
                                    <p className="text-gray-300 text-sm">
                                      <span className="text-gray-400">Last edited by:</span>{' '}
                                      {request.edited_by}
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                      <span className="text-gray-400">Last edited at:</span>{' '}
                                      {new Date(request.edited_at).toLocaleString()}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 flex space-x-3">
                              <button
                                onClick={() => initiateEdit(request.id, request.amount)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <FiEdit className="mr-2" />
                                Edit Amount
                              </button>
                              <button
                                onClick={() => initiateDelete(request.id)}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <FiTrash2 className="mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        {editingRequest === request.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto shadow-2xl border border-gray-700">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-white">Edit Payment Amount</h3>
                                <button 
                                  onClick={cancelEdit}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-gray-300 mb-4">
                                  Edit the payment amount for:
                                </p>
                                <div className="bg-gray-900 p-4 rounded-lg mb-4">
                                  <p className="text-white font-medium mb-2">{request.clientName}</p>
                                  <p className="text-gray-400 text-sm">Requested by: <span className="text-white">{request.salesPersonName}</span></p>
                                  <p className="text-gray-400 text-sm">Source: <span className="text-white capitalize">
                                    {request.source || 'Not specified'}
                                  </span></p>
                                </div>
                                
                                <div className="mb-4">
                                  <label htmlFor="amount" className="block text-gray-300 mb-2">Payment Amount (₹)</label>
                                  <input
                                    type="number"
                                    id="amount"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                    step="any"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelEdit}
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleEdit(request.id)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                                >
                                  <FiCheck className="mr-2" />
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {deletingRequest === request.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto shadow-2xl border border-gray-700">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-white">Delete Payment Request</h3>
                                <button 
                                  onClick={cancelDelete}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  <FiX size={24} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-gray-300 mb-4">
                                  Are you sure you want to delete this payment request? This action cannot be undone.
                                </p>
                                <div className="bg-gray-900 p-4 rounded-lg">
                                  <p className="text-white font-medium mb-2">{request.clientName}</p>
                                  <p className="text-gray-400 text-sm mb-2">Amount: <span className="text-white">₹{request.amount}</span></p>
                                  <p className="text-gray-400 text-sm">Status: <span className="text-white capitalize">{request.status}</span></p>
                                  <p className="text-gray-400 text-sm">Source: <span className="text-white capitalize">
                                    {request.source || 'Not specified'}
                                  </span></p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-3 justify-end">
                                <button 
                                  onClick={cancelDelete}
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleDelete(request.id)}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                                >
                                  <FiTrash2 className="mr-2" />
                                  Delete Request
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
