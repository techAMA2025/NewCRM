'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiAlertTriangle, FiMail, FiPhone, FiUser, FiX } from 'react-icons/fi';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import { useRouter } from 'next/navigation';

export default function PaymentRequestsPage() {
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [confirmingRequest, setConfirmingRequest] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check user authentication and role
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    setUserRole(role);
    setUserName(name);

    // Redirect if user is not admin or overlord
    if (role !== 'admin' && role !== 'overlord') {
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
      const paymentsSnap = await getDocs(paymentsRef);
      
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
        // Find the target document for this salesperson using their name
        const targetsRef = collection(db, 'targets');
        const q = query(targetsRef, where("userName", "==", request.salesPersonName));
        const targetSnapshot = await getDocs(q);
        
        if (!targetSnapshot.empty) {
          const targetDoc = targetSnapshot.docs[0];
          const targetData = targetDoc.data();
          
          // Calculate the new amount collected
          const currentAmount = targetData.amountCollected || 0;
          const newAmount = currentAmount + Number(request.amount);
          
          // Update the target document
          await updateDoc(doc(db, 'targets', targetDoc.id), {
            amountCollected: newAmount,
            updatedAt: new Date().toISOString()
          });
        }
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

  if (userRole !== 'admin' && userRole !== 'overlord') {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <AdminSidebar />
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
                <span className="text-white font-semibold">
                  {paymentRequests.filter(req => req.status === 'pending').length}
                </span>
              </div>
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
            <div className="grid gap-6">
              {paymentRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors"
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
                      </div>

                      <div className="text-right">
                        <div className="bg-gray-900 rounded-lg p-4 inline-block">
                          <p className="text-sm text-gray-400 mb-1">Amount</p>
                          <p className="text-2xl font-bold text-white">₹{request.amount}</p>
                        </div>
                      </div>
                    </div>
                    
                    {request.status === 'approved' && (
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
                          </div>
                        </div>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={() => initiateApproval(request.id)}
                          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <FiCheck className="mr-2" />
                          Approve Payment
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Confirmation Dialog */}
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
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
