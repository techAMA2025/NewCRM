"use client";

import { useState, useEffect, FormEvent } from "react";
import toast from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useBankDataSimple } from "@/components/BankDataProvider";

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
}

interface ReplyToNoticeFormProps {
  onClose: () => void;
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

const ReplyToNoticeForm = ({ onClose }: ReplyToNoticeFormProps) => {
  const { bankData, isLoading: isLoadingBanks } = useBankDataSimple();
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Format today's date as DD/MM/YYYY
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  
  const [formData, setFormData] = useState({
    clientName: "",
    bankName: "",
    bankAddress: "",
    lawyerEmail: "  ", // Default lawyer email
    bankEmail: "",
    noticeDate: formattedDate, // Initialize with today's date
    referenceNumber: "",
    clientMobile: "",
    selectedBank: "", // For bank selection dropdown
    accountType: "", // New field for account type
  });



  // Fetch clients from Firebase when component mounts
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

  // Handle client selection from dropdown
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
        clientMobile: selectedClient.phone || "",
        // If client has bank data, prefill that bank
        selectedBank: selectedClient.banks && selectedClient.banks.length > 0 
          ? selectedClient.banks[0].bankName || "" 
          : prevFormData.selectedBank
      }));

      // If a bank was auto-selected, populate its address and email
      if (selectedClient.banks?.length > 0) {
        const bankName = selectedClient.banks[0].bankName;
        const selectedBankData = bankData[bankName as keyof typeof bankData];
        
        if (selectedBankData) {
          setFormData(prevFormData => ({
            ...prevFormData,
            bankName,
            bankAddress: selectedBankData.address,
            bankEmail: selectedBankData.email
          }));
        }
      }
    }
  };

  const handleBankSelect = (value: string) => {
    const bankName = value;
    if (bankName && bankData[bankName]) {
      const selectedBankData = bankData[bankName];

      if (selectedBankData) {
        setFormData(prev => ({
          ...prev,
          bankName,
          bankAddress: selectedBankData.address,
          bankEmail: selectedBankData.email
        }));
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call the API to generate the document
      const response = await fetch('/api/replynotice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      // Check if the response indicates an error
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const errorText = await response.text();
          
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'Failed to generate document');
          } catch (parseError) {
            throw new Error(`Failed to generate document: Unable to parse error response`);
          }
        } else {
          throw new Error(`Failed to generate document: ${response.statusText}`);
        }
      }
      
      // Get the document as a blob for download
      const blob = await response.blob();
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.clientName}_replyToNotice.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Reply to Notice generated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to generate document. Please try again.");
      console.error("Error generating document:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Selector Dropdown */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Select Client</label>
          <select
            value={selectedClientId}
            onChange={handleClientChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} - {client.phone}
              </option>
            ))}
          </select>
        </div>

        {/* Client Name */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client Name</label>
          <input
            type="text"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
          {selectedClientId && <p className="text-xs text-gray-500 mt-0.5">Auto-filled from client data (editable)</p>}
        </div>
        
        {/* Client Mobile */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client Mobile</label>
          <input
            type="text"
            name="clientMobile"
            value={formData.clientMobile}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
          {selectedClientId && <p className="text-xs text-gray-500 mt-0.5">Auto-filled from client data (editable)</p>}
        </div>
        
        {/* Lawyer's Email */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Lawyer's Email</label>
          <input
            type="email"
            name="lawyerEmail"
            value={formData.lawyerEmail}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
        </div>
        
        {/* Notice Date */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Notice Date (DD/MM/YYYY)</label>
          <input
            type="text"
            name="noticeDate"
            value={formData.noticeDate}
            onChange={handleChange}
            placeholder="DD/MM/YYYY"
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
        </div>
        
        {/* Reference Number */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Reference Number</label>
          <input
            type="text"
            name="referenceNumber"
            value={formData.referenceNumber}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
        </div>
        
        {/* Account Type Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Account Type</label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          >
            <option value="">Select account type...</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Loan Account">Loan Account</option>
          </select>
        </div>
        
        {/* Bank Selection Dropdown */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Select Bank</label>
          <select
            name="bankName"
            value={formData.bankName}
            onChange={(e) => handleBankSelect(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            disabled={isLoadingBanks}
            required
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
        
        {/* Bank Address */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Address</label>
          <textarea
            name="bankAddress"
            value={formData.bankAddress}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
          {formData.bankName && <p className="text-xs text-gray-500 mt-0.5">Auto-filled from bank selection (editable)</p>}
        </div>
        
        {/* Bank Email */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Email</label>
          <textarea
            name="bankEmail"
            value={formData.bankEmail}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
          {formData.bankName && <p className="text-xs text-gray-500 mt-0.5">Auto-filled from bank selection (editable)</p>}
        </div>
      </div>
      
      <div className="pt-4 flex justify-end space-x-4 border-t border-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors duration-200 flex items-center text-sm ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            "Generate Reply"
          )}
        </button>
      </div>

      <div className="p-4 bg-gray-700/50 rounded-md border border-gray-600 mt-6">
        <h3 className="text-md font-medium text-white mb-2">Document Preview</h3>
        <p className="text-gray-300 text-sm mb-3">Once generated, your legal notice reply will include:</p>
        
        <ul className="text-sm text-gray-300 space-y-1 list-disc pl-5">
          <li>Full heading with LEGAL NOTICE and delivery methods</li>
          <li>Formal "WITHOUT PREJUDICE" indication</li>
          <li>Bank address and Nodal Officer details</li>
          <li>Copy sent to Lawyer's and Bank's Email IDs</li>
          <li>Subject line with reference to original notice</li>
          <li>Bar Council rules citation regarding lawyer enrollment numbers</li>
          <li>Full explanation of client's financial situation</li>
          <li>Request for amicable settlement and financial consideration</li>
          <li>Client contact information</li>
          <li>Formal closing with preservation of rights statement</li>
        </ul>
      </div>
    </form>
  );
};

export default ReplyToNoticeForm; 