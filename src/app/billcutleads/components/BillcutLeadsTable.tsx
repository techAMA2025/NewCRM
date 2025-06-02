import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as crmDb } from '@/firebase/firebase';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  assignedTo: string;
  monthlyIncome: string;
  remarks: string;
  salesNotes: string;
  lastModified: Date;
}

interface SalesPerson {
  id: string;
  name: string;
  email: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface BillcutLeadsTableProps {
  leads: Lead[];
  statusOptions: string[];
  salesTeamMembers: User[];
  updateLead: (id: string, data: any) => Promise<boolean>;
}

const BillcutLeadsTable = ({
  leads,
  statusOptions,
  salesTeamMembers,
  updateLead,
}: BillcutLeadsTableProps) => {
  const [editingData, setEditingData] = useState<{ [key: string]: Partial<Lead> }>({});
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);

  // Fetch sales team members
  useEffect(() => {
    const fetchSalesTeam = async () => {
      try {
        const usersRef = collection(crmDb, 'users');
        const q = query(usersRef, where('role', '==', 'sales'));
        const querySnapshot = await getDocs(q);
        const salesTeam = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().firstName + ' ' + doc.data().lastName,
          email: doc.data().email,
        }));
        setSalesPeople(salesTeam);
      } catch (error) {
        console.error('Error fetching sales team:', error);
      }
    };
    fetchSalesTeam();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'interested':
        return 'bg-green-500/20 text-green-400';
      case 'not interested':
        return 'bg-red-500/20 text-red-400';
      case 'not answering':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'callback':
        return 'bg-blue-500/20 text-blue-400';
      case 'converted':
        return 'bg-purple-500/20 text-purple-400';
      case 'loan required':
        return 'bg-indigo-500/20 text-indigo-400';
      case 'cibil issue':
        return 'bg-orange-500/20 text-orange-400';
      case 'closed lead':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-700/20 text-gray-400';
    }
  };

  const handleChange = (id: string, field: keyof Lead, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = async (id: string) => {
    if (editingData[id] && Object.keys(editingData[id]).length > 0) {
      if (await updateLead(id, editingData[id])) {
        setEditingData(prev => {
          const newData = { ...prev };
          delete newData[id];
          return newData;
        });
      }
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
      <table className="min-w-full divide-y divide-gray-700/50">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Contact Info</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Location</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Financials</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Assigned To</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Sales Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50 bg-gray-800/10">
          {leads.map((lead) => (
            <tr 
              key={lead.id} 
              className="hover:bg-gray-700/20 transition-colors duration-150 ease-in-out"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-blue-300">
                  {lead.lastModified.toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-gray-100">{lead.name}</div>
                  <div className="text-sm text-blue-300/80">{lead.email}</div>
                  <div className="text-sm text-red-300">{lead.phone}</div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-purple-300">{lead.city}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-green-300">Income: ₹{lead.monthlyIncome}</div>
                  <div className="text-sm text-orange-300">{lead.remarks}</div>
                </div>
              </td>
              <td className="px-6 py-4">
                <select
                  value={editingData[lead.id]?.status || lead.status}
                  onChange={(e) => {
                    handleChange(lead.id, 'status', e.target.value);
                    handleSave(lead.id);
                  }}
                  className="w-full px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm text-gray-100"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-6 py-4">
                <select
                  value={editingData[lead.id]?.assignedTo || lead.assignedTo}
                  onChange={(e) => {
                    handleChange(lead.id, 'assignedTo', e.target.value);
                    handleSave(lead.id);
                  }}
                  className="w-full px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm text-gray-100"
                >
                  <option value="">Unassigned</option>
                  {salesPeople.map((person) => (
                    <option key={person.id} value={person.name}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-6 py-4">
                <textarea
                  value={editingData[lead.id]?.salesNotes || lead.salesNotes}
                  onChange={(e) => handleChange(lead.id, 'salesNotes', e.target.value)}
                  onBlur={() => handleSave(lead.id)}
                  className="w-full px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm text-gray-100"
                  rows={2}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BillcutLeadsTable; 