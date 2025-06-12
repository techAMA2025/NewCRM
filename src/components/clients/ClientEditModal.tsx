"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/firebase';
import { toast } from 'react-hot-toast';

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
  settled: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  altPhone: string;
  assignedTo: string;
  email: string;
  city: string;
  alloc_adv: string;
  status: string;
  personalLoanDues: string;
  creditCardDues: string;
  banks: Bank[];
  monthlyIncome?: string;
  monthlyFees?: string;
  occupation?: string;
  startDate?: string;
  tenure?: string;
  remarks?: string;
  salesNotes?: string;
  queries?: string;
  isPrimary: boolean;
  isSecondary: boolean;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: Date;
}

interface ClientEditModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onClientUpdated: (updatedClient: Client) => void;
}

export default function ClientEditModal({ 
  client,  
  isOpen, 
  onClose, 
  onClientUpdated 
}: ClientEditModalProps) {
  const [formData, setFormData] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Initialize form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({...client});
    }
  }, [client]);

  if (!isOpen || !client || !formData) return null;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };

  const handleBankChange = (bankId: string, field: keyof Bank, value: string | boolean) => {
    setFormData(prev => {
      if (!prev) return null;
      
      const updatedBanks = prev.banks.map(bank => {
        if (bank.id === bankId) {
          return { ...bank, [field]: value };
        }
        return bank;
      });
      
      return { ...prev, banks: updatedBanks };
    });
  };

  const addNewBank = () => {
    setFormData(prev => {
      if (!prev) return null;
      
      const newBank: Bank = {
        id: `bank-${Date.now()}`,
        bankName: "",
        accountNumber: "",
        loanType: "Personal Loan",
        loanAmount: "",
        settled: false
      };
      
      return { ...prev, banks: [...prev.banks, newBank] };
    });
  };

  const removeBank = (bankId: string) => {
    setFormData(prev => {
      if (!prev) return null;
      
      const updatedBanks = prev.banks.filter(bank => bank.id !== bankId);
      return { ...prev, banks: updatedBanks };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const clientDocRef = doc(db, "clients", formData.id);
      
      // Remove the id field before updating (Firestore doesn't need it in the update)
      const { id, ...dataToUpdate } = formData;
      
      await updateDoc(clientDocRef, dataToUpdate);
      
      setSuccessMessage("Client updated successfully!");
      onClientUpdated(formData);
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      console.error("Error updating client:", err);
      setError("Failed to update client. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is a Word document
      if (file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFileUpload(file);
      } else {
        toast.error("Please upload a Word document (.doc or .docx)");
        e.target.value = '';
      }
    }
  };
  
  const handleFileUpload = async () => {
    if (!fileUpload || !formData) return;
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `clients/${formData.id}/documents/${fileUpload.name}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, fileUpload);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore
      const clientRef = doc(db, 'clients', formData.id);
      await updateDoc(clientRef, {
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date(),
        lastModified: new Date()
      });
      
      // Update local state
      const updatedClient = {
        ...formData,
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date()
      };
      
      setFormData(updatedClient);
      
      // Update parent component
      onClientUpdated(updatedClient);
      
      // Show success toast
      toast.success("Document uploaded successfully");
      
      // Reset file upload state
      setFileUpload(null);
    } catch (err) {
      console.error('Error uploading document:', err);
      let errorMessage = "Failed to upload document";
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div 
        className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700"
        style={{ animation: 'slideUp 0.3s ease-out forwards' }}
      >
        <div className="relative bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 p-6">
          <div className="absolute top-4 right-4">
            <button 
              onClick={onClose}
              className="text-gray-300 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-2 transition-all duration-200"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <h2 className="text-2xl font-bold text-white">Edit Client: {client.name}</h2>
          <p className="text-gray-300 mt-1">Update client information</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-6 bg-red-900/40 text-red-200 p-3 rounded-lg border border-red-800">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-6 bg-green-900/40 text-green-200 p-3 rounded-lg border border-green-800">
              {successMessage}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Personal Information */}
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.altPhone}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="occupation" className="block text-sm font-medium text-gray-300 mb-1">Occupation</label>
                  <input
                    type="text"
                    id="occupation"
                    name="occupation"
                    value={formData.occupation || ""}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Financial Information */}
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Financial Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="personalLoanDues" className="block text-sm font-medium text-gray-300 mb-1">Personal Loan Dues</label>
                  <input
                    type="text"
                    id="personalLoanDues"
                    name="personalLoanDues"
                    value={formData.personalLoanDues}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="creditCardDues" className="block text-sm font-medium text-gray-300 mb-1">Credit Card Dues</label>
                  <input
                    type="text"
                    id="creditCardDues"
                    name="creditCardDues"
                    value={formData.creditCardDues}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-300 mb-1">Monthly Income</label>
                  <input
                    type="text"
                    id="monthlyIncome"
                    name="monthlyIncome"
                    value={formData.monthlyIncome || ""}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="monthlyFees" className="block text-sm font-medium text-gray-300 mb-1">Monthly Fees</label>
                  <input
                    type="text"
                    id="monthlyFees"
                    name="monthlyFees"
                    value={formData.monthlyFees || ""}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="tenure" className="block text-sm font-medium text-gray-300 mb-1">Tenure (months)</label>
                  <input
                    type="text"
                    id="tenure"
                    name="tenure"
                    value={formData.tenure || ""}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Bank Information */}
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Bank Details</h3>
              <button
                type="button"
                onClick={addNewBank}
                className="flex items-center text-sm bg-purple-700 hover:bg-purple-600 text-white py-1 px-3 rounded transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Bank
              </button>
            </div>
            
            {formData.banks.length === 0 ? (
              <div className="text-center p-4 text-gray-400">No bank details added yet</div>
            ) : (
              <div className="space-y-6">
                {formData.banks.map((bank, index) => (
                  <div key={bank.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 relative">
                    <button
                      type="button"
                      onClick={() => removeBank(bank.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-400"
                      aria-label="Remove bank"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={bank.bankName}
                          onChange={(e) => handleBankChange(bank.id, 'bankName', e.target.value)}
                          className="w-full bg-gray-600 border border-gray-500 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={bank.accountNumber}
                          onChange={(e) => handleBankChange(bank.id, 'accountNumber', e.target.value)}
                          className="w-full bg-gray-600 border border-gray-500 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Loan Type</label>
                        <select
                          value={bank.loanType}
                          onChange={(e) => handleBankChange(bank.id, 'loanType', e.target.value)}
                          className="w-full bg-gray-600 border border-gray-500 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="Personal Loan">Personal Loan</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Home Loan">Home Loan</option>
                          <option value="Business Loan">Business Loan</option>
                          <option value="Auto Loan">Auto Loan</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Loan Amount</label>
                        <input
                          type="text"
                          value={bank.loanAmount}
                          onChange={(e) => handleBankChange(bank.id, 'loanAmount', e.target.value)}
                          className="w-full bg-gray-600 border border-gray-500 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      {/* Settled checkbox */}
                      <div className="md:col-span-2 mt-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`settled-${bank.id}`}
                            checked={bank.settled || false}
                            onChange={(e) => handleBankChange(bank.id, 'settled', e.target.checked)}
                            className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-500"
                          />
                          <label htmlFor={`settled-${bank.id}`} className="ml-2 text-sm font-medium text-gray-300">
                            Mark as Settled
                          </label>
                          {bank.settled && (
                            <span className="ml-2 px-2 py-1 bg-green-800/40 text-green-200 text-xs rounded-full">
                              Settled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Document Upload */}
          <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-4 text-purple-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Document Management
            </h3>
            
            {formData?.documentUrl ? (
              <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{formData.documentName || 'Document'}</p>
                    {formData.documentUploadedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Uploaded: {new Date(formData.documentUploadedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => window.open(formData.documentUrl, '_blank')}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 inline-block">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    View Document
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 mb-4">No document has been uploaded for this client yet.</p>
            )}
            
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm text-gray-400 block mb-1">Upload Word Document</label>
                <input 
                  id="file-upload"
                  type="file"
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <button
                onClick={handleFileUpload}
                disabled={!fileUpload || uploading}
                className={`px-4 py-2 rounded font-medium ${
                  !fileUpload || uploading 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                } transition-colors duration-200`}
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Uploading...
                  </div>
                ) : 'Upload Document'}
              </button>
            </div>
          </div>
          
          {/* Form Footer */}
          <div className="border-t border-gray-700 pt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md transition-colors duration-200 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : "Save Changes"}
            </button>
          </div>
        </form>
        
        {/* Add CSS for animations */}
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
} 