import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

interface SalespersonPerformance {
  name: string;
  convertedLeads: number;
  interestedLeads: number;
  targetAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  conversionRate: number;
  targetAchievement: number;
}

interface SalespersonPerformanceTableProps {
  isLoading?: boolean;
  selectedAnalyticsMonth?: number | null;
  selectedAnalyticsYear?: number | null;
}

export const SalespersonPerformanceTable: React.FC<SalespersonPerformanceTableProps> = ({
  isLoading = false,
  selectedAnalyticsMonth = null,
  selectedAnalyticsYear = null
}) => {
  const [salespeople, setSalespeople] = useState<SalespersonPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Separate month filter state for salesperson performance
  const [selectedPerformanceMonth, setSelectedPerformanceMonth] = useState<number | null>(null);
  const [selectedPerformanceYear, setSelectedPerformanceYear] = useState<number | null>(null);

  useEffect(() => {
    const fetchSalespersonData = async () => {
      try {
        setLoading(true);
        
        // Use performance month filter if set, otherwise fall back to analytics filter, then current month
        const now = new Date();
        const targetMonth = selectedPerformanceMonth !== null ? selectedPerformanceMonth : 
                          (selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : now.getMonth());
        const targetYear = selectedPerformanceYear !== null ? selectedPerformanceYear : 
                          (selectedAnalyticsYear !== null ? selectedAnalyticsYear : now.getFullYear());
        
        // Get month and year in the correct format (e.g., "Aug_2025")
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        const monthYearName = `${monthNames[targetMonth]}_${targetYear}`;
        
        console.log('Fetching data for month:', monthYearName, 'Target month:', targetMonth, 'Target year:', targetYear);
        
        // First, get all active salespeople from users collection
        const usersRef = collection(db, 'users');
        const usersQuery = query(
          usersRef, 
          where('role', '==', 'sales'),
          where('status', '==', 'active')
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        console.log('Found users with sales role:', usersSnapshot.size);
        
        const salespersonData: SalespersonPerformance[] = [];
        
        // Process each user
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          const salespersonName = userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}` 
            : userData.firstName || userData.email || 'Unknown';
          
          console.log('Processing salesperson:', salespersonName);
          
          // Fetch leads data for this salesperson from crm_leads (for interested leads only)
          const leadsQuery = query(
            collection(db, 'crm_leads'),
            where('assignedTo', '==', salespersonName),
            where('synced_at', '>=', Timestamp.fromDate(new Date(targetYear, targetMonth, 1))),
            where('synced_at', '<=', Timestamp.fromDate(new Date(targetYear, targetMonth + 1, 0, 23, 59, 59)))
          );
          const leadsSnapshot = await getDocs(leadsQuery);
          console.log(`Found ${leadsSnapshot.size} crm_leads for ${salespersonName} in target month`);
          
          // Fetch billcut leads data for this salesperson (for interested leads only)
          const billcutQuery = query(
            collection(db, 'billcutLeads'),
            where('assigned_to', '==', salespersonName),
            where('synced_date', '>=', Timestamp.fromDate(new Date(targetYear, targetMonth, 1))),
            where('synced_date', '<=', Timestamp.fromDate(new Date(targetYear, targetMonth + 1, 0, 23, 59, 59)))
          );
          const billcutSnapshot = await getDocs(billcutQuery);
          console.log(`Found ${billcutSnapshot.size} billcutLeads for ${salespersonName} in target month`);
          
          // Count interested leads only (converted leads will come from targets collection)
          let interestedLeads = 0;
          
          // Process crm_leads for interested leads
          leadsSnapshot.forEach(doc => {
            const lead = doc.data();
            if (lead.status === 'Interested') {
              interestedLeads++;
            }
          });
          
          // Process billcutLeads for interested leads
          billcutSnapshot.forEach(doc => {
            const lead = doc.data();
            if (lead.category === 'Interested') {
              interestedLeads++;
            }
          });
          
          // Fetch target data for this salesperson from targets collection
          let targetAmount = 0;
          let collectedAmount = 0;
          let convertedLeads = 0; // This will come from targets collection
          
          try {
            // Get the user's target document from the targets collection
            const userTargetRef = doc(db, 'targets', monthYearName, 'sales_targets', userDoc.id);
            const userTargetSnap = await getDoc(userTargetRef);
            
            if (userTargetSnap.exists()) {
              const targetData = userTargetSnap.data();
              targetAmount = targetData.amountCollectedTarget || 0;
              collectedAmount = targetData.amountCollected || 0;
              convertedLeads = targetData.convertedLeads || 0; // Get converted leads from targets collection
              console.log(`Found target for ${salespersonName}:`, { 
                targetAmount, 
                collectedAmount, 
                convertedLeads 
              });
            } else {
              console.log(`No target found for ${salespersonName} in ${monthYearName}`);
            }
          } catch (error) {
            console.log(`Error fetching target for ${salespersonName}:`, error);
          }
          
          const pendingAmount = Math.max(0, targetAmount - collectedAmount);
          const conversionRate = (convertedLeads + interestedLeads) > 0 
            ? Math.round((convertedLeads / (convertedLeads + interestedLeads)) * 100) 
            : 0;
          const targetAchievement = targetAmount > 0 
            ? Math.round((collectedAmount / targetAmount) * 100) 
            : 0;
          
          // Only add salesperson if they have any data (leads or targets)
          if (convertedLeads > 0 || interestedLeads > 0 || targetAmount > 0) {
            salespersonData.push({
              name: salespersonName,
              convertedLeads,
              interestedLeads,
              targetAmount,
              collectedAmount,
              pendingAmount,
              conversionRate,
              targetAchievement
            });
            
            console.log(`Added ${salespersonName}:`, {
              convertedLeads,
              interestedLeads,
              targetAmount,
              collectedAmount,
              conversionRate,
              targetAchievement
            });
          } else {
            // Add salesperson with zero data for visibility
            salespersonData.push({
              name: salespersonName,
              convertedLeads: 0,
              interestedLeads: 0,
              targetAmount: 0,
              collectedAmount: 0,
              pendingAmount: 0,
              conversionRate: 0,
              targetAchievement: 0
            });
            console.log(`Added ${salespersonName} with zero data`);
          }
        }
        
        // Sort by target achievement (descending)
        salespersonData.sort((a, b) => b.targetAchievement - a.targetAchievement);
        
        console.log('Final salesperson data:', salespersonData);
        setSalespeople(salespersonData);
      } catch (error) {
        console.error('Error fetching salesperson data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSalespersonData();
  }, [selectedAnalyticsMonth, selectedAnalyticsYear, selectedPerformanceMonth, selectedPerformanceYear]);

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="text-blue-200">Loading salesperson data...</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="p-3 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-blue-200 font-medium text-sm">Salesperson Performance</h4>
            <p className="text-gray-400 text-xs mt-1">
              {(() => {
                const now = new Date();
                const targetMonth = selectedPerformanceMonth !== null ? selectedPerformanceMonth : 
                                  (selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : now.getMonth());
                const targetYear = selectedPerformanceYear !== null ? selectedPerformanceYear : 
                                  (selectedAnalyticsYear !== null ? selectedAnalyticsYear : now.getFullYear());
                const monthNames = [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ];
                return `${monthNames[targetMonth]} ${targetYear}`;
              })()}
            </p>
          </div>
          
          {/* Performance Month Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <select
                className="bg-gray-700 border border-gray-600 text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPerformanceMonth !== null ? selectedPerformanceMonth : new Date().getMonth()}
                onChange={(e) => setSelectedPerformanceMonth(parseInt(e.target.value))}
              >
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>
              
              <select
                className="bg-gray-700 border border-gray-600 text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPerformanceYear !== null ? selectedPerformanceYear : new Date().getFullYear()}
                onChange={(e) => setSelectedPerformanceYear(parseInt(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              {(selectedPerformanceMonth !== null || selectedPerformanceYear !== null) && (
                <button 
                  onClick={() => {
                    setSelectedPerformanceMonth(null);
                    setSelectedPerformanceYear(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/30 px-1 py-1 rounded-md"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-800/80">
            <tr className="bg-gradient-to-r from-blue-900/80 to-purple-900/80">
              <th className="p-2 text-left font-semibold text-blue-100 text-xs">Salesperson</th>
              <th className="p-2 text-center font-semibold text-blue-100 text-xs">Converted (Month)</th>
              <th className="p-2 text-center font-semibold text-blue-100 text-xs">Interested (Month)</th>
              <th className="p-2 text-center font-semibold text-blue-100 text-xs">Target</th>
              <th className="p-2 text-center font-semibold text-blue-100 text-xs">Collected</th>
              <th className="p-2 text-center font-semibold text-blue-100 text-xs">Pending</th>
            </tr>
          </thead>
          <tbody>
            {salespeople.map((person, index) => (
              <tr 
                key={person.name} 
                className={`hover:bg-gray-700/40 transition-colors ${
                  index % 2 === 0 ? 'bg-gray-800/40' : 'bg-gray-800/60'
                }`}
              >
                <td className="p-2 border-t border-gray-700 font-medium text-gray-100 text-xs">
                  {person.name}
                </td>
                <td className="p-2 text-center border-t border-gray-700 text-green-300 text-xs font-semibold">
                  {person.convertedLeads}
                </td>
                <td className="p-2 text-center border-t border-gray-700 text-blue-300 text-xs">
                  {person.interestedLeads}
                </td>
                <td className="p-2 text-center border-t border-gray-700 text-gray-100 text-xs">
                  {formatCurrency(person.targetAmount)}
                </td>
                <td className="p-2 text-center border-t border-gray-700 text-green-300 text-xs font-semibold">
                  {formatCurrency(person.collectedAmount)}
                </td>
                <td className="p-2 text-center border-t border-gray-700 text-orange-300 text-xs">
                  {formatCurrency(person.pendingAmount)}
                </td>
              
              </tr>
            ))}
            
            {salespeople.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400 text-sm">
                  No salesperson data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Summary row */}
      {salespeople.length > 0 && (
        <div className="p-3 border-t border-gray-700 bg-gradient-to-r from-blue-900/90 to-purple-900/90">
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-blue-200">Total Converted (Month): </span>
              <span className="text-white font-semibold">
                {salespeople.reduce((sum, p) => sum + p.convertedLeads, 0)}
              </span>
            </div>
            <div>
              <span className="text-blue-200">Total Target: </span>
              <span className="text-white font-semibold">
                {formatCurrency(salespeople.reduce((sum, p) => sum + p.targetAmount, 0))}
              </span>
            </div>
            <div>
              <span className="text-blue-200">Total Collected: </span>
              <span className="text-white font-semibold">
                {formatCurrency(salespeople.reduce((sum, p) => sum + p.collectedAmount, 0))}
              </span>
            </div>
            <div>
              <span className="text-blue-200">Total Interested (Month): </span>
              <span className="text-white font-semibold">
                {salespeople.reduce((sum, p) => sum + p.interestedLeads, 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 