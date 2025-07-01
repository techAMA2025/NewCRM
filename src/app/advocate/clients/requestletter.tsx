"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db, storage } from "@/firebase/firebase";
import mammoth from 'mammoth';
import { useBankDataSimple } from "@/components/BankDataProvider";

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
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
  alloc_adv_at?: any;
  convertedAt?: any;
  adv_status?: string;
  isPrimary: boolean;
  isSecondary: boolean;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: any;
}

// Request Letter Form Component
function RequestLetterForm({ client, onClose }: { client: Client, onClose: () => void }) {
  const { bankData, isLoading: isLoadingBanks } = useBankDataSimple();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name1: client.name || "",
    bankName: "",
    bankAddress: "",
    bankEmail: "",
    accountType: "Loan Account", // Default value
    number: client.banks && client.banks.length > 0 ? client.banks[0].accountNumber || "" : "",
    reason: "Job Loss", // Default value
    email: client.email || "",
    selectedBank: "", // New field for bank selection
  });

  const handleBankSelect = (value: string) => {
    if (value && bankData[value]) {
      const selectedBankData = bankData[value];
      if (selectedBankData) {
        setFormData(prev => ({
          ...prev,
          selectedBank: value,
          bankName: value,
          bankAddress: selectedBankData.address,
          bankEmail: selectedBankData.email
        }));
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handler for form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log("Submitting form data:", JSON.stringify(formData, null, 2));
      
      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      console.log("Response status:", response.status, response.statusText);
      
      // Check if the response indicates an error
      if (!response.ok) {
        // Only try to parse JSON for error responses
        const contentType = response.headers.get('content-type');
        console.log("Error response content type:", contentType);
        
        if (contentType && contentType.includes('application/json')) {
          const errorText = await response.text(); // Get raw text first
          console.log("Error response text:", errorText);
          
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'Failed to generate document');
          } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            throw new Error(`Failed to generate document: Unable to parse error response`);
          }
        } else {
          // If it's not JSON, just use the status text
          throw new Error(`Failed to generate document: ${response.statusText}`);
        }
      }
      
      // Get the document as a blob
      const blob = await response.blob();
      console.log("Document blob received, size:", blob.size);
      
      // Generate a filename
      const filename = `${formData.name1}_request_letter_${new Date().toISOString().replace(/[:.]/g, '-')}.docx`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `client_documents/${client.id}/request_letters/${filename}`);
      
      // Upload the blob
      const uploadTask = await uploadBytes(storageRef, blob);
      console.log("Document uploaded to Firebase Storage", uploadTask);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      console.log("Document download URL:", downloadURL);
      
      // Update client document record in Firestore
      const clientRef = doc(db, "clients", client.id);
      
      // Get existing documents array or create new one
      const clientDoc = await getDoc(clientRef);
      const existingData = clientDoc.data() || {};
      let documents = existingData.documents || [];
      
      // Ensure documents is an array
      if (!Array.isArray(documents)) {
        documents = [];
      }
      
      try {
        // For document editing capability, we need to convert to HTML
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const htmlContent = result.value;
        
        // Upload the HTML version for editing
        const htmlStorageRef = ref(storage, `client_documents/${client.id}/request_letters/html/${filename.replace('.docx', '.html')}`);
        await uploadString(htmlStorageRef, htmlContent, 'raw', { contentType: 'text/html' });
        const htmlDownloadURL = await getDownloadURL(htmlStorageRef);
        
        // Add the htmlUrl to the document metadata
        documents.push({
          type: "request_letter",
          name: filename,
          url: downloadURL,       // Original DOCX URL
          htmlUrl: htmlDownloadURL, // HTML version for editing
          bankName: formData.selectedBank,
          createdAt: new Date().toISOString(),
          accountType: formData.accountType
        });
        
        // Update client record
        await updateDoc(clientRef, { 
          documents: documents,
          request_letter: true,
          lastUpdated: serverTimestamp()
        });
        
        console.log("Client record updated with document reference");
      } catch (uploadError) {
        console.error("Error preparing document for editing:", uploadError);
        // Ensure documents is an array here too
        if (!Array.isArray(documents)) {
          documents = [];
        }
        documents.push({
          type: "request_letter",
          name: filename,
          url: downloadURL,
          bankName: formData.selectedBank,
          createdAt: new Date().toISOString(),
          accountType: formData.accountType
        });
      }
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Document successfully generated, saved to client record, and downloaded.");
      onClose();
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name field - auto-filled and readonly */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client Name</label>
          <input
            type="text"
            name="name1"
            value={formData.name1}
            readOnly
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white cursor-not-allowed text-sm"
          />
          <p className="text-xs text-gray-500 mt-0.5">Auto-filled</p>
        </div>

        {/* Email - auto-filled and readonly */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            readOnly
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white cursor-not-allowed text-sm"
          />
          <p className="text-xs text-gray-500 mt-0.5">Auto-filled</p>
        </div>

        {/* Bank Selection Dropdown - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Select Bank</label>
          <select
            name="selectedBank"
            value={formData.selectedBank}
            onChange={(e) => handleBankSelect(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            disabled={isLoadingBanks}
          >
            <option value="">
              {isLoadingBanks ? "Loading banks..." : "Select a bank..."}
            </option>
            {Object.keys(bankData).map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>

        {/* Bank Address - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Address</label>
          <textarea
            name="bankAddress"
            value={formData.bankAddress}
            onChange={handleChange}
            required
            rows={3}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter bank address"
          />
        </div>

        {/* Bank Email - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Email</label>
          <textarea
            name="bankEmail"
            value={formData.bankEmail}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter bank email (use commas to separate multiple emails)"
          />
        </div>

        {/* Account Type (dropdown) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Account Type</label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="Loan Account">Loan Account</option>
            <option value="Credit Card Number">Credit Card Number</option>
          </select>
        </div>

        {/* Reason (dropdown) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Reason</label>
          <select
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="Job Loss">Job Loss</option>
            <option value="Business Loss">Business Loss</option>
            <option value="Financial Loss">Financial Loss</option>
          </select>
        </div>

        {/* Account/Card Number */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Account/Card Number</label>
          <input
            type="text"
            name="number"
            value={formData.number}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter account or card number"
          />
          {client.banks && client.banks.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">Pre-filled from client data</p>
          )}
        </div>
      </div>

      {/* Form buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800 mt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors duration-200 flex items-center text-sm"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>Generate Request Letter</>
          )}
        </button>
      </div>
    </form>
  );
}

export default RequestLetterForm; 