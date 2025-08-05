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
  isPrimary: boolean;
  isSecondary: boolean;
}

interface LegalNoticeFormProps {
  client: Client;
  onClose: () => void;
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

export default function LegalNoticeForm({ client, onClose }: LegalNoticeFormProps) {
  const { bankData, isLoading: isLoadingBanks } = useBankDataSimple();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [formData, setFormData] = useState({
    name: client.name || "",
    referenceNumber: "",
    lawyerEmail: "", // Default lawyer email
    selectedBank: "",
    bankEmail: "",
    bankAddress: "", // Add bank address field
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
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

    const selectedClient = clients.find((c) => c.id === clientId);

    if (selectedClient) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        name: selectedClient.name || "",
      }));
    }
  };

  const handleBankSelect = (value: string) => {
    if (value && bankData[value]) {
      const selectedBankData = bankData[value];
      if (selectedBankData) {
        setFormData(prev => ({
          ...prev,
          selectedBank: value,
          bankName: value,
          bankEmail: selectedBankData.email,
          bankAddress: selectedBankData.address,
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
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Format the data for API submission
      const response = await fetch("/api/sec138", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || "Failed to generate document");
          } catch (parseError) {
            throw new Error("Failed to generate document: Unable to parse error response");
          }
        } else {
          throw new Error(`Failed to generate document: ${response.statusText}`);
        }
      }

      // Get the document as a blob
      const blob = await response.blob();

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formData.name}_legal_notice.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Legal notice successfully generated and downloaded.");
      onClose();
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate document. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Selector Dropdown */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Select Client
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

        {/* Client Name */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Client Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
        </div>

        {/* Reference Number */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Reference Number
          </label>
          <input
            type="text"
            name="referenceNumber"
            value={formData.referenceNumber}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
            placeholder="Enter reference number"
          />
        </div>

        {/* Bank Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Select Bank
          </label>
          <SearchableDropdown
            options={Object.keys(bankData).map(bank => ({
              value: bank,
              label: bank
            }))}
            value={formData.selectedBank}
            onChange={handleBankSelect}
            placeholder="Select a bank..."
            isLoading={isLoadingBanks}
            loadingText="Loading banks..."
            disabled={isLoadingBanks}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Date
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
        </div>

        {/* Bank Email */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Bank Email
          </label>
          <textarea
            name="bankEmail"
            value={formData.bankEmail}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Bank email addresses will auto-fill when bank is selected"
          />
        </div>

        {/* Bank Address */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Bank Address
          </label>
          <textarea
            name="bankAddress"
            value={formData.bankAddress}
            onChange={handleChange}
            required
            rows={3}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Bank address will auto-fill when bank is selected"
          />
        </div>

        {/* Lawyer Email */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Lawyer Email
          </label>
          <input
            type="email"
            name="lawyerEmail"
            value={formData.lawyerEmail}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
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
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating...
            </>
          ) : (
            <>Generate Legal Notice</>
          )}
        </button>
      </div>
    </form>
  );
}
