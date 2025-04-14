"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

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
  email: string;
  city: string;
  alloc_adv: string;
  status: string;
  personalLoanDues: string;
  creditCardDues: string;
  banks: Bank[];
  [key: string]: any; // For other potential properties
}

export default function ComplaintForHarassmentForm({ client, onClose }: { client: Client, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bankName: "",
    agentName: "",
    agentNumber: "",
    harassmentLocation: "House", // Default value
    whoWasHarassed: "Family", // Default value
    date: new Date().toISOString().split('T')[0], // Today's date
    clientName: client.name || "",
    email: client.email || "",
    loanNumber: ""
  });
  
  // If client has banks, set the first bank as default
  useEffect(() => {
    if (client.banks && client.banks.length > 0) {
      const firstBank = client.banks[0];
      setFormData(prev => ({
        ...prev,
        bankName: firstBank.bankName || "",
        loanNumber: firstBank.accountNumber || ""
      }));
    }
  }, [client]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBankId = e.target.value;
    const selectedBank = client.banks.find(bank => bank.id === selectedBankId);
    
    if (selectedBank) {
      setFormData(prev => ({
        ...prev,
        bankName: selectedBank.bankName || "",
        loanNumber: selectedBank.accountNumber || ""
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bankName || !formData.date || !formData.clientName || !formData.loanNumber) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call the API to generate the Word document
      const response = await fetch('/api/cfhab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate document');
      }
      
      // Get the document as a blob
      const blob = await response.blob();
      console.log("Document blob received, size:", blob.size);
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.clientName}_harassment_complaint.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Harassment Complaint successfully generated and downloaded.");
      onClose();
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Bank Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Select Bank <span className="text-red-500">*</span>
            </label>
            {client.banks && client.banks.length > 0 ? (
              <select
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                onChange={handleBankChange}
                defaultValue=""
              >
                <option value="" disabled>Select a bank</option>
                {client.banks.map(bank => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bankName} - {bank.accountNumber} ({bank.loanType})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter bank name"
                required
              />
            )}
          </div>
          
          {/* Agent Name and Agent Number as separate fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Agent Name
              </label>
              <input
                type="text"
                name="agentName"
                value={formData.agentName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ex: John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Agent Number
              </label>
              <input
                type="text"
                name="agentNumber"
                value={formData.agentNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ex: 9876543210"
              />
            </div>
          </div>
          
          {/* Harassment Location */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Harassment Location <span className="text-red-500">*</span>
            </label>
            <select
              name="harassmentLocation"
              value={formData.harassmentLocation}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="House">House</option>
              <option value="Office">Office</option>
              <option value="Neighbours">Neighbours</option>
            </select>
          </div>
          
          {/* Who Was Harassed */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Who Was Harassed <span className="text-red-500">*</span>
            </label>
            <select
              name="whoWasHarassed"
              value={formData.whoWasHarassed}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="Family">Family</option>
              <option value="Colleagues">Colleagues</option>
              <option value="Neighbours">Neighbours</option>
            </select>
          </div>
          
          {/* Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Date of Incident <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          
          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                placeholder="Client's full name"
                required
                readOnly
              />
              <p className="text-xs text-gray-500 mt-0.5">Auto-filled</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                placeholder="client@example.com"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-0.5">Auto-filled</p>
            </div>
          </div>
          
          {/* Loan/Credit Card Number */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Loan/Credit Card Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="loanNumber"
              value={formData.loanNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter loan or credit card number"
              required
            />
          </div>
          
          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md transition-colors duration-200 flex items-center"
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
                <>Generate Harassment Complaint</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
