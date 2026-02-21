"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
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

interface BulkPdfRow {
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

interface BulkDemandNoticePDFFormProps {
  onClose: () => void;
}

export default function BulkDemandNoticePDFForm({ onClose }: BulkDemandNoticePDFFormProps) {
  const { bankData, isLoading: isLoadingBanks } = useBankDataSimple();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<BulkPdfRow[]>([]);
  const [pendingClientId, setPendingClientId] = useState("");
  const [pendingBankId, setPendingBankId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [addAllBanks, setAddAllBanks] = useState(false);

  // Fetch clients on mount
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

  const createRow = (client: FirestoreClient, bank: BankAccount): BulkPdfRow => {
    const matchedName = findClosestBankMatch(bank.bankName, Object.keys(bankData));
    const details = bankData[matchedName || bank.bankName];
    
    let status: BulkPdfRow['status'] = 'missing';
    if (bankData[bank.bankName]) status = 'matched';
    else if (matchedName) status = 'fuzzy';

    return {
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
  };

  const handleAddRow = () => {
    if (!pendingClientId) {
      toast.error("Please select a client.");
      return;
    }

    const client = clients.find(c => c.id === pendingClientId);
    if (!client) return;

    if (addAllBanks) {
      // Add all banks for the selected client
      if (client.banks.length === 0) {
        toast.error("This client has no bank accounts.");
        return;
      }
      const newRows = client.banks.map(bank => createRow(client, bank));
      setSelectedClients(prev => [...prev, ...newRows]);
      toast.success(`Added all ${client.banks.length} bank accounts for ${client.name}`);
    } else {
      if (!pendingBankId) {
        toast.error("Please select a bank account.");
        return;
      }
      const bank = client.banks.find(b => b.id === pendingBankId);
      if (!bank) return;

      const newRow = createRow(client, bank);
      setSelectedClients(prev => [...prev, newRow]);
      toast.success(`Added ${bank.bankName} for ${client.name}`);
    }

    setPendingBankId("");
  };

  const handleRemoveRow = (index: number) => {
    setSelectedClients(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof BulkPdfRow, value: string) => {
    setSelectedClients(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ));
  };

  const handleSubmit = async () => {
    if (selectedClients.length === 0) {
      toast.error("Please add at least one client.");
      return;
    }

    setIsSubmitting(true);
    setProgress(10);

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

      setProgress(25);

      const response = await fetch('/api/bulk-demand-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notices }),
      });

      setProgress(75);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || "Failed to generate bulk PDF notices");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bulk_Demand_Notices_PDF_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProgress(100);
      toast.success(`Successfully generated ${selectedClients.length} PDF notices!`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  const matchedCount = selectedClients.filter(r => r.status === 'matched').length;
  const fuzzyCount = selectedClients.filter(r => r.status === 'fuzzy').length;
  const missingCount = selectedClients.filter(r => r.status === 'missing').length;

  return (
    <div className="space-y-6">
      {/* Add Client Controls */}
      <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">1. Select Client</label>
            <SearchableDropdown
              options={clients.map(c => ({ value: c.id, label: `${c.name} (${c.phone})` }))}
              value={pendingClientId}
              onChange={(val) => {
                setPendingClientId(val);
                setPendingBankId("");
              }}
              placeholder="Search client..."
            />
          </div>

          {!addAllBanks && (
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs font-medium text-gray-400 mb-1">2. Select Bank Account</label>
              <select
                value={pendingBankId}
                onChange={(e) => setPendingBankId(e.target.value)}
                disabled={!pendingClientId}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm disabled:opacity-50 h-[38px] outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">-- Select Client Bank --</option>
                {pendingClientId && clients.find(c => c.id === pendingClientId)?.banks.map(bank => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bankName} - {bank.accountNumber} ({bank.loanType})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700 hover:border-red-500/50 transition-all">
              <input
                type="checkbox"
                checked={addAllBanks}
                onChange={(e) => setAddAllBanks(e.target.checked)}
                className="w-3.5 h-3.5 accent-red-500"
              />
              <span>Add all banks</span>
            </label>

            <button
              type="button"
              onClick={handleAddRow}
              disabled={!pendingClientId || (!addAllBanks && !pendingBankId)}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white rounded-md text-sm font-medium transition-all"
            >
              Add to Queue
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800">
          <div className="flex-none">
            <label className="block text-xs font-medium text-gray-400 mb-1">Notice Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm w-40"
            />
          </div>

          <div className="flex-1 flex justify-end gap-3">
            {selectedClients.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {matchedCount > 0 && <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded">✓ {matchedCount}</span>}
                {fuzzyCount > 0 && <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded">~ {fuzzyCount}</span>}
                {missingCount > 0 && <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded">⚠ {missingCount}</span>}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedClients([])}
              disabled={selectedClients.length === 0}
              className="px-4 py-1.5 text-xs text-red-400 hover:text-red-300 disabled:text-gray-600 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800/80 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 w-8">#</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Bank & Ref</th>
              <th className="px-4 py-3">Contact Details (Editable)</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {selectedClients.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3 text-gray-600 text-xs font-mono">{idx + 1}</td>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-white">{row.clientName}</div>
                  <div className="text-xs text-gray-500">{row.clientEmail}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-2">
                    <input
                      value={row.bankName}
                      onChange={(e) => handleRowChange(idx, 'bankName', e.target.value)}
                      className="w-full bg-transparent border-b border-gray-700 focus:border-red-500 outline-none text-white text-xs py-0.5"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        value={row.reference}
                        onChange={(e) => handleRowChange(idx, 'reference', e.target.value)}
                        className="bg-transparent border-b border-gray-700 focus:border-red-500 outline-none text-gray-400 text-[11px] py-0.5"
                        placeholder="Ref/Acc No"
                      />
                      {row.status === 'matched' && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Matched</span>}
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
                      className="w-full bg-transparent border border-gray-700/50 rounded p-1 text-[11px] text-gray-300 focus:border-red-500 outline-none"
                    />
                    <textarea
                      value={row.bankAddress}
                      onChange={(e) => handleRowChange(idx, 'bankAddress', e.target.value)}
                      placeholder="Bank Address"
                      rows={2}
                      className="w-full bg-transparent border border-gray-700/50 rounded p-1 text-[11px] text-gray-400 focus:border-red-500 outline-none"
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
                <td colSpan={5} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <span className="italic text-sm">No PDFs in queue. Select clients and banks above to start building your batch.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Progress Bar (visible during generation) */}
      {isSubmitting && (
        <div className="bg-gray-900/50 p-4 rounded-xl border border-red-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Generating {selectedClients.length} PDF notices...</span>
            <span className="text-sm font-mono text-red-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Each notice is rendered as a high-quality PDF with letterhead & signature. This may take a moment...</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-between items-center py-4 border-t border-gray-800">
        <div className="text-sm text-gray-400">
          Total PDFs: <span className="text-white font-semibold">{selectedClients.length}</span>
          {selectedClients.length > 0 && (
            <span className="ml-2 text-red-400/60 text-xs">(Letterhead + Signature)</span>
          )}
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
            className="px-8 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg font-semibold shadow-lg shadow-red-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Generating PDFs...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Generate All PDFs (.zip)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
