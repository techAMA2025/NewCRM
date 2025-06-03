'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc, setDoc, deleteDoc, collectionGroup } from 'firebase/firestore';
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
  month?: string;
  year?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

type MonthlyData = {
  [userId: string]: {
    userName?: string;
    convertedLeadsTarget: number;
    amountCollectedTarget: number;
    amountCollected: number;
  };
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
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
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
          lastName: userData.lastName,
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

      setSalesUsers(users); // We'll sort these after fetching the progress data
      setTargets(targetData);
      setProgress(progressData);
      
      // Fetch existing targets
      await fetchExistingTargets(users);
      
      // Fetch progress data (this will also sort the users)
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
      
      // Create a monthly document ID
      const monthDocId = `${selectedMonth}_${selectedYear}`;
      
      // Try to get the monthly document
      const monthlyDocRef = doc(db, 'targets', monthDocId);
      const monthlyDocSnap = await getDoc(monthlyDocRef);
      
      if (monthlyDocSnap.exists()) {
        // Monthly document exists, now fetch targets from its subcollection
        for (const user of users) {
          // Get the user's target from the subcollection
          const userTargetRef = doc(db, 'targets', monthDocId, 'sales_targets', user.id);
          const userTargetSnap = await getDoc(userTargetRef);
          
          if (userTargetSnap.exists()) {
            // User has targets in the subcollection
            const targetData = userTargetSnap.data();
            tempTargets[user.id] = {
              convertedLeads: targetData.convertedLeadsTarget || 0,
              amountCollected: targetData.amountCollectedTarget || 0
            };
          } else {
            // No target in subcollection for this user
            tempTargets[user.id] = {
              convertedLeads: 0,
              amountCollected: 0
            };
          }
        }
      } else {
        // No monthly document exists yet
        for (const user of users) {
          // Initialize with zeros
          tempTargets[user.id] = {
            convertedLeads: 0,
            amountCollected: 0
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
      const userProgressData: { userId: string; progressPercentage: number }[] = [];
      
      // Create a monthly document ID
      const monthDocId = `${selectedMonth}_${selectedYear}`;
      
      for (const user of users) {
        // Fetch lead conversion data
        const leadsQuery = query(
          collection(db, 'crm_leads'),
          where('assignedTo', '==', user.firstName + (user.lastName ? ' ' + user.lastName : ''))
          // Add filters for month/year if your leads have timestamp fields
        );
        const leadsSnapshot = await getDocs(leadsQuery);
        
        let convertedLeadsCount = 0;
        leadsSnapshot.forEach(doc => {
          const leadData = doc.data();
          if (leadData.status === 'Converted' || leadData.convertedToClient === true) {
            convertedLeadsCount++;
          }
        });
        
        let amountCollected = 0;
        
        // Check if we have a monthly document with subcollections
        const monthlyDocRef = doc(db, 'targets', monthDocId);
        const monthlyDocSnap = await getDoc(monthlyDocRef);
        
        if (monthlyDocSnap.exists()) {
          // Monthly document exists, check in subcollection
          const userTargetRef = doc(db, 'targets', monthDocId, 'sales_targets', user.id);
          const userTargetSnap = await getDoc(userTargetRef);
          
          if (userTargetSnap.exists()) {
            const targetData = userTargetSnap.data();
            amountCollected = targetData.amountCollected || 0;
          }
        }
        
        tempProgress[user.id] = {
          convertedLeads: convertedLeadsCount,
          amountCollected: amountCollected
        };
        
        // Calculate progress percentage
        const targetValue = viewMetric === 'convertedLeads' 
          ? targets[user.id]?.convertedLeads || 0
          : targets[user.id]?.amountCollected || 0;
        
        const progressValue = viewMetric === 'convertedLeads'
          ? convertedLeadsCount
          : amountCollected;
        
        const progressPercentage = targetValue > 0 
          ? (progressValue / targetValue) * 100
          : 0;
        
        userProgressData.push({
          userId: user.id,
          progressPercentage
        });
      }
      
      setProgress(tempProgress);
      
      // Sort users by progress percentage
      const sortedUsers = [...users].sort((a, b) => {
        const aProgress = userProgressData.find(p => p.userId === a.id)?.progressPercentage || 0;
        const bProgress = userProgressData.find(p => p.userId === b.id)?.progressPercentage || 0;
        return bProgress - aProgress; // Descending order (highest first)
      });
      
      setSalesUsers(sortedUsers);
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
      
      // Create the monthly document ID
      const monthDocId = `${selectedMonth}_${selectedYear}`;
      const monthlyDocRef = doc(db, 'targets', monthDocId);
      
      // Create or update the main monthly document with metadata
      await setDoc(monthlyDocRef, {
        month: selectedMonth,
        year: selectedYear,
        updatedAt: new Date(),
        updatedBy: user.uid,
        createdAt: new Date(), // This will only apply if document doesn't exist
        createdBy: user.uid,   // This will only apply if document doesn't exist
      }, { merge: true }); // Use merge to avoid overwriting existing fields
      
      // Now update each user's target in the subcollection
      for (const salesUser of salesUsers) {
        // Skip if no target data
        if (!targets[salesUser.id]) continue;
        
        // Reference to the user's document in the subcollection
        const userTargetRef = doc(db, 'targets', monthDocId, 'sales_targets', salesUser.id);
        
        // Check if the user already has a document in the subcollection
        const userTargetSnap = await getDoc(userTargetRef);
        
        if (userTargetSnap.exists()) {
          // Update existing document
          await updateDoc(userTargetRef, {
            userName: salesUser.firstName + (salesUser.lastName ? ' ' + salesUser.lastName : ''),
            convertedLeadsTarget: Number(targets[salesUser.id].convertedLeads) || 0,
            amountCollectedTarget: Number(targets[salesUser.id].amountCollected) || 0,
            updatedAt: new Date()
          });
        } else {
          // Create new document in subcollection
          await setDoc(userTargetRef, {
            userId: salesUser.id,
            userName: salesUser.firstName + (salesUser.lastName ? ' ' + salesUser.lastName : ''),
            convertedLeadsTarget: Number(targets[salesUser.id].convertedLeads) || 0,
            amountCollectedTarget: Number(targets[salesUser.id].amountCollected) || 0,
            amountCollected: 0, // Initialize with zero
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user.uid
          });
        }
      }
      
      setSuccess('Targets have been set successfully!');
      setShowForm(false);
    } catch (error) {
      console.error('Error setting targets:', error);
      setError('Failed to set targets. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get current month in format "Jan", "Feb", etc.
  function getCurrentMonth() {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[new Date().getMonth()];
  }

  // Add effect to re-sort when viewMetric changes
  useEffect(() => {
    if (salesUsers.length > 0 && Object.keys(progress).length > 0) {
      const userProgressData = salesUsers.map(user => {
        const targetValue = viewMetric === 'convertedLeads' 
          ? targets[user.id]?.convertedLeads || 0
          : targets[user.id]?.amountCollected || 0;
        
        const progressValue = viewMetric === 'convertedLeads'
          ? progress[user.id]?.convertedLeads || 0
          : progress[user.id]?.amountCollected || 0;
        
        const progressPercentage = targetValue > 0 
          ? (progressValue / targetValue) * 100
          : 0;
        
        return {
          userId: user.id,
          progressPercentage
        };
      });
      
      const sortedUsers = [...salesUsers].sort((a, b) => {
        const aProgress = userProgressData.find(p => p.userId === a.id)?.progressPercentage || 0;
        const bProgress = userProgressData.find(p => p.userId === b.id)?.progressPercentage || 0;
        return bProgress - aProgress; // Descending order (highest first)
      });
      
      setSalesUsers(sortedUsers);
    }
  }, [viewMetric, progress, targets]);

  // Effect to refresh data when month/year changes
  useEffect(() => {
    if (salesUsers.length > 0) {
      // When month or year changes, re-fetch targets and progress
      fetchExistingTargets(salesUsers);
      fetchProgressData(salesUsers);
    }
  }, [selectedMonth, selectedYear]);

  if (loading && authChecked) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <p className="text-white text-sm">loading...</p>
      </div>
    );
  }

  // Show a general loading state if auth is still being checked
  if (!authChecked && (authLoading || loading)) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <p className="text-white text-sm">Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900" style={{ transform: 'scale(0.9)', transformOrigin: 'top left', width: '111.11%', height: '111.11%' }}>
      <OverlordSidebar />
      <div className="flex-1 overflow-auto p-7">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold mb-5 text-white">Sales Targets</h1>
          
          {error && (
            <div className="bg-red-900 border border-red-600 text-red-200 px-3 py-2 rounded mb-3 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-900 border border-green-600 text-green-200 px-3 py-2 rounded mb-3 text-sm">
              {success}
            </div>
          )}
          
          {/* Month Selector */}
          <div className="mb-5 flex items-center">
            <label className="text-white mr-2 text-sm">Month/Year:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {[2023, 2024, 2025, 2026, 2027].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {/* Current Targets Table */}
          <div className="mb-7">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-white">
                  Current Targets - {selectedMonth} {selectedYear}
                </h2>
                <div className="ml-3 flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMetric('convertedLeads')}
                    className={`relative inline-flex items-center px-3 py-1 rounded-l-md border ${
                      viewMetric === 'convertedLeads' 
                        ? 'bg-blue-600 text-white border-blue-700' 
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    } text-xs font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    Converted Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMetric('amountCollected')}
                    className={`relative inline-flex items-center px-3 py-1 rounded-r-md border ${
                      viewMetric === 'amountCollected' 
                        ? 'bg-blue-600 text-white border-blue-700' 
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    } text-xs font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    Amount Collected
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {showForm ? 'Hide Form' : 'Update Targets'}
              </button>
            </div>
            
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-lg font-medium text-gray-300 uppercase tracking-wider">
                      Sales Person
                    </th>
                    <th className="px-4 py-2 text-left text-lg font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-lg font-medium text-gray-300 uppercase tracking-wider">
                      {viewMetric === 'convertedLeads' ? 'Converted Leads Target' : 'Amount Collected Target (₹)'}
                    </th>
                    <th className="px-4 py-2 text-left text-lg font-medium text-gray-300 uppercase tracking-wider">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {salesUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-center text-gray-400 text-sm">
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
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-md font-medium text-gray-200">{salesUser.firstName} {" "} {salesUser.lastName}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-md text-gray-400">{salesUser.email}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-md text-gray-200">
                              {viewMetric === 'convertedLeads' 
                                ? targets[salesUser.id]?.convertedLeads || 0
                                : `₹${targets[salesUser.id]?.amountCollected || 0}`}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-1 ${progressColor} rounded-full`} 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-md text-gray-300 w-12">
                                {viewMetric === 'convertedLeads' 
                                  ? `${progressValue}/${targetValue}`
                                  : `${Math.round(percentage)}%`}
                              </span>
                            </div>
                            {viewMetric === 'amountCollected' && (
                              <div className="text-md text-gray-400 mt-1">
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
            <div className="mb-7">
              <h2 className="text-lg font-semibold text-white mb-3">Update Targets</h2>
              <form onSubmit={handleSubmit}>
                <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Sales Person
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <div>Converted Leads Target</div>
                          <div className="text-xs font-light normal-case mt-1 text-gray-400">Number of leads to convert</div>
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <div>Amount Collected Target (₹)</div>
                          <div className="text-xs font-light normal-case mt-1 text-gray-400">Target revenue in rupees</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {salesUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center text-gray-400 text-sm">
                            No sales personnel found
                          </td>
                        </tr>
                      ) : (
                        salesUsers.map((salesUser) => (
                          <tr key={salesUser.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-200">{salesUser.firstName}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs text-gray-400">{salesUser.email}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  className="bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                  value={targets[salesUser.id]?.convertedLeads || 0}
                                  onChange={(e) => handleInputChange(salesUser.id, 'convertedLeads', e.target.value)}
                                  aria-label="Converted leads target"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                  <span className="text-gray-400 text-xs">₹</span>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  className="bg-gray-700 border border-gray-600 text-gray-200 rounded pl-6 pr-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
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
                
                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded shadow disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {submitting ? 'Saving...' : 'Set Targets'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="ml-3 bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded shadow focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
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