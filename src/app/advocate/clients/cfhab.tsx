"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useBankDataSimple } from "@/components/BankDataProvider";
import SearchableDropdown from "@/components/SearchableDropdown";

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

// Client interface from Firestore
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

export default function ComplaintForHarassmentForm({ client, onClose }: { client: Client, onClose: () => void }) {
  const { bankData, isLoading: isLoadingBanks } = useBankDataSimple();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedClientBanks, setSelectedClientBanks] = useState<Bank[]>([]);
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
    setSelectedBank(""); // Reset bank selection when client changes
    setSelectedClientBanks([]); // Reset client banks

    if (!clientId) {
      // Reset form data when no client is selected
      setFormData(prevFormData => ({
        ...prevFormData,
        clientName: "",
        email: "",
        bankName: "",
        loanNumber: "",
      }));
      return;
    }

    const selectedClient = clients.find((c) => c.id === clientId);

    if (selectedClient) {
      // Set the client's banks
      setSelectedClientBanks(selectedClient.banks || []);
      
      setFormData(prevFormData => ({
        ...prevFormData,
        clientName: selectedClient.name || "",
        email: selectedClient.email || "",
        bankName: "",
        loanNumber: "",
      }));
    }
  };

  const handleBankSelect = (value: string) => {
    // Ignore separator selections
    if (value === "separator") return;
    
    setSelectedBank(value);
    
    if (!value) return;

    // Check if this is a client bank selection (contains pipe separator)
    if (value.includes('|')) {
      // Client bank selection - extract bank name and account number
      const [bankName, accountNumber] = value.split('|');
      
      setFormData(prev => ({
        ...prev,
        bankName: bankName,
        loanNumber: accountNumber,
      }));
    } else {
      // Other bank selection - no account number to auto-fill
      setFormData(prev => ({
        ...prev,
        bankName: value,
        loanNumber: "",
      }));
    }
  };

  // Function to prepare bank options with client banks first and visual indicators
  const getBankOptions = () => {
    const allBanks = Object.keys(bankData);
    const clientBankNames = selectedClientBanks.map(bank => bank.bankName);
    
    console.log('CFHAB Debug:', {
      allBanks,
      selectedClientBanks,
      clientBankNames,
      bankDataKeys: Object.keys(bankData)
    });
    
    // Separate banks into client banks and other banks
    const clientBanks = allBanks.filter(bank => clientBankNames.includes(bank));
    const otherBanks = allBanks.filter(bank => !clientBankNames.includes(bank));
    
    // Create options with visual indicators for client banks
    // Handle multiple accounts from same bank
    const clientBankOptions: any[] = [];
    
    clientBanks.forEach(bankName => {
      // Find all accounts for this bank
      const bankAccounts = selectedClientBanks.filter(bank => bank.bankName === bankName);
      
      if (bankAccounts.length === 1) {
        // Single account - show bank name with account number
        const account = bankAccounts[0];
        clientBankOptions.push({
          value: `${bankName}|${account.accountNumber}`,
          label: `✅ ${bankName} - ${account.accountNumber} (${account.loanType || 'Account'})`,
          className: "text-green-400 font-medium"
        });
      } else {
        // Multiple accounts - show each account separately
        bankAccounts.forEach((account, index) => {
          clientBankOptions.push({
            value: `${bankName}|${account.accountNumber}`,
            label: `✅ ${bankName} - ${account.accountNumber} (${account.loanType || 'Account'} #${index + 1})`,
            className: "text-green-400 font-medium"
          });
        });
      }
    });
    
    const otherBankOptions = otherBanks.map(bankName => ({
      value: bankName,
      label: bankName,
      className: ""
    }));
    
    // Add separator if there are both client banks and other banks
    const separator = clientBankOptions.length > 0 && otherBankOptions.length > 0 ? [{
      value: "separator",
      label: "────────── Other Banks ──────────",
      className: "text-gray-500 text-xs font-semibold cursor-default"
    }] : [];
    
    // Return client banks first, then separator, then other banks
    return [...clientBankOptions, ...separator, ...otherBankOptions];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
          {/* Client Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Select Client <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={clients.map(client => ({
                value: client.id,
                label: `${client.name} - ${client.phone}`
              }))}
              value={selectedClientId}
              onChange={(value) => handleClientChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)}
              placeholder="Select a client..."
              isLoading={false}
            />
          </div>

          {/* Bank Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Select Bank <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={getBankOptions()}
              value={selectedBank}
              onChange={handleBankSelect}
              placeholder="Select a bank..."
              isLoading={isLoadingBanks}
              loadingText="Loading banks..."
              disabled={isLoadingBanks}
            />
            {selectedClientId && selectedBank && selectedBank.includes('|') && (
              <p className="text-xs text-green-500 mt-0.5">
                ✅ Client account selected - account number auto-filled
              </p>
            )}
            {selectedClientId && selectedBank && !selectedBank.includes('|') && (
              <p className="text-xs text-amber-500 mt-0.5">
                Other bank selected - please enter account number manually
              </p>
            )}
            {selectedClientId && !selectedBank && (
              <p className="text-xs text-gray-500 mt-0.5">
                Banks with ✅ show client's accounts with account numbers
              </p>
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
              placeholder={selectedBank && selectedBank.includes('|') ? "Account number auto-filled from selected account" : "Select a client account or enter manually"}
              required
            />
            {selectedBank && selectedBank.includes('|') && formData.loanNumber && (
              <p className="text-xs text-green-500 mt-0.5">
                ✅ Auto-filled from selected client account (editable)
              </p>
            )}
            {selectedBank && !selectedBank.includes('|') && selectedClientId && (
              <p className="text-xs text-amber-500 mt-0.5">
                Other bank selected - please enter account number manually
              </p>
            )}
            {selectedClientId && !selectedBank && (
              <p className="text-xs text-gray-500 mt-0.5">
                Select a client account to auto-fill the account number
              </p>
            )}
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
