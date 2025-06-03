import React, { useState, useEffect } from 'react'
import { Lead } from './types/lead'
// import firebase from '../../firebase/firebase'
import  {db, storage}  from '../../firebase/firebase'
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

// Define Indian states array
const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", 
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Lakshadweep", "Puducherry"
];

interface EditClientModalProps {
  lead: Lead
  saving: boolean
  saveError: string | null
  saveSuccess: boolean
  onClose: () => void
  onSave: (lead: Lead) => void
  onAddBank: () => void
  onUpdateBank: (bankId: string, field: string, value: string) => void
  onRemoveBank: (bankId: string) => void
}

const EditClientModal = ({ 
  lead: initialLead, 
  saving, 
  saveError, 
  saveSuccess, 
  onClose, 
  onSave, 
  onAddBank, 
  onUpdateBank, 
  onRemoveBank 
}: EditClientModalProps) => {
  // Create a state copy of the lead to track changes
  const [lead, setLead] = useState<Lead>({...initialLead});
  
  // Document upload states
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Add state for agreement generation checkbox
  const [shouldGenerateAgreement, setShouldGenerateAgreement] = useState(false);
  
  // Update local lead state when initialLead changes
  useEffect(() => {
    setLead({...initialLead});
  }, [initialLead]);
  
  // Handle field changes
  const handleFieldChange = (field: keyof Lead, value: any) => {
    console.log(`Updating field: ${field} with value:`, value); // Debug logging
    
    // Special handling for name field - capitalize first letter of each word
    if (field === 'name') {
      value = value
        .toLowerCase()
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Special handling for phone field - only allow numbers and max 10 digits
    if (field === 'phone') {
      // Remove any non-numeric characters
      const numericValue = value.replace(/[^0-9]/g, '');
      // Take only first 10 digits
      value = numericValue.slice(0, 10);
    }

    setLead(prevLead => ({
      ...prevLead,
      [field]: value
    }));
  };

  // Handle adding a bank locally
  const handleAddBank = () => {
    const newBank = {
      id: `bank-${Date.now()}`,
      bankName: '',
      loanType: '',
      accountNumber: '',
      loanAmount: ''
    };
    
    setLead(prevLead => {
      const updatedLead = {
        ...prevLead,
        banks: [...(prevLead.banks || []), newBank]
      };
      return updatedLead;
    });
  };

  // Handle updating a bank locally
  const handleUpdateBank = (bankId: string, field: string, value: string) => {
    setLead(prevLead => {
      const updatedBanks = (prevLead.banks || []).map(bank => 
        bank.id === bankId ? { ...bank, [field]: value } : bank
      );
      
      const updatedLead = {
        ...prevLead,
        banks: updatedBanks
      };
      
      // If loan type or amount changed, recalculate dues
      if (field === 'loanType' || field === 'loanAmount') {
        return calculateTotalDues(updatedLead);
      }
      
      return updatedLead;
    });
  };

  // Handle removing a bank locally
  const handleRemoveBank = (bankId: string) => {
    setLead(prevLead => {
      const updatedLead = {
        ...prevLead,
        banks: (prevLead.banks || []).filter(bank => bank.id !== bankId)
      };
      
      return calculateTotalDues(updatedLead);
    });
  };
  
  // Calculate total dues from banks
  const calculateTotalDues = (leadData: Lead): Lead => {
    let personalLoanTotal = 0;
    let creditCardTotal = 0;
    
    if (leadData.banks && leadData.banks.length > 0) {
      leadData.banks.forEach(bank => {
        const amount = parseFloat(bank.loanAmount) || 0;
        
        if (bank.loanType === 'Personal Loan' || bank.loanType === 'Business Loan') {
          // Add both Personal Loan and Business Loan to personalLoanTotal
          personalLoanTotal += amount;
        } else if (bank.loanType === 'Credit Card') {
          creditCardTotal += amount;
        }
      });
    }
    
    return {
      ...leadData,
      personalLoanDues: personalLoanTotal.toString(),
      creditCardDues: creditCardTotal.toString()
    };
  };

  // Effect to calculate totals when banks change
  useEffect(() => {
    if (lead.banks && lead.banks.length > 0) {
      setLead(prevLead => calculateTotalDues(prevLead));
    }
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is a Word document
      if (file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFileUpload(file);
      } else {
        setUploadError("Please upload a Word document (.doc or .docx)");
        e.target.value = '';
      }
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!fileUpload || !lead.id) return;
    
    setUploading(true);
    setUploadError(null);
    
    try {
      const storageRef = ref(storage, `leads/${lead.id}/documents/${fileUpload.name}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, fileUpload);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update local state
      setLead(prevLead => ({
        ...prevLead,
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date()
      }));
      
      setUploadSuccess(true);
      setFileUpload(null);
      
      // If there's a file input, reset it
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error('Error uploading document:', err);
      setUploadError('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if already saving
    if (saving) return;
    
    // Log the lead object to see what's being sent
    console.log('Submitting lead with source:', lead.source_database);
    
    try {
      // Create a cleaned version of the lead to send
      const leadToSave = {...lead};
      
      // If this is a new lead (ID starts with 'new-'), generate an ID based on the source
      if (leadToSave.id && leadToSave.id.startsWith('new-')) {
        console.log('Processing new lead creation');
        
        // Generate a new ID based on source database
        if (leadToSave.source_database) {
          const timestamp = Date.now();
          const sourcePrefix = leadToSave.source_database.substring(0, 3).toUpperCase();
          leadToSave.id = `${sourcePrefix}-${timestamp}`;
          console.log('Generated new lead ID:', leadToSave.id);
        } else {
          // If no source selected, remove the ID to let Firebase generate one
          (leadToSave as any).id = undefined;
          console.log('No source selected, letting Firebase generate ID');
        }
      }
      
      // Generate agreement document only if checkbox is checked and required fields are present
      if (shouldGenerateAgreement && leadToSave.name && leadToSave.email && leadToSave.startDate && 
          leadToSave.tenure && leadToSave.monthlyFees) {
        try {
          const documentData = await generateAgreementDocument(leadToSave);
          
          // Update the lead object with document information before saving
          if (documentData) {
            leadToSave.documentName = documentData.documentName;
            leadToSave.documentUrl = documentData.documentUrl;
            leadToSave.documentUploadedAt = new Date(documentData.documentUploadedAt);
          }
        } catch (error) {
          console.error('Error generating agreement document:', error);
          // Continue with save even if document generation fails
        }
      }
      
      // Pass the lead to onSave
      onSave(leadToSave);
    } catch (error) {
      console.error('Error in save process:', error);
      // The parent component should handle setting saveError
    }
  };

  // Function to generate agreement document
  const generateAgreementDocument = async (leadData: Lead): Promise<{documentName: string, documentUrl: string, documentUploadedAt: string} | null> => {
    try {
      setUploading(true);
      setUploadError(null);
      
      const response = await fetch('/api/agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate agreement');
      }
      
      const data = await response.json();
      
      // Update lead with document information
      setLead(prevLead => ({
        ...prevLead,
        documentUrl: data.documentUrl,
        documentName: data.documentName,
        documentUploadedAt: new Date(data.documentUploadedAt)
      }));
      
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      
      return data;
      
    } catch (error) {
      console.error('Error generating agreement:', error);
      setUploadError('Failed to generate agreement document');
      setTimeout(() => setUploadError(null), 3000);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center overflow-y-auto">
      <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              {lead.id?.startsWith('new-') ? 'Add New Client' : 'Edit Client Details'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-800 text-green-100 rounded-md">
              Client details saved successfully!
            </div>
          )}
          
          {saveError && (
            <div className="mb-4 p-3 bg-red-800 text-red-100 rounded-md">
              {saveError}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
              <FormSection title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    id="name"
                    label="Name*"
                    value={lead.name || ''}
                    onChange={(value) => handleFieldChange('name', value)}
                    required
                  />
                  <InputField
                    id="email"
                    label="Email"
                    type="email"
                    value={lead.email || ''}
                    onChange={(value) => handleFieldChange('email', value)}
                  />
                  <InputField
                    id="phone"
                    label="Phone*"
                    value={lead.phone || ''}
                    onChange={(value) => handleFieldChange('phone', value)}
                    required
                  />
                  <InputField
                    id="dob"
                    label="Date of Birth"
                    type="date"
                    value={lead.dob || ''}
                    onChange={(value) => handleFieldChange('dob', value)}
                  />
                  <InputField
                    id="panNumber"
                    label="PAN Number"
                    value={lead.panNumber || ''}
                    onChange={(value) => handleFieldChange('panNumber', value)}
                  />
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-400 mb-1">
                      State
                    </label>
                    <select
                      id="city"
                      value={lead.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <option value="">Select state</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField
                    id="occupation"
                    label="Occupation"
                    value={lead.occupation || ''}
                    onChange={(value) => handleFieldChange('occupation', value)}
                  />
                  <InputField
                    id="aadharNumber"
                    label="Aadhar Card Number"
                    value={lead.aadharNumber || ''}
                    onChange={(value) => handleFieldChange('aadharNumber', value)}
                  />
                  <div>
                    <label htmlFor="source_database" className="block text-sm font-medium text-gray-400 mb-1">
                      Data Source
                    </label>
                    <select
                      id="source_database"
                      value={lead.source_database || ''}
                      onChange={(e) => handleFieldChange('source_database', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <option value="">Select source</option>
                      <option value="credsettlee">Cred Settle</option>
                      <option value="ama">AMA</option>
                      <option value="settleloans">Settle Loans</option>
                      <option value="billcut">Bill Cut</option>
                    </select>
                  </div>
                </div>
              </FormSection>
              
              <FormSection title="Financial Information">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    id="personalLoanDues"
                    label="Personal Loan Dues"
                    value={lead.personalLoanDues || ''}
                    onChange={(value) => handleFieldChange('personalLoanDues', value)}
                    placeholder="₹"
                  />
                  <InputField
                    id="creditCardDues"
                    label="Credit Card Dues"
                    value={lead.creditCardDues || ''}
                    onChange={(value) => handleFieldChange('creditCardDues', value)}
                    placeholder="₹"
                  />
                  <InputField
                    id="monthlyIncome"
                    label="Monthly Income"
                    value={lead.monthlyIncome?.toString() || ''}
                    onChange={(value) => handleFieldChange('monthlyIncome', value)}
                    placeholder="₹"
                  />
                </div>
              </FormSection>
              
              <FormSection title="Fee Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    id="tenure"
                    label="Tenure (months)"
                    value={lead.tenure?.toString() || ''}
                    onChange={(value) => handleFieldChange('tenure', value)}
                  />
                  <InputField
                    id="monthlyFees"
                    label="Monthly Fees"
                    value={lead.monthlyFees?.toString() || ''}
                    onChange={(value) => handleFieldChange('monthlyFees', value)}
                    placeholder="₹"
                  />
                  <InputField
                    id="startDate"
                    label="Start Date of Service"
                    type="date"
                    value={lead.startDate || ''}
                    onChange={(value) => handleFieldChange('startDate', value)}
                  />
                </div>
              </FormSection>
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">Bank Details</h3>
                  
                </div>
                
                <div className="space-y-4">
                  {lead.banks?.length ? (
                    lead.banks.map((bank: any) => (
                      <BankForm
                        key={bank.id}
                        bank={bank}
                        onUpdate={handleUpdateBank}
                        onRemove={handleRemoveBank}
                      />
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm italic">No bank details added yet.</p>
                  )}
                </div>
                <button
                    type="button"
                    onClick={handleAddBank}
                    className="mt-5 inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Bank
                  </button>
              </div>
              
              {/* Document Upload Section */}
              <FormSection title="Document Upload">
                <div className="space-y-4">
                  {lead.documentUrl ? (
                    <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            {lead.documentName || 'Document'}
                          </p>
                          {lead.documentUploadedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Uploaded on: {lead.documentUploadedAt.toString()}
                            </p>
                          )}
                        </div>
                        <a 
                          href={lead.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">No document has been uploaded for this lead yet.</p>
                  )}
                  
                  <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-400 mb-1">
                          Upload Word Document
                        </label>
                        <input 
                          id="file-upload"
                          type="file"
                          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-gray-400 
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-md file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-blue-600 file:text-white
                                  hover:file:bg-blue-700
                                  bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleFileUpload}
                        disabled={!fileUpload || uploading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </span>
                        ) : 'Upload Document'}
                      </button>
                    </div>
                    
                    {/* Generate Agreement checkbox */}
                    <div className="mt-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shouldGenerateAgreement}
                          onChange={(e) => setShouldGenerateAgreement(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out bg-gray-700 border-gray-500 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-300">Generate agreement document</span>
                      </label>
                    </div>
                    
                    {uploadError && (
                      <div className="mt-2 p-2 bg-red-800 text-red-100 rounded-md text-sm">
                        {uploadError}
                      </div>
                    )}
                    {uploadSuccess && (
                      <div className="mt-2 p-2 bg-green-800 text-green-100 rounded-md text-sm">
                        Document uploaded successfully!
                      </div>
                    )}
                    
                    {/* Generate Agreement Button */}
                    <button
                      type="button"
                      onClick={() => generateAgreementDocument(lead)}
                      disabled={uploading || !lead.name || !lead.email || !lead.startDate || !lead.tenure || !lead.monthlyFees || !shouldGenerateAgreement}
                      className="mt-4 w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : 'Generate Agreement Document'}
                    </button>
                  </div>
                </div>
              </FormSection>
              
              <FormSection title="Notes & Remarks">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-400 mb-1">Client Message/Query</label>
                    <textarea
                      id="remarks"
                      value={lead.remarks || ''}
                      onChange={(e) => handleFieldChange('remarks', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="salesNotes" className="block text-sm font-medium text-gray-400 mb-1">Sales Notes</label>
                    <textarea
                      id="salesNotes"
                      value={lead.salesNotes || ''}
                      onChange={(e) => handleFieldChange('salesNotes', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                  </div>
                </div>
              </FormSection>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface FormSectionProps {
  title: string
  children: React.ReactNode
}

const FormSection = ({ title, children }: FormSectionProps) => (
  <div>
    <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">{title}</h3>
    <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
      {children}
    </div>
  </div>
)

interface InputFieldProps {
  id: string
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}

const InputField = ({ id, label, value, onChange, type = 'text', required = false, placeholder, disabled = false }: InputFieldProps) => {
  // Determine if this is a numeric field
  const isNumericField = ['number', 'tel'].includes(type) || 
                         id.includes('Dues') || 
                         id.includes('Income') || 
                         id.includes('Fees') || 
                         id.includes('Amount');
  
  // Special handling for phone input
  const inputProps = id === 'phone' ? {
    maxLength: 10,
    pattern: '[0-9]*',
    inputMode: 'numeric' as const,
    onKeyPress: (e: React.KeyboardEvent) => {
      // Allow only numeric input for phone
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }
  } : {};
  
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-400">{label}</label>
      <input
        type={id === 'phone' ? 'tel' : type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        {...inputProps}
      />
      {isNumericField && (
        <p className="mt-1 text-xs text-amber-400">Please enter numbers only (no commas)</p>
      )}
      {id === 'phone' && (
        <p className="mt-1 text-xs text-amber-400">Enter exactly 10 digits</p>
      )}
    </div>
  )
}

interface BankFormProps {
  bank: any
  onUpdate: (bankId: string, field: string, value: string) => void
  onRemove: (bankId: string) => void
}

const BankForm = ({ bank, onUpdate, onRemove }: BankFormProps) => (
  <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 relative">
    <button
      type="button"
      onClick={() => onRemove(bank.id)}
      className="absolute top-2 right-2 text-gray-400 hover:text-red-400"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor={`bank-${bank.id}-name`} className="block text-sm font-medium text-gray-400 mb-1">Bank Name</label>
        <input
          id={`bank-${bank.id}-name`}
          type="text"
          value={bank.bankName}
          onChange={(e) => onUpdate(bank.id, 'bankName', e.target.value)}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor={`bank-${bank.id}-loanType`} className="block text-sm font-medium text-gray-400 mb-1">Loan Type</label>
        <select
          id={`bank-${bank.id}-loanType`}
          value={bank.loanType}
          onChange={(e) => onUpdate(bank.id, 'loanType', e.target.value)}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select type</option>
          <option value="Personal Loan">Personal Loan</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Business Loan">Business Loan</option>
        </select>
      </div>
      <div>
        <label 
          htmlFor={`bank-${bank.id}-accountNumber`}
          className="block text-sm font-medium text-gray-400 mb-1"
        >
          {bank.loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number'}
        </label>
        <input
          id={`bank-${bank.id}-accountNumber`}
          type="text"
          value={bank.accountNumber}
          onChange={(e) => onUpdate(bank.id, 'accountNumber', e.target.value)}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label 
          htmlFor={`bank-${bank.id}-amount`}
          className="block text-sm font-medium text-gray-400 mb-1"
        >
          {bank.loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount'}
        </label>
        <input
          id={`bank-${bank.id}-amount`}
          type="text"
          value={bank.loanAmount}
          onChange={(e) => onUpdate(bank.id, 'loanAmount', e.target.value)}
          placeholder="₹"
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-amber-400">Please enter numbers only (no commas)</p>
      </div>
    </div>
  </div>
)

export default EditClientModal