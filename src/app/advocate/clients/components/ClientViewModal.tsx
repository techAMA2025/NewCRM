"use client"

import { useState, useEffect, useRef } from "react"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/firebase/firebase"
import { formatIndianCurrency, formatIndianPhoneNumber, formatIndianDate } from "../utils/formatters"
import toast from "react-hot-toast"
import { FaEllipsisV, FaWhatsapp } from "react-icons/fa"

// Use compatible Client type that matches parent component
interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
  settled: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  altPhone: string;
  assignedTo: string;
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
  isPrimary: boolean;
  isSecondary: boolean;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: Date;
  // Additional fields from local type
  alloc_adv_secondary?: string;
  alloc_adv_secondary_at?: any;
  alloc_adv_at?: any;
  convertedAt?: any;
  adv_status?: string;
  source_database?: string;
  request_letter?: boolean;
  sentAgreement?: boolean;
  convertedFromLead?: boolean;
  leadId?: string;
  dob?: string;
  panNumber?: string;
  aadharNumber?: string;
  documents?: {
    type: string;
    bankName?: string;
    accountType?: string;
    createdAt?: string;
    url?: string;
    name?: string;
    lastEdited?: string;
    htmlUrl?: string;
  }[];
}

interface ClientViewModalProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  openDocumentViewer: (url?: string, name?: string) => void
  openRequestLetterModal: (client: Client) => void
  openLegalNoticeModal: (client: Client) => void
  openDemandNoticeModal: (client: Client) => void
  openHarassmentComplaintModal: (client: Client) => void
  openDocumentEditor: (url: string, name: string, index: number, clientId: string) => void
  openBillCutDocument: (client: Client) => void
}

export default function ClientViewModal({
  client,
  isOpen,
  onClose,
  openDocumentViewer,
  openRequestLetterModal,
  openLegalNoticeModal,
  openDemandNoticeModal,
  openHarassmentComplaintModal,
  openDocumentEditor,
  openBillCutDocument,
}: ClientViewModalProps) {
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [showPhoneSelectionModal, setShowPhoneSelectionModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)

  // WATI template options
  const whatsappTemplates = [
    {
      name: "Send Feedback Message",
      templateName: "advocate_feedback_20250801",
      description: "Send feedback request message to client"
    }
  ]

  // Handle clicking outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowWhatsAppMenu(false)
      }
    }

    if (showWhatsAppMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showWhatsAppMenu])

  const sendWhatsAppMessage = async (templateName: string, phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error("No phone number available")
      return
    }

    setIsSendingWhatsApp(true)
    setShowPhoneSelectionModal(false)

    try {
      const sendClientWhatsappMessageFn = httpsCallable(functions, "sendClientWhatsappMessage")

      // Format phone number to ensure it's in the correct format
      let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/[()-]/g, "")
      if (formattedPhone.startsWith("+91")) {
        formattedPhone = formattedPhone.substring(3)
      }
      if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
        formattedPhone = "91" + formattedPhone
      }

      const messageData = {
        phoneNumber: formattedPhone,
        templateName: templateName,
        clientId: client?.id,
        userId: localStorage.getItem("userName") || "Unknown",
        userName: localStorage.getItem("userName") || "Unknown",
        message: `Template message: ${templateName}`,
        customParams: [
          { name: "name", value: client?.name || "Customer" },
          { name: "Channel", value: "AMA Legal Solutions" },
          { name: "agent_name", value: localStorage.getItem("userName") || "Agent" },
          { name: "customer_mobile", value: formattedPhone }
        ],
        channelNumber: "919289622596",
        broadcastName: `${templateName}_${Date.now()}`
      }

      const result = await sendClientWhatsappMessageFn(messageData)

      if (result.data && (result.data as any).success) {
        const templateDisplayName = whatsappTemplates.find(t => t.templateName === templateName)?.name || templateName
        toast.success(`WhatsApp message sent successfully using "${templateDisplayName}" template`)
      } else {
        console.log("Success check failed. Result data:", result.data)
        toast.error("Failed to send WhatsApp message")
      }
    } catch (error: any) {
      console.error("Error sending WhatsApp message:", error)
      const errorMessage = error.message || error.details || "Unknown error"
      toast.error(`Failed to send WhatsApp message: ${errorMessage}`)
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName)
    setShowWhatsAppMenu(false)
    setShowPhoneSelectionModal(true)
  }

  const handlePhoneSelection = (phoneNumber: string) => {
    sendWhatsAppMessage(selectedTemplate, phoneNumber)
  }

  if (!isOpen || !client) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div
          className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700"
          style={{ animation: "slideUp 0.3s ease-out forwards" }}
        >
          {/* Client Header/Hero Section */}
          <div className="relative bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 p-8">
            <div className="absolute top-4 right-4">
              <button
                onClick={onClose}
                className="text-gray-300 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-2 transition-all duration-200"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="text-gray-300 mb-1 flex items-center">
                  Client Profile
                  <span
                    className={`ml-3 px-3 py-0.5 rounded-full text-xs font-medium ${
                      client.adv_status === "Active"
                        ? "bg-blue-800 text-blue-200"
                        : !client.adv_status || client.adv_status === "Inactive"
                          ? "bg-gray-700 text-gray-300"
                          : client.adv_status === "Dropped"
                            ? "bg-red-800 text-red-200"
                            : client.adv_status === "Not Responding"
                              ? "bg-yellow-800 text-yellow-200"
                              : client.adv_status === "On Hold"
                                ? "bg-purple-800 text-purple-200"
                                : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {client.adv_status || "Inactive"}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-1">{client.name}</h2>
                <div className="text-sm mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      client.source_database === "credsettlee"
                        ? "bg-emerald-800 text-emerald-200"
                        : client.source_database === "ama"
                          ? "bg-amber-800 text-amber-200"
                          : client.source_database === "settleloans"
                            ? "bg-blue-800 text-blue-200"
                            : client.source_database === "billcut"
                              ? "bg-purple-800 text-purple-200"
                              : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {client.source_database === "credsettlee"
                      ? "Cred Settle"
                      : client.source_database === "ama"
                        ? "AMA"
                        : client.source_database === "settleloans"
                          ? "Settle Loans"
                          : client.source_database === "billcut"
                            ? "Bill Cut"
                            : client.source_database || "Not specified"}
                  </span>
                  {client.leadId && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs font-medium">
                      ID: {client.leadId}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {formatIndianPhoneNumber(client.phone)}
                  </div>
                  
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {client.email}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {client.city}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end space-y-1">
                {client.convertedAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm font-medium">Converted:</span>
                    <span className="text-white">{formatIndianDate(client.convertedAt)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm font-medium">Assigned At:</span>
                  <span className="text-white">{formatIndianDate(client.alloc_adv_at)}</span>
                </div>
                {client.startDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm font-medium">Start Date:</span>
                    <span className="text-white">{formatIndianDate(client.startDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Financial Overview */}
            <div className="mb-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              <div className="text-sm text-gray-400 font-medium px-4 py-2 bg-black/20">Financial Overview</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 p-1">
                <div className="p-3 flex flex-col">
                  <span className="text-xs text-gray-400 mb-1">Personal Loan Dues</span>
                  <span className="text-xl font-bold text-purple-300">
                    {formatIndianCurrency(client.personalLoanDues)}
                  </span>
                </div>
                <div className="p-3 flex flex-col">
                  <span className="text-xs text-gray-400 mb-1">Credit Card Dues</span>
                  <span className="text-xl font-bold text-purple-300">{formatIndianCurrency(client.creditCardDues)}</span>
                </div>
                <div className="p-3 flex flex-col">
                  <span className="text-xs text-gray-400 mb-1">Monthly Income</span>
                  <span className="text-xl font-bold text-purple-300">{formatIndianCurrency(client.monthlyIncome)}</span>
                </div>
                <div className="p-3 flex flex-col">
                  <span className="text-xs text-gray-400 mb-1">Tenure</span>
                  <span className="text-xl font-bold text-purple-300">
                    {client.tenure ? `${client.tenure} months` : "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal & Professional */}
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Name</span>
                    <span className="text-white w-2/3 font-medium">{client.name}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Phone</span>
                    <span className="text-white w-2/3">{formatIndianPhoneNumber(client.phone)}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Alt Phone</span>
                    <span className="text-white w-2/3">{formatIndianPhoneNumber(client.altPhone)}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Email</span>
                    <span className="text-white w-2/3">{client.email}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">City</span>
                    <span className="text-white w-2/3">{client.city}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Date of Birth</span>
                    <span className="text-white w-2/3">
                      {client.dob ? formatIndianDate(client.dob) : "Not specified"}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Occupation</span>
                    <span className="text-white w-2/3">{client.occupation || "Not specified"}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">PAN Number</span>
                    <span className="text-white w-2/3">{client.panNumber || "Not specified"}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Aadhar Number</span>
                    <span className="text-white w-2/3">{client.aadharNumber || "Not specified"}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Source</span>
                    <span className="text-white w-2/3">{client.source_database || "Not specified"}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Salesperson</span>
                    <span className="text-white w-2/3">{client.assignedTo}</span>
                  </div>
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Primary Advocate</span>
                    <span className="text-white w-2/3">{client.alloc_adv}</span>
                  </div>
                  {client.alloc_adv_secondary && (
                    <div className="flex border-b border-gray-700 pb-2">
                      <span className="text-gray-400 w-1/3">Secondary Advocate</span>
                      <span className="text-white w-2/3">{client.alloc_adv_secondary}</span>
                    </div>
                  )}
                  <div className="flex border-b border-gray-700 pb-2">
                    <span className="text-gray-400 w-1/3">Status</span>
                    <span className="text-white w-2/3">{client.status}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-400 w-1/3">Advocate Status</span>
                    <span className="text-white w-2/3">{client.adv_status || "Inactive"}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                    />
                  </svg>
                  Bank Details ({client.banks?.length || 0} accounts)
                </h3>
                {client.banks && client.banks.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {client.banks.map((bank, index) => (
                      <div key={bank.id} className="rounded-lg bg-gray-900/50 p-4 border border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-white font-semibold">{bank.bankName}</h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 bg-purple-900/40 text-purple-300 rounded">
                              {bank.loanType}
                            </span>
                            {bank.settled && (
                              <span className="text-xs px-2 py-1 bg-green-800/40 text-green-200 rounded-full">
                                Settled
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Account Number</p>
                            <p className="text-gray-200 font-mono text-xs">{bank.accountNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Loan Amount</p>
                            <p className="text-gray-200 font-medium">{formatIndianCurrency(bank.loanAmount)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
                    No bank details available
                  </div>
                )}
              </div>

              {/* Notes & Remarks */}
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm md:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Notes & Queries
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.remarks && (
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                          />
                        </svg>
                        Remarks
                      </h4>
                      <div className="bg-gray-800/50 p-3 rounded text-gray-200 text-sm max-h-32 overflow-y-auto">
                        {client.remarks}
                      </div>
                    </div>
                  )}
                  {client.salesNotes && (
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Sales Notes
                      </h4>
                      <div className="bg-gray-800/50 p-3 rounded text-gray-200 text-sm max-h-32 overflow-y-auto">
                        {client.salesNotes}
                      </div>
                    </div>
                  )}
                  {client.queries && (
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Queries
                      </h4>
                      <div className="bg-gray-800/50 p-3 rounded text-gray-200 text-sm max-h-32 overflow-y-auto">
                        {client.queries}
                      </div>
                    </div>
                  )}
                  {!client.remarks && !client.salesNotes && !client.queries && (
                    <div className="md:col-span-2 flex items-center justify-center h-32 text-gray-400 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
                      No notes or queries available
                    </div>
                  )}
                </div>
              </div>

              {/* Document Section */}
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm md:col-span-2 mt-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  Client Documents
                  <div className="ml-auto flex gap-2">
                    {client.request_letter && (
                      <span className="px-2 py-1 bg-green-800/30 text-green-300 rounded text-xs">
                        Request Letter Enabled
                      </span>
                    )}
                    {client.sentAgreement && (
                      <span className="px-2 py-1 bg-blue-800/30 text-blue-300 rounded text-xs">Agreement Sent</span>
                    )}
                  </div>
                </h3>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  {/* View Uploaded Agreement */}
                  {client.documentUrl && (
                    <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            {client.documentName || "Client Agreement"}
                          </p>
                          {client.documentUploadedAt && (
                            <p className="text-sm text-gray-400 mt-1">
                              Uploaded on: {new Date(client.documentUploadedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => openDocumentViewer(client.documentUrl, client.documentName || "Client Agreement")}
                          className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View Agreement
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Document List Section */}
                  {client.documents && client.documents.length > 0 ? (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-purple-300 mb-2">
                        Generated Documents ({client.documents.length})
                      </h4>
                      <div className="bg-gray-800/50 rounded-lg divide-y divide-gray-700">
                        {client.documents.map((doc, index) => (
                          <div key={index} className="p-3 flex justify-between items-center">
                            <div>
                              <p className="text-white text-sm font-medium">
                                {doc.type === "request_letter"
                                  ? "Request Letter"
                                  : doc.type === "demand_notice"
                                    ? "Demand Notice"
                                    : doc.type === "legal_notice"
                                      ? "Legal Notice"
                                      : doc.type === "harassment_complaint"
                                        ? "Harassment Complaint"
                                        : "Document"}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                {doc.bankName && (
                                  <span className="px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-xs">
                                    {doc.bankName}
                                  </span>
                                )}
                                {doc.accountType && (
                                  <span className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs">
                                    {doc.accountType}
                                  </span>
                                )}
                                {doc.createdAt && (
                                  <span className="text-xs text-gray-500">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                                {doc.lastEdited && (
                                  <span className="text-xs text-green-500">
                                    Edited: {new Date(doc.lastEdited).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openDocumentViewer(doc.url, doc.name)}
                                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded flex items-center"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                View
                              </button>
                              {doc.htmlUrl && (
                                <button
                                  onClick={() => openDocumentViewer(doc.htmlUrl, doc.name?.replace(".docx", ".html"))}
                                  className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-gray-200 text-xs rounded flex items-center"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                    />
                                  </svg>
                                  HTML
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (doc.url && doc.name && client) {
                                    openDocumentEditor(doc.url, doc.name, index, client.id)
                                  } else {
                                    toast.error("Document URL, name, or client ID is missing")
                                  }
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-gray-200 text-xs rounded flex items-center"
                                disabled={!doc.url || !doc.name || !client}
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Document Generation Actions */}
                  <div className={client.documents && client.documents.length > 0 ? "pt-3 border-t border-gray-700" : ""}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <p className="text-white font-medium">Generate New Documents</p>
                        <p className="text-xs text-gray-400 mt-1">Create legal documents for this client</p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
                        <button
                          onClick={() => openRequestLetterModal(client)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Request Letter
                        </button>
                        <button
                          onClick={() => openDemandNoticeModal(client)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          Demand Notice
                        </button>
                        <button
                          onClick={() => openLegalNoticeModal(client)}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Legal Notice
                        </button>
                        {client.source_database === "billcut" && (
                          <button
                            onClick={() => openBillCutDocument(client)}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            BillCut Agreement
                          </button>
                        )}
                        <button
                          onClick={() => openHarassmentComplaintModal(client)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Harassment Complaint
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* WATI Templates Section */}
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm md:col-span-2 mt-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FaWhatsapp className="w-5 h-5 mr-2 text-green-400" />
                  WhatsApp Communication
                  <div className="ml-auto relative overflow-visible">
                    <button
                      onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
                      disabled={isSendingWhatsApp}
                      className={`px-3 py-2 rounded transition-colors duration-200 flex items-center ${
                        isSendingWhatsApp
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : showWhatsAppMenu
                          ? "bg-green-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                      title="Send WhatsApp message"
                    >
                      {isSendingWhatsApp ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      ) : (
                        <FaEllipsisV className="w-4 h-4 mr-2" />
                      )}
                      Templates
                    </button>

                    {/* WATI Menu Dropdown */}
                    {showWhatsAppMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50" ref={menuRef}>
                        <div className="p-3 border-b border-gray-700">
                          <div className="flex items-center space-x-2">
                            <FaWhatsapp className="text-green-400" />
                            <span className="text-sm font-medium text-gray-200">WhatsApp Templates</span>
                          </div>
                        </div>
                        <div className="py-2">
                          {whatsappTemplates.map((template, index) => (
                            <button
                              key={index}
                              onClick={() => handleTemplateSelect(template.templateName)}
                              disabled={isSendingWhatsApp}
                              className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="text-sm font-medium text-gray-200">{template.name}</div>
                              <div className="text-xs text-gray-400 mt-1">{template.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </h3>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <p className="text-white font-medium">Send WhatsApp Messages</p>
                      <p className="text-xs text-gray-400 mt-1">Send pre-defined templates to client</p>
                    </div>
                    <div className="text-sm text-gray-300">
                      <p>Primary: {client.phone ? formatIndianPhoneNumber(client.phone) : "Not available"}</p>
                      {client.altPhone && (
                        <p>Alternate: {formatIndianPhoneNumber(client.altPhone)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone Selection Modal */}
      {showPhoneSelectionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Select Phone Number</h2>
              <button
                onClick={() => setShowPhoneSelectionModal(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300 text-sm mb-4">
                Choose which phone number to send the WhatsApp message to:
              </p>
              
              <div className="space-y-3">
                {client.phone && (
                  <button
                    onClick={() => handlePhoneSelection(client.phone)}
                    disabled={isSendingWhatsApp}
                    className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-left">
                      <div className="text-white font-medium">Primary Phone</div>
                      <div className="text-gray-400 text-sm">{formatIndianPhoneNumber(client.phone)}</div>
                    </div>
                  </button>
                )}
                
                {client.altPhone && (
                  <button
                    onClick={() => handlePhoneSelection(client.altPhone)}
                    disabled={isSendingWhatsApp}
                    className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-left">
                      <div className="text-white font-medium">Alternate Phone</div>
                      <div className="text-gray-400 text-sm">{formatIndianPhoneNumber(client.altPhone)}</div>
                    </div>
                  </button>
                )}
              </div>
              
              {!client.phone && !client.altPhone && (
                <div className="text-center text-gray-400 py-8">
                  No phone numbers available for this client
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </>
  )
}
