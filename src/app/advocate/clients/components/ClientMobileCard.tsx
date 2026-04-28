"use client"

import { useState, useEffect, useRef } from "react"
import { FaEllipsisV, FaWhatsapp, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaHistory, FaEdit, FaEye, FaUserFriends, FaMoneyCheckAlt } from "react-icons/fa"
import {
  formatIndianDate,
  formatIndianPhoneNumber,
  getWeekFromStartDate,
  getWeekLabel,
  isNewClient,
} from "../utils/formatters"
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates"

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
  client_app_status?: {
    index: string;
    remarks: string;
    createdAt: number;
    createdBy: string;
  }[];
}

interface ClientMobileCardProps {
  client: Client
  requestLetterState: boolean
  latestRemark: string
  onStatusChange: (clientId: string, newStatus: string) => void
  onRequestLetterChange: (clientId: string, checked: boolean) => void
  onRemarkSave: (clientId: string, remark: string) => Promise<void>
  onAppStatusSave: (clientId: string, status: string, currentStatus: any[]) => void
  onViewHistory: (clientId: string) => void
  onViewAppStatusHistory: (client: Client) => void
  onViewDetails: (client: Client) => void
  onEditClient: (client: Client) => void
  onTemplateSelect: (templateName: string, client: Client) => void
  isSendingWhatsApp: boolean
}

export default function ClientMobileCard({
  client,
  requestLetterState,
  latestRemark,
  onStatusChange,
  onRequestLetterChange,
  onRemarkSave,
  onAppStatusSave,
  onViewHistory,
  onViewAppStatusHistory,
  onViewDetails,
  onEditClient,
  onTemplateSelect,
  isSendingWhatsApp,
}: ClientMobileCardProps) {
  const [remarkText, setRemarkText] = useState(latestRemark || "")
  const [isSaving, setIsSaving] = useState(false)
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const getLatestAppStatus = (statusArray?: any[]) => {
    if (!statusArray || statusArray.length === 0) return ""
    const sorted = [...statusArray].sort((a, b) => b.createdAt - a.createdAt)
    return sorted[0].remarks
  }

  const [appStatusText, setAppStatusText] = useState(getLatestAppStatus(client.client_app_status))

  useEffect(() => {
    setRemarkText(latestRemark || "")
  }, [latestRemark])

  useEffect(() => {
    setAppStatusText(getLatestAppStatus(client.client_app_status))
  }, [client.client_app_status])

  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates('advocate')

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

  const handleRemarkSave = async () => {
    if (isSaving) return;
    setIsSaving(true)
    try {
      await onRemarkSave(client.id, remarkText)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAppStatusSave = () => {
    onAppStatusSave(client.id, appStatusText, client.client_app_status || [])
  }

  const handleTemplateSelect = (templateName: string) => {
    onTemplateSelect(templateName, client)
    setShowWhatsAppMenu(false)
  }

  const clientWeek = getWeekFromStartDate(client.startDate)

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 mb-4 animate-fadeIn">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-lg leading-tight uppercase tracking-wide">{client.name}</h3>
              {isNewClient(client.startDate) && (
                <span className="px-1.5 py-0.5 bg-green-900/60 text-green-300 rounded text-[10px] font-bold animate-pulse">
                  NEW
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
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
                {client.source_database || "Other"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                clientWeek === 1 ? "bg-green-800 text-green-200" :
                clientWeek === 2 ? "bg-blue-800 text-blue-200" :
                clientWeek === 3 ? "bg-yellow-800 text-yellow-200" :
                clientWeek === 4 ? "bg-purple-800 text-purple-200" : "bg-gray-700 text-gray-300"
              }`}>
                {clientWeek > 0 ? getWeekLabel(clientWeek) : "N/A"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select
              value={client.adv_status || "Inactive"}
              onChange={(e) => onStatusChange(client.id, e.target.value)}
              className={`px-2 py-1 rounded text-[10px] font-bold border-0 focus:outline-none appearance-none cursor-pointer ${
                client.adv_status === "Active" ? "bg-blue-600 text-white" :
                client.adv_status === "Dropped" ? "bg-red-600 text-white" :
                client.adv_status === "On Hold" ? "bg-purple-600 text-white" :
                client.adv_status === "Renewal" ? "bg-cyan-600 text-white" :
                client.adv_status === "Not Responding" ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-200"
              }`}
            >
              <option value="Active">ACTIVE</option>
              <option value="Inactive">INACTIVE</option>
              <option value="Dropped">DROPPED</option>
              <option value="Not Responding">N/R</option>
              <option value="On Hold">HOLD</option>
              <option value="Renewal">RENEWAL</option>
            </select>
            <span className="text-[10px] text-gray-400 font-medium">{formatIndianDate(client.startDate)}</span>
          </div>
        </div>
      </div>

      {/* Quick Contact & Info */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="flex items-start gap-2">
          <div className="mt-1 bg-indigo-900/50 p-1.5 rounded-lg text-indigo-400">
             <FaPhone className="text-xs" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Phone</p>
            <p className="text-xs text-gray-200 font-medium">{formatIndianPhoneNumber(client.phone)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
           <div className="mt-1 bg-purple-900/50 p-1.5 rounded-lg text-purple-400">
             <FaMapMarkerAlt className="text-xs" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">City</p>
            <p className="text-xs text-gray-200 font-medium">{client.city || "—"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
           <div className="mt-1 bg-amber-900/50 p-1.5 rounded-lg text-amber-400">
             <FaUserFriends className="text-xs" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Assignment</p>
            <p className="text-xs text-gray-200 font-medium">
              {client.isPrimary && client.isSecondary ? "P & S" : client.isPrimary ? "PRIMARY" : "SECONDARY"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
           <div className="mt-1 bg-green-900/50 p-1.5 rounded-lg text-green-400">
             <FaMoneyCheckAlt className="text-xs" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Monthly Fees</p>
            <p className="text-xs text-gray-200 font-medium">{client.source_database !== "billcut" ? (client.monthlyFees || "—") : "—"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 col-span-2">
           <div className="mt-1 bg-blue-900/50 p-1.5 rounded-lg text-blue-400">
             <FaEnvelope className="text-xs" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Email</p>
            <p className="text-xs text-gray-200 font-medium truncate">{client.email || "—"}</p>
          </div>
        </div>
      </div>

      {/* Collapsible Actions & Editing */}
      <div className="bg-gray-900/30 p-4 border-t border-gray-700/50 flex flex-col gap-4">
        {/* Remarks Section */}
        <div>
          <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 block flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
             Advocate Remarks
          </label>
          <div className="flex flex-col gap-2">
            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="Add your remarks here..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 resize-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={handleRemarkSave}
                disabled={isSaving}
                className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>SAVE REMARK</>
                )}
              </button>
              <button
                onClick={() => onViewHistory(client.id)}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                HISTORY
              </button>
            </div>
          </div>
        </div>

        {/* App Status Section */}
        <div>
          <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 block flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
             Application Status
          </label>
          <div className="flex flex-col gap-2">
            <textarea
              value={appStatusText}
              onChange={(e) => setAppStatusText(e.target.value)}
              placeholder="Status on app..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAppStatusSave}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 uppercase"
              >
                Save App Status
              </button>
              <button
                onClick={() => onViewAppStatusHistory(client)}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1.5 uppercase"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 bg-gray-800 border-t border-gray-700 flex justify-between items-center gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(client)}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all active:scale-95 shadow-lg"
            title="View Details"
          >
            <FaEye className="text-sm" />
          </button>
          <button
            onClick={() => onEditClient(client)}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all active:scale-95 shadow-lg"
            title="Edit Client"
          >
            <FaEdit className="text-sm" />
          </button>
        </div>

        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Req Letter</p>
                <input
                type="checkbox"
                checked={requestLetterState}
                onChange={(e) => onRequestLetterChange(client.id, e.target.checked)}
                className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-bg-gray-800"
                />
            </div>

            <div className="relative" ref={menuRef}>
                <button
                onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
                disabled={isSendingWhatsApp || templatesLoading}
                className={`p-2 rounded-lg transition-all flex items-center justify-center shadow-lg ${
                    isSendingWhatsApp || templatesLoading
                    ? "bg-gray-700 text-gray-500"
                    : "bg-green-600 hover:bg-green-700 text-white active:scale-95"
                }`}
                >
                {isSendingWhatsApp || templatesLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <FaWhatsapp className="text-lg" />
                )}
                </button>

                {showWhatsAppMenu && (
                <div className="absolute right-0 bottom-full mb-3 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden transform origin-bottom-right transition-all animate-scaleIn">
                    <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
                    <FaWhatsapp className="text-green-500" />
                    <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wider">Templates</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                    {whatsappTemplates.length > 0 ? (
                        whatsappTemplates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template.templateName)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0"
                        >
                            <p className="text-xs font-bold text-gray-200 mb-0.5">{template.name}</p>
                            <p className="text-[10px] text-gray-500 line-clamp-1">{template.description}</p>
                        </button>
                        ))
                    ) : (
                        <div className="px-4 py-6 text-center text-[10px] text-gray-500 uppercase font-bold">
                        No templates found
                        </div>
                    )}
                    </div>
                </div>
                )}
            </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
