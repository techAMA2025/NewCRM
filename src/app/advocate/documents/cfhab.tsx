"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
}

interface FirestoreClient {
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
  panNumber?: string;
  aadharNumber?: string;
  dob?: string;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: any;
}

interface CFHABFormProps {
  onClose: () => void;
}

export default function CFHABForm({ onClose }: CFHABFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [formData, setFormData] = useState({
    bankName: "",
    agentName: "",
    agentNumber: "",
    harassmentLocation: "House",
    whoWasHarassed: "Family",
    date: new Date().toISOString().split('T')[0],
    clientName: "",
    email: "",
    loanNumber: ""
  });

  // Fetch clients when component mounts
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsCollection = collection(db, "clients");
        const clientSnapshot = await getDocs(clientsCollection);
        const clientsList: FirestoreClient[] = [];
        
        clientSnapshot.forEach((doc) => {
          const data = doc.data() as Omit<FirestoreClient, "id">;
          clientsList.push({ id: doc.id, ...data });
        });
        
        setClients(clientsList);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients");
      }
    };

    fetchClients();
  }, []);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    
    if (!clientId) return;
    
    const selectedClient = clients.find(c => c.id === clientId);
    
    if (selectedClient) {
      // Update form with selected client's data
      setFormData(prevFormData => ({
        ...prevFormData,
        clientName: selectedClient.name || "",
        email: selectedClient.email || "",
        // If the client has banks, try to get loan/account number from first bank
        loanNumber: selectedClient.banks && selectedClient.banks.length > 0 
          ? selectedClient.banks[0].accountNumber || "" 
          : "",
        // Set bankName if available
        bankName: selectedClient.banks && selectedClient.banks.length > 0
          ? selectedClient.banks[0].bankName || ""
          : ""
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      
      toast.success("CFHAB document successfully generated and downloaded.");
      onClose();
    } catch (error) {
      console.error("Error generating CFHAB document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate CFHAB document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {/* Client Selector Dropdown */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Select Client
          </label>
          <select
            value={selectedClientId}
            onChange={handleClientChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} - {client.phone}
              </option>
            ))}
          </select>
        </div>
        
        {/* Bank Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter bank name"
            required
          />
          {selectedClientId && formData.bankName && (
            <p className="text-xs text-gray-500 mt-0.5">Auto-filled from client data (editable)</p>
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
              onChange={handleChange}
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
              onChange={handleChange}
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
            onChange={handleChange}
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
            onChange={handleChange}
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
            onChange={handleChange}
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
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
              placeholder="Client's full name"
              required
            />
            {selectedClientId && (
              <p className="text-xs text-gray-500 mt-0.5">Auto-filled from client data (editable)</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
              placeholder="client@example.com"
            />
            {selectedClientId && formData.email && (
              <p className="text-xs text-gray-500 mt-0.5">Auto-filled from client data (editable)</p>
            )}
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
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter loan or credit card number"
            required
          />
          {selectedClientId && formData.loanNumber && (
            <p className="text-xs text-gray-500 mt-0.5">Auto-filled from client data (editable)</p>
          )}
        </div>
        
        {/* Form buttons */}
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
              <>Generate CFHAB Document</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}