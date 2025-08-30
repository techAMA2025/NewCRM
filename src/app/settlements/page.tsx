'use client'

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'react-hot-toast';
import { FiChevronDown, FiChevronUp, FiDollarSign, FiCreditCard, FiUser, FiPhone, FiMail, FiCalendar, FiMapPin, FiHome } from 'react-icons/fi';
import { FaUniversity, FaMoneyBillWave, FaHandshake } from 'react-icons/fa';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar';

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanAmount: string;
  loanType: string;
  settledat?: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  banks: Bank[];
  status: string;
  adv_status: string;
  alloc_adv: string;
  alloc_adv_secondary: string;
  personalLoanDues: string;
  creditCardDues: string;
  monthlyIncome: string;
  occupation: string;
  startDate: string;
  lastModified: any;
  convertedAt: any;
}

const SettlementsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentInputValues, setCurrentInputValues] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') || '';
      setUserRole(role);
    }
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchClients();
    }
  }, [userRole]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const clientsRef = collection(db, 'clients');
      
      let q;
      
      // If user is overlord, fetch all clients
      if (userRole === 'overlord') {
        q = query(clientsRef, orderBy('lastModified', 'desc'));
      } else {
        // For advocates, only fetch clients primarily assigned to them
        const currentUser = localStorage.getItem('userName');
        if (!currentUser) {
          toast.error('User information not found');
          setLoading(false);
          return;
        }
        q = query(
          clientsRef, 
          where('alloc_adv', '==', currentUser),
          orderBy('lastModified', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      const clientsData: Client[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Client, 'id'>;
        clientsData.push({ id: doc.id, ...data });
      });
      
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const openClientDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsModalOpen(true);
  };

  const updateSettlementAmount = async (clientId: string, bankId: string, settledAmount: string) => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const client = clients.find(c => c.id === clientId);
      
      if (!client) return;
      
      // Remove commas and convert to number for storage
      const cleanAmount = settledAmount.replace(/,/g, '');
      
      const updatedBanks = client.banks.map(bank => 
        bank.id === bankId 
          ? { ...bank, settledat: cleanAmount }
          : bank
      );
      
      await updateDoc(clientRef, {
        banks: updatedBanks
      });
      
      // Update local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? { ...client, banks: updatedBanks }
            : client
        )
      );
      
      toast.success('Settlement amount updated successfully');
    } catch (error) {
      console.error('Error updating settlement amount:', error);
      toast.error('Failed to update settlement amount');
    }
  };

  // Function to format number with Indian commas
  const formatIndianNumber = (value: string) => {
    if (!value) return '';
    
    // Remove all non-digit characters
    const cleanValue = value.replace(/[^\d]/g, '');
    
    if (cleanValue === '') return '';
    
    // Convert to number and format with Indian commas
    const number = parseInt(cleanValue, 10);
    return number.toLocaleString('en-IN');
  };

  // Function to handle input change with formatting
  const handleSettlementInputChange = (clientId: string, bankId: string, value: string) => {
    // Only allow numbers and commas
    const cleanInput = value.replace(/[^\d,]/g, '');
    
    // Format the input value with Indian commas
    const formattedValue = formatIndianNumber(cleanInput);
    
    // Update the input field with formatted value
    const inputElement = document.getElementById(`settlement-${clientId}-${bankId}`) as HTMLInputElement;
    if (inputElement) {
      inputElement.value = formattedValue;
    }
    
    // Store the clean value (without commas) in state for real-time calculations
    const cleanValue = cleanInput.replace(/,/g, '');
    const inputKey = `${clientId}-${bankId}`;
    setCurrentInputValues(prev => ({
      ...prev,
      [inputKey]: cleanValue
    }));
    
    // Update database
    updateSettlementAmount(clientId, bankId, cleanValue);
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getTotalLoanAmount = (banks: Bank[]) => {
    return banks.reduce((total, bank) => total + parseFloat(bank.loanAmount || '0'), 0);
  };

  const getTotalSettledAmount = (banks: Bank[], clientId?: string) => {
    return banks.reduce((total, bank) => {
      let settled = parseFloat(bank.settledat || '0');
      
      // If clientId is provided, use current input values for real-time calculation
      if (clientId) {
        const inputKey = `${clientId}-${bank.id}`;
        const currentValue = currentInputValues[inputKey];
        if (currentValue !== undefined) {
          settled = parseFloat(currentValue || '0');
        }
      }
      
      return total + settled;
    }, 0);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || client.adv_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const renderContent = () => (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settlements Tracker</h1>
          <p className="text-gray-600">
            {userRole === 'overlord' 
              ? 'Track and manage client settlement amounts across all banks' 
              : 'Track and manage settlement amounts for your assigned clients'
            }
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Clients</label>
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Converted">Converted</option>
                <option value="Active">Active</option>
                <option value="Dropped">Dropped</option>
                <option value="Not Responding">Not Responding</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchClients}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <FiUser className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{filteredClients.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FaUniversity className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Banks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredClients.reduce((total, client) => total + client.banks.length, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaMoneyBillWave className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Loan Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    filteredClients.reduce((total, client) => 
                      total + getTotalLoanAmount(client.banks), 0
                    ).toString()
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaHandshake className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Settled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    filteredClients.reduce((total, client) => 
                      total + getTotalSettledAmount(client.banks), 0
                    ).toString()
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div 
              key={client.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onClick={() => openClientDetails(client)}
            >
              {/* Status Bar */}
              <div className={`h-2 ${
                client.adv_status === 'Active' ? 'bg-green-500' :
                client.adv_status === 'Dropped' ? 'bg-red-500' :
                client.adv_status === 'Not Responding' ? 'bg-yellow-500' :
                client.adv_status === 'On Hold' ? 'bg-orange-500' :
                client.adv_status === 'Inactive' ? 'bg-gray-500' : 'bg-blue-500'
              }`}></div>
              
              {/* Client Card Content */}
              <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-gray-900">{client.name.toUpperCase()}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    client.adv_status === 'Active' ? 'bg-green-100 text-green-800' :
                    client.adv_status === 'Dropped' ? 'bg-red-100 text-red-800' :
                    client.adv_status === 'Not Responding' ? 'bg-yellow-100 text-yellow-800' :
                    client.adv_status === 'On Hold' ? 'bg-orange-100 text-orange-800' :
                    client.adv_status === 'Inactive' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {client.adv_status || 'Not Assigned'}
                  </span>
                </div>
                
                {/* Client Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <FiMail className="mr-2 text-gray-400" />
                    <span className="text-sm truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiPhone className="mr-2 text-gray-400" />
                    <span className="text-sm">{client.phone}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiMapPin className="mr-2 text-gray-400" />
                    <span className="text-sm">{client.city}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiCalendar className="mr-2 text-gray-400" />
                    <span className="text-sm">{client.startDate || 'N/A'}</span>
                  </div>
                </div>
                
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Monthly Income</p>
                    <p className="font-medium text-green-600">{formatCurrency(client.monthlyIncome || '0')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Banks</p>
                    <p className="font-medium text-blue-600">{client.banks.length}</p>
                  </div>
                </div>
                
                {/* Action Section */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500">Total Loan Amount</div>
                    <div className="font-medium text-green-600">{formatCurrency(getTotalLoanAmount(client.banks).toString())}</div>
                  </div>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <FaHandshake className="mr-1" />
                    View Settlements
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Client Details Modal */}
        {selectedClient && isDetailsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedClient.name}</h2>
                  <p className="text-gray-600">Settlement Details</p>
                </div>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Client Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Personal Loan Dues</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedClient.personalLoanDues || '0')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Credit Card Dues</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedClient.creditCardDues || '0')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Banks</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedClient.banks.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Settled</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(getTotalSettledAmount(selectedClient.banks, selectedClient.id).toString())}</p>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Bank Accounts & Settlements</h3>
                  {selectedClient.banks.map((bank, index) => (
                    <div key={bank.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div className="md:col-span-2">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <FiHome className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{bank.bankName}</p>
                              <p className="text-sm text-gray-600">{bank.accountNumber}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Loan Type</p>
                          <p className="font-medium">{bank.loanType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Original Amount</p>
                          <p className="font-semibold text-green-600">{formatCurrency(bank.loanAmount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Settled Amount</p>
                          <input
                            type="text"
                            id={`settlement-${selectedClient.id}-${bank.id}`}
                            placeholder="Enter amount"
                            defaultValue={bank.settledat ? formatIndianNumber(bank.settledat) : ''}
                            onChange={(e) => handleSettlementInputChange(selectedClient.id, bank.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Savings</p>
                          <p className={`font-semibold ${
                            (() => {
                              const inputKey = `${selectedClient.id}-${bank.id}`;
                              const currentValue = currentInputValues[inputKey] || bank.settledat || '0';
                              return parseFloat(currentValue) < parseFloat(bank.loanAmount);
                            })()
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }`}>
                            {(() => {
                              const inputKey = `${selectedClient.id}-${bank.id}`;
                              const currentValue = currentInputValues[inputKey] || bank.settledat || '0';
                              return parseFloat(currentValue) < parseFloat(bank.loanAmount)
                                ? formatCurrency((parseFloat(bank.loanAmount) - parseFloat(currentValue)).toString())
                                : 'N/A';
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Settlement Summary */}
                <div className="mt-6 bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Settlement Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Original Amount</p>
                      <p className="font-semibold text-lg">{formatCurrency(getTotalLoanAmount(selectedClient.banks).toString())}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Settled Amount</p>
                      <p className="font-semibold text-lg">{formatCurrency(getTotalSettledAmount(selectedClient.banks, selectedClient.id).toString())}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Savings</p>
                      <p className="font-semibold text-lg text-green-600">
                        {formatCurrency((getTotalLoanAmount(selectedClient.banks) - getTotalSettledAmount(selectedClient.banks, selectedClient.id)).toString())}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Savings %</p>
                      <p className="font-semibold text-lg text-green-600">
                        {getTotalLoanAmount(selectedClient.banks) > 0
                          ? `${(((getTotalLoanAmount(selectedClient.banks) - getTotalSettledAmount(selectedClient.banks, selectedClient.id)) / getTotalLoanAmount(selectedClient.banks)) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {filteredClients.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiUser className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settlements...</p>
        </div>
      </div>
    );
  }

  // Render based on user role
  if (userRole === 'overlord') {
    return <OverlordSidebar>{renderContent()}</OverlordSidebar>;
  } else if (userRole === 'advocate') {
    return (
      <div className="flex">
        <AdvocateSidebar />
        <div className="flex-1 bg-gray-50">
          {renderContent()}
        </div>
      </div>
    );
  }

  // Fallback for unknown roles
  return (
    <div className="min-h-screen bg-gray-50">
      {renderContent()}
    </div>
  );
};

export default SettlementsPage;
