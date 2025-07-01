import React, { useState, useEffect, useMemo } from 'react'
import { Lead } from './types/lead'
// import firebase from '../../firebase/firebase'
import  {db, storage}  from '../../firebase/firebase'
import { collection, doc, setDoc, writeBatch, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getBankDataSync } from '../../data/bankData'

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
  const [localSaveError, setLocalSaveError] = useState<string | null>(null);
  
  // Add state for agreement generation checkbox
  const [shouldGenerateAgreement, setShouldGenerateAgreement] = useState(false);
  
  // Add state for loan percentage (billcut specific)
  const [loanPercentage, setLoanPercentage] = useState('15');
  
  // Update local lead state when initialLead changes
  useEffect(() => {
    setLead({...initialLead});
  }, [initialLead]);
  
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

  // Calculate monthly fees
  const calculateMonthlyFees = (leadData: Lead): Lead => {
    const personalLoanTotal = parseFloat(leadData.personalLoanDues || '0');
    const creditCardTotal = parseFloat(leadData.creditCardDues || '0');
    const tenure = parseInt(leadData.tenure?.toString() || '0');
    
    if (tenure > 0) {
      const totalDues = personalLoanTotal + creditCardTotal;
      const feeAmount = totalDues * 0.10; // 10% of total dues
      const monthlyFee = Math.round(feeAmount / tenure);
      
      return {
        ...leadData,
        monthlyFees: monthlyFee.toString()
      };
    }
    
    return leadData;
  };

  // Effect to calculate totals when banks change
  useEffect(() => {
    if (lead.banks && lead.banks.length > 0) {
      setLead(prevLead => {
        const withTotals = calculateTotalDues(prevLead);
        return calculateMonthlyFees(withTotals);
      });
    }
  }, [lead.banks, lead.tenure]);

  // Effect to set default tenure for billcut source
  useEffect(() => {
    if (lead.source_database === 'billcut' && !lead.tenure) {
      setLead(prevLead => ({
        ...prevLead,
        tenure: '09'
      }));
    }
  }, [lead.source_database]);

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

    // Special handling for altPhone field - same as phone validation
    if (field === 'altPhone') {
      // Remove any non-numeric characters
      const numericValue = value.replace(/[^0-9]/g, '');
      // Take only first 10 digits
      value = numericValue.slice(0, 10);
    }

    // Special handling for PAN number - only alphanumeric and max 10 characters
    if (field === 'panNumber') {
      // Remove any non-alphanumeric characters and convert to uppercase
      const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      // Take only first 10 characters
      value = cleanValue.slice(0, 10);
    }

    // Special handling for Aadhar number - only numeric and max 12 digits
    if (field === 'aadharNumber') {
      // Remove any non-numeric characters
      const numericValue = value.replace(/[^0-9]/g, '');
      // Take only first 12 digits
      value = numericValue.slice(0, 12);
    }

    setLead(prevLead => {
      const updatedLead = {
        ...prevLead,
        [field]: value
      };
      
      // Recalculate monthly fees if tenure or loan amounts change
      if (field === 'tenure' || field === 'personalLoanDues' || field === 'creditCardDues') {
        return calculateMonthlyFees(updatedLead);
      }
      
      return updatedLead;
    });
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
    
    // Validate required fields
    if (!lead.panNumber || !lead.phone || !lead.altPhone || !lead.email || !lead.city) {
      setLocalSaveError('Please fill in all required fields (marked with *)');
      return;
    }
    
    // Additional validation for billcut clients
    if (lead.source_database === 'billcut') {
      // Calculate total loan amount for billcut clients
      const totalLoanAmount = (lead.banks || []).reduce((total: number, bank: any) => {
        return total + (parseFloat(bank.loanAmount) || 0);
      }, 0);
      
      // Only require loanPercentage if total loan amount is <= 400000
      if (totalLoanAmount <= 400000 && !loanPercentage) {
        setLocalSaveError('Loan percentage is required for billcut clients with total loan amount ≤ ₹4,00,000');
        return;
      }
    }
    
    // Clear any previous errors
    setLocalSaveError(null);
    
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
      console.log('Starting agreement generation for lead:', leadData.id);

      // Determine which API endpoint to use based on source and loan amount
      let apiEndpoint = '/api/agreement';
      let requestData: any = leadData;
      
      if (leadData.source_database === 'billcut') {
        // Calculate total loan amount
        const totalLoanAmount = (leadData.banks || []).reduce((total: number, bank: any) => {
          return total + (parseFloat(bank.loanAmount) || 0);
        }, 0);
        
        console.log('Total loan amount for billcut client:', totalLoanAmount);
        
        // If total loan amount is <= 400000, use billcut agreement
        if (totalLoanAmount <= 400000) {
          apiEndpoint = '/api/billcut-agreement';
          
          // Prepare data for billcut agreement
          requestData = {
            name: leadData.name,
            email: leadData.email,
            panNumber: leadData.panNumber,
            feePercentage: parseFloat(loanPercentage),
            date: leadData.startDate || new Date().toISOString().split('T')[0],
            banks: (leadData.banks || []).map((bank: any) => ({
              bankName: bank.bankName,
              loanAmount: bank.loanAmount,
              loanType: bank.loanType
            }))
          };
        } else {
          // If total loan amount is > 400000, use billcut PAS agreement with adjusted fee
          apiEndpoint = '/api/billcut-agreement-pas';
          
          // Calculate adjusted fee percentage (2% less than entered)
          const enteredPercentage = parseFloat(loanPercentage);
          const adjustedPercentage = Math.max(0, enteredPercentage - 2); // Ensure it doesn't go negative
          
          // Prepare data for billcut PAS agreement with adjusted fee
          requestData = {
            name: leadData.name,
            email: leadData.email,
            panNumber: leadData.panNumber,
            feePercentage: adjustedPercentage, // Pass the adjusted percentage
            date: leadData.startDate || new Date().toISOString().split('T')[0],
            banks: (leadData.banks || []).map((bank: any) => ({
              bankName: bank.bankName,
              loanAmount: bank.loanAmount,
              loanType: bank.loanType
            }))
          };
        }
      }
      
      console.log(`Sending request to ${apiEndpoint} with data:`, requestData);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Failed to generate agreement. Status:', response.status, 'Body:', errorBody);
        throw new Error('Failed to generate agreement');
      }
      
      const data = await response.json();
      console.log('Received response from agreement API:', data);
      
      // Update lead with document information
      setLead(prevLead => ({
        ...prevLead,
        documentUrl: data.documentUrl,
        documentName: data.documentName,
        documentUploadedAt: new Date(data.documentUploadedAt)
      }));
      
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      
      // Download the file
      if (data.documentUrl && data.documentName) {
        console.log('Attempting to download file:', data.documentName, 'from URL:', data.documentUrl);
        try {
          const fileResponse = await fetch(data.documentUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch the document from storage. Status: ${fileResponse.status}`);
          }
          const blob = await fileResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.documentName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          console.log('File download initiated successfully.');
        } catch (downloadError) {
          console.error('Error downloading the generated document:', downloadError);
          setUploadError('Document saved to cloud, but automatic download failed.');
        }
      }
      
      return data;
      
    } catch (error: any) {
      console.error('Error in generateAgreementDocument function:', error);
      setUploadError('Failed to generate agreement document');
      setTimeout(() => setUploadError(null), 3000);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const { isGenerateDisabled, generateDisabledReason } = useMemo(() => {
    const reasons = [];
    if (uploading) reasons.push('Currently uploading or generating.');
    if (!lead.name) reasons.push('Client Name is required.');
    if (!lead.email) reasons.push('Client Email is required.');
    if (!lead.startDate) reasons.push('Start Date of Service is required.');
    if (!lead.tenure) reasons.push('Tenure is required.');
    if (!shouldGenerateAgreement) reasons.push('The "Generate agreement document" checkbox must be checked.');

    if (lead.source_database === 'billcut') {
      // Calculate total loan amount for billcut clients
      const totalLoanAmount = (lead.banks || []).reduce((total: number, bank: any) => {
        return total + (parseFloat(bank.loanAmount) || 0);
      }, 0);
      
      // Only require loanPercentage if total loan amount is <= 400000
      if (totalLoanAmount <= 400000 && !loanPercentage) {
        reasons.push('Loan Percentage is required for Billcut clients with total loan amount ≤ ₹4,00,000.');
      }
    } else {
      if (!lead.monthlyFees) reasons.push('Monthly Fees are required.');
    }

    const isDisabled = reasons.length > 0;
    const reasonText = isDisabled ? `Cannot generate: ${reasons.join(' ')}` : 'Generate Agreement Document';
    
    // Log the state to the console for debugging
    console.log('Generate Agreement Button State:', { 
      isDisabled, 
      reasons,
      leadData: {
        name: !!lead.name,
        email: !!lead.email,
        startDate: !!lead.startDate,
        tenure: !!lead.tenure,
        monthlyFees: lead.monthlyFees,
        isBillcut: lead.source_database === 'billcut',
        loanPercentage: loanPercentage,
        isBoxChecked: shouldGenerateAgreement,
        totalLoanAmount: lead.source_database === 'billcut' ? (lead.banks || []).reduce((total: number, bank: any) => {
          return total + (parseFloat(bank.loanAmount) || 0);
        }, 0) : 0
      }
    });

    return { isGenerateDisabled: isDisabled, generateDisabledReason: reasonText };
  }, [uploading, lead, loanPercentage, shouldGenerateAgreement]);

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
          
          {localSaveError && (
            <div className="mb-4 p-3 bg-red-800 text-red-100 rounded-md">
              {localSaveError}
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
                    label="Email*"
                    type="email"
                    value={lead.email || ''}
                    onChange={(value) => handleFieldChange('email', value)}
                    required
                  />
                  <InputField
                    id="phone"
                    label="Phone*"
                    value={lead.phone || ''}
                    onChange={(value) => handleFieldChange('phone', value)}
                    required
                  />
                  <InputField
                    id="altPhone"
                    label="Alternate Phone*"
                    value={lead.altPhone || ''}
                    onChange={(value) => handleFieldChange('altPhone', value)}
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
                    label="PAN Number*"
                    value={lead.panNumber || ''}
                    onChange={(value) => handleFieldChange('panNumber', value)}
                    required
                  />
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-400 mb-1">
                      City*
                    </label>
                    <select
                      id="city"
                      value={lead.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      required
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <option value="Salesperson did not provide">Select city</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="occupation" className="block text-sm font-medium text-gray-400 mb-1">
                      Occupation
                    </label>
                    <select
                      id="occupation"
                      value={lead.occupation || ''}
                      onChange={(e) => handleFieldChange('occupation', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <option value="">Select occupation</option>
                      <option value="Not Employed">Not Employed</option>
                      <option value="Self employed">Self employed</option>
                      <option value="Employed With Government">Employed With Government</option>
                      <option value="Employed With Private">Employed With Private</option>
                      <option value="Small Business">Small Business</option>
                      <option value="Business with 10 people">Business with 10 people</option>
                    </select>
                  </div>
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
                  <div>
                    <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-400 mb-1">
                      Monthly Income
                    </label>
                    <select
                      id="monthlyIncome"
                      value={lead.monthlyIncome?.toString() || ''}
                      onChange={(e) => handleFieldChange('monthlyIncome', e.target.value)}
                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <option value="">Select income range</option>
                      <option value="0-25000">₹0 - ₹25,000</option>
                      <option value="25000-50000">₹25,000 - ₹50,000</option>
                      <option value="50000-75000">₹50,000 - ₹75,000</option>
                      <option value="75000-100000">₹75,000 - ₹1,00,000</option>
                      <option value="100000+">₹1,00,000+</option>
                    </select>
                  </div>
                </div>
              </FormSection>
              
              <FormSection title="Fee Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    id="tenure"
                    label="Tenure (months)"
                    value={lead.tenure?.toString() || ''}
                    onChange={(value) => handleFieldChange('tenure', value)}
                    required
                  />
                  {lead.source_database === 'billcut' ? (
                    <InputField
                      id="monthlyFees"
                      label="Monthly Fees"
                      value="0"
                      onChange={() => {}}
                      disabled
                      placeholder="₹"
                    />
                  ) : (
                    <InputField
                      id="monthlyFees"
                      label="Monthly Fees"
                      value={lead.monthlyFees?.toString() || ''}
                      onChange={(value) => handleFieldChange('monthlyFees', value)}
                      placeholder="₹"
                    />
                  )}
                  <InputField
                    id="startDate"
                    label="Start Date of Service"
                    type="date"
                    value={lead.startDate || ''}
                    onChange={(value) => handleFieldChange('startDate', value)}
                    required
                  />
                </div>
                
                {/* Loan Percentage field for billcut */}
                {lead.source_database === 'billcut' && (
                  <div className="mt-4">
                    {(() => {
                      const totalLoanAmount = (lead.banks || []).reduce((total: number, bank: any) => {
                        return total + (parseFloat(bank.loanAmount) || 0);
                      }, 0);
                      
                      if (totalLoanAmount <= 400000) {
                        return (
                          <InputField
                            id="loanPercentage"
                            label="Loan Percentage (%)"
                            value={loanPercentage}
                            onChange={(value) => setLoanPercentage(value)}
                            type="number"
                            placeholder="Enter percentage"
                            required
                          />
                        );
                      } else {
                        const enteredPercentage = parseFloat(loanPercentage);
                        const adjustedPercentage = Math.max(0, enteredPercentage - 2);
                        return (
                          <div className="space-y-3">
                            <InputField
                              id="loanPercentage"
                              label="Loan Percentage (%)"
                              value={loanPercentage}
                              onChange={(value) => setLoanPercentage(value)}
                              type="number"
                              placeholder="Enter percentage"
                              required
                            />
                            <div className="p-3 bg-blue-900 border border-blue-700 rounded-md">
                              <p className="text-blue-200 text-sm">
                                <strong>PAS Agreement:</strong> For total loan amount over ₹4,00,000, 
                                the actual fee will be <strong>{adjustedPercentage}%</strong> (2% less than entered percentage).
                              </p>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
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
              {lead.source_database !== 'billcut' && (
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
                    </div>
                  </div>
                </FormSection>
              )}
              
              <FormSection title="Agreement Generation">
                <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
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
                        Document processed successfully!
                      </div>
                    )}
                    
                    {/* Generate Agreement Button */}
                    <button
                      type="button"
                      onClick={() => generateAgreementDocument(lead)}
                      disabled={isGenerateDisabled}
                      title={generateDisabledReason}
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
                      ) : `Generate ${lead.source_database === 'billcut' ? 'Billcut ' : ''}Agreement Document`}
                    </button>
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
  
  // Special handling for altPhone input
  const altPhoneProps = id === 'altPhone' ? {
    maxLength: 10,
    pattern: '[0-9]*',
    inputMode: 'numeric' as const,
    onKeyPress: (e: React.KeyboardEvent) => {
      // Allow only numeric input for altPhone
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }
  } : {};

  // Special handling for PAN number input
  const panProps = id === 'panNumber' ? {
    maxLength: 10,
    pattern: '[A-Za-z0-9]*',
    style: { textTransform: 'uppercase' as const },
    onKeyPress: (e: React.KeyboardEvent) => {
      // Allow only alphanumeric characters for PAN
      if (!/[A-Za-z0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }
  } : {};

  // Special handling for Aadhar number input
  const aadharProps = id === 'aadharNumber' ? {
    maxLength: 12,
    pattern: '[0-9]*',
    inputMode: 'numeric' as const,
    onKeyPress: (e: React.KeyboardEvent) => {
      // Allow only numeric input for Aadhar
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }
  } : {};
  
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-400">{label}</label>
      <input
        type={id === 'phone' || id === 'altPhone' ? 'tel' : type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        {...inputProps}
        {...altPhoneProps}
        {...panProps}
        {...aadharProps}
      />
      {isNumericField && (
        <p className="mt-1 text-xs text-amber-400">Please enter numbers only (no commas)</p>
      )}
      {id === 'phone' && (
        <p className="mt-1 text-xs text-amber-400">Enter exactly 10 digits</p>
      )}
      {id === 'altPhone' && (
        <p className="mt-1 text-xs text-amber-400">Enter exactly 10 digits</p>
      )}
      {id === 'panNumber' && (
        <p className="mt-1 text-xs text-amber-400">Enter exactly 10 alphanumeric characters (e.g., ABCDE1234F)</p>
      )}
      {id === 'aadharNumber' && (
        <p className="mt-1 text-xs text-amber-400">Enter exactly 12 digits</p>
      )}
    </div>
  )
}

interface BankFormProps {
  bank: any
  onUpdate: (bankId: string, field: string, value: string) => void
  onRemove: (bankId: string) => void
}

const BankForm = ({ bank, onUpdate, onRemove }: BankFormProps) => {
  const [isEditingBankName, setIsEditingBankName] = useState(false);
  const [bankData, setBankData] = useState<Record<string, any>>({});
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);

  // Load bank data dynamically
  useEffect(() => {
    const loadBankData = async () => {
      try {
        const data = getBankDataSync();
        setBankData(data);
      } catch (error) {
        console.error('Error loading bank data:', error);
      } finally {
        setIsLoadingBanks(false);
      }
    };
    
    loadBankData();
  }, []);

  const bankNames = Object.keys(bankData);

  return (
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
          {isEditingBankName ? (
            <input
              id={`bank-${bank.id}-name`}
              type="text"
              value={bank.bankName}
              onChange={(e) => onUpdate(bank.id, 'bankName', e.target.value)}
              onBlur={() => setIsEditingBankName(false)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          ) : (
            <select
              id={`bank-${bank.id}-name`}
              value={bank.bankName}
              onChange={(e) => {
                onUpdate(bank.id, 'bankName', e.target.value);
                setIsEditingBankName(true);
              }}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Bank</option>
              {bankNames.map((bankName) => (
                <option key={bankName} value={bankName}>
                  {bankName}
                </option>
              ))}
            </select>
          )}
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
}

export default EditClientModal