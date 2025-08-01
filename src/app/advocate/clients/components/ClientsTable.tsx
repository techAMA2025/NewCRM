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

import ClientTableRow from "./ClientTableRow"

interface ClientsTableProps {
  clients: Client[]
  requestLetterStates: { [key: string]: boolean }
  latestRemarks: { [key: string]: string }
  onStatusChange: (clientId: string, newStatus: string) => void
  onRequestLetterChange: (clientId: string, checked: boolean) => void
  onRemarkSave: (clientId: string, remark: string) => void
  onViewHistory: (clientId: string) => void
  onViewDetails: (client: Client) => void
  onEditClient: (client: Client) => void
  onTemplateSelect: (templateName: string, client: Client) => void
  isSendingWhatsApp: boolean
}

export default function ClientsTable({
  clients,
  requestLetterStates,
  latestRemarks,
  onStatusChange,
  onRequestLetterChange,
  onRemarkSave,
  onViewHistory,
  onViewDetails,
  onEditClient,
  onTemplateSelect,
  isSendingWhatsApp,
}: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-800 rounded-lg">
        <p className="text-gray-300 text-sm">No clients match your search criteria.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] border-collapse bg-gray-800 shadow-md rounded-lg text-sm">
        <thead>
          <tr className="bg-gray-700">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
              Start Date
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">Week</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">Name</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">Contact</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">City</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
              Assignment
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">Status</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
              Request Letter
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">Remarks</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {clients.map((client) => (
            <ClientTableRow
              key={client.id}
              client={client}
              requestLetterState={requestLetterStates[client.id] || false}
              latestRemark={latestRemarks[client.id] || ""}
              onStatusChange={onStatusChange}
              onRequestLetterChange={onRequestLetterChange}
              onRemarkSave={onRemarkSave}
              onViewHistory={onViewHistory}
              onViewDetails={onViewDetails}
              onEditClient={onEditClient}
              onTemplateSelect={onTemplateSelect}
              isSendingWhatsApp={isSendingWhatsApp}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
