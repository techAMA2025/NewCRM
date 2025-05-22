"use client";

import { useState } from "react";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import toast, { Toaster } from "react-hot-toast";
import RequestLetterForm from "./requestletter";
import DemandNoticeForm from "./demandnotice";
import CFHABForm from "./cfhab";
import ReplyToNoticeForm from "./replytonotice";

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

  const handleFormToggle = (formType: string) => {
    setActiveForm(activeForm === formType ? null : formType);
  };

  return (
    <div className="flex bg-gray-900 min-h-screen">
      <AdvocateSidebar />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-white">Document Generation</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Request Letters
            </h2>
            <p className="text-gray-300 mb-4">Generate request letters to banks for your clients.</p>
            <button
              onClick={() => handleFormToggle('requestLetter')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors duration-200"
            >
              {activeForm === 'requestLetter' ? "Hide Form" : "Create Request Letter"}
            </button>
          </div>
          
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Demand Notice
            </h2>
            <p className="text-gray-300 mb-4">Generate formal demand notices for outstanding payments.</p>
            <button
              onClick={() => handleFormToggle('demandNotice')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors duration-200"
            >
              {activeForm === 'demandNotice' ? "Hide Form" : "Create Demand Notice"}
            </button>
          </div>
          
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              CFHAB
            </h2>
            <p className="text-gray-300 mb-4">Generate Consumer Forum/RERA/Banking Ombudsman requests.</p>
            <button
              onClick={() => handleFormToggle('cfhab')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors duration-200"
            >
              {activeForm === 'cfhab' ? "Hide Form" : "Create CFHAB"}
            </button>
          </div>
          
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Reply to Notice
            </h2>
            <p className="text-gray-300 mb-4">Generate formal replies to legal notices from banks.</p>
            <button
              onClick={() => handleFormToggle('replyToNotice')}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors duration-200"
            >
              {activeForm === 'replyToNotice' ? "Hide Form" : "Create Reply Notice"}
            </button>
          </div>
        </div>
        
        {activeForm === 'requestLetter' && (
          <div className="mt-6 bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-sm animate-fadeIn">
            <h2 className="text-xl font-semibold text-white mb-6">Generate Request Letter</h2>
            <RequestLetterForm client={dummyClient} onClose={() => setActiveForm(null)} />
          </div>
        )}
        
        {activeForm === 'demandNotice' && (
          <div className="mt-6 bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-sm animate-fadeIn">
            <h2 className="text-xl font-semibold text-white mb-6">Generate Demand Notice</h2>
            <DemandNoticeForm onClose={() => setActiveForm(null)} />
          </div>
        )}
        
        {activeForm === 'cfhab' && (
          <div className="mt-6 bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-sm animate-fadeIn">
            <h2 className="text-xl font-semibold text-white mb-6">Generate CFHAB Document</h2>
            <CFHABForm onClose={() => setActiveForm(null)} />
          </div>
        )}
        
        {activeForm === 'replyToNotice' && (
          <div className="mt-6 bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-sm animate-fadeIn">
            <h2 className="text-xl font-semibold text-white mb-6">Generate Reply to Notice</h2>
            <ReplyToNoticeForm onClose={() => setActiveForm(null)} />
          </div>
        )}
        
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
