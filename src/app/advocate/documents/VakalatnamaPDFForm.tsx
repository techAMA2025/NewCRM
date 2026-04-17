"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { collection, getDocs, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
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

interface Advocate {
  id?: string;
  name: string;
  barEnrollment: string;
}

interface VakalatnamaPDFFormProps {
  onClose: () => void;
  initialClient?: any;
}

export default function VakalatnamaPDFForm({ onClose, initialClient }: VakalatnamaPDFFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(initialClient?.id || "");
  const [allAdvocates, setAllAdvocates] = useState<Advocate[]>([]);
  const [selectedAdvocates, setSelectedAdvocates] = useState<Advocate[]>([]);
  const [isAddingAdvocate, setIsAddingAdvocate] = useState(false);
  const [advForm, setAdvForm] = useState({ name: "", barEnrollment: "" });

  const [formData, setFormData] = useState({
    clientName: initialClient?.name || "",
    bankName: "",
    arbitrator: "",
    caseNo: "",
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const q = query(collection(db, "adv_details"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const advs: Advocate[] = [];
      snapshot.forEach((doc) => advs.push({ id: doc.id, ...doc.data() } as Advocate));
      setAllAdvocates(advs);
    });
    return () => unsubscribe();
  }, []);

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

  const handleToggleAdvocate = (adv: Advocate) => {
    setSelectedAdvocates(prev => {
      const exists = prev.find(a => a.id === adv.id);
      if (exists) {
        return prev.filter(a => a.id !== adv.id);
      } else {
        return [...prev, adv];
      }
    });
  };

  const handleAddAdvocate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!advForm.name || !advForm.barEnrollment) {
      toast.error("Please fill both name and bar enrollment number");
      return;
    }

    try {
      await addDoc(collection(db, "adv_details"), advForm);
      setAdvForm({ name: "", barEnrollment: "" });
      setIsAddingAdvocate(false);
      toast.success("Advocate added successfully");
    } catch (error) {
      console.error("Error adding advocate:", error);
      toast.error("Failed to add advocate");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAdvocates.length === 0) {
      toast.error("Please select at least one advocate");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authFetch('/api/vakalatnama-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          advocates: selectedAdvocates.map(a => ({ name: a.name, barEnrollment: a.barEnrollment }))
        }),
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

      {/* Advocate Selection Section */}
      <div className="pt-4 border-t border-gray-800">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Select Advocates (Required)</label>
          <button
            type="button"
            onClick={() => setIsAddingAdvocate(!isAddingAdvocate)}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            {isAddingAdvocate ? "- Cancel" : "+ Add New Advocate"}
          </button>
        </div>

        {isAddingAdvocate && (
          <div className="bg-gray-900/50 p-3 rounded-lg border border-purple-900/30 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Name"
                value={advForm.name}
                onChange={(e) => setAdvForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs"
              />
              <input
                type="text"
                placeholder="Bar Enrollment No."
                value={advForm.barEnrollment}
                onChange={(e) => setAdvForm(prev => ({ ...prev, barEnrollment: e.target.value }))}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs"
              />
            </div>
            <button
              onClick={handleAddAdvocate}
              className="w-full py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-600/50 rounded text-xs font-medium transition-colors"
            >
              Save Advocate to Database
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
          {allAdvocates.map((adv) => (
            <div
              key={adv.id}
              onClick={() => handleToggleAdvocate(adv)}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                selectedAdvocates.find(a => a.id === adv.id)
                  ? "bg-purple-600/20 border-purple-500 text-purple-200"
                  : "bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                selectedAdvocates.find(a => a.id === adv.id)
                  ? "bg-purple-500 border-purple-500"
                  : "border-gray-500"
              }`}>
                {selectedAdvocates.find(a => a.id === adv.id) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="truncate">
                <p className="text-[10px] font-medium leading-none mb-0.5">{adv.name}</p>
                <p className="text-[9px] opacity-60 leading-none">{adv.barEnrollment}</p>
              </div>
            </div>
          ))}
          {allAdvocates.length === 0 && (
            <p className="col-span-full text-center py-4 text-xs text-gray-500 italic">No advocates found. Please add one above.</p>
          )}
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
