'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'

// Define interface for client data
interface Client {
  id: string
  name: string
  status: string
  lastContact: string
}

const AdvocateDashboard = () => {
  const [clientStats, setClientStats] = useState({
    activeClients: 0,
    droppedClients: 0,
    notRespondingClients: 0
  })
  // Properly type the clients array
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAdvocateData = async () => {
      try {
        // Get the current advocate name - in a real app, this would come from auth context
        // For now using a placeholder - replace with actual logged-in advocate name
        const currentAdvocate = "Rahul Gour"; // Replace with actual advocate name
        
        // Fetch clients assigned to this advocate
        const clientsRef = collection(db, 'clients');
        const advocateClientsQuery = query(
          clientsRef,
          where("alloc_adv", "==", currentAdvocate)
        );
        
        const clientsSnapshot = await getDocs(advocateClientsQuery);
        
        // Count clients by status
        let activeCount = 0;
        let droppedCount = 0;
        let notRespondingCount = 0;
        
        const recentClientsList: Client[] = [];
        
        clientsSnapshot.forEach((doc) => {
          const clientData = doc.data();
          const status = clientData.adv_status;
          
          // Count by status
          if (status === "Active") activeCount++;
          else if (status === "Dropped") droppedCount++;
          else if (status === "Not Responding") notRespondingCount++;
          
          // Add to recent clients (limiting to most recent ones)
          if (recentClientsList.length < 4) {
            recentClientsList.push({
              id: doc.id,
              name: clientData.name,
              status: clientData.adv_status,
              lastContact: clientData.lastModified?.toDate().toISOString().split('T')[0] || 'N/A'
            });
          }
        });
        
        // Update stats
        setClientStats({
          activeClients: activeCount,
          droppedClients: droppedCount,
          notRespondingClients: notRespondingCount
        });
        
        // If we have recent clients from the query, use them
        if (recentClientsList.length > 0) {
          setRecentClients(recentClientsList);
        } else {
          // Fallback to sample data if no clients found
          setRecentClients([
            { id: '1', name: 'Sarah Johnson', status: 'Active', lastContact: '2023-08-15' },
            { id: '2', name: 'Michael Rodriguez', status: 'Not Responding', lastContact: '2023-08-12' },
            { id: '3', name: 'Taylor Williams', status: 'Active', lastContact: '2023-08-10' },
            { id: '4', name: 'Alex Chen', status: 'Dropped', lastContact: '2023-08-05' },
          ]);
        }
      } catch (error) {
        console.error('Error fetching advocate data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvocateData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Advocate Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Active Clients</h2>
          <p className="text-3xl font-bold text-blue-600">{clientStats.activeClients}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Dropped Clients</h2>
          <p className="text-3xl font-bold text-red-600">{clientStats.droppedClients}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Not Responding Clients</h2>
          <p className="text-3xl font-bold text-yellow-600">{clientStats.notRespondingClients}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Clients</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${client.status === 'Active' ? 'bg-green-100 text-green-800' : 
                          client.status === 'Review' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.lastContact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Upcoming Tasks</h2>
          <div className="space-y-3">
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Today, 11:00 AM</p>
              <p>Client call with Sarah Johnson</p>
            </div>
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Today, 2:30 PM</p>
              <p>Case review meeting</p>
            </div>
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Tomorrow, 10:00 AM</p>
              <p>Documentation preparation for Rodriguez case</p>
            </div>
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Aug 17, 1:00 PM</p>
              <p>Team sync with legal department</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvocateDashboard
