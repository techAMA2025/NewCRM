"use client";

import React, { useState, useEffect } from 'react';
import { addBank, getAllBanksWithIds, updateBank, deleteBank, type BankDocument, type BankData } from '../../lib/bankService';
import { refreshBankData } from '../../data/bankData';
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaEnvelope, FaUniversity, FaSave, FaTimes } from 'react-icons/fa';

interface FormData {
  name: string;
  address: string;
  email: string;
}

export default function AddBankPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    email: ''
  });
  
  const [banks, setBanks] = useState<BankDocument[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<BankDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingBank, setEditingBank] = useState<BankDocument | null>(null);

  // Load banks on component mount
  useEffect(() => {
    loadBanks();
  }, []);

  // Filter banks based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredBanks(banks);
    } else {
      const filtered = banks.filter(bank => 
        bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBanks(filtered);
    }
  }, [searchTerm, banks]);

  const loadBanks = async () => {
    try {
      const bankData = await getAllBanksWithIds();
      setBanks(bankData);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load banks' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (editingBank) {
        // Update existing bank
        await updateBank(editingBank.id, formData.name, {
          address: formData.address,
          email: formData.email
        });
        setMessage({ type: 'success', text: 'Bank updated successfully!' });
        setEditingBank(null);
      } else {
        // Add new bank
        await addBank(formData.name, {
          address: formData.address,
          email: formData.email
        });
        setMessage({ type: 'success', text: 'Bank added successfully!' });
      }
      
      // Reset form and reload banks
      setFormData({ name: '', address: '', email: '' });
      await loadBanks();
      
      // IMPORTANT: Refresh the global bank data cache so other components see the changes
      try {
        await refreshBankData();
        console.log('Bank data cache refreshed successfully');
      } catch (error) {
        console.error('Failed to refresh bank data cache:', error);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save bank. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bank: BankDocument) => {
    setFormData({
      name: bank.name,
      address: bank.address,
      email: bank.email
    });
    setEditingBank(bank);
    setMessage(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteBank(id);
        setMessage({ type: 'success', text: 'Bank deleted successfully!' });
        await loadBanks();
        
        // IMPORTANT: Refresh the global bank data cache so other components see the changes
        try {
          await refreshBankData();
          console.log('Bank data cache refreshed after deletion');
        } catch (error) {
          console.error('Failed to refresh bank data cache after deletion:', error);
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to delete bank.' });
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingBank(null);
    setFormData({ name: '', address: '', email: '' });
    setMessage(null);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Sidebar */}
      <AdvocateSidebar />
      
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-2">
              Bank Management
            </h1>
            <p className="text-gray-400 text-lg">Manage your banking institutions with ease</p>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl backdrop-blur-sm border ${
              message.type === 'success' 
                ? 'bg-green-900/30 border-green-500/50 text-green-300' 
                : 'bg-red-900/30 border-red-500/50 text-red-300'
            } shadow-lg animate-pulse`}>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  message.type === 'success' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                {message.text}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl mr-4">
                  <FaUniversity className="text-white text-xl" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {editingBank ? 'Edit Bank Details' : 'Add New Bank'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-300">
                    Bank Name *
                  </label>
                  <div className="relative">
                    <FaUniversity className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                      placeholder="Enter bank name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="address" className="block text-sm font-semibold text-gray-300">
                    Address *
                  </label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-4 top-4 text-gray-400" />
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 resize-none"
                      placeholder="Enter full address"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-300">
                    Email *
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-4 text-gray-400" />
                    <textarea
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 resize-none"
                      placeholder="Enter email addresses (comma separated if multiple)"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                  >
                    <FaSave className="mr-2" />
                    {loading ? 'Saving...' : editingBank ? 'Update Bank' : 'Add Bank'}
                  </button>
                  
                  {editingBank && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex items-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-all duration-300"
                    >
                      <FaTimes className="mr-2" />
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Banks List Section */}
            <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Banks Directory</h2>
                <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 px-4 py-2 rounded-xl border border-purple-500/30">
                  <span className="text-purple-300 font-semibold">{filteredBanks.length} Banks</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-6">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search banks by name, address, or email..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                />
              </div>
              
              {/* Banks List */}
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {filteredBanks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl p-8 border border-gray-700/50">
                      <FaUniversity className="text-4xl text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">
                        {searchTerm ? 'No banks match your search.' : 'No banks found. Add your first bank!'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBanks.map((bank, index) => (
                      <div key={bank.id} className="group bg-gray-900/30 border border-gray-700/50 rounded-xl p-6 hover:bg-gray-900/50 hover:border-purple-500/30 transition-all duration-300 shadow-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-3">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg mr-3">
                                <FaUniversity className="text-white text-sm" />
                              </div>
                              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors duration-300">
                                {bank.name}
                              </h3>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-start text-gray-300">
                                <FaMapMarkerAlt className="text-indigo-400 mt-1 mr-2 flex-shrink-0" />
                                <span className="break-words">{bank.address}</span>
                              </div>
                              <div className="flex items-start text-gray-300">
                                <FaEnvelope className="text-purple-400 mt-1 mr-2 flex-shrink-0" />
                                <span className="break-words">{bank.email}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                              onClick={() => handleEdit(bank)}
                              className="p-2 bg-yellow-500/20 text-yellow-300 rounded-lg hover:bg-yellow-500/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all duration-300"
                              title="Edit Bank"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(bank.id, bank.name)}
                              className="p-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-300"
                              title="Delete Bank"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.3) rgba(55, 65, 81, 0.3);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
