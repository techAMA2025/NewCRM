"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useBankDataSimple } from "@/components/BankDataProvider";
import SearchableDropdown from "@/components/SearchableDropdown";

// Fuzzy matching function to find closest bank name
const findClosestBankMatch = (clientBankName: string, availableBanks: string[]): string | null => {
  if (availableBanks.length === 0) return null;
  
  // Common bank name mappings
  const bankNameMappings: { [key: string]: string } = {
    'induslnd': 'indusind',
    'indusland': 'indusind',
    'axis': 'axis bank',
    'kotak': 'kotak mahindra bank',
    'kotak mahindra': 'kotak mahindra bank',
    'aditya birla': 'aditya birla capital',
    'poonawalla': 'poonawalla fincorp',
    'hdfc': 'hdfc bank',
    'sbi': 'state bank of india',
    'icici': 'icici bank',
    'pnb': 'punjab national bank',
    'canara': 'canara bank',
    'union': 'union bank of india',
    'bank of baroda': 'bob',
    'bob': 'bank of baroda',
    'idbi': 'idbi bank',
    'yes': 'yes bank',
    'federal': 'federal bank',
    'karur': 'karur vysya bank',
    'karnataka': 'karnataka bank',
    'south indian': 'south indian bank',
    'tamilnad': 'tamilnad mercantile bank',
    'tmb': 'tamilnad mercantile bank',
    'uco': 'uco bank',
    'central': 'central bank of india',
    'indian': 'indian bank',
    'indian overseas': 'indian overseas bank',
    'iob': 'indian overseas bank',
    'punjab and sind': 'punjab and sind bank',
    'psb': 'punjab and sind bank',
    'bank of india': 'boi',
    'boi': 'bank of india',
    'bank of maharashtra': 'bom',
    'bom': 'bank of maharashtra',
  };
  
  // Normalize bank names for comparison
  const normalizeBankName = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters and spaces
      .replace(/bank|limited|ltd|inc|corporation|corp/g, '') // Remove common suffixes
      .trim();
  };
  
  const normalizedClientBank = normalizeBankName(clientBankName);
  
  // First, try exact match after normalization
  const exactMatch = availableBanks.find(bank => 
    normalizeBankName(bank) === normalizedClientBank
  );
  if (exactMatch) return exactMatch;
  
  // Try mapping-based match
  const mappedName = bankNameMappings[normalizedClientBank];
  if (mappedName) {
    const mappedMatch = availableBanks.find(bank => 
      normalizeBankName(bank) === normalizeBankName(mappedName)
    );
    if (mappedMatch) return mappedMatch;
  }
  
  // Calculate similarity scores
  const similarityScores = availableBanks.map(bank => {
    const normalizedBank = normalizeBankName(bank);
    
    // Calculate Levenshtein distance
    const distance = levenshteinDistance(normalizedClientBank, normalizedBank);
    const maxLength = Math.max(normalizedClientBank.length, normalizedBank.length);
    const similarity = 1 - (distance / maxLength);
    
    return { bank, similarity, distance };
  });
  
  // Sort by similarity (highest first)
  similarityScores.sort((a, b) => b.similarity - a.similarity);
  
  // Return the best match if similarity is above threshold (70%)
  const bestMatch = similarityScores[0];
  if (bestMatch.similarity >= 0.7) {
    console.log(`Fuzzy match found: "${clientBankName}" -> "${bestMatch.bank}" (similarity: ${(bestMatch.similarity * 100).toFixed(1)}%)`);
    return bestMatch.bank;
  }
  
  return null;
};

// Levenshtein distance calculation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

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
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedClientBanks, setSelectedClientBanks] = useState<Bank[]>([]);
  const [formData, setFormData] = useState({
    name: client.name || "",
    referenceNumber: "",
    lawyerEmail: "", // Default lawyer email
    bankName: "",
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

  // Test fuzzy matching when bankData is loaded
  useEffect(() => {
    if (Object.keys(bankData).length > 0) {
      console.log('Testing fuzzy matching in SEC138...');
      const testBanks = ['INDUSLND', 'AXIS', 'KOTAK', 'ADITYA BIRLA', 'POONAWALLA FINCORP'];
      testBanks.forEach(bank => {
        const match = findClosestBankMatch(bank, Object.keys(bankData));
        if (match) {
          console.log(`✅ "${bank}" matched to "${match}"`);
        } else {
          console.log(`❌ "${bank}" - no match found`);
        }
      });
    }
  }, [bankData]);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    setSelectedBank(""); // Reset bank selection when client changes
    setSelectedClientBanks([]); // Reset client banks

    if (!clientId) {
      // Reset form data when no client is selected
      setFormData((prevFormData) => ({
        ...prevFormData,
        name: "",
        referenceNumber: "",
        bankName: "",
        bankEmail: "",
        bankAddress: "",
      }));
      return;
    }

    const selectedClient = clients.find((c) => c.id === clientId);

    if (selectedClient) {
      // Set the client's banks
      setSelectedClientBanks(selectedClient.banks || []);
      
      setFormData((prevFormData) => ({
        ...prevFormData,
        name: selectedClient.name || "",
        referenceNumber: "",
        bankName: "",
        bankEmail: "",
        bankAddress: "",
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
      
      // Try to find a fuzzy match for this bank
      const matchedBank = findClosestBankMatch(bankName, Object.keys(bankData));
      
      // Get bank details from bankData (use matched bank if available)
      const bankDetails = bankData[matchedBank || bankName];
      
      if (bankDetails) {
        setFormData(prev => ({
          ...prev,
          bankName: matchedBank || bankName, // Use matched bank name from database
          bankEmail: bankDetails.email || "",
          bankAddress: bankDetails.address || "",
          referenceNumber: accountNumber,
        }));
      } else {
        // Bank not in bankData - set only what we have
        setFormData(prev => ({
          ...prev,
          bankName: bankName,
          bankEmail: "",
          bankAddress: "",
          referenceNumber: accountNumber,
        }));
      }
    } else {
      // Other bank selection - no account number to auto-fill
      const bankDetails = bankData[value];
      
      if (bankDetails) {
        setFormData(prev => ({
          ...prev,
          bankName: value,
          bankEmail: bankDetails.email || "",
          bankAddress: bankDetails.address || "",
          referenceNumber: "",
        }));
      } else {
        // Bank not in bankData - set only what we have
        setFormData(prev => ({
          ...prev,
          bankName: value,
          bankEmail: "",
          bankAddress: "",
          referenceNumber: "",
        }));
      }
    }
  };

  // Function to prepare bank options with client banks first and visual indicators
  const getBankOptions = () => {
    const allBanks = Object.keys(bankData);
    const clientBankNames = selectedClientBanks.map(bank => bank.bankName);
    
    console.log('SEC138 Debug:', {
      allBanks,
      selectedClientBanks,
      clientBankNames,
      bankDataKeys: Object.keys(bankData),
      selectedClientId,
      hasClientBanks: selectedClientBanks.length > 0
    });
    
    // If no client is selected, return all banks
    if (!selectedClientId || selectedClientBanks.length === 0) {
      return allBanks.map(bankName => ({
        value: bankName,
        label: bankName,
        className: ""
      }));
    }
    
    // Create options for ALL client banks (not just those in bankData)
    const clientBankOptions: any[] = [];
    
    // Group client banks by bank name to handle multiple accounts
    const bankGroups: { [key: string]: Bank[] } = {};
    selectedClientBanks.forEach(bank => {
      if (!bankGroups[bank.bankName]) {
        bankGroups[bank.bankName] = [];
      }
      bankGroups[bank.bankName].push(bank);
    });
    
    // Create options for each client bank
    Object.entries(bankGroups).forEach(([bankName, accounts]) => {
      // Try to find a fuzzy match for this bank
      const matchedBank = findClosestBankMatch(bankName, allBanks);
      const hasBankData = allBanks.includes(bankName) || matchedBank !== null;
      
      if (accounts.length === 1) {
        // Single account - show bank name with account number
        const account = accounts[0];
        const matchIndicator = matchedBank && matchedBank !== bankName ? ` (→ ${matchedBank})` : '';
        clientBankOptions.push({
          value: `${bankName}|${account.accountNumber}`,
          label: `✅ ${bankName} - ${account.accountNumber} (${account.loanType || 'Account'})${matchIndicator}${!hasBankData ? ' ⚠️' : ''}`,
          className: hasBankData ? "text-green-400 font-medium" : "text-yellow-400 font-medium"
        });
      } else {
        // Multiple accounts - show each account separately
        accounts.forEach((account, index) => {
          const matchIndicator = matchedBank && matchedBank !== bankName ? ` (→ ${matchedBank})` : '';
          clientBankOptions.push({
            value: `${bankName}|${account.accountNumber}`,
            label: `✅ ${bankName} - ${account.accountNumber} (${account.loanType || 'Account'} #${index + 1})${matchIndicator}${!hasBankData ? ' ⚠️' : ''}`,
            className: hasBankData ? "text-green-400 font-medium" : "text-yellow-400 font-medium"
          });
        });
      }
    });
    
    // Get other banks (banks in bankData but not client banks)
    const otherBanks = allBanks.filter(bank => !clientBankNames.includes(bank));
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
            placeholder={selectedBank && selectedBank.includes('|') ? "Account number auto-filled from selected account" : "Select a client account or enter manually"}
            required
          />
          {selectedBank && selectedBank.includes('|') && formData.referenceNumber && (
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
          {selectedBank && selectedBank.includes('|') && !bankData[selectedBank.split('|')[0]] && !findClosestBankMatch(selectedBank.split('|')[0], Object.keys(bankData)) && (
            <p className="text-xs text-yellow-500 mt-0.5">
              ⚠️ Bank details not in system - please fill address and email manually
            </p>
          )}
          {selectedBank && selectedBank.includes('|') && findClosestBankMatch(selectedBank.split('|')[0], Object.keys(bankData)) && (
            <p className="text-xs text-blue-500 mt-0.5">
              🔄 Using fuzzy-matched bank details (→ {findClosestBankMatch(selectedBank.split('|')[0], Object.keys(bankData))})
            </p>
          )}
        </div>

        {/* Bank Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Select Bank
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
              Banks with ✅ show client's accounts. → indicates fuzzy-matched bank (name will be corrected). ⚠️ indicates bank details not available in system.
            </p>
          )}
          {!selectedClientId && (
            <p className="text-xs text-gray-500 mt-0.5">
              Select a client to see their banks
            </p>
          )}
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
