'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import { FiFileText, FiMail, FiUser, FiCreditCard, FiTag, FiBriefcase } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

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

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <OverlordSidebar />
      
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
        </div>
      </div>
    </div>
  );
}
