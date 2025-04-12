"use client";

import { useState } from "react";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import toast, { Toaster } from "react-hot-toast";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name1: client.name || "",
    bankAddress: "",
    bankEmail: "",
    accountType: "Loan Account", // Default value
    number: client.banks && client.banks.length > 0 ? client.banks[0].accountNumber || "" : "",
    reason: "Job Loss", // Default value
    email: client.email || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Format the data for API submission
      const formBody = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formBody.append(key, value);
      });
      
      // Call the document generation API
      // This is where you would integrate with your document generation service
      // For now, we'll simulate a successful response
      toast.success("Document generation initiated. The document will download shortly.");
      
      // In a real implementation, you would call an API endpoint:
      // const response = await fetch('/api/generate-request-letter', {
      //   method: 'POST',
      //   body: formBody,
      // });
      
      // if (response.ok) {
      //   // Handle successful document generation
      //   // This might involve triggering a download or showing a link
      // } else {
      //   throw new Error('Failed to generate document');
      // }
      
      // Close the modal after successful submission
      onClose();
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Failed to generate document. Please try again.");
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

        {/* Bank Address - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Address</label>
          <textarea
            name="bankAddress"
            value={formData.bankAddress}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter bank address (use commas to separate multiple addresses)"
          />
        </div>

        {/* Bank Email - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Email</label>
          <input
            type="text"
            name="bankEmail"
            value={formData.bankEmail}
            onChange={handleChange}
            required
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
            <option value="Credit Card Account">Credit Card Account</option>
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

const DocumentsPage = () => {
  // Placeholder for client data - in a real implementation, you would:
  // 1. Get this from a URL parameter or state
  // 2. Fetch client details from an API or context
  const [dummyClient, setDummyClient] = useState<Client>({
    id: "placeholder",
    name: "John Doe",
    phone: "9876543210",
    email: "john@example.com",
    city: "Mumbai",
    alloc_adv: "",
    status: "Active",
    personalLoanDues: "250000",
    creditCardDues: "100000",
    banks: [
      {
        id: "bank1",
        bankName: "HDFC Bank",
        accountNumber: "XXXX1234",
        loanType: "Personal Loan",
        loanAmount: "250000"
      }
    ],
    isPrimary: true,
    isSecondary: false
  });

  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex bg-gray-900 min-h-screen">
      <AdvocateSidebar />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-white">Document Generation</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Request Letters
            </h2>
            <p className="text-gray-300 mb-4">Generate request letters to banks for your clients.</p>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors duration-200"
            >
              {showForm ? "Hide Form" : "Create Request Letter"}
            </button>
          </div>
          
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Legal Notices
            </h2>
            <p className="text-gray-300 mb-4">Generate legal notices for non-responsive cases.</p>
            <button
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors duration-200"
              onClick={() => alert("Legal notice generation coming soon!")}
            >
              Create Legal Notice
            </button>
          </div>
        </div>
        
        {showForm && (
          <div className="mt-6 bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-sm animate-fadeIn">
            <h2 className="text-xl font-semibold text-white mb-6">Generate Request Letter</h2>
            <RequestLetterForm client={dummyClient} onClose={() => setShowForm(false)} />
          </div>
        )}
        
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: 'rgba(47, 133, 90, 0.9)',
              },
            },
            error: {
              duration: 3000,
              style: {
                background: 'rgba(175, 45, 45, 0.9)',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default DocumentsPage;
