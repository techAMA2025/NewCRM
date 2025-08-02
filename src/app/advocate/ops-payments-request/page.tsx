'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUser, FiPhone, FiSend, FiCheck, 
  FiMenu, FiX, FiFileText, FiDollarSign
} from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';
import SalesSidebar from '@/components/navigation/SalesSidebar';
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, setDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';

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
}

export default function OpsPaymentsRequestPage() {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    amount: '',
    source: '',
    type: '',
    miscellaneousDetails: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userPayments, setUserPayments] = useState<OpsPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  useEffect(() => {
    // Get user role and name from localStorage when component mounts
    const storedUserRole = localStorage.getItem('userRole') || '';
    const storedUserName = localStorage.getItem('userName') || '';
    setUserRole(storedUserRole);
    setUserName(storedUserName);
  }, []);
  
  useEffect(() => {
    // Always fetch payments associated with the logged-in user
    fetchUserPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, userName]);
  
  const fetchUserPayments = async () => {
    try {
      setLoadingPayments(true);
      const submittedBy = localStorage.getItem('userName');
      if (!submittedBy) return;
      
      // Filter payments by the logged-in user's name
      const paymentsRef = collection(db, 'ops_payments');
      const q = query(paymentsRef, where('submittedBy', '==', submittedBy));
      
      const querySnapshot = await getDocs(q);
      
      let payments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as OpsPayment);
      
      // Sort by timestamp descending (newest first)
      payments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setUserPayments(payments);
      setLoadingPayments(false);
    } catch (error) {
      console.error('Error fetching ops payment requests:', error);
      setLoadingPayments(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get user name from localStorage
      const submittedBy = localStorage.getItem('userName') || 'Unknown';
      
      // Prepare data for submission
      const paymentData = {
        status: 'pending',
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        amount: formData.amount,
        source: formData.source,
        type: formData.type,
        miscellaneousDetails: formData.miscellaneousDetails || '',
        submittedBy,
        timestamp: new Date().toISOString()
      };
      
      // Add document to Firebase ops_payments collection
      await addDoc(collection(db, 'ops_payments'), paymentData);
      
      // After successful submission
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      // Refresh the payment list
      fetchUserPayments();
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({
          name: '',
          phoneNumber: '',
          amount: '',
          source: '',
          type: '',
          miscellaneousDetails: '',
        });
      }, 3000);
    } catch (error) {
      console.error('Error submitting ops payment request:', error);
      setIsSubmitting(false);
      // Here you might want to add error handling UI
    }
  };
  
  const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);
  
  const renderSidebar = () => {
    // Check if the user role is 'advocate'
    if (userRole === 'advocate') {
      return <AdvocateSidebar />;
    } else if (userRole === 'overlord') {
      return <OverlordSidebar />;
    } else {
      return <SalesSidebar />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700/30 dark:text-yellow-400';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };
  
  const renderPayments = () => {
    if (loadingPayments) {
      return <div className="text-center py-4">Loading ops payment requests...</div>;
    }
    
    if (userPayments.length === 0) {
      return <div className="text-center py-4">No ops payment requests found.</div>;
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Phone</th>
              <th scope="col" className="px-6 py-3">Amount</th>
              <th scope="col" className="px-6 py-3">Source</th>
              <th scope="col" className="px-6 py-3">Type</th>
              <th scope="col" className="px-6 py-3">Submitted By</th>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {userPayments.map((payment) => (
              <tr key={payment.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-4">{payment.name}</td>
                <td className="px-6 py-4">{payment.phoneNumber}</td>
                <td className="px-6 py-4">₹{payment.amount}</td>
                <td className="px-6 py-4">{payment.source}</td>
                <td className="px-6 py-4">{payment.type}</td>
                <td className="px-6 py-4">{payment.submittedBy}</td>
                <td className="px-6 py-4">
                  {new Date(payment.timestamp).toLocaleDateString('en-GB')}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.status)}`}>
                    {getStatusText(payment.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="flex bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        {renderSidebar()}
      </div>
      
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${mobileSidebarOpen ? 'visible' : 'invisible'}`}>
        <div 
          className={`fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ${mobileSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={toggleMobileSidebar}
        ></div>
        
        <div className={`fixed inset-y-0 left-0 transition-transform duration-300 transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {renderSidebar()}
          <button
            onClick={toggleMobileSidebar}
            className="absolute top-4 right-4 text-white"
            aria-label="Close sidebar"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="md:hidden p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-800 dark:text-blue-400">
            Ops Portal
          </h1>
          <button 
            onClick={toggleMobileSidebar}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none"
          >
            <FiMenu className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-blue-800 dark:text-blue-400 mb-2">
                Ops Payment Request
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Submit operational payment details for approval
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-blue-200 dark:border-blue-700">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <h2 className="text-xl font-semibold flex items-center">
                  <BiRupee   className="mr-3" />
                  New Ops Payment Request
                </h2>
                <p className="text-blue-100 mt-1">Fill in the details below to submit your request</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="text-blue-500" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3 transition-all duration-200"
                        placeholder="Enter full name"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="text-blue-500" />
                      </div>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        required
                        className="bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3 transition-all duration-200"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BiRupee className="text-blue-500 text-lg" />
                      </div>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3 transition-all duration-200"
                        placeholder="Enter amount"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="source" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Source
                    </label>
                    <select
                      id="source"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      required
                      className="bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-all duration-200"
                    >
                      <option value="">Select source</option>
                      <option value="credsettlee">Cred Settle</option>
                      <option value="ama">AMA</option>
                      <option value="settleloans">Settle Loans</option>
                      <option value="billcut">Bill Cut</option>
                    </select>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2 md:col-span-2"
                  >
                    <label htmlFor="type" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      required
                      className="bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-all duration-200"
                    >
                      <option value="">Select type</option>
                      <option value="Client visit">Client visit</option>
                      <option value="Arbitration">Arbitration</option>
                      <option value="Fees">Fees</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </motion.div>
                  
                  {formData.type === 'Miscellaneous' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 md:col-span-2"
                    >
                      <label htmlFor="miscellaneousDetails" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Miscellaneous Details
                      </label>
                      <textarea
                        id="miscellaneousDetails"
                        name="miscellaneousDetails"
                        value={formData.miscellaneousDetails}
                        onChange={handleChange}
                        rows={3}
                        className="bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-all duration-200 resize-none"
                        placeholder="Please provide details about the miscellaneous payment..."
                      />
                    </motion.div>
                  )}
                </div>
                
                <div className="pt-6">
                  {!isSubmitted ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full flex justify-center items-center py-4 px-6 rounded-xl text-white font-semibold text-lg transition-all duration-200 shadow-lg ${
                        isSubmitting 
                          ? 'bg-gray-400 dark:bg-gray-600' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FiSend className="mr-2" />
                          Submit
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full flex justify-center items-center py-4 px-6 rounded-xl text-white font-semibold text-lg bg-gradient-to-r from-green-600 to-emerald-600"
                    >
                      <FiCheck className="mr-2" />
                      Ops Payment Request Submitted Successfully!
                    </motion.div>
                  )}
                </div>
              </form>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700/50 dark:to-gray-600/50 p-4 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  Your ops payment request will be reviewed by an admin. You will be notified when it's processed.
                </p>
              </div>
            </div>
            
            <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl p-8 border border-blue-200 dark:border-blue-700 shadow-lg">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-300 flex items-center">
                  <FiFileText className="mr-3 text-blue-600" />
                  Recent Ops Payment Requests
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Track the status of your submitted requests</p>
              </div>
              
              {renderPayments()}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
