"use client"

import { useEffect, useState, Suspense } from "react"
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  orderBy,
  serverTimestamp,
  limit,
} from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { Spinner } from "@/components/ui/spinner"
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar"
import ClientEditModal from "@/components/clients/ClientEditModal"
import toast, { Toaster } from "react-hot-toast"
import RequestLetterForm from "./requestletter"
import DemandNoticeForm from "./demandnotice"
import ComplaintForHarassmentForm from "./cfhab"
import { useSearchParams } from "next/navigation"
import DocumentEditor from "./DocumentEditor"

interface Bank {
  id: string
  bankName: string
  accountNumber: string
  loanType: string
  loanAmount: string
  settled: boolean
}

interface Client {
  id: string
  name: string
  phone: string
  altPhone: string
  email: string
  city: string
  alloc_adv: string
  assignedTo: string
  status: string
  personalLoanDues: string
  creditCardDues: string
  banks: Bank[]
  monthlyIncome?: string
  monthlyFees?: string
  occupation?: string
  startDate?: any // Firestore Timestamp or string
  tenure?: string
  remarks?: string
  salesNotes?: string
  queries?: string
  alloc_adv_at?: any
  convertedAt?: any
  createdAt?: any // Added createdAt field
  adv_status?: string
  isPrimary: boolean
  isSecondary: boolean
  documentUrl?: string
  documentName?: string
  documentUploadedAt?: any
  source_database?: string
  request_letter?: boolean
  documents?: {
    type: string
    bankName?: string
    accountType?: string
    createdAt?: string
    url?: string
    name?: string
    lastEdited?: string
  }[]
}

interface RemarkHistory {
  remark: string
  timestamp: any // Firestore Timestamp
  advocateName: string
}

function formatIndianCurrency(amount: string | number | undefined): string {
  if (!amount) return "—"

  // Convert to string if it's not already a string
  const amountStr = typeof amount === "string" ? amount : String(amount)

  // Remove any existing currency symbols or non-numeric characters except decimal point
  const numericValue = amountStr.replace(/[^\d.]/g, "")

  // Format with ₹ symbol and thousands separators (e.g., ₹1,50,000)
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  return formatter.format(Number(numericValue))
}

function formatIndianPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, "")

  // Check if it's a 10-digit number without country code
  if (digits.length === 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`
  }

  // If it already has country code (usually 12 digits with 91)
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits.substring(0, 2)} ${digits.substring(2, 7)} ${digits.substring(7)}`
  }

  // Return the original if it doesn't match expected patterns
  return phone
}

function formatIndianDate(date: any): string {
  if (!date) return "Not specified"

  if (date.toDate && typeof date.toDate === "function") {
    const dateObj = date.toDate()
    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) // DD-MM-YYYY format
  }

  // If it's a string already, try to format it
  if (typeof date === "string") {
    // Try to parse and format if it's a date string
    const dateObj = new Date(date)
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }
    return date
  }

  return "Not specified"
}

// Helper function to get week number based on day of month from startDate
function getWeekFromStartDate(startDate: any): number {
  if (!startDate) return 0

  let dateObj: Date

  if (startDate.toDate && typeof startDate.toDate === "function") {
    dateObj = startDate.toDate()
  } else if (typeof startDate === "string") {
    dateObj = new Date(startDate)
  } else if (startDate instanceof Date) {
    dateObj = startDate
  } else {
    return 0
  }

  if (isNaN(dateObj.getTime())) return 0

  const dayOfMonth = dateObj.getDate()

  if (dayOfMonth >= 1 && dayOfMonth <= 7) return 1
  if (dayOfMonth >= 8 && dayOfMonth <= 14) return 2
  if (dayOfMonth >= 15 && dayOfMonth <= 21) return 3
  if (dayOfMonth >= 22 && dayOfMonth <= 31) return 4

  return 0
}

// Helper function to get week label
function getWeekLabel(weekNumber: number): string {
  switch (weekNumber) {
    case 1:
      return "Week 1 (1-7)"
    case 2:
      return "Week 2 (8-14)"
    case 3:
      return "Week 3 (15-21)"
    case 4:
      return "Week 4 (22-31)"
    default:
      return "Unknown Week"
  }
}

function ClientViewModal({
  client,
  isOpen,
  onClose,
  openDocumentViewer,
  openRequestLetterModal,
  openLegalNoticeModal,
  openDemandNoticeModal,
  openHarassmentComplaintModal,
  openDocumentEditor,
}: {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  openDocumentViewer: (url?: string, name?: string) => void
  openRequestLetterModal: (client: Client) => void
  openLegalNoticeModal: (client: Client) => void
  openDemandNoticeModal: (client: Client) => void
  openHarassmentComplaintModal: (client: Client) => void
  openDocumentEditor: (url: string, name: string, index: number, clientId: string) => void
}) {
  if (!isOpen || !client) return null

  // Animation when modal opens
  return (
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
                    client.status === "Converted" ? "bg-green-800 text-green-200" : "bg-blue-800 text-blue-200"
                  }`}
                >
                  {client.status}
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
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
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
                  <svg
                    className="w-4 h-4 mr-1 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
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
                  <svg
                    className="w-4 h-4 mr-1 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
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
              {client.createdAt && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm font-medium">Created:</span>
                  <span className="text-white">{formatIndianDate(client.createdAt)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm font-medium">Assigned At:</span>
                <span className="text-white">{formatIndianDate(client.alloc_adv_at)}</span>
              </div>
              {client.startDate && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm font-medium">Joining Date:</span>
                  <span className="text-white">{formatIndianDate(client.startDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Financial Overview - Highlighted Summary */}
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
                <span className="text-xs text-gray-400 mb-1">Monthly Fees</span>
                <span className="text-xl font-bold text-purple-300">{formatIndianCurrency(client.monthlyFees)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal & Professional */}
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
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
                  <span className="text-gray-400 w-1/3">Alternate Phone</span>
                  <span className="text-white w-2/3">{(client.altPhone) || "Not specified"}</span>
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
                  <span className="text-gray-400 w-1/3">Occupation</span>
                  <span className="text-white w-2/3">{client.occupation || "Not specified"}</span>
                </div>
                <div className="flex border-b border-gray-700 pb-2">
                  <span className="text-gray-400 w-1/3">Source</span>
                  <span className="text-white w-2/3">{client.source_database || "Not specified"}</span>
                </div>
                <div className="flex border-b border-gray-700 pb-2">
                  <span className="text-gray-400 w-1/3">Salesperson</span>
                  <span className="text-white w-2/3">{client.assignedTo}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-1/3">Tenure</span>
                  <span className="text-white w-2/3">
                    {client.tenure ? `${client.tenure} months` : "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                  />
                </svg>
                Bank Details
              </h3>

              {client.banks && client.banks.length > 0 ? (
                <div className="space-y-4">
                  {client.banks.map((bank, index) => (
                    <div
                      key={bank.id}
                      className={`rounded-lg bg-gray-900/50 p-4 ${index !== client.banks.length - 1 ? "mb-3" : ""}`}
                    >
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
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400 mb-1">Account Number</p>
                          <p className="text-gray-200 font-mono">{bank.accountNumber}</p>
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
                <svg
                  className="w-5 h-5 mr-2 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Notes & Queries
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {client.remarks && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
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
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
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
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
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
                  <div className="md:col-span-3 flex items-center justify-center h-32 text-gray-400 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
                    No notes or queries available
                  </div>
                )}
              </div>
            </div>

            {/* Document Section - Add this after Notes & Remarks */}
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm md:col-span-2 mt-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                Client Documents
              </h3>

              <div className="bg-gray-900/50 rounded-lg p-4">
                {/* Document List Section */}
                {client.documents && client.documents.length > 0 ? (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-purple-300 mb-2">Saved Documents</h4>
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
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
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
                            <button
                              onClick={() => {
                                // Only open editor if both URL and name are defined
                                if (doc.url && doc.name && client) {
                                  console.log("Calling openDocumentEditor with:", {
                                    url: doc.url,
                                    name: doc.name,
                                    index,
                                    clientId: client.id,
                                  })
                                  openDocumentEditor(doc.url, doc.name, index, client.id)
                                } else {
                                  toast.error("Document URL, name, or client ID is missing")
                                  console.error("Missing data:", { url: doc.url, name: doc.name, clientId: client?.id })
                                }
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-gray-200 text-xs rounded flex items-center"
                              disabled={!doc.url || !doc.name || !client}
                            >
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
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

                {/* Original Document Section */}
                <div className={client.documents && client.documents.length > 0 ? "pt-3 border-t border-gray-700" : ""}>
                  {client.documentUrl ? (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <p className="text-white font-medium">{client.documentName || "Client Document"}</p>
                        {client.documentUploadedAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            Uploaded:{" "}
                            {typeof client.documentUploadedAt === "object" && client.documentUploadedAt.toDate
                              ? client.documentUploadedAt.toDate().toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Unknown date"}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
                        <button
                          onClick={() => openDocumentViewer(client.documentUrl, client.documentName || "Document")}
                          className="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
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
                          View Document
                        </button>
                        <button
                          onClick={() => openRequestLetterModal(client)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
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
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
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
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Legal Notice
                        </button>
                        <button
                          onClick={() => openHarassmentComplaintModal(client)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
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
                  ) : (
                    <div className="flex flex-col md:flex-row justify-between items-center">
                      <p className="text-gray-400 mb-4 md:mb-0">No original document uploaded for this client.</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openRequestLetterModal(client)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
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
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
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
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Legal Notice
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS for animations */}
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
    </div>
  )
}

// Legal Notice Form Component - placeholder implementation
function LegalNoticeForm({ client, onClose }: { client: Client; onClose: () => void }) {
  // Similar implementation to RequestLetterForm
  // This is a placeholder - you would customize this for the legal notice fields

  return (
    <div className="text-center py-8">
      <p className="text-white mb-4">Legal Notice form will be implemented here</p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
      >
        Close
      </button>
    </div>
  )
}

function isNewClient(startDate: any): boolean {
  if (!startDate) return false

  let dateObj: Date
  if (startDate.toDate && typeof startDate.toDate === "function") {
    dateObj = startDate.toDate()
  } else if (typeof startDate === "string") {
    dateObj = new Date(startDate)
  } else if (startDate instanceof Date) {
    dateObj = startDate
  } else {
    return false
  }

  if (isNaN(dateObj.getTime())) return false

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return dateObj >= oneWeekAgo
}

// Create a client component for the filtered list
function ClientsList() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [advocateName, setAdvocateName] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [assignmentFilter, setAssignmentFilter] = useState<string>("primary")
  const [cityFilter, setCityFilter] = useState<string>("all")
  const [weekFilter, setWeekFilter] = useState<string>("all") // Week filter state
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false)
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState("")
  const [viewingDocumentName, setViewingDocumentName] = useState("")
  const [isRequestLetterModalOpen, setIsRequestLetterModalOpen] = useState(false)
  const [isLegalNoticeModalOpen, setIsLegalNoticeModalOpen] = useState(false)
  const [selectedClientForDoc, setSelectedClientForDoc] = useState<Client | null>(null)
  const [isDemandNoticeModalOpen, setIsDemandNoticeModalOpen] = useState(false)
  const [isHarassmentComplaintModalOpen, setIsHarassmentComplaintModalOpen] = useState(false)
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedClientHistory, setSelectedClientHistory] = useState<RemarkHistory[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [latestRemarks, setLatestRemarks] = useState<{ [key: string]: string }>({})
  const [requestLetterStates, setRequestLetterStates] = useState<{ [key: string]: boolean }>({})
  const [editingDocument, setEditingDocument] = useState<{
    url: string
    name: string
    index: number
    clientId?: string // Add clientId to the state
  } | null>(null)

  const searchParams = useSearchParams()

  useEffect(() => {
    // Get the advocate name from localStorage
    if (typeof window !== "undefined") {
      const userName = localStorage.getItem("userName")
      setAdvocateName(userName || "")

      // Check for status filter in URL
      const status = searchParams.get("status")
      if (status && ["Active", "Dropped", "Not Responding"].includes(status)) {
        setStatusFilter(status)
      }
    }
  }, [searchParams])

  useEffect(() => {
    async function fetchClients() {
      if (!advocateName) return

      setLoading(true)
      try {
        const clientsRef = collection(db, "clients")

        const primaryQuery = query(clientsRef, where("alloc_adv", "==", advocateName))
        const secondaryQuery = query(clientsRef, where("alloc_adv_secondary", "==", advocateName))

        const [primarySnapshot, secondarySnapshot] = await Promise.all([getDocs(primaryQuery), getDocs(secondaryQuery)])

        const clientsList: Client[] = []

        primarySnapshot.forEach((doc) => {
          const clientData = doc.data()
          clientsList.push({
            id: doc.id,
            ...clientData,
            isPrimary: true,
            isSecondary: false,
          } as Client)

          // Initialize request letter states
          setRequestLetterStates((prev) => ({
            ...prev,
            [doc.id]: clientData.request_letter || false,
          }))
        })

        secondarySnapshot.forEach((doc) => {
          const clientData = doc.data()
          const existingIndex = clientsList.findIndex((c) => c.id === doc.id)

          if (existingIndex >= 0) {
            clientsList[existingIndex].isSecondary = true
            // Initialize request letter states for existing clients (both primary and secondary)
            setRequestLetterStates((prev) => ({
              ...prev,
              [doc.id]: clientData.request_letter || false,
            }))
          } else {
            clientsList.push({
              id: doc.id,
              ...clientData,
              isPrimary: false,
              isSecondary: true,
            } as Client)
            // Initialize request letter states for new secondary clients
            setRequestLetterStates((prev) => ({
              ...prev,
              [doc.id]: clientData.request_letter || false,
            }))
          }
        })

        setClients(clientsList)

        // Fetch latest remarks for all clients
        await Promise.all(clientsList.map((client) => fetchLatestRemark(client.id)))
      } catch (error) {
        console.error("Error fetching clients:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [advocateName])

  const handleViewDetails = (client: Client) => {
    setViewClient(client)
    setIsViewModalOpen(true)
  }

  const closeViewModal = () => {
    setIsViewModalOpen(false)
    setViewClient(null)
  }

  const handleEditClient = (client: Client) => {
    setEditClient(client)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditClient(null)
  }

  const handleClientUpdated = (updatedClient: Client) => {
    // Update the clients array with the updated client
    setClients((prevClients) => prevClients.map((client) => (client.id === updatedClient.id ? updatedClient : client)))

    // If the view modal is also open for this client, update that as well
    if (viewClient?.id === updatedClient.id) {
      setViewClient(updatedClient)
    }
  }

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    try {
      const clientRef = doc(db, "clients", clientId)
      await updateDoc(clientRef, {
        adv_status: newStatus,
      })

      // Update local state
      setClients((prevClients) =>
        prevClients.map((client) => (client.id === clientId ? { ...client, adv_status: newStatus } : client)),
      )

      // Also update viewClient if the modal is open
      if (viewClient?.id === clientId) {
        setViewClient((prev) => (prev ? { ...prev, adv_status: newStatus } : null))
      }

      // Show success toast
      toast.success(`Client status updated to ${newStatus}`)
    } catch (error) {
      console.error("Error updating client status:", error)
      toast.error("Failed to update client status")
    }
  }

  const openDocumentViewer = (url?: string, name?: string) => {
    if (!url) return
    setViewingDocumentUrl(url)
    setViewingDocumentName(name || "Document")
    setIsDocViewerOpen(true)
  }

  const openRequestLetterModal = (client: Client) => {
    // Both primary and secondary advocates can generate request letters
    setSelectedClientForDoc(client)
    setIsRequestLetterModalOpen(true)
  }

  const openLegalNoticeModal = (client: Client) => {
    setSelectedClientForDoc(client)
    setIsLegalNoticeModalOpen(true)
  }

  const openDemandNoticeModal = (client: Client) => {
    console.log("Opening demand notice modal for client:", client.name)
    setSelectedClientForDoc(client)
    setIsDemandNoticeModalOpen(true)
  }

  const openHarassmentComplaintModal = (client: Client) => {
    console.log("Opening harassment complaint modal for client:", client.name)
    setSelectedClientForDoc(client)
    setIsHarassmentComplaintModalOpen(true)
  }

  const handleRemarkChange = (clientId: string, value: string) => {
    setRemarks((prev) => ({ ...prev, [clientId]: value }))
  }

  const handleSaveRemark = async (clientId: string) => {
    try {
      const advocateName = localStorage.getItem("userName") || "Unknown Advocate"
      const remarkText = remarks[clientId]?.trim()

      if (!remarkText) {
        toast.error("Please enter a remark before saving")
        return
      }

      const historyRef = collection(db, "clients", clientId, "history")
      await addDoc(historyRef, {
        remark: remarkText,
        timestamp: serverTimestamp(),
        advocateName,
      })

      // Update latest remarks
      setLatestRemarks((prev) => ({ ...prev, [clientId]: remarkText }))

      // Clear the input after saving
      setRemarks((prev) => ({ ...prev, [clientId]: remarkText }))
      toast.success("Remark saved successfully")
    } catch (error) {
      console.error("Error saving remark:", error)
      toast.error("Failed to save remark")
    }
  }

  const handleViewHistory = async (clientId: string) => {
    try {
      const historyRef = collection(db, "clients", clientId, "history")
      const q = query(historyRef, orderBy("timestamp", "desc"))
      const snapshot = await getDocs(q)

      const history = snapshot.docs.map(
        (doc) =>
          ({
            ...doc.data(),
          }) as RemarkHistory,
      )

      setSelectedClientHistory(history)
      setSelectedClientId(clientId)
      setIsHistoryModalOpen(true)
    } catch (error) {
      console.error("Error fetching history:", error)
      toast.error("Failed to fetch history")
    }
  }

  const handleRequestLetterChange = async (clientId: string, checked: boolean) => {
    try {
      // Update local state first
      setRequestLetterStates((prev) => ({
        ...prev,
        [clientId]: checked,
      }))

      // Update in Firebase - both primary and secondary advocates can update request letter status
      const clientRef = doc(db, "clients", clientId)
      await updateDoc(clientRef, {
        request_letter: checked,
      })

      // Success notification
      toast.success(`Request letter status ${checked ? "enabled" : "disabled"}`)
    } catch (error) {
      console.error("Error updating request letter status:", error)

      // Revert local state on error
      setRequestLetterStates((prev) => ({
        ...prev,
        [clientId]: !checked,
      }))

      toast.error("Failed to update request letter status")
    }
  }

  const getFilteredClients = () => {
    return clients
      .filter((client) => {
        const matchesSearch =
          searchQuery === "" ||
          client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.phone.includes(searchQuery) ||
          client.email.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus =
          statusFilter === "all" ||
          client.adv_status === statusFilter ||
          (!client.adv_status && statusFilter === "Active")

        const matchesSource = sourceFilter === "all" || client.source_database === sourceFilter

        const matchesAssignment =
          assignmentFilter === "all" ||
          (assignmentFilter === "primary" && client.isPrimary) ||
          (assignmentFilter === "secondary" && client.isSecondary) ||
          (assignmentFilter === "both" && client.isPrimary && client.isSecondary)

        const matchesCity = cityFilter === "all" || client.city === cityFilter

        // Updated week filter logic to use startDate
        const matchesWeek =
          weekFilter === "all" ||
          (() => {
            const clientWeek = getWeekFromStartDate(client.startDate)
            return clientWeek.toString() === weekFilter
          })()

        return matchesSearch && matchesStatus && matchesSource && matchesAssignment && matchesCity && matchesWeek
      })
      .sort((a, b) => {
        // Sort by startDate instead of createdAt
        const dateA = typeof a.startDate === 'string' ? new Date(a.startDate).getTime() : a.startDate?.toMillis?.() || 0
        const dateB = typeof b.startDate === 'string' ? new Date(b.startDate).getTime() : b.startDate?.toMillis?.() || 0
        return dateB - dateA // Sort in descending order (latest first)
      })
  }

  const getUniqueCities = () => {
    const cities = clients.map((client) => client.city).filter(Boolean)
    return Array.from(new Set(cities)).sort()
  }

  const getUniqueSources = () => {
    const sources = clients.map((client) => client.source_database).filter(Boolean)
    return Array.from(new Set(sources)).sort()
  }

  const fetchLatestRemark = async (clientId: string) => {
    try {
      const historyRef = collection(db, "clients", clientId, "history")
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(1))
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const latestRemark = snapshot.docs[0].data().remark
        setLatestRemarks((prev) => ({ ...prev, [clientId]: latestRemark }))
        setRemarks((prev) => ({ ...prev, [clientId]: latestRemark }))
      }
    } catch (error) {
      console.error("Error fetching latest remark:", error)
    }
  }

  // Get week statistics for display
  const getWeekStats = () => {
    const filteredClients = getFilteredClients()
    const stats = {
      week1: 0,
      week2: 0,
      week3: 0,
      week4: 0,
      unknown: 0,
    }

    filteredClients.forEach((client) => {
      const week = getWeekFromStartDate(client.startDate)
      switch (week) {
        case 1:
          stats.week1++
          break
        case 2:
          stats.week2++
          break
        case 3:
          stats.week3++
          break
        case 4:
          stats.week4++
          break
        default:
          stats.unknown++
      }
    })

    return stats
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      )
    }

    const filteredClients = getFilteredClients()
    const uniqueCities = getUniqueCities()
    const uniqueSources = getUniqueSources()

    const weekStats = getWeekStats()

    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4 text-white">My Clients ({clients.length})</h1>

        {/* Search and Filters Section */}
        <div className="mb-4 bg-gray-800 p-3 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Bar */}
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <svg
                    className="w-3 h-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-8 pr-2 py-1.5 border-0 rounded-md bg-gray-700 text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Dropped">Dropped</option>
                <option value="Not Responding">Not Responding</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="all">All Sources</option>
                {uniqueSources.map((source) => (
                  <option key={source} value={source}>
                    {source === "credsettlee"
                      ? "Cred Settle"
                      : source === "ama"
                        ? "AMA"
                        : source === "settleloans"
                          ? "Settle Loans"
                          : source === "billcut"
                            ? "Bill Cut"
                            : source}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Second Row for Assignment Filter, Week Filter and City Filter */}
          <div className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Assignment Filter */}
              <div>
                <select
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">All Assignments</option>
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="both">Primary & Secondary</option>
                </select>
              </div>

              {/* Week Filter */}
              <div>
                <select
                  value={weekFilter}
                  onChange={(e) => setWeekFilter(e.target.value)}
                  className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">All Weeks</option>
                  <option value="1">Week 1 (1-7) - {weekStats.week1} clients</option>
                  <option value="2">Week 2 (8-14) - {weekStats.week2} clients</option>
                  <option value="3">Week 3 (15-21) - {weekStats.week3} clients</option>
                  <option value="4">Week 4 (22-31) - {weekStats.week4} clients</option>
                </select>
              </div>

              {/* City Filter */}
              <div>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">All Cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Stats */}
              <div className="flex items-end">
                <div className="text-gray-400 text-xs">
                  Showing <span className="text-white font-medium">{filteredClients.length}</span> of{" "}
                  <span className="text-white font-medium">{clients.length}</span> clients
                  {searchQuery && <span> • Search: "{searchQuery}"</span>}
                  {(statusFilter !== "all" ||
                    sourceFilter !== "all" ||
                    assignmentFilter !== "all" ||
                    cityFilter !== "all" ||
                    weekFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSearchQuery("")
                        setStatusFilter("all")
                        setSourceFilter("all")
                        setAssignmentFilter("all")
                        setCityFilter("all")
                        setWeekFilter("all")
                      }}
                      className="ml-2 text-purple-400 hover:text-purple-300 focus:outline-none"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="text-center p-6 bg-gray-800 rounded-lg">
            <p className="text-gray-300 text-sm">No clients match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-gray-800 shadow-md rounded-lg text-sm">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Request Letter
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Remarks
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredClients.map((client) => {
                  const clientWeek = getWeekFromStartDate(client.startDate)
                  return (
                    <tr key={client.id} className="hover:bg-gray-700">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-200 text-xs">
                        {formatIndianDate(client.startDate)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            clientWeek === 1
                              ? "bg-green-800 text-green-200"
                              : clientWeek === 2
                                ? "bg-blue-800 text-blue-200"
                                : clientWeek === 3
                                  ? "bg-yellow-800 text-yellow-200"
                                  : clientWeek === 4
                                    ? "bg-purple-800 text-purple-200"
                                    : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {clientWeek > 0 ? getWeekLabel(clientWeek) : "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-200 text-xs">
                        <div className="flex items-center">
                          {client.name}
                          {isNewClient(client.startDate) && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-green-900/60 text-green-300 rounded-full text-xs font-medium animate-pulse">
                              New
                            </span>
                          )}
                        </div>
                        <div className="text-xs mb-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
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
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-gray-200 text-xs">{formatIndianPhoneNumber(client.phone)}</div>
                        <div className="text-xs text-gray-400">{client.email}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-200 text-xs">{client.city}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {client.isPrimary && client.isSecondary ? (
                          <span className="px-1.5 py-0.5 bg-purple-800 text-purple-200 rounded-full text-xs font-medium">
                            Primary & Secondary
                          </span>
                        ) : client.isPrimary ? (
                          <span className="px-1.5 py-0.5 bg-blue-800 text-blue-200 rounded-full text-xs font-medium">
                            Primary
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                            Secondary
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <select
                          value={client.adv_status || "Active"}
                          onChange={(e) => handleStatusChange(client.id, e.target.value)}
                          className={`px-1.5 py-1 rounded text-xs font-medium border-0 focus:ring-1 focus:ring-opacity-50 ${
                            client.adv_status === "Active" || !client.adv_status
                              ? "bg-blue-800 text-blue-200 focus:ring-blue-500"
                              : client.adv_status === "Dropped"
                                ? "bg-red-800 text-red-200 focus:ring-red-500"
                                : client.adv_status === "Not Responding"
                                  ? "bg-yellow-800 text-yellow-200 focus:ring-yellow-500"
                                  : "bg-gray-800 text-gray-200 focus:ring-gray-500"
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="Dropped">Dropped</option>
                          <option value="Not Responding">Not Responding</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={requestLetterStates[client.id] || false}
                            onChange={(e) => handleRequestLetterChange(client.id, e.target.checked)}
                            className="w-4 h-4 rounded-sm text-purple-600 border-gray-600 bg-gray-700 focus:ring-purple-500 focus:ring-opacity-25"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col space-y-1.5">
                          <textarea
                            value={remarks[client.id] || ""}
                            onChange={(e) => handleRemarkChange(client.id, e.target.value)}
                            placeholder="Enter remark..."
                            className="w-full px-1.5 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs resize-none"
                            rows={2}
                          />
                          <div className="flex space-x-1.5">
                            <button
                              onClick={() => handleSaveRemark(client.id)}
                              className="px-2 py-0.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors duration-200"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => handleViewHistory(client.id)}
                              className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded transition-colors duration-200"
                            >
                              History
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => handleViewDetails(client)}
                            className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded transition-colors duration-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors duration-200"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Add a function to open the document editor
  const openDocumentEditor = (url: string, name: string, index: number, clientId: string) => {
    console.log("Opening document editor with:", { url, name, index, clientId })
    setEditingDocument({ url, name, index, clientId })
  }

  return (
    <div className="flex-1">
      {renderContent()}
      <ClientViewModal
        client={viewClient}
        isOpen={isViewModalOpen}
        onClose={closeViewModal}
        openDocumentViewer={openDocumentViewer}
        openRequestLetterModal={openRequestLetterModal}
        openLegalNoticeModal={openLegalNoticeModal}
        openDemandNoticeModal={openDemandNoticeModal}
        openHarassmentComplaintModal={openHarassmentComplaintModal}
        openDocumentEditor={openDocumentEditor}
      />
      <ClientEditModal
        client={editClient}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onClientUpdated={handleClientUpdated}
      />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#333",
            color: "#fff",
          },
          success: {
            duration: 3000,
            style: {
              background: "rgba(47, 133, 90, 0.9)",
            },
          },
          error: {
            duration: 3000,
            style: {
              background: "rgba(175, 45, 45, 0.9)",
            },
          },
        }}
      />

      {/* Add document viewer modal */}
      {isDocViewerOpen && viewingDocumentUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 w-[95vw] max-w-6xl h-[90vh] shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white flex items-center">{viewingDocumentName}</h3>
              <button
                onClick={() => setIsDocViewerOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-white rounded overflow-hidden">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocumentUrl)}&embedded=true`}
                className="w-full h-full border-0"
                title="Document Viewer"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Request Letter Modal */}
      {isRequestLetterModalOpen && selectedClientForDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white">Generate Request Letter</h2>
              <button
                onClick={() => setIsRequestLetterModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <RequestLetterForm client={selectedClientForDoc} onClose={() => setIsRequestLetterModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Legal Notice Modal */}
      {isLegalNoticeModalOpen && selectedClientForDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white">Generate Legal Notice</h2>
              <button
                onClick={() => setIsLegalNoticeModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <LegalNoticeForm client={selectedClientForDoc} onClose={() => setIsLegalNoticeModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Demand Notice Modal */}
      {isDemandNoticeModalOpen && selectedClientForDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white">Generate Demand Notice</h2>
              <button
                onClick={() => setIsDemandNoticeModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <DemandNoticeForm client={selectedClientForDoc} onClose={() => setIsDemandNoticeModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Harassment Complaint Modal */}
      {isHarassmentComplaintModalOpen && selectedClientForDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white">Complaint For Harassment Against Banks</h2>
              <button
                onClick={() => setIsHarassmentComplaintModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <ComplaintForHarassmentForm
              client={selectedClientForDoc}
              onClose={() => setIsHarassmentComplaintModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-2xl animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Remark History</h2>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedClientHistory.map((history, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-purple-400 font-medium">{history.advocateName}</span>
                    <span className="text-gray-400 text-sm">
                      {history.timestamp?.toDate?.()?.toLocaleString("en-IN") || "Unknown date"}
                    </span>
                  </div>
                  <p className="text-white">{history.remark}</p>
                </div>
              ))}

              {selectedClientHistory.length === 0 && (
                <div className="text-center text-gray-400 py-8">No remarks history available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Editor Modal */}
      {editingDocument && (
        <DocumentEditor
          documentUrl={editingDocument.url}
          documentName={editingDocument.name}
          documentIndex={editingDocument.index}
          clientId={editingDocument.clientId || viewClient?.id || ""}
          onClose={() => setEditingDocument(null)}
          onDocumentUpdated={() => {
            // Refresh client data after document update
            if (viewClient) {
              // Clone the viewClient to trigger a re-render
              setViewClient({ ...viewClient })
            }
          }}
        />
      )}
    </div>
  )
}

// Main page component
export default function AdvocateClientsPage() {
  return (
    <div className="flex bg-gray-900 min-h-screen">
      <AdvocateSidebar />
      <Suspense
        fallback={
          <div className="flex-1 flex justify-center items-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <ClientsList />
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#333",
            color: "#fff",
          },
          success: {
            duration: 3000,
            style: {
              background: "rgba(47, 133, 90, 0.9)",
            },
          },
          error: {
            duration: 3000,
            style: {
              background: "rgba(175, 45, 45, 0.9)",
            },
          },
        }}
      />
    </div>
  )
}
