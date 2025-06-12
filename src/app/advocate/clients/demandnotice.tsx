"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { bankData } from "@/data/bankData";

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

// Demand Notice Form Component
function DemandNoticeForm({ client, onClose }: { client: Client, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name2: client.name || "",
    bankName: client.banks && client.banks.length > 0 ? client.banks[0].bankName || "" : "",
    bankAddress: "",
    bankEmail: "",
    reference: client.banks && client.banks.length > 0 ? client.banks[0].accountNumber || "" : "",
    email: client.email || "",
    date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    selectedBank: "", // For bank selection dropdown
  });

  // Handler for form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // If bank selection changes, update bank address, email fields and bank name
    if (name === "selectedBank" && value) {
      const selectedBankData = bankData[value as keyof typeof bankData];
      if (selectedBankData) {
        setFormData({
          ...formData,
          selectedBank: value,
          bankName: value,
          bankAddress: selectedBankData.address,
          bankEmail: selectedBankData.email
        });
      } else {
        setFormData({
          ...formData,
          selectedBank: value,
          bankName: value,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handler for form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log("Submitting demand notice form data:", JSON.stringify(formData, null, 2));
      
      const response = await fetch('/api/demand-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      console.log("Response status:", response.status, response.statusText);
      
      // Check if the response indicates an error
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        console.log("Error response content type:", contentType);
        
        if (contentType && contentType.includes('application/json')) {
          const errorText = await response.text(); 
          console.log("Error response text:", errorText);
          
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'Failed to generate document');
          } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            throw new Error(`Failed to generate document: Unable to parse error response`);
          }
        } else {
          throw new Error(`Failed to generate document: ${response.statusText}`);
        }
      }
      
      // Get the document as a blob
      const blob = await response.blob();
      console.log("Document blob received, size:", blob.size);
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.name2}_demand_notice.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Demand Notice successfully generated and downloaded.");
      onClose();
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date to YYYY-MM-DD for the date input
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name field - auto-filled and readonly */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client Name</label>
          <input
            type="text"
            name="name2"
            value={formData.name2}
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
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">Select a bank...</option>
            {Object.keys(bankData).map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>

        {/* Bank Name - Editable field that gets auto-populated */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Name</label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter bank name"
          />
          {formData.selectedBank && <p className="text-xs text-gray-500 mt-0.5">Auto-filled from selection (editable)</p>}
        </div>

        {/* Reference Number */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Reference Number</label>
          <input
            type="text"
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter reference number"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          />
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
          {formData.selectedBank && <p className="text-xs text-gray-500 mt-0.5">Auto-filled from selection (editable)</p>}
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
          {formData.selectedBank && <p className="text-xs text-gray-500 mt-0.5">Auto-filled from selection (editable)</p>}
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
            <>Generate Demand Notice</>
          )}
        </button>
      </div>
    </form>
  );
}

export default DemandNoticeForm;
