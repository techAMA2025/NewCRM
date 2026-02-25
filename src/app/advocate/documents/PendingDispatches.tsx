"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db, functions, storage } from "@/firebase/firebase";
import { ref, getDownloadURL, deleteObject } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { toast } from "react-hot-toast";
import { FaEye, FaPaperPlane, FaSpinner, FaSync, FaTrash } from "react-icons/fa";

interface OutboxDocument {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  bankName: string;
  bankEmail: string;
  lawyerEmail: string;
  reference: string;
  referenceNumber: string;
  fileName: string;
  storagePath: string;
  status: string;
  generatedAt: string;
}

const draftTemplates = [
  {
    id: "demand-notice",
    name: "Demand Notice Reply",
    content: `Please find attached the reply to the notice sent by you to my client, <b>[CLIENT_NAME]</b>, at their registered email address <b>[CLIENT_EMAIL]</b>.\nShould the bank require any further information, documentation, or clarification, my client is fully prepared to provide all necessary details to facilitate the process. Kindly acknowledge receipt of this communication.`,
  },
  {
    id: "section-138",
    name: "Section 138 Reply",
    content: `Dear Sir/Madam,\nPlease find attached the detailed reply to the legal notice issued under Section 138 of the Negotiable Instruments Act, 1881, addressed to my client, [CLIENT_NAME], at their registered email address [CLIENT_EMAIL].\nMy client has duly noted the contents of the notice and, through this response, has addressed all allegations and factual clarifications. Should you or your client require any further information or supporting documents, we are open to providing the same to resolve the matter amicably.\nKindly acknowledge receipt of this communication.`,
  },
  {
    id: "harassment-notice",
    name: "Extreme Harassment Notice",
    content: `Please find attached a legal notice addressed to you on behalf of my client, [CLIENT_NAME], regarding the continued and extreme harassment faced by them at your instance.\nDespite multiple attempts to resolve the matter amicably, your conduct has persisted, causing severe mental, emotional, and reputational distress to my client. This notice is being served as a final opportunity to cease and desist from such unlawful behavior, failing which my client shall be constrained to initiate appropriate legal proceedings, both civil and criminal, at your risk, cost, and consequence.\nYou are hereby advised to treat this matter with the seriousness it warrants. An acknowledgment of this communication and your response to the attached notice is expected within the stipulated time.`,
  }
];

const subjectTemplates = [
  { id: "demand-notice-subject", text: "Reply to Legal Notice" },
  { id: "section-138-subject", text: "Reply to Legal Notice under Section 138 of the Negotiable Instruments Act" },
  { id: "harassment-notice-subject", text: "Legal Notice for Extreme Harassment" },
  { id: "custom", text: "Custom Subject" },
];

export default function PendingDispatches() {
  const [documents, setDocuments] = useState<OutboxDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  
  // Email state
  const [selectedTemplateId, setSelectedTemplateId] = useState(draftTemplates[0].id);
  const [subjectOption, setSubjectOption] = useState(subjectTemplates[0].text);
  const [customSubject, setCustomSubject] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "generated_outbox"),
        where("status", "==", "pending_dispatch")
      );
      
      const querySnapshot = await getDocs(q);
      const docs: OutboxDocument[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as OutboxDocument);
      });
      
      // Sort in JS since we need compound index for orderBy
      docs.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching outbox:", error);
      toast.error("Failed to fetch pending documents.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (storagePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const fileRef = ref(storage, storagePath);
      const url = await getDownloadURL(fileRef);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Could not load preview. File may have been removed or access denied.");
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDocs(newSet);
  };

  const currentTemplate = draftTemplates.find(t => t.id === selectedTemplateId)?.content || "";

  const handleDeleteSingle = async (docItem: OutboxDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete the document for ${docItem.clientName} (${docItem.bankName})?`)) return;
    
    try {
      // Delete from Firebase Storage
      if (docItem.storagePath) {
        try {
          const fileRef = ref(storage, docItem.storagePath);
          await deleteObject(fileRef);
        } catch (storageErr: any) {
          // File may already be deleted, continue with Firestore cleanup
          console.warn("Storage file not found or already deleted:", storageErr.message);
        }
      }
      // Delete from Firestore
      await deleteDoc(doc(db, "generated_outbox", docItem.id));
      toast.success(`Deleted document for ${docItem.clientName}`);
      setDocuments(prev => prev.filter(d => d.id !== docItem.id));
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(docItem.id);
        return newSet;
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) {
      toast.error("Please select at least one document to delete.");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedDocs.size} selected document(s)? This action cannot be undone.`)) return;

    setIsDeleting(true);
    const toastId = toast.loading(`Deleting ${selectedDocs.size} documents...`);
    let deletedCount = 0;
    let failedCount = 0;

    try {
      for (const docId of Array.from(selectedDocs)) {
        const docItem = documents.find(d => d.id === docId);
        if (!docItem) continue;

        try {
          // Delete from Firebase Storage
          if (docItem.storagePath) {
            try {
              const fileRef = ref(storage, docItem.storagePath);
              await deleteObject(fileRef);
            } catch (storageErr: any) {
              console.warn("Storage file not found:", storageErr.message);
            }
          }
          // Delete from Firestore
          await deleteDoc(doc(db, "generated_outbox", docItem.id));
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete doc ${docId}:`, err);
          failedCount++;
        }
      }

      if (failedCount === 0) {
        toast.success(`Successfully deleted ${deletedCount} document(s)!`, { id: toastId });
      } else {
        toast.error(`Deleted ${deletedCount}, failed ${failedCount}.`, { id: toastId });
      }

      setSelectedDocs(new Set());
      fetchDocuments();
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      toast.error(error.message || "Failed to delete documents.", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDispatch = async () => {
    if (selectedDocs.size === 0) {
      toast.error("Please select at least one document to dispatch.");
      return;
    }

    const finalSubject = subjectOption === "Custom Subject" ? customSubject : subjectOption;
    if (!finalSubject.trim()) {
      toast.error("Please provide an email subject.");
      return;
    }

    setIsSending(true);
    const toastId = toast.loading(`Dispatching ${selectedDocs.size} emails...`);

    try {
      const operations = Array.from(selectedDocs).map(docId => {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return null;
        
        const personalizedContent = currentTemplate
          .replace(/\[CLIENT_NAME\]/g, doc.clientName)
          .replace(/\[CLIENT_EMAIL\]/g, doc.clientEmail);
        
        return {
          docId: doc.id,
          subject: finalSubject,
          content: personalizedContent
        };
      }).filter(Boolean);

      const dispatchBulkDemandNotices = httpsCallable(functions, 'dispatchBulkDemandNotices');
      const response = await dispatchBulkDemandNotices({ operations });
      const result = response.data as any;

      if (result.success) {
        toast.success(`Successfully dispatched emails!`, { id: toastId });
        setSelectedDocs(new Set());
        fetchDocuments(); // Refresh queue
      } else {
        toast.error("Some emails failed to dispatch. Check logs.", { id: toastId });
      }

    } catch (error: any) {
      console.error("Dispatch error:", error);
      toast.error(error.message || "Failed to dispatch emails.", { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-2xl border border-blue-500/20 shadow-xl animate-fadeIn">
      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Pending Dispatches <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{documents.length}</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">Review generated PDFs and dispatch them in bulk.</p>
        </div>
        <button 
          onClick={fetchDocuments} 
          disabled={loading || isSending}
          className="p-2 text-gray-400 hover:text-white transition-colors bg-gray-700/50 rounded-lg hover:bg-gray-700"
          title="Refresh Queue"
        >
          <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {documents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Context Panel - Takes 1/3 width */}
          <div className="lg:col-span-1 bg-gray-900/50 p-5 rounded-xl border border-gray-700 flex flex-col h-full">
            <h3 className="text-md font-semibold text-white mb-4">Email Configuration</h3>
            
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
                <select 
                  value={subjectOption}
                  onChange={(e) => setSubjectOption(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                >
                  {subjectTemplates.map(st => (
                     <option key={st.id} value={st.text}>{st.text}</option>
                  ))}
                </select>
                {subjectOption === "Custom Subject" && (
                  <input 
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Enter custom email subject..."
                    className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email Template</label>
                <select 
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                >
                  {draftTemplates.map(dt => (
                     <option key={dt.id} value={dt.id}>{dt.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Preview Body (Draft)</label>
                <textarea 
                  readOnly 
                  value={currentTemplate}
                  className="w-full h-40 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-300 text-xs p-3 outline-none resize-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">[CLIENT_NAME] and [CLIENT_EMAIL] will be auto-replaced.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button 
                onClick={handleBulkDispatch}
                disabled={isSending || isDeleting || selectedDocs.size === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
              >
                {isSending ? (
                  <><FaSpinner className="animate-spin" /> Dispatching...</>
                ) : (
                  <><FaPaperPlane /> Bulk Dispatch ({selectedDocs.size})</>
                )}
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isSending || isDeleting || selectedDocs.size === 0}
                className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isDeleting ? (
                  <><FaSpinner className="animate-spin" /> Deleting...</>
                ) : (
                  <><FaTrash /> Delete Selected ({selectedDocs.size})</>
                )}
              </button>
            </div>
          </div>

          {/* Queue Table - Takes 2/3 width */}
          <div className="lg:col-span-2 overflow-hidden bg-gray-900/50 rounded-xl border border-gray-700 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-800/80 text-gray-400 text-xs uppercase sticky top-0 z-10 shadow-sm shadow-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedDocs.size === documents.length && documents.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded bg-gray-700 border-gray-600 accent-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Bank Details</th>
                    <th className="px-4 py-3">Ref No.</th>
                    <th className="px-4 py-3 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {documents.map((doc) => (
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-gray-800/60 transition-colors cursor-pointer ${selectedDocs.has(doc.id) ? 'bg-blue-900/10' : ''}`}
                      onClick={() => toggleSelect(doc.id)}
                    >
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          checked={selectedDocs.has(doc.id)}
                          onChange={() => {}} // handled by tr click
                          className="w-4 h-4 rounded bg-gray-700 border-gray-600 accent-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{doc.clientName}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{doc.clientEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300 font-medium">{doc.bankName}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]" title={doc.bankEmail}>{doc.bankEmail}</div>
                        {doc.lawyerEmail && (
                          <div className="text-[10px] text-blue-400 mt-0.5 truncate max-w-[200px]" title={doc.lawyerEmail}>
                            Lawyer: {doc.lawyerEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {doc.referenceNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handlePreview(doc.storagePath, e)}
                            className="p-2 text-gray-400 hover:text-blue-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                            title="Preview PDF"
                          >
                            <FaEye />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteSingle(doc, e)}
                            className="p-2 text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                            title="Delete Document"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center bg-gray-900/30 rounded-xl border border-dashed border-gray-700">
          <FaEye className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-medium text-lg mb-1">No pending dispatches</h3>
          <p className="text-gray-500 text-sm">Generate some Demand Notices first to see them here.</p>
        </div>
      )}
    </div>
  );
}
