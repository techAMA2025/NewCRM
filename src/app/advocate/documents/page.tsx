"use client";

import { useState, useEffect } from "react";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import AssistantSidebar from "@/components/navigation/AssistantSidebar";
import toast, { Toaster } from "react-hot-toast";
import RequestLetterForm from "./requestletter";
import DemandNoticeForm from "./demandnotice";
import DemandNoticePDFForm from "./DemandNoticePDFForm";
import BulkDemandNoticeForm from "./BulkDemandNoticeForm";
import BulkDemandNoticePDFForm from "./BulkDemandNoticePDFForm";
import PendingDispatches from "./PendingDispatches";
import CFHABForm from "./cfhab";
import ReplyToNoticeForm from "./replytonotice";
import Sec138Form from "./sec138";
import Sec21Form from "./sec21";
import VakalatnamaPDFForm from "./VakalatnamaPDFForm";
import OverlordSidebar from "@/components/navigation/OverlordSidebar";

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
  isPrimary: boolean;
  isSecondary: boolean;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: any;
}

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: React.ReactNode, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative flex flex-col">
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 p-5 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white flex items-center">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const DocumentsPage = () => {
  // Placeholder for client data - in a real implementation, you would:
  // 1. Get this from a URL parameter or state
  // 2. Fetch client details from an API or context
  const [dummyClient, setDummyClient] = useState<Client>({
    id: "placeholder",
    name: "",
    phone: "",
    email: "",
    city: "",
    alloc_adv: "",
    status: "Active",
    personalLoanDues: "",
    creditCardDues: "",
    banks: [],
    isPrimary: false,
    isSecondary: false
  });

  // State to track which form is currently shown
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'dispatches'>('individual');

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      setUserRole(role || '');
    }
  }, []);

  const handleFormToggle = (formType: string) => {
    setActiveForm(activeForm === formType ? null : formType);
  };

  const closeModal = () => setActiveForm(null);

  return (
    <div className="flex bg-gray-900 min-h-screen">
      {userRole === 'advocate' ? <AdvocateSidebar /> : 
       userRole === 'assistant' ? <AssistantSidebar /> :
       <OverlordSidebar />}
      <div className="flex-1 p-8 max-w-8xl mx-auto w-full">
        <div className="flex justify-between items-end mb-8 w-full">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Document Generation</h1>
            <p className="text-gray-400">Generate, dispatch, and manage legal documents for your clients.</p>
          </div>
        </div>
        
        {/* Modern Tabs */}
        <div className="flex space-x-1 border-b border-gray-800 mb-8 overflow-x-auto no-scrollbar w-full">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'individual'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Individual Documents
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'bulk'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Bulk Generation

          </button>
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'dispatches'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Pending Dispatches
          </button>
        </div>

        {/* Tab Content: Individual */}
        {activeTab === 'individual' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn w-full">
            <div className="bg-gray-800/40 hover:bg-gray-800/60 transition-all p-6 rounded-2xl border border-gray-700/50 shadow-sm group flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center">
                <div className="p-2 bg-purple-500/10 rounded-lg mr-3 group-hover:bg-purple-500/20 transition-colors">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Request Letters
              </h2>
              <p className="text-gray-400 text-sm flex-grow mb-5">Generate standard request letters to banks for your clients.</p>
              <button
                onClick={() => handleFormToggle('requestLetter')}
                className="w-full py-2.5 bg-gray-700/50 hover:bg-purple-600 text-white rounded-xl transition-colors duration-200 text-sm font-medium"
              >
                Create Document
              </button>
            </div>
            


            <div className="bg-gradient-to-b from-gray-800/50 to-gray-800/30 hover:from-gray-800/80 transition-all p-6 rounded-2xl border border-red-500/20 hover:border-red-500/40 shadow-lg group flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <span className="px-2 py-1 text-[10px] bg-red-500 text-white font-bold rounded-lg shadow-sm">PDF</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center">
                <div className="p-2 bg-red-500/10 rounded-lg mr-3 group-hover:bg-red-500/20 transition-colors">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                Demand Notice
              </h2>
              <p className="text-gray-400 text-sm flex-grow mb-5 pr-8">Directly generate as a finalized PDF with letterhead & signature.</p>
              <button
                onClick={() => handleFormToggle('demandNoticePDF')}
                className="w-full py-2.5 bg-gradient-to-r from-red-600/80 to-rose-600/80 hover:from-red-500 hover:to-rose-500 text-white rounded-xl transition-all duration-200 text-sm font-medium shadow-md shadow-red-900/20"
              >
                Create PDF Notice
              </button>
            </div>

            <div className="bg-gradient-to-b from-gray-800/50 to-gray-800/30 hover:from-gray-800/80 transition-all p-6 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/40 shadow-lg group flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <span className="px-2 py-1 text-[10px] bg-indigo-500 text-white font-bold rounded-lg shadow-sm">PDF</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center">
                <div className="p-2 bg-indigo-500/10 rounded-lg mr-3 group-hover:bg-indigo-500/20 transition-colors">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Vakalatnama
              </h2>
              <p className="text-gray-400 text-sm flex-grow mb-5 pr-8">Generate Vakalatnama with dynamic ARB details & advocate signatures.</p>
              <button
                onClick={() => handleFormToggle('vakalatnama')}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600/80 to-blue-600/80 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl transition-all duration-200 text-sm font-medium shadow-md shadow-indigo-900/20"
              >
                Create PDF Document
              </button>
            </div>
            
            <div className="bg-gray-800/40 hover:bg-gray-800/60 transition-all p-6 rounded-2xl border border-gray-700/50 shadow-sm group flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center">
                <div className="p-2 bg-blue-500/10 rounded-lg mr-3 group-hover:bg-blue-500/20 transition-colors">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                CFHAB
              </h2>
              <p className="text-gray-400 text-sm flex-grow mb-5">Generate Consumer Forum/RERA/Banking Ombudsman requests.</p>
              <button
                onClick={() => handleFormToggle('cfhab')}
                className="w-full py-2.5 bg-gray-700/50 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 text-sm font-medium"
              >
                Create Document
              </button>
            </div>
            
            <div className="bg-gray-800/40 hover:bg-gray-800/60 transition-all p-6 rounded-2xl border border-gray-700/50 shadow-sm group flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center">
                <div className="p-2 bg-rose-500/10 rounded-lg mr-3 group-hover:bg-rose-500/20 transition-colors">
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Section 25
              </h2>
              <p className="text-gray-400 text-sm flex-grow mb-5">Generate formal replies to legal notices from banks.</p>
              <button
                onClick={() => handleFormToggle('replyToNotice')}
                className="w-full py-2.5 bg-gray-700/50 hover:bg-rose-600 text-white rounded-xl transition-colors duration-200 text-sm font-medium"
              >
                Create Document
              </button>
            </div>

            <div className="bg-gray-800/40 hover:bg-gray-800/60 transition-all p-6 rounded-2xl border border-gray-700/50 shadow-sm group flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center">
                <div className="p-2 bg-green-500/10 rounded-lg mr-3 group-hover:bg-green-500/20 transition-colors">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Section 138
              </h2>
              <p className="text-gray-400 text-sm flex-grow mb-5">Generate formal replies to legal notices from banks.</p>
              <button
                onClick={() => handleFormToggle('sec138')}
                className="w-full py-2.5 bg-gray-700/50 hover:bg-green-600 text-white rounded-xl transition-colors duration-200 text-sm font-medium"
              >
                Create Document
              </button>
            </div>

            <div className="bg-gray-800/40 hover:bg-gray-800/60 transition-all p-6 rounded-2xl border border-gray-700/50 shadow-sm group flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center">
                <div className="p-2 bg-cyan-500/10 rounded-lg mr-3 group-hover:bg-cyan-500/20 transition-colors">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Section 21
              </h2>
              <p className="text-gray-400 text-sm flex-grow mb-5">Generate Section 21 notices.</p>
              <button
                onClick={() => handleFormToggle('sec21')}
                className="w-full py-2.5 bg-gray-700/50 hover:bg-cyan-600 text-white rounded-xl transition-colors duration-200 text-sm font-medium"
              >
                Create Document
              </button>
            </div>


          </div>
        )}

        {/* Tab Content: Bulk */}
        {activeTab === 'bulk' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn w-full max-w-5xl">
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 hover:from-gray-800 hover:to-gray-800 transition-all p-8 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 shadow-lg group flex flex-col">
              <h2 className="text-xl font-bold text-white mb-3 flex items-center">
                <div className="p-2.5 bg-amber-500/10 rounded-xl mr-4 group-hover:bg-amber-500/20 transition-colors">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                Bulk Demand Notice
              </h2>
              <p className="text-gray-400 text-base flex-grow mb-6">Generate 50+ demand notices at once into a single ZIP file. Perfect for processing large batches of clients efficiently.</p>
              <button
                onClick={() => handleFormToggle('bulkDemandNotice')}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl transition-all duration-200 text-sm font-bold shadow-lg shadow-amber-900/20"
              >
                Launch Bulk Generator
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 hover:from-gray-800 hover:to-gray-800 transition-all p-8 rounded-2xl border border-red-500/20 hover:border-red-500/40 shadow-lg group flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 flex gap-2">
                <span className="px-2 py-1 text-[10px] bg-red-500 text-white font-bold rounded-lg shadow-sm">PDF</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center">
                <div className="p-2.5 bg-red-500/10 rounded-xl mr-4 group-hover:bg-red-500/20 transition-colors">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                Bulk Demand PDF
              </h2>
              <p className="text-gray-400 text-base flex-grow mb-6 pr-10">Bulk generate finalized PDF notices with letterhead & signature in a ZIP archive. Ready to print or email.</p>
              <button
                onClick={() => handleFormToggle('bulkDemandNoticePDF')}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl transition-all duration-200 text-sm font-bold shadow-lg shadow-red-900/20"
              >
                Launch Bulk PDF Generator
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Pending Dispatches */}
        {activeTab === 'dispatches' && (
          <div className="animate-fadeIn w-full">
            <PendingDispatches />
          </div>
        )}

        {/* Modals for Forms */}
        <Modal 
          isOpen={activeForm === 'requestLetter'} 
          onClose={closeModal} 
          title="Generate Request Letter"
        >
          <RequestLetterForm client={dummyClient} onClose={closeModal} />
        </Modal>

        <Modal 
          isOpen={activeForm === 'demandNoticePDF'} 
          onClose={closeModal} 
          title={
            <span className="flex items-center gap-2">
              Generate Demand Notice PDF
              <span className="px-2 py-0.5 text-xs bg-red-500 text-white font-bold rounded">PDF</span>
            </span>
          }
        >
          <DemandNoticePDFForm onClose={closeModal} />
        </Modal>

        <Modal 
          isOpen={activeForm === 'bulkDemandNotice'} 
          onClose={closeModal} 
          title={
            <div className="flex flex-col">
              <span className="text-xl font-bold">Bulk Demand Notice Generation</span>
              <span className="text-sm font-normal text-gray-400 mt-1">Select multiple clients to generate documents in parallel.</span>
            </div>
          }
        >
          <BulkDemandNoticeForm onClose={closeModal} />
        </Modal>

        <Modal 
          isOpen={activeForm === 'bulkDemandNoticePDF'} 
          onClose={closeModal} 
          title={
            <div className="flex flex-col">
              <span className="text-xl font-bold flex items-center gap-2">
                Bulk Demand Notice PDF Generation
                <span className="px-2 py-0.5 text-xs bg-red-500 text-white font-bold rounded">PDF</span>
              </span>
              <span className="text-sm font-normal text-gray-400 mt-1">Generate multiple high-quality PDF notices into a single ZIP file.</span>
            </div>
          }
        >
          <BulkDemandNoticePDFForm onClose={closeModal} />
        </Modal>

        <Modal 
          isOpen={activeForm === 'cfhab'} 
          onClose={closeModal} 
          title="Generate CFHAB Document"
        >
          <CFHABForm onClose={closeModal} />
        </Modal>

        <Modal 
          isOpen={activeForm === 'replyToNotice'} 
          onClose={closeModal} 
          title="Generate Reply to Notice"
        >
          <ReplyToNoticeForm onClose={closeModal} />
        </Modal>

        <Modal 
          isOpen={activeForm === 'sec138'} 
          onClose={closeModal} 
          title="Generate Section 138"
        >
          <Sec138Form client={dummyClient} onClose={closeModal} />
        </Modal>

        <Modal 
          isOpen={activeForm === 'sec21'} 
          onClose={closeModal} 
          title="Generate Section 21 Notice"
        >
          <Sec21Form onClose={closeModal} />
        </Modal>

        <Modal 
          isOpen={activeForm === 'vakalatnama'} 
          onClose={closeModal} 
          title={
            <span className="flex items-center gap-2">
              Generate Vakalatnama PDF
              <span className="px-2 py-0.5 text-xs bg-indigo-500 text-white font-bold rounded">PDF</span>
            </span>
          }
        >
          <VakalatnamaPDFForm onClose={closeModal} />
        </Modal>

        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: 'rgba(47, 133, 90, 0.9)',
              },
            },
            error: {
              duration: 3000,
              style: {
                background: 'rgba(175, 45, 45, 0.9)',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default DocumentsPage;
