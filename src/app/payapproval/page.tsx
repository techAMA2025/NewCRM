'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUser, FiMail, FiPhone, FiSend, FiCheck, 
  FiMenu, FiX
} from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';
import SalesSidebar from '@/components/navigation/SalesSidebar';
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

interface Payment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  amount: string;
  salesPersonName: string;
  timestamp: string;
  status: 'pending' | 'approved';
  approvedBy?: string;
  source: string;
}

export default function PaymentApprovalPage() {
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    amount: '',
    source: '',
    reasonOfPayment: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  useEffect(() => {
    fetchUserPayments();
    // Get user role from localStorage
    const role = localStorage.getItem('userRole') || 'sales';
    setUserRole(role);
  }, []);
  
  const fetchUserPayments = async () => {
    try {
      setLoadingPayments(true);
      const salesPersonName = localStorage.getItem('userName');
      if (!salesPersonName) return;
      
      const paymentsRef = collection(db, 'payments');
      const q = query(paymentsRef, where('salesPersonName', '==', salesPersonName));
      const querySnapshot = await getDocs(q);
      
      const payments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Payment);
      
      // Sort by timestamp descending (newest first)
      payments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setUserPayments(payments);
      setLoadingPayments(false);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      setLoadingPayments(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get salesperson name from localStorage
      const salesPersonName = localStorage.getItem('userName') || 'Unknown';
      
      // Prepare data for submission
      const paymentData = {
        status: 'pending',
        clientName: formData.clientName,
        clientEmail: formData.clientEmail, 
        clientPhone: formData.clientPhone,
        amount: formData.amount,
        source: formData.source,
        reasonOfPayment: formData.reasonOfPayment,
        salesPersonName,
        timestamp: new Date().toISOString()
      };
      
      // Add document to Firebase payments collection
      await addDoc(collection(db, 'payments'), paymentData);
      
      // After successful submission
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      // Refresh the payment list
      fetchUserPayments();
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({
          clientName: '',
          clientEmail: '',
          clientPhone: '',
          amount: '',
          source: '',
          reasonOfPayment: '',
        });
      }, 3000);
    } catch (error) {
      console.error('Error submitting payment request:', error);
      setIsSubmitting(false);
      // Here you might want to add error handling UI
    }
  };
  
  const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);
  
  const renderSidebar = () => {
    return userRole === 'advocate' ? <AdvocateSidebar /> : <SalesSidebar />;
  };
  
  return (
    <div className="flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
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
          <h1 className="text-xl font-bold text-green-800 dark:text-green-400">
            Sales Portal
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
            <h1 className="text-3xl md:text-4xl font-bold text-green-800 dark:text-green-400 mb-2">
              Payment Approval Request
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Submit client payment details for admin approval
            </p>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-green-50 dark:bg-gray-700/50 p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold flex items-center text-green-800 dark:text-green-400">
                  <BiRupee className="mr-2" />
                  New Payment Request
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Client Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="text-gray-500" />
                      </div>
                      <input
                        type="text"
                        id="clientName"
                        name="clientName"
                        value={formData.clientName}
                        onChange={handleChange}
                        required
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-green-500 focus:border-green-500 block w-full pl-10 p-2.5"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Client Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="text-gray-500" />
                      </div>
                      <input
                        type="email"
                        id="clientEmail"
                        name="clientEmail"
                        value={formData.clientEmail}
                        onChange={handleChange}
                        required
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-green-500 focus:border-green-500 block w-full pl-10 p-2.5"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Client Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="text-gray-500" />
                      </div>
                      <input
                        type="tel"
                        id="clientPhone"
                        name="clientPhone"
                        value={formData.clientPhone}
                        onChange={handleChange}
                        required
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-green-500 focus:border-green-500 block w-full pl-10 p-2.5"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Received Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BiRupee className="text-gray-500" />
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
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-green-500 focus:border-green-500 block w-full pl-10 p-2.5"
                      />
                    </div>
                  </motion.div>
                  
                  {userRole === 'advocate' && (
                    <motion.div 
                      whileHover={{ y: -2 }}
                      className="space-y-2 md:col-span-2"
                    >
                      <label htmlFor="reasonOfPayment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Reason of Payment
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="reasonOfPayment"
                          name="reasonOfPayment"
                          value={formData.reasonOfPayment}
                          onChange={handleChange}
                          required={userRole === 'advocate'}
                          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
                          placeholder="Describe the reason for this payment"
                        />
                      </div>
                    </motion.div>
                  )}
                  
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="space-y-2 md:col-span-2"
                  >
                    <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Source
                    </label>
                    <select
                      id="source"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      required
                      className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
                    >
                      <option value="">Select source</option>
                      <option value="credsettlee">Cred Settle</option>
                      <option value="ama">AMA</option>
                      <option value="settleloans">Settle Loans</option>
                      <option value="billcut">Bill Cut</option>
                    </select>
                  </motion.div>
                </div>
                
                <div className="pt-4">
                  {!isSubmitted ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-medium transition ${
                        isSubmitting 
                          ? 'bg-gray-400 dark:bg-gray-600' 
                          : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
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
                          Submit Approval Request
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-medium bg-green-600 dark:bg-green-700"
                    >
                      <FiCheck className="mr-2" />
                      Request Submitted Successfully!
                    </motion.div>
                  )}
                </div>
              </form>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  The payment approval request will be reviewed by an admin. You will be notified when it's approved.
                </p>
              </div>
            </div>
            
            <div className="mt-12 bg-white dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-300">Recent Payment Requests</h2>
              
              {loadingPayments ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : userPayments.length === 0 ? (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="py-3 px-4 bg-gray-50 dark:bg-gray-800/80">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No recent requests found.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {userPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{payment.clientName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{payment.clientEmail}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-200">₹{payment.amount}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(payment.timestamp).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              payment.status === 'approved' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                            }`}>
                              {payment.status === 'approved' ? 'Approved' : 'Pending'}
                            </span>
                            {payment.status === 'approved' && payment.approvedBy && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                by {payment.approvedBy}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
