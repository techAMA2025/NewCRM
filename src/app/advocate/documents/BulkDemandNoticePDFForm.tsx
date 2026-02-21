"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useBankDataSimple } from "@/components/BankDataProvider";
import { findClosestBankMatch } from "@/utils/bankMatching";
import SearchableDropdown from "@/components/SearchableDropdown";

interface BankAccount {
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
  banks: BankAccount[];
}

interface BulkNoticeRow {
  clientId: string;
  clientName: string;
  clientEmail: string;
  bankName: string;
  bankAddress: string;
  bankEmail: string;
  reference: string;
  status: 'matched' | 'fuzzy' | 'missing' | 'custom';
  originalBankName: string;
}

interface BulkDemandNoticeFormProps {
  onClose: () => void;
}

export default function BulkDemandNoticeForm({ onClose }: BulkDemandNoticeFormProps) {
  const { bankData, isLoading: isLoadingBanks } = useBankDataSimple();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<BulkNoticeRow[]>([]);
  const [pendingClientId, setPendingClientId] = useState("");
  const [pendingBankId, setPendingBankId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch clients ... (omitted same as before)
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientSnapshot = await getDocs(collection(db, "clients"));
        const clientsList: FirestoreClient[] = [];
        clientSnapshot.forEach((doc) => {
          const data = doc.data();
          clientsList.push({ 
            id: doc.id, 
            name: data.name || "", 
            phone: data.phone || "",
            email: data.email || "",
            banks: data.banks || []
          } as FirestoreClient);
        });
        setClients(clientsList);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients");
      }
    };
    fetchClients();
  }, []);

  const handleAddRow = () => {
    if (!pendingClientId || !pendingBankId) {
      toast.error("Please select both a client and a bank account.");
      return;
    }
    
    const client = clients.find(c => c.id === pendingClientId);
    if (!client) return;

    const bank = client.banks.find(b => b.id === pendingBankId);
    if (!bank) return;

    const matchedName = findClosestBankMatch(bank.bankName, Object.keys(bankData));
    const details = bankData[matchedName || bank.bankName];
    
    let status: BulkNoticeRow['status'] = 'missing';
    if (bankData[bank.bankName]) status = 'matched';
    else if (matchedName) status = 'fuzzy';

    const newRow: BulkNoticeRow = {
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      bankName: matchedName || bank.bankName,
      bankAddress: details?.address || "",
      bankEmail: details?.email || "",
      reference: bank.accountNumber,
      status,
      originalBankName: bank.bankName
    };

    setSelectedClients(prev => [...prev, newRow]);
    setPendingBankId(""); // Reset bank only, keep client for convenience or reset both? 
    // Usually user wants to add multiple banks for same client or different. Let's reset bank.
    toast.success(`Added ${bank.bankName} for ${client.name}`);
  };

  const handleRemoveRow = (index: number) => {
    setSelectedClients(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof BulkNoticeRow, value: string) => {
    setSelectedClients(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClients.length === 0) {
      toast.error("Please add at least one client.");
      return;
    }

    setIsSubmitting(true);
    try {
      const notices = selectedClients.map(row => ({
        name2: row.clientName,
        email: row.clientEmail,
        bankName: row.bankName,
        bankAddress: row.bankAddress,
        bankEmail: row.bankEmail,
        reference: row.reference,
        date: date
      }));

      const response = await fetch('/api/bulk-demand-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notices }),
      });

      if (!response.ok) throw new Error("Failed to generate bulk notices");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bulk_Demand_Notices_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Successfully generated ${selectedClients.length} notices!`);
      // onClose(); // Optional: close form after success
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end bg-gray-900/50 p-4 rounded-xl border border-gray-700">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-xs font-medium text-gray-400 mb-1">1. Select Client</label>
          <SearchableDropdown
            options={clients.map(c => ({ value: c.id, label: `${c.name} (${c.phone})` }))}
            value={pendingClientId}
            onChange={(val) => {
              setPendingClientId(val);
              setPendingBankId(""); // Reset bank when client changes
            }}
            placeholder="Search client..."
          />
        </div>

        <div className="flex-1 min-w-[250px]">
          <label className="block text-xs font-medium text-gray-400 mb-1">2. Select Bank Account</label>
          <select
            value={pendingBankId}
            onChange={(e) => setPendingBankId(e.target.value)}
            disabled={!pendingClientId}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm disabled:opacity-50 h-[38px] outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="">-- Select Client Bank --</option>
            {pendingClientId && clients.find(c => c.id === pendingClientId)?.banks.map(bank => (
              <option key={bank.id} value={bank.id}>
                {bank.bankName} - {bank.accountNumber} ({bank.loanType})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-none">
          <button
            type="button"
            onClick={handleAddRow}
            disabled={!pendingClientId || !pendingBankId}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-md text-sm font-medium transition-all"
          >
            Add to Queue
          </button>
        </div>

        <div className="w-40 border-l border-gray-700 pl-4 ml-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Notice Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
          />
        </div>
        
        <div className="flex-none">
          <button
            type="button"
            onClick={() => setSelectedClients([])}
            className="px-4 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800/80 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Bank & Ref</th>
              <th className="px-4 py-3">Contact Details (Editable)</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {selectedClients.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-white">{row.clientName}</div>
                  <div className="text-xs text-gray-500">{row.clientEmail}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-2">
                    <input
                      value={row.bankName}
                      onChange={(e) => handleRowChange(idx, 'bankName', e.target.value)}
                      className="w-full bg-transparent border-b border-gray-700 focus:border-purple-500 outline-none text-white text-xs py-0.5"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        value={row.reference}
                        onChange={(e) => handleRowChange(idx, 'reference', e.target.value)}
                        className="bg-transparent border-b border-gray-700 focus:border-purple-500 outline-none text-gray-400 text-[11px] py-0.5"
                        placeholder="Ref/Acc No"
                      />
                      {row.status === 'fuzzy' && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Fuzzy</span>}
                      {row.status === 'missing' && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">No Data</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-2 max-w-xs">
                    <textarea
                      value={row.bankEmail}
                      onChange={(e) => handleRowChange(idx, 'bankEmail', e.target.value)}
                      placeholder="Bank Email(s)"
                      rows={1}
                      className="w-full bg-transparent border border-gray-700/50 rounded p-1 text-[11px] text-gray-300 focus:border-purple-500 outline-none"
                    />
                    <textarea
                      value={row.bankAddress}
                      onChange={(e) => handleRowChange(idx, 'bankAddress', e.target.value)}
                      placeholder="Bank Address"
                      rows={2}
                      className="w-full bg-transparent border border-gray-700/50 rounded p-1 text-[11px] text-gray-400 focus:border-purple-500 outline-none"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRemoveRow(idx)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            ))}
            {selectedClients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500 italic">
                  No clients in queue. Use the dropdown above to add clients and their bank accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center py-4 border-t border-gray-800">
        <div className="text-sm text-gray-400">
          Total Notices: <span className="text-white font-semibold">{selectedClients.length}</span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedClients.length === 0}
            className="px-8 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-semibold shadow-lg shadow-amber-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processing...
              </>
            ) : (
              <>Generate All Notices (.zip)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
