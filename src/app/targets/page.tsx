'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '@/context/AuthContext';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
// import Spinner from '@/components/ui/spinner';

type User = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName?: string;
};

type Target = {
  userId: string;
  userName: string;
  convertedLeadsTarget: number;
  amountCollectedTarget: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export default function TargetsPage() {
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [targets, setTargets] = useState<{ [key: string]: { convertedLeads: number; amountCollected: number } }>({});
  const [progress, setProgress] = useState<{ [key: string]: { convertedLeads: number; amountCollected: number } }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewMetric, setViewMetric] = useState<'convertedLeads' | 'amountCollected'>('convertedLeads');
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only proceed when auth is no longer loading
    if (authLoading) return;
    
    const checkUserRole = async () => {
      if (!user) {
        // Only redirect if we're sure auth has completed loading
        if (!authLoading) {
          router.push('/login');
        }
        return;
      }

      // First try to get the role from localStorage
      const storedRole = localStorage.getItem('userRole');
      
      if (storedRole === 'overlord') {
        fetchSalesUsers();
        setAuthChecked(true);
        return;
      }

      // Fallback to checking Firestore if role not in localStorage or not overlord
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (!userData || userData.role !== 'overlord') {
          router.push('/dashboard');
          return;
        }

        // Store the role in localStorage for future checks
        localStorage.setItem('userRole', userData.role);
        fetchSalesUsers();
        setAuthChecked(true);
      } catch (error) {
        console.error("Error checking user role:", error);
        setError("Error verifying your permissions. Please try again.");
        setLoading(false);
      }
    };
    
    checkUserRole();
  }, [user, router, authLoading]);

  const fetchSalesUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('role', '==', 'sales'));
      const querySnapshot = await getDocs(q);
      
      const users: User[] = [];
      const targetData: { [key: string]: { convertedLeads: number; amountCollected: number } } = {};
      const progressData: { [key: string]: { convertedLeads: number; amountCollected: number } } = {};

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          id: doc.id,
          firstName: userData.firstName || userData.displayName,
          email: userData.email,
          role: userData.role
        });
        
        // Initialize with default values
        targetData[doc.id] = {
          convertedLeads: 0,
          amountCollected: 0
        };
        
        // Initialize progress with default values
        progressData[doc.id] = {
          convertedLeads: 0,
          amountCollected: 0
        };
      });

      setSalesUsers(users);
      setTargets(targetData);
      setProgress(progressData);
      
      // Fetch existing targets
      await fetchExistingTargets(users);
      
      // Fetch progress data
      await fetchProgressData(users);
    } catch (error) {
      console.error('Error fetching sales users:', error);
      setError('Failed to load sales users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingTargets = async (users: User[]) => {
    try {
      const tempTargets = { ...targets };
      
      for (const user of users) {
        const q = query(collection(db, 'targets'), where('userId', '==', user.id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const targetData = querySnapshot.docs[0].data();
          tempTargets[user.id] = {
            convertedLeads: targetData.convertedLeadsTarget || 0,
            amountCollected: targetData.amountCollectedTarget || 0
          };
        }
      }
      
      setTargets(tempTargets);
    } catch (error) {
      console.error('Error fetching existing targets:', error);
    }
  };

  const fetchProgressData = async (users: User[]) => {
    try {
      const tempProgress = { ...progress };
      
      // This is a placeholder - you would replace this with your actual data fetching logic
      // For example, you might query your 'leads' collection to count converted leads
      // and query your 'payments' collection to sum amounts collected
      
      for (const user of users) {
        // Example: Fetch converted leads count (replace with your actual implementation)
        // const leadsQuery = query(
        //   collection(db, 'leads'), 
        //   where('assignedTo', '==', user.id),
        //   where('status', '==', 'converted')
        // );
        // const leadsSnapshot = await getDocs(leadsQuery);
        // tempProgress[user.id].convertedLeads = leadsSnapshot.size;
        
        // Example: Fetch amount collected (replace with your actual implementation)
        // const paymentsQuery = query(
        //   collection(db, 'payments'),
        //   where('collectedBy', '==', user.id)
        // );
        // const paymentsSnapshot = await getDocs(paymentsQuery);
        // let totalAmount = 0;
        // paymentsSnapshot.forEach(doc => {
        //   totalAmount += doc.data().amount || 0;
        // });
        // tempProgress[user.id].amountCollected = totalAmount;
        
        // For demo purposes, set random progress values
        tempProgress[user.id] = {
          convertedLeads: Math.floor(Math.random() * 30),
          amountCollected: Math.floor(Math.random() * 50000)
        };
      }
      
      setProgress(tempProgress);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    }
  };

  const handleInputChange = (userId: string, field: 'convertedLeads' | 'amountCollected', value: string) => {
    const numValue = parseInt(value) || 0;
    setTargets(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: numValue
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      // Create or update targets for each sales user
      for (const salesUser of salesUsers) {
        const targetData: Target = {
          userId: salesUser.id,
          userName: salesUser.firstName,
          convertedLeadsTarget: targets[salesUser.id].convertedLeads,
          amountCollectedTarget: targets[salesUser.id].amountCollected,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.uid
        };
        
        // Check if target already exists
        const q = query(collection(db, 'targets'), where('userId', '==', salesUser.id));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // Create new target
          await addDoc(collection(db, 'targets'), targetData);
        } else {
          // Update existing target
          const targetDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'targets', targetDoc.id), {
            convertedLeadsTarget: targetData.convertedLeadsTarget,
            amountCollectedTarget: targetData.amountCollectedTarget,
            updatedAt: new Date()
          });
        }
      }
      
      setSuccess('Targets have been set successfully!');
      setShowForm(false); // Hide form after successful submission
    } catch (error) {
      console.error('Error setting targets:', error);
      setError('Failed to set targets. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && authChecked) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <p className="text-white">loading...</p>
      </div>
    );
  }

  // Show a general loading state if auth is still being checked
  if (!authChecked && (authLoading || loading)) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <p className="text-white">Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <OverlordSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-white">Sales Targets</h1>
          
          {error && (
            <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-900 border border-green-600 text-green-200 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
          
          {/* Current Targets Table */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-white">Current Targets</h2>
                <div className="ml-4 flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMetric('convertedLeads')}
                    className={`relative inline-flex items-center px-4 py-2 rounded-l-md border ${
                      viewMetric === 'convertedLeads' 
                        ? 'bg-blue-600 text-white border-blue-700' 
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    Converted Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMetric('amountCollected')}
                    className={`relative inline-flex items-center px-4 py-2 rounded-r-md border ${
                      viewMetric === 'amountCollected' 
                        ? 'bg-blue-600 text-white border-blue-700' 
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    Amount Collected
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {showForm ? 'Hide Form' : 'Update Targets'}
              </button>
            </div>
            
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Sales Person
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {viewMetric === 'convertedLeads' ? 'Converted Leads Target' : 'Amount Collected Target (₹)'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {salesUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                        No sales personnel found
                      </td>
                    </tr>
                  ) : (
                    salesUsers.map((salesUser) => {
                      // Calculate progress percentage
                      const targetValue = viewMetric === 'convertedLeads' 
                        ? targets[salesUser.id]?.convertedLeads || 0
                        : targets[salesUser.id]?.amountCollected || 0;
                      
                      const progressValue = viewMetric === 'convertedLeads'
                        ? progress[salesUser.id]?.convertedLeads || 0
                        : progress[salesUser.id]?.amountCollected || 0;
                      
                      const percentage = targetValue > 0 
                        ? Math.min(Math.round((progressValue / targetValue) * 100), 100)
                        : 0;
                      
                      // Determine progress color
                      let progressColor = "bg-blue-600";
                      if (percentage >= 100) progressColor = "bg-green-600";
                      else if (percentage >= 75) progressColor = "bg-teal-600";
                      else if (percentage >= 50) progressColor = "bg-yellow-600";
                      else if (percentage < 25) progressColor = "bg-red-600";
                      
                      return (
                        <tr key={salesUser.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-200">{salesUser.firstName} {" "} {salesUser.lastName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">{salesUser.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-200">
                              {viewMetric === 'convertedLeads' 
                                ? targets[salesUser.id]?.convertedLeads || 0
                                : `₹${targets[salesUser.id]?.amountCollected || 0}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-2 ${progressColor} rounded-full`} 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="ml-3 text-sm text-gray-300 w-16">
                                {viewMetric === 'convertedLeads' 
                                  ? `${progressValue}/${targetValue}`
                                  : `${Math.round(percentage)}%`}
                              </span>
                            </div>
                            {viewMetric === 'amountCollected' && (
                              <div className="text-xs text-gray-400 mt-1">
                                ₹{progressValue} of ₹{targetValue}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Target Update Form - Only show when showForm is true */}
          {showForm && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Update Targets</h2>
              <form onSubmit={handleSubmit}>
                <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Sales Person
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <div>Converted Leads Target</div>
                          <div className="text-xs font-light normal-case mt-1 text-gray-400">Number of leads to convert</div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <div>Amount Collected Target (₹)</div>
                          <div className="text-xs font-light normal-case mt-1 text-gray-400">Target revenue in rupees</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {salesUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                            No sales personnel found
                          </td>
                        </tr>
                      ) : (
                        salesUsers.map((salesUser) => (
                          <tr key={salesUser.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-200">{salesUser.firstName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-400">{salesUser.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  className="bg-gray-700 border border-gray-600 text-gray-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={targets[salesUser.id]?.convertedLeads || 0}
                                  onChange={(e) => handleInputChange(salesUser.id, 'convertedLeads', e.target.value)}
                                  aria-label="Converted leads target"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-gray-400">₹</span>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  className="bg-gray-700 border border-gray-600 text-gray-200 rounded pl-8 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={targets[salesUser.id]?.amountCollected || 0}
                                  onChange={(e) => handleInputChange(salesUser.id, 'amountCollected', e.target.value)}
                                  aria-label="Amount collected target in rupees"
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {submitting ? 'Saving...' : 'Set Targets'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="ml-4 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded shadow focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
