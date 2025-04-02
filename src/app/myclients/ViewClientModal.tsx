import React from 'react'
import { Lead } from './types/lead'

interface ViewClientModalProps {
  lead: Lead
  loading: boolean
  error: string | null
  onClose: () => void
}

const ViewClientModal = ({ lead, loading, error, onClose }: ViewClientModalProps) => {
  // Type guard to check if the object is a Firestore Timestamp
  function isFirestoreTimestamp(value: any): value is { toDate: () => Date } {
    return value && typeof value.toDate === 'function';
  }

  // Format phone number for better readability
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    
    // Remove non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's an international number
    if (cleaned.length > 10) {
      // Format as international with the country code
      return `+${cleaned.slice(0, cleaned.length-10)} ${cleaned.slice(-10, -5)} ${cleaned.slice(-5)}`;
    } else if (cleaned.length === 10) {
      // Format as regular 10-digit number
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    
    // Return original if format doesn't match
    return phone;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Client Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Loading client details...</span>
            </div>
          ) : error ? (
            <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-md mb-6">
              <p>{error}</p>
              <p className="text-sm mt-2">Showing lead information instead.</p>
            </div>
          ) : (
            // Client Information Sections
            <div className="space-y-6">
              {/* Personal Information */}
              <ClientInfoSection 
                title="Personal Information"
                fields={[
                  { label: "Name", value: lead.name },
                  { label: "Email", value: lead.email },
                  { label: "Phone", value: formatPhoneNumber(lead.phone) },
                  { label: "City", value: lead.city },
                  { label: "Occupation", value: lead.occupation },
                  { label: "Aadhar Card Number", value: lead.aadharNumber }
                ]}
              />

              {/* Financial Information */}
              <ClientInfoSection 
                title="Financial Information"
                fields={[
                  { label: "Personal Loan Dues", value: lead.personalLoanDues, type: "currency" },
                  { label: "Credit Card Dues", value: lead.creditCardDues, type: "currency" },
                  { label: "Monthly Income", value: lead.monthlyIncome, type: "currency" }
                ]}
                columns={3}
              />

              {/* Fee Details */}
              <ClientInfoSection 
                title="Fee Details"
                fields={[
                  { label: "Tenure (months)", value: lead.tenure },
                  { label: "Monthly Fees", value: lead.monthlyFees, type: "currency" },
                  { label: "Start Date of Service", value: lead.startDate }
                ]}
                columns={3}
              />

              {/* Bank Details */}
              <div>
                <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Bank Details</h3>
                {lead.banks && lead.banks.length > 0 ? (
                  <div className="space-y-4">
                    {lead.banks.map((bank: any) => (
                      <div key={bank.id} className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-sm font-medium text-gray-400">Bank Name</span>
                            <span className="block mt-1 text-white">{bank.bankName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-gray-400">Loan Type</span>
                            <span className="block mt-1 text-white">{bank.loanType || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-gray-400">
                              {bank.loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number'}
                            </span>
                            <span className="block mt-1 text-white">{bank.accountNumber || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-gray-400">
                              {bank.loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount'}
                            </span>
                            <span className="block mt-1 text-white">₹{bank.loanAmount || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 text-center">
                    <p className="text-gray-400">No bank details available for this client.</p>
                  </div>
                )}
              </div>

              {/* Notes & Remarks */}
              <div>
                <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Notes & Remarks</h3>
                <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                  <div className="mb-4">
                    <span className="block text-sm font-medium text-gray-400">Client Message/Query</span>
                    <div className="mt-1 p-3 bg-gray-700 rounded-md text-white">
                      {lead.message || lead.queries || lead.Queries || lead.remarks || 'No message provided.'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-400">Sales Notes</span>
                    <div className="mt-1 p-3 bg-gray-700 rounded-md text-white">
                      {lead.salesNotes || 'No sales notes added.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <ClientInfoSection 
                title="Additional Information"
                fields={[
                  { label: "Data Source", value: lead.source },
                  { label: "Assigned To", value: lead.assignedTo },
                  { label: "Last Modified", value: isFirestoreTimestamp(lead.lastModified) ? 
                    lead.lastModified.toDate().toLocaleDateString('en-IN', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    }) : lead.lastModified instanceof Date ? 
                      lead.lastModified.toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'Unknown'
                  },
                  { label: "Conversion Date", value: lead.convertedAt?.toDate ? 
                    lead.convertedAt.toDate().toLocaleDateString('en-IN', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    }) : 'Unknown'
                  },
                  { label: "Lead ID", value: lead.leadId },
                ]}
              />
            </div>
          )}

          {/* Close button */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ClientInfoSectionProps {
  title: string
  fields: {
    label: string
    value: any
    type?: 'text' | 'currency'
  }[]
  columns?: number
}

const ClientInfoSection = ({ title, fields, columns = 2 }: ClientInfoSectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">{title}</h3>
      <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
        <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
          {fields.map((field, index) => (
            <div key={index}>
              <span className="block text-sm font-medium text-gray-400">{field.label}</span>
              <span className={`block mt-1 ${field.type === 'currency' ? 'text-green-400 font-medium' : 'text-white'}`}>
                {field.type === 'currency' && field.value ? '₹' : ''}
                {field.value || 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ViewClientModal