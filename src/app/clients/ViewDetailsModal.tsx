'use client'

import { format, formatDate } from 'date-fns'
import { User, Clock } from 'lucide-react'
import { FaRupeeSign } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Client {
  id: string
  name: string
  phone: string
  email: string
  status: string
  city: string
  occupation: string
  aadharNumber: string
  panNumber: string
  assignedTo: string
  alloc_adv?: string
  alloc_adv_at?: any
  alloc_adv_secondary?: string
  convertedAt?: any
  convertedFromLead?: boolean
  creditCardDues?: string
  lastModified?: any
  leadId?: string
  monthlyFees?: string
  monthlyIncome?: string
  personalLoanDues?: string
  remarks?: string
  salesNotes?: string
  source_database?: string
  startDate?: string
  tenure?: string
  banks?: Array<{
    id: string;
    accountNumber: string;
    bankName: string;
    loanAmount: string;
    loanType: string;
  }>
  adv_status?: string
  documentUrl?: string
  documentName?: string
  documentUploadedAt?: Date
  dob?: string
}

interface ViewDetailsModalProps {
  client: Client
  isOpen: boolean
  onClose: () => void
  openDocumentViewer: (url: string, name: string) => void
  formatSourceName: (source: string) => string
}

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'N/A'
  try {
    const date = timestamp.toDate()
    return format(date, 'PPP p')
  } catch (error) {
    return 'Invalid date'
  }
}

export default function ViewDetailsModal({ 
  client, 
  isOpen, 
  onClose,
  openDocumentViewer,
  formatSourceName
}: ViewDetailsModalProps) {
  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              {client.name}
            </h2>
            <p className="text-gray-400 flex items-center mt-1">
              <Clock className="h-4 w-4 mr-1" />
              {client.startDate ? `Client since ${client.startDate}` : 'Client details'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {client.documentUrl && (
              <Button
                onClick={() => openDocumentViewer(client.documentUrl || "", client.documentName || "Document")}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                View Document
              </Button>
            )}
            <button 
              onClick={onClose}
              className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Name</div>
                <div className="text-white font-medium">{client.name ? client.name.toUpperCase() : 'N/A'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Phone</div>
                <div className="text-white">{client.phone}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Email</div>
                <div className="text-white break-all">{client.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">City</div>
                <div className="text-white">{client.city ? client.city.toUpperCase() : 'N/A'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Date of Birth</div>
                <div className="text-white">{client.dob ? formatDate(client.dob, 'dd/MM/yyyy') : 'Sales Person did not provide this information'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Occupation</div>
                <div className="text-white">{client.occupation}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Aadhar Number</div>
                <div className="text-white">{client.aadharNumber}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Pan Card Number</div>
                <div className="text-white">{client.panNumber}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Assigned To</div>
                <div className="text-white">{client.assignedTo}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Allocated Advocate</div>
                <div className="text-white">{client.alloc_adv}</div>
              </div>
              {client.alloc_adv_at && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">Advocate Allocated At</div>
                  <div className="text-white">{formatTimestamp(client.alloc_adv_at)}</div>
                </div>
              )}
              {client.alloc_adv_secondary && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">Secondary Advocate</div>
                  <div className="text-white">{client.alloc_adv_secondary}</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Financial Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
              <FaRupeeSign className="h-4 w-4 mr-2" />
              Financial Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Monthly Income</div>
                <div className="text-green-400 font-medium flex items-center">
                  <FaRupeeSign className="h-3 w-3 mr-1" />
                  {client.monthlyIncome || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Monthly Fees</div>
                <div className="text-orange-400 flex items-center">
                  <FaRupeeSign className="h-3 w-3 mr-1" />
                  {client.monthlyFees || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Credit Card Dues</div>
                <div className="text-red-400 flex items-center">
                  <FaRupeeSign className="h-3 w-3 mr-1" />
                  {client.creditCardDues || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Personal Loan Dues</div>
                <div className="text-red-400 flex items-center">
                  <FaRupeeSign className="h-3 w-3 mr-1" />
                  {client.personalLoanDues || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Tenure</div>
                <div className="text-white">{client.tenure || 'N/A'} months</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Start Date</div>
                <div className="text-white">{client.startDate || 'N/A'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Source</div>
                <div className="text-white">{client.source_database ? formatSourceName(client.source_database) : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bank Details Section */}
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
          <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
            <FaRupeeSign className="h-4 w-4 mr-2" />
            Bank Details
          </h3>
          
          {!client.banks || client.banks.length === 0 ? (
            <div className="text-gray-400 p-3">No bank details available.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-900">
                  <TableRow className="border-gray-800 hover:bg-gray-800/50">
                    <TableHead className="text-gray-400">Bank</TableHead>
                    <TableHead className="text-gray-400">Account Number</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.banks.map(bank => (
                    <TableRow key={bank.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">{bank.bankName}</TableCell>
                      <TableCell className="text-gray-300">{bank.accountNumber}</TableCell>
                      <TableCell>
                        <Badge className={`px-2 py-1 rounded-md border ${
                          bank.loanType === 'Credit Card' 
                            ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                            : 'bg-blue-500/20 text-blue-500 border-blue-500/50'
                        }`}>
                          {bank.loanType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-red-400 flex items-center">
                        <FaRupeeSign className="h-3 w-3 mr-1" />
                        {bank.loanAmount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        {/* Additional Information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-3 text-yellow-400">Remarks</h3>
            <div className="bg-gray-950 p-3 rounded border border-gray-700 min-h-[100px] text-gray-300">
              {client.remarks || "No remarks available."}
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-3 text-yellow-400">Sales Notes</h3>
            <div className="bg-gray-950 p-3 rounded border border-gray-700 min-h-[100px] text-gray-300">
              {client.salesNotes || "No sales notes available."}
            </div>
          </div>
        </div>

        {/* Conversion Information */}
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
          <h3 className="font-semibold text-lg mb-3 text-purple-400">Conversion Details</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-400">Converted From Lead</div>
              <div className="text-white">{client.convertedFromLead ? 'Yes' : 'No'}</div>
            </div>
            {client.convertedAt && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Converted At</div>
                <div className="text-white">{formatTimestamp(client.convertedAt)}</div>
              </div>
            )}
            {client.leadId && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-400">Lead ID</div>
                <div className="text-white">{client.leadId}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-400">Last Modified</div>
              <div className="text-white">{formatTimestamp(client.lastModified)}</div>
            </div>
          </div>
        </div>

        {/* Document Section */}
        {client.documentUrl && (
          <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Client Document
            </h3>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    {client.documentName || "Client Document"}
                  </p>
                  {client.documentUploadedAt && (
                    <p className="text-sm text-gray-400 mt-1">
                      Uploaded on: {formatTimestamp(client.documentUploadedAt)}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => openDocumentViewer(client.documentUrl || "", client.documentName || "Document")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  View Document
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}