"use client"

import { useState, useEffect, useRef } from "react"
import { FaEllipsisV, FaWhatsapp } from "react-icons/fa"
import {
  formatIndianDate,
  formatIndianPhoneNumber,
  getWeekFromStartDate,
  getWeekLabel,
  isNewClient,
} from "../utils/formatters"
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates"

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

interface ClientTableRowProps {
  client: Client
  requestLetterState: boolean
  latestRemark: string
  onStatusChange: (clientId: string, newStatus: string) => void
  onRequestLetterChange: (clientId: string, checked: boolean) => void
  onRemarkSave: (clientId: string, remark: string) => void
  onViewHistory: (clientId: string) => void
  onViewDetails: (client: Client) => void
  onEditClient: (client: Client) => void
  onTemplateSelect: (templateName: string, client: Client) => void
  isSendingWhatsApp: boolean
}

export default function ClientTableRow({
  client,
  requestLetterState,
  latestRemark,
  onStatusChange,
  onRequestLetterChange,
  onRemarkSave,
  onViewHistory,
  onViewDetails,
  onEditClient,
  onTemplateSelect,
  isSendingWhatsApp,
}: ClientTableRowProps) {
  const [remarkText, setRemarkText] = useState(latestRemark || "")
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const clientWeek = getWeekFromStartDate(client.startDate)

  // Use the custom hook to fetch advocate templates
  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates('advocate')

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

  const handleRemarkSave = () => {
    onRemarkSave(client.id, remarkText)
  }

  const handleTemplateSelect = (templateName: string) => {
    onTemplateSelect(templateName, client)
    setShowWhatsAppMenu(false)
  }

  return (
    <tr className="hover:bg-gray-700">
      <td className="px-3 py-2 whitespace-nowrap text-gray-200 text-xs">{formatIndianDate(client.startDate)}</td>

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

      <td className="px-3 py-2 whitespace-nowrap text-gray-200 text-xs">
        {client.source_database !== "billcut" ? (client.monthlyFees || "—") : "—"}
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        {client.isPrimary && client.isSecondary ? (
          <span className="px-1.5 py-0.5 bg-purple-800 text-purple-200 rounded-full text-xs font-medium">
            Primary & Secondary
          </span>
        ) : client.isPrimary ? (
          <span className="px-1.5 py-0.5 bg-blue-800 text-blue-200 rounded-full text-xs font-medium">Primary</span>
        ) : (
          <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">Secondary</span>
        )}
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <select
          value={client.adv_status || "Inactive"}
          onChange={(e) => onStatusChange(client.id, e.target.value)}
          className={`px-1.5 py-1 rounded text-xs font-medium border-0 focus:ring-1 focus:ring-opacity-50 ${
            client.adv_status === "Active"
              ? "bg-blue-800 text-blue-200 focus:ring-blue-500"
              : !client.adv_status || client.adv_status === "Inactive"
                ? "bg-gray-800 text-gray-200 focus:ring-gray-500"
                : client.adv_status === "Dropped"
                  ? "bg-red-800 text-red-200 focus:ring-red-500"
                  : client.adv_status === "Not Responding"
                    ? "bg-yellow-800 text-yellow-200 focus:ring-yellow-500"
                    : client.adv_status === "On Hold"
                      ? "bg-purple-800 text-purple-200 focus:ring-purple-500"
                      : "bg-gray-800 text-gray-200 focus:ring-gray-500"
          }`}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Dropped">Dropped</option>
          <option value="Not Responding">Not Responding</option>
          <option value="On Hold">On Hold</option>
        </select>
      </td>

      <td className="px-3 py-2 whitespace-nowrap text-center">
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={requestLetterState}
            onChange={(e) => onRequestLetterChange(client.id, e.target.checked)}
            className="w-4 h-4 rounded-sm text-purple-600 border-gray-600 bg-gray-700 focus:ring-purple-500 focus:ring-opacity-25"
          />
        </div>
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-col space-y-1.5">
          <textarea
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Enter remark..."
            className="w-full px-1.5 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs resize-none"
            rows={2}
          />
          <div className="flex space-x-1.5">
            <button
              onClick={handleRemarkSave}
              className="px-2 py-0.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors duration-200"
            >
              Save
            </button>
            <button
              onClick={() => onViewHistory(client.id)}
              className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded transition-colors duration-200"
            >
              History
            </button>
            
            {/* WATI Templates Button */}
            <div className="relative overflow-visible">
              <button
                onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
                disabled={isSendingWhatsApp || templatesLoading}
                className={`px-2 py-0.5 rounded transition-colors duration-200 flex items-center ${
                  isSendingWhatsApp || templatesLoading
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : showWhatsAppMenu
                    ? "bg-green-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
                title="Send WhatsApp message"
              >
                {isSendingWhatsApp || templatesLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <FaEllipsisV className="w-3 h-3" />
                )}
              </button>

              {/* WATI Menu Dropdown */}
              {showWhatsAppMenu && !templatesLoading && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50" ref={menuRef}>
                  <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <FaWhatsapp className="text-green-400" />
                      <span className="text-sm font-medium text-gray-200">WhatsApp Templates</span>
                    </div>
                  </div>
                  <div className="py-2">
                    {whatsappTemplates.length > 0 ? (
                      whatsappTemplates.map((template, index) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template.templateName)}
                          disabled={isSendingWhatsApp}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="text-sm font-medium text-gray-200">{template.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{template.description}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-400">
                        No advocate templates available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex space-x-1.5">
          <button
            onClick={() => onViewDetails(client)}
            className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded transition-colors duration-200"
          >
            View
          </button>
          <button
            onClick={() => onEditClient(client)}
            className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors duration-200"
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  )
}
