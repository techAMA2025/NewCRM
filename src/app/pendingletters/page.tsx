'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, functions } from '@/firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import { FiFileText, FiMail, FiUser, FiCreditCard, FiTag, FiBriefcase, FiDatabase, FiRefreshCw, FiBarChart } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { authFetch } from '@/lib/authFetch';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  leadId: string;
  alloc_adv: string;
  alloc_adv_secondary?: string;
  banks?: string[];
  creditCardDues: string;
  personalLoanDues: string;
  request_letter?: boolean;
}

export default function PendingLettersPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [productivityLoading, setProductivityLoading] = useState(false);
  const [productivityStatus, setProductivityStatus] = useState<string>('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [backfillSourceLoading, setBackfillSourceLoading] = useState(false);
  const [backfillSourceStatus, setBackfillSourceStatus] = useState<string>('');

  const handleSyncSettlements = async () => {
    setSyncLoading(true);
    setSyncStatus('Starting settlement sync...');
    
    try {
      const syncSettledAccountsManual = httpsCallable(functions, 'syncSettledAccountsManual');
      const result = await syncSettledAccountsManual({});
      
      setSyncStatus('Sync completed successfully!');
      toast.success('Settlement status sync completed');
      console.log('Sync result:', result.data);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      setSyncStatus(`Sync failed: ${errorMessage}`);
      toast.error(`Sync failed: ${errorMessage}`);
      console.error('Sync error:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsCollection = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsCollection);
        
        const clientsList = clientsSnapshot.docs
          .map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          } as Client))
          .filter(client => client.request_letter !== true);
        
        setClients(clientsList);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to load client data');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const generateLetter = async (client: Client) => {
    toast.success(`Letter generation initiated for ${client.name}`);
    // Implementation for letter generation would go here
  };

  const handleCrmToAmaMigration = async () => {
    setMigrationLoading(true);
    setMigrationStatus('Starting migration...');
    
    try {
      // Use Firebase httpsCallable to call the Cloud Function
      const completeCrmToAmaMigration = httpsCallable(functions, 'completeCrmToAmaMigration');
      
      const result = await completeCrmToAmaMigration({});
      
      if (result.data && (result.data as any).success) {
        setMigrationStatus('Migration completed successfully!');
        toast.success('CRM to AMA migration completed successfully');
        console.log('Migration results:', (result.data as any).results);
      } else {
        throw new Error((result.data as any)?.error || 'Migration failed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      setMigrationStatus(`Migration failed: ${errorMessage}`);
      toast.error(`Migration failed: ${errorMessage}`);
      console.error('Migration error:', error);
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleCreateProductivitySnapshot = async () => {
    setProductivityLoading(true);
    setProductivityStatus('Creating productivity snapshot...');
    
    try {
      // Use Firebase httpsCallable to call the Cloud Function
      const createDailyProductivitySnapshot = httpsCallable(functions, 'createDailyProductivitySnapshot');
      
      const result = await createDailyProductivitySnapshot({});
      
      setProductivityStatus('Productivity snapshot created successfully!');
      toast.success('Daily productivity snapshot created successfully');
      console.log('Productivity snapshot result:', result.data);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      setProductivityStatus(`Snapshot creation failed: ${errorMessage}`);
      toast.error(`Productivity snapshot failed: ${errorMessage}`);
      console.error('Productivity snapshot error:', error);
    } finally {
      setProductivityLoading(false);
    }
  };

  const handleBackfillSource = async () => {
    setBackfillSourceLoading(true);
    setBackfillSourceStatus('Starting settlement source backfill...');
    
    try {
      const response = await authFetch('/api/settlement-tracker/backfill-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (data.success) {
        const { summary } = data;
        setBackfillSourceStatus(
          `Backfill completed! Updated: ${summary.updated}, Skipped (already had source): ${summary.skipped}, Client not found: ${summary.clientNotFound}, No source_database: ${summary.noSourceDatabase}, Errors: ${summary.errors}`
        );
        toast.success(`Settlement source backfill completed! ${summary.updated} records updated.`);
      } else {
        throw new Error(data.error || 'Backfill failed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      setBackfillSourceStatus(`Backfill failed: ${errorMessage}`);
      toast.error(`Backfill failed: ${errorMessage}`);
      console.error('Backfill error:', error);
    } finally {
      setBackfillSourceLoading(false);
    }
  };

  return (
    <OverlordSidebar>
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="p-8">
          <div className="mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500">
              Clients Pending Letters
            </h1>
            <div className="px-4 py-1 rounded-full bg-indigo-900/30 border border-indigo-700/50 text-indigo-300">
              {clients.length} Pending Letters
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 shadow-xl transition-all hover:shadow-indigo-900/10 hover:border-indigo-700/50">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-900/50 p-3 rounded-xl mr-3">
                  <FiUser className="text-indigo-400 text-xl" />
                </div>
                <h2 className="text-lg font-semibold text-gray-300">Total Clients</h2>
              </div>
              <div className="text-3xl font-bold text-white">{clients.length}</div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 shadow-xl transition-all hover:shadow-indigo-900/10 hover:border-indigo-700/50">
              <div className="flex items-center mb-4">
                <div className="bg-purple-900/50 p-3 rounded-xl mr-3">
                  <FiBriefcase className="text-purple-400 text-xl" />
                </div>
                <h2 className="text-lg font-semibold text-gray-300">Advocates</h2>
              </div>
              <div className="text-3xl font-bold text-white">
                {new Set(clients.map(client => client.alloc_adv)).size}
              </div>
            </div>
            
            
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-16 h-16 border-4 border-t-indigo-500 border-b-purple-700 rounded-full animate-spin"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-10 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl text-center">
              <div className="inline-flex justify-center items-center w-20 h-20 bg-indigo-900/30 rounded-full mb-4">
                <FiMail className="text-indigo-400 text-3xl" />
              </div>
              <p className="text-gray-400 text-lg">No clients with pending letters found.</p>
            </div>
          ) : (
            <div className="overflow-hidden bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr className="bg-gray-800/70">
                    <th scope="col" className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">Client</th>
                    <th scope="col" className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">Advocate</th>
                    <th scope="col" className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {clients.map((client, index) => (
                    <tr 
                      key={client.id} 
                      className={`hover:bg-gray-700/30 transition-colors duration-200 ${index % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-800/40'}`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">{client.name.charAt(0)}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-white">{client.name}</div>
                            <div className="flex flex-col space-y-1 mt-1">
                              <div className="text-xs text-gray-400 flex items-center">
                                <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
                                {client.phone}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center">
                                <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                                {client.email}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-white bg-gradient-to-r from-indigo-900/40 to-purple-900/40 px-3 py-1 rounded-md inline-block border border-indigo-700/30">
                          {client.alloc_adv}
                        </div>
                        {client.alloc_adv_secondary && (
                          <div className="text-xs text-gray-400 mt-2 bg-gray-700/30 px-3 py-1 rounded-md inline-block border border-gray-600/30">
                            {client.alloc_adv_secondary}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="space-y-2">
                          <div className="text-sm text-white flex items-center">
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            CC: <span className="ml-1 font-medium text-red-400">₹{parseInt(client.creditCardDues || '0').toLocaleString()}</span>
                          </div>
                          <div className="text-sm text-gray-400 flex items-center">
                            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                            PL: <span className="ml-1 font-medium text-yellow-400">₹{parseInt(client.personalLoanDues || '0').toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CRM to AMA Migration Section */}
          <div className="mt-12 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="bg-green-900/50 p-3 rounded-xl mr-4">
                <FiDatabase className="text-green-400 text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Database Migration</h2>
                <p className="text-gray-400 text-sm">Complete CRM to AMA leads migration</p>
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Migration Details</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Migrates all CRM leads to AMA leads collection
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Preserves all subcollections (history, callback_info)
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Normalizes data from different sources (CredSettle, SettleLoans, AMA)
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  This operation may take several minutes to complete
                </li>
              </ul>
            </div>

            {migrationStatus && (
              <div className="mb-6 p-4 rounded-xl border border-gray-700/50 bg-gray-900/30">
                <div className="flex items-center">
                  {migrationLoading ? (
                    <FiRefreshCw className="text-blue-400 text-lg mr-3 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-green-500 mr-3"></div>
                  )}
                  <span className="text-gray-300">{migrationStatus}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleCrmToAmaMigration}
              disabled={migrationLoading}
              className={`flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                migrationLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-green-900/25'
              }`}
            >
              {migrationLoading ? (
                <>
                  <FiRefreshCw className="text-lg mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <FiDatabase className="text-lg mr-2" />
                  Start CRM to AMA Migration
                </>
              )}
            </button>
          </div>

          {/* Daily Productivity Snapshot Section */}
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="bg-yellow-900/50 p-3 rounded-xl mr-4">
                <FiBarChart className="text-yellow-400 text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Daily Productivity Snapshot</h2>
                <p className="text-gray-400 text-sm">Generate daily productivity report for all users</p>
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Snapshot Details</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  Calculates productivity for Billcut and AMA leads
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  Creates daily snapshot with user-wise productivity data
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  Stores data in productivity_snapshots collection
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  Skips if snapshot already exists for today
                </li>
              </ul>
            </div>

            {productivityStatus && (
              <div className="mb-6 p-4 rounded-xl border border-gray-700/50 bg-gray-900/30">
                <div className="flex items-center">
                  {productivityLoading ? (
                    <FiRefreshCw className="text-blue-400 text-lg mr-3 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-yellow-500 mr-3"></div>
                  )}
                  <span className="text-gray-300">{productivityStatus}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleCreateProductivitySnapshot}
              disabled={productivityLoading}
              className={`flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                productivityLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white shadow-lg hover:shadow-yellow-900/25'
              }`}
            >
              {productivityLoading ? (
                <>
                  <FiRefreshCw className="text-lg mr-2 animate-spin" />
                  Creating Snapshot...
                </>
              ) : (
                <>
                  <FiBarChart className="text-lg mr-2" />
                  Create Daily Productivity Snapshot
                </>
              )}
            </button>
          </div>

          {/* Settlement Status Sync Section */}
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="bg-blue-900/50 p-3 rounded-xl mr-4">
                <FiRefreshCw className="text-blue-400 text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Settlement Status Sync</h2>
                <p className="text-gray-400 text-sm">Sync 'Settled' status from Settlements to Clients</p>
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Sync Details</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Finds all settlements marked as 'Settled'
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Updates corresponding client bank records with 'settled: true'
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Backfills missing status for older records
                </li>
              </ul>
            </div>

            {syncStatus && (
              <div className="mb-6 p-4 rounded-xl border border-gray-700/50 bg-gray-900/30">
                <div className="flex items-center">
                  {syncLoading ? (
                    <FiRefreshCw className="text-blue-400 text-lg mr-3 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-blue-500 mr-3"></div>
                  )}
                  <span className="text-gray-300">{syncStatus}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSyncSettlements}
              disabled={syncLoading}
              className={`flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                syncLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-900/25'
              }`}
            >
              {syncLoading ? (
                <>
                  <FiRefreshCw className="text-lg mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <FiRefreshCw className="text-lg mr-2" />
                  Test Sync Settlements
                </>
              )}
            </button>
          </div>

          {/* Settlement Source Backfill Section */}
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="bg-orange-900/50 p-3 rounded-xl mr-4">
                <FiTag className="text-orange-400 text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Settlement Source Backfill</h2>
                <p className="text-gray-400 text-sm">Backfill missing source field in settlements from clients collection</p>
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Backfill Details</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Checks each settlement for existing source field (skips if present)
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Looks up clientId in clients collection to get source_database
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Maps: ama → AMA, billcut → Billcut, credsettlee → Credsettle, settleloans → Settleloans
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  This operation may take several minutes for large collections
                </li>
              </ul>
            </div>

            {backfillSourceStatus && (
              <div className="mb-6 p-4 rounded-xl border border-gray-700/50 bg-gray-900/30">
                <div className="flex items-center">
                  {backfillSourceLoading ? (
                    <FiRefreshCw className="text-blue-400 text-lg mr-3 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-orange-500 mr-3"></div>
                  )}
                  <span className="text-gray-300 text-sm">{backfillSourceStatus}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleBackfillSource}
              disabled={backfillSourceLoading}
              className={`flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                backfillSourceLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-orange-900/25'
              }`}
            >
              {backfillSourceLoading ? (
                <>
                  <FiRefreshCw className="text-lg mr-2 animate-spin" />
                  Backfilling Sources...
                </>
              ) : (
                <>
                  <FiTag className="text-lg mr-2" />
                  Backfill Settlement Sources
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </OverlordSidebar>
  );
}
