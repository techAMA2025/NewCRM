"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import SearchableDropdown from "@/components/SearchableDropdown";
import { authFetch } from "@/lib/authFetch";

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
  banks: Bank[];
}

interface VakalatnamaPDFFormProps {
  onClose: () => void;
  initialClient?: any;
}

export default function VakalatnamaPDFForm({ onClose, initialClient }: VakalatnamaPDFFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(initialClient?.id || "");
  const [formData, setFormData] = useState({
    clientName: initialClient?.name || "",
    bankName: "",
    arbitrator: "",
    caseNo: "",
    date: new Date().toISOString().split('T')[0],
  });

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

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientName: selectedClient.name || "",
        bankName: selectedClient.banks?.[0]?.bankName || ""
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await authFetch('/api/vakalatnama-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate Vakalatnama');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.clientName}_vakalatnama.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Vakalatnama PDF successfully generated!");
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Selector */}
        {!initialClient && (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">Select Client</label>
            <SearchableDropdown
              options={clients.map(client => ({
                value: client.id,
                label: `${client.name} - ${client.email || client.phone}`
              }))}
              value={selectedClientId}
              onChange={handleClientChange}
              placeholder="Select a client..."
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client Name</label>
          <input
            type="text"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Arbitrator Name</label>
          <input
            type="text"
            name="arbitrator"
            value={formData.arbitrator}
            onChange={handleChange}
            required
            placeholder="e.g. SH. RAJESH KUMAR"
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Case Number</label>
          <input
            type="text"
            name="caseNo"
            value={formData.caseNo}
            onChange={handleChange}
            required
            placeholder="e.g. ARB/123/2026"
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Name (Claimant)</label>
          <div className="space-y-2">
            <select
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, bankName: value === "manual" ? "" : value }));
              }}
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
              value={clients.find(c => c.id === selectedClientId)?.banks?.some(b => b.bankName === formData.bankName) ? formData.bankName : "manual"}
            >
              {clients.find(c => c.id === selectedClientId)?.banks?.map((bank: Bank) => (
                <option key={bank.id} value={bank.bankName}>{bank.bankName}</option>
              )) || (initialClient?.banks as Bank[])?.map((bank: Bank) => (
                <option key={bank.id} value={bank.bankName}>{bank.bankName}</option>
              ))}
              <option value="manual">Manual Entry / Other</option>
            </select>
            
            {(formData.bankName === "" || !clients.find(c => c.id === selectedClientId)?.banks?.some(b => b.bankName === formData.bankName)) && (
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                required
                placeholder="Enter bank name manually"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md flex items-center text-sm"
        >
          {isSubmitting ? "Generating..." : "Generate Vakalatnama"}
        </button>
      </div>
    </form>
  );
}
