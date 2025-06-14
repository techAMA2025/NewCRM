import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as crmDb } from '@/firebase/firebase';
import BillcutLeadNotesCell from './BillcutLeadNotesCell';

// Add color mapping interface and function
interface ColorMap {
  [key: string]: string;
}

const getRandomColor = (name: string): string => {
  // Predefined set of colors that work well with dark theme
  const colors = [
    'bg-blue-600',
    'bg-purple-600',
    'bg-green-600',
    'bg-pink-600',
    'bg-indigo-600',
    'bg-teal-600',
    'bg-orange-600',
    'bg-cyan-600',
    'bg-rose-600',
    'bg-emerald-600',
  ];
  
  // Use the name to generate a consistent index
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  assignedTo: string;
  assignedToId?: string;
  monthlyIncome: string;
  remarks: string;
  salesNotes: string;
  lastModified: Date;
  date: number;
}

interface SalesPerson {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BillcutLeadsTableProps {
  leads: Lead[];
  statusOptions: string[];
  salesTeamMembers: User[];
  updateLead: (id: string, data: any) => Promise<boolean>;
  fetchNotesHistory: (leadId: string) => Promise<void>;
  crmDb: any;
  user: any;
  showMyLeads: boolean;
  selectedLeads: string[];
  onSelectLead: (leadId: string) => void;
  onSelectAll: () => void;
}

const BillcutLeadsTable = ({
  leads,
  statusOptions,
  salesTeamMembers,
  updateLead,
  fetchNotesHistory,
  crmDb,
  user,
  showMyLeads,
  selectedLeads,
  onSelectLead,
  onSelectAll,
}: BillcutLeadsTableProps) => {
  const [editingData, setEditingData] = useState<{ [key: string]: Partial<Lead> }>({});
  const [salesPeople, setSalesPeople] = useState<User[]>([]);
  const [salesPersonColors, setSalesPersonColors] = useState<ColorMap>({});

  // Get user info from localStorage
  const userRole = localStorage.getItem('userRole') || '';
  const userName = localStorage.getItem('userName') || '';

  // Initialize color mapping when sales people are loaded
  useEffect(() => {
    const colorMap: ColorMap = {};
    salesPeople.forEach(person => {
      colorMap[person.name] = getRandomColor(person.name);
    });
    setSalesPersonColors(colorMap);
  }, [salesPeople]);

  // Fetch sales team members
  useEffect(() => {
    const fetchSalesTeam = async () => {
      try {
        const usersRef = collection(crmDb, 'users');
        const q = query(usersRef, where('role', 'in', ['sales']));
        const querySnapshot = await getDocs(q);
        let salesTeam = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().firstName + ' ' + doc.data().lastName,
          email: doc.data().email,
          role: doc.data().role,
        }));

        // Filter based on user role
        if (userRole === 'sales') {
          // Sales users can only see themselves in the dropdown
          salesTeam = salesTeam.filter(person => person.name === userName);
        }
        // Admin and overlord users see all salespeople

        setSalesPeople(salesTeam);
      } catch (error) {
        console.error('Error fetching sales team:', error);
      }
    };
    fetchSalesTeam();
  }, [userRole, userName]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'interested':
        return 'bg-green-900 text-green-100 border-green-700';
      case 'not interested':
        return 'bg-red-900 text-red-100 border-red-700';
      case 'not answering':
        return 'bg-orange-900 text-orange-100 border-orange-700';
      case 'callback':
        return 'bg-yellow-900 text-yellow-100 border-yellow-700';
      case 'converted':
        return 'bg-emerald-900 text-emerald-100 border-emerald-700';
      case 'loan required':
        return 'bg-purple-900 text-purple-100 border-purple-700';
      case 'cibil issue':
        return 'bg-rose-900 text-rose-100 border-rose-700';
      case 'closed lead':
        return 'bg-gray-500 text-white border-gray-700';
      case 'select status':
      default:
        return 'bg-gray-700 text-gray-200 border-gray-600';
    }
  };

  const isUnassigned = (lead: Lead) => {
    console.log('Checking if lead is unassigned:', {
      id: lead.id,
      assignedTo: lead.assignedTo,
      assignedToId: lead.assignedToId,
      isNull: lead.assignedTo === null,
      isUndefined: lead.assignedTo === undefined,
      isEmpty: lead.assignedTo === '',
      isDash: lead.assignedTo === '-',
      type: typeof lead.assignedTo
    });
    
    // Check for all possible unassigned states
    return !lead.assignedTo || 
           lead.assignedTo === '' || 
           lead.assignedTo === '-' || 
           lead.assignedTo === 'Unassigned' ||
           lead.assignedTo === 'unassigned';
  };

  const canAssignLead = (lead: Lead) => {
    if (!user) return false;
    
    const unassigned = isUnassigned(lead);
    console.log('Can assign lead check:', {
      id: lead.id,
      assignedTo: lead.assignedTo,
      userRole: userRole,
      userName: userName,
      isUnassigned: unassigned
    });
    
    // If lead is unassigned, anyone with sales/admin/overlord role can assign it
    if (unassigned) {
      return ['sales', 'admin', 'overlord'].includes(userRole || '');
    }
    
    // Admin and overlord can always assign/unassign
    if (userRole === 'admin' || userRole === 'overlord') return true;
    
    // For sales users:
    if (userRole === 'sales') {
      // If the lead is already assigned, only the assigned sales person can modify it
      if (lead.assignedTo === userName) {
        return true;
      }
      // If the lead is unassigned, any sales person can assign it
      return unassigned;
    }
    
    return false;
  };

  const handleUnassign = async (leadId: string) => {
    try {
      const dbData = {
        assignedTo: '',
        assignedToId: '',
      };
      
      const success = await updateLead(leadId, dbData);
      if (success) {
        // Remove local state update since parent will handle it
        console.log('Update successful, clearing editing data');
        setEditingData(prev => {
          const newData = { ...prev };
          delete newData[leadId];
          console.log('Cleared editing data:', newData);
          return newData;
        });
      }
    } catch (error) {
      console.error('Error unassigning lead:', error);
    }
  };

  const handleChange = (id: string, field: keyof Lead, value: any) => {
    console.log('handleChange called:', { id, field, value });
    
    // For status changes, immediately save to database
    if (field === 'status') {
      const dbData = { status: value };
      console.log('Saving status change:', { id, dbData });
      updateLead(id, dbData).then(success => {
        if (success) {
          // Remove local state update since parent will handle it
          console.log('Update successful, clearing editing data');
          setEditingData(prev => {
            const newData = { ...prev };
            delete newData[id];
            console.log('Cleared editing data:', newData);
            return newData;
          });
        }
      }).catch(error => {
        console.error('Error updating status:', error);
      });
      return;
    }

    // For assignedTo changes, immediately save to database
    if (field === 'assignedTo') {
      const selectedPerson = salesPeople.find(p => p.name === value);
      if (!selectedPerson) return;

      const dbData = { 
        assignedTo: value || '',
        assignedToId: selectedPerson.id || ''
      };
      
      console.log('Saving assignedTo change:', { id, dbData });
      updateLead(id, dbData).then(success => {
        if (success) {
          // Remove local state update since parent will handle it
          console.log('Update successful, clearing editing data');
          setEditingData(prev => {
            const newData = { ...prev };
            delete newData[id];
            console.log('Cleared editing data:', newData);
            return newData;
          });
        }
      }).catch(error => {
        console.error('Error updating assignedTo:', error);
      });
      return;
    }

    // For other fields, update editing state
    setEditingData(prev => {
      const newData = {
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          [field]: value
        }
      };
      console.log('New editing data:', newData);
      return newData;
    });
  };

  const handleSave = async (id: string) => {
    console.log('handleSave called for id:', id);
    console.log('Current editing data:', editingData);
    
    if (editingData[id] && Object.keys(editingData[id]).length > 0) {
      const data = editingData[id];
      console.log('Data to save:', data);
      
      // Map the fields to their database names
      const dbData: any = {};
      
      // Handle any remaining fields that need to be saved
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'status' && key !== 'assignedTo') {
          dbData[key] = value;
        }
      });

      try {
        console.log('Calling updateLead with:', { id, dbData });
        const success = await updateLead(id, dbData);
        console.log('updateLead result:', success);
        
        if (success) {
          // Remove local state update since parent will handle it
          console.log('Update successful, clearing editing data');
          setEditingData(prev => {
            const newData = { ...prev };
            delete newData[id];
            console.log('Cleared editing data:', newData);
            return newData;
          });
        }
      } catch (error) {
        console.error('Error in handleSave:', error);
      }
    } else {
      console.log('No editing data found for id:', id);
    }
  };

  // Check if user can edit lead (status and notes)
  const canEditLead = (lead: Lead, showMyLeads: boolean) => {
    // If lead is unassigned and My Leads is not turned on, disable editing
    if (isUnassigned(lead) && !showMyLeads) {
      return false;
    }

    // If My Leads is turned on, allow editing for any lead
    if (showMyLeads) {
      return true;
    }

    // If lead is assigned, check permissions
    if (!isUnassigned(lead)) {
      // Admin and overlord can always edit
      if (userRole === 'admin' || userRole === 'overlord') {
        return true;
      }
      
      // Sales users can only edit leads assigned to them
      if (userRole === 'sales') {
        return lead.assignedTo === userName;
      }
    }

    return false;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
      <table className="min-w-full divide-y divide-gray-700/50">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-16">
              <input
                type="checkbox"
                checked={selectedLeads.length === leads.length && leads.length > 0}
                onChange={onSelectAll}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
            </th>
            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-32">Date</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Contact Info</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Location</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Financials</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Assigned To</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Sales Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50 bg-gray-800/10">
          {leads.map((lead) => {
            const canAssign = canAssignLead(lead);
            const isOwner = user && lead.assignedToId === user.uid;
            
            return (
              <tr 
                key={lead.id} 
                className="hover:bg-gray-700/20 transition-colors duration-150 ease-in-out"
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={() => onSelectLead(lead.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-blue-300">
                      {new Date(lead.date).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-blue-300/70">
                      {new Date(lead.date).toLocaleString('en-US', {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </div>
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
                  <div className="flex flex-col space-y-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium shadow-sm ${getStatusColor(lead.status || 'Select Status')}`}>
                      {lead.status || 'Select Status'}
                    </span>
                    <select
                      value={editingData[lead.id]?.status || lead.status}
                      onChange={(e) => {
                        console.log('Status select changed:', { id: lead.id, newValue: e.target.value });
                        handleChange(lead.id, 'status', e.target.value);
                        handleSave(lead.id);
                      }}
                      disabled={!canEditLead(lead, showMyLeads)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-sm ${
                        canEditLead(lead, showMyLeads)
                          ? 'bg-gray-700/50 border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-gray-100'
                          : 'bg-gray-800/50 border-gray-700/50 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-2">
                    {!isUnassigned(lead) ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center flex-1">
                          <div 
                            className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                              salesPersonColors[lead.assignedTo] || 'bg-gray-800'
                            } text-white border border-gray-700 shadow-sm font-medium text-xs`}
                          >
                            {lead.assignedTo.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </div>
                          <span className="ml-2 text-xs text-gray-300 truncate">{lead.assignedTo}</span>
                        </div>
                        {user && lead.assignedTo === localStorage.getItem('userName') && (
                          <button
                            onClick={() => handleUnassign(lead.id)}
                            className="flex items-center justify-center h-6 w-6 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors duration-150"
                            title="Unassign lead"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-800 text-gray-400 border border-gray-700 shadow-sm font-medium text-xs">
                        UN
                      </div>
                    )}
                    {canAssignLead(lead) && (
                      <div className="mt-2">
                        <select
                          value={editingData[lead.id]?.assignedTo || (isUnassigned(lead) ? '' : lead.assignedTo)}
                          onChange={(e) => {
                            console.log('Assigned To select changed:', { 
                              id: lead.id, 
                              newValue: e.target.value,
                              currentAssignedTo: lead.assignedTo,
                              isUnassigned: isUnassigned(lead)
                            });
                            handleChange(lead.id, 'assignedTo', e.target.value);
                            handleSave(lead.id);
                          }}
                          className="w-full px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm text-gray-100"
                        >
                          <option value="">Unassigned</option>
                          {salesPeople.map((person) => (
                            <option 
                              key={person.id} 
                              value={person.name}
                              style={{
                                backgroundColor: salesPersonColors[person.name]?.replace('bg-', '') || 'gray-700',
                                color: 'white'
                              }}
                            >
                              {person.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </td>
                <BillcutLeadNotesCell
                  lead={lead}
                  fetchNotesHistory={fetchNotesHistory}
                  crmDb={crmDb}
                  updateLead={updateLead}
                  disabled={!canEditLead(lead, showMyLeads)}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BillcutLeadsTable; 