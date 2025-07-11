'use client'

import { User } from 'lucide-react'
import { FaRupeeSign } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { format } from 'date-fns'

interface Client {
  id: string
  name: string
  phone: string
  email: string
  status: string
  city: string
  occupation: string
  aadharNumber: string
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
  sentAgreement?: boolean
}

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

interface EditModalProps {
  client: Client
  isOpen: boolean
  onClose: () => void
  onSave: () => Promise<void>
  advocates: User[]
  allSources: string[]
  isSaving: boolean
  handleEditInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSelectChange: (name: string, value: string) => void
  handleBankChange: (bankId: string, field: string, value: string) => void
  handleAddBank: () => void
  handleRemoveBank: (bankId: string) => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleFileUpload: () => Promise<void>
  openDocumentViewer: (url: string, name: string) => void
  testUpload: () => Promise<void>
  formatSourceName: (source: string) => string
  uploading: boolean
  fileUpload: File | null
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

export default function EditModal({
  client,
  isOpen,
  onClose,
  onSave,
  advocates,
  allSources,
  isSaving,
  handleEditInputChange,
  handleSelectChange,
  handleBankChange,
  handleAddBank,
  handleRemoveBank,
  handleFileChange,
  handleFileUpload,
  openDocumentViewer,
  testUpload,
  formatSourceName,
  uploading,
  fileUpload
}: EditModalProps) {
  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Edit Client: {client.name}
            </h2>
            <p className="text-gray-400 flex items-center mt-1">
              Update client information
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Name</label>
                <Input 
                  name="name"
                  value={client.name ? client.name.toUpperCase() : ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Phone</label>
                <Input 
                  name="phone"
                  value={client.phone}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Email</label>
                <Input 
                  name="email"
                  value={client.email}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">City</label>
                <Input 
                  name="city"
                  value={client.city}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Occupation</label>
                <Input 
                  name="occupation"
                  value={client.occupation}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Aadhar Number</label>
                <Input 
                  name="aadharNumber"
                  value={client.aadharNumber}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Assigned To</label>
                <Input 
                  name="assignedTo"
                  value={client.assignedTo}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Primary Allocated Advocate</label>
                <Select 
                  defaultValue={client.alloc_adv || "unassigned"}
                  onValueChange={(value) => handleSelectChange('alloc_adv', value)}
                >
                  <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                    <SelectValue placeholder="Select primary advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border-gray-700">
                    <SelectGroup>
                      <SelectLabel>Advocates</SelectLabel>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {advocates.map(advocate => (
                        <SelectItem 
                          key={advocate.uid} 
                          value={`${advocate.firstName} ${advocate.lastName}`.trim()}
                        >
                          {advocate.firstName} {advocate.lastName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Secondary Allocated Advocate</label>
                <Select 
                  defaultValue={client.alloc_adv_secondary || "unassigned"}
                  onValueChange={(value) => handleSelectChange('alloc_adv_secondary', value)}
                >
                  <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                    <SelectValue placeholder="Select secondary advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border-gray-700">
                    <SelectGroup>
                      <SelectLabel>Advocates</SelectLabel>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {advocates.map(advocate => (
                        <SelectItem 
                          key={advocate.uid} 
                          value={`${advocate.firstName} ${advocate.lastName}`.trim()}
                        >
                          {advocate.firstName} {advocate.lastName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Status</label>
                <Select 
                  defaultValue={client.adv_status || "Inactive"}
                  onValueChange={(value) => handleSelectChange('adv_status', value)}
                >
                  <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border-gray-700">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Dropped">Dropped</SelectItem>
                    <SelectItem value="Not Responding">Not Responding</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Financial Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
              <FaRupeeSign className="h-4 w-4 mr-2" />
              Financial Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Monthly Income</label>
                <Input 
                  name="monthlyIncome"
                  value={client.monthlyIncome || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Monthly Fees</label>
                <Input 
                  name="monthlyFees"
                  value={client.monthlyFees || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Credit Card Dues</label>
                <Input 
                  name="creditCardDues"
                  value={client.creditCardDues || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Personal Loan Dues</label>
                <Input 
                  name="personalLoanDues"
                  value={client.personalLoanDues || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Tenure (months)</label>
                <Input 
                  name="tenure"
                  value={client.tenure || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Start Date</label>
                <Input 
                  name="startDate"
                  value={client.startDate || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Source</label>
                <Select 
                  value={client.source_database || 'none'} 
                  onValueChange={(value) => handleSelectChange('source_database', value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border-gray-700">
                    <SelectItem value="none">Select source</SelectItem>
                    {allSources.map(source => (
                      <SelectItem key={source} value={source}>
                        {formatSourceName(source)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bank Details Section */}
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg text-blue-400 flex items-center">
              <FaRupeeSign className="h-4 w-4 mr-2" />
              Bank Details
            </h3>
            <Button
              onClick={handleAddBank}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M12 5v14M5 12h14"></path></svg>
              Add Bank
            </Button>
          </div>
          
          {!client.banks || client.banks.length === 0 ? (
            <div className="text-gray-400 p-3 text-center">
              No bank details available. Click "Add Bank" to add a bank.
            </div>
          ) : (
            <div className="space-y-4">
              {client.banks.map((bank) => (
                <div 
                  key={bank.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative"
                >
                  <button
                    onClick={() => handleRemoveBank(bank.id)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-900/50 hover:bg-red-800 text-red-300 flex items-center justify-center"
                    title="Remove bank"
                  >
                    ✕
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Bank Name</label>
                      <Input 
                        value={bank.bankName}
                        onChange={(e) => handleBankChange(bank.id, 'bankName', e.target.value)}
                        className="bg-gray-950 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Account Number</label>
                      <Input 
                        value={bank.accountNumber}
                        onChange={(e) => handleBankChange(bank.id, 'accountNumber', e.target.value)}
                        className="bg-gray-950 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Loan Type</label>
                      <Select 
                        value={bank.loanType} 
                        onValueChange={(value) => handleBankChange(bank.id, 'loanType', value)}
                      >
                        <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 text-white border-gray-700">
                          <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Home Loan">Home Loan</SelectItem>
                          <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Loan Amount</label>
                      <Input 
                        value={bank.loanAmount}
                        onChange={(e) => handleBankChange(bank.id, 'loanAmount', e.target.value)}
                        className="bg-gray-950 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Additional Information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-3 text-green-400">Agreement Status</h3>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="sentAgreement"
                name="sentAgreement"
                checked={client.sentAgreement || false}
                onChange={(e) => handleSelectChange('sentAgreement', e.target.checked.toString())}
                className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="sentAgreement" className="text-sm text-gray-300">
                Agreement Sent
              </label>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-3 text-yellow-400">Remarks</h3>
            <Textarea 
              name="remarks"
              value={client.remarks || ''}
              onChange={handleEditInputChange}
              className="bg-gray-950 border-gray-700 text-white min-h-[100px]"
            />
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-3 text-yellow-400">Sales Notes</h3>
            <Textarea 
              name="salesNotes"
              value={client.salesNotes || ''}
              onChange={handleEditInputChange}
              className="bg-gray-950 border-gray-700 text-white min-h-[100px]"
            />
          </div>
        </div>

        {/* Document Upload Section */}
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
          <h3 className="font-semibold text-lg mb-4 text-purple-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Document Management
          </h3>
          
          {client.documentUrl ? (
            <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{client.documentName || 'Document'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Uploaded: {client.documentUploadedAt ? 
                      formatTimestamp(client.documentUploadedAt) : 'Unknown date'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openDocumentViewer(client.documentUrl || "", client.documentName || "Document")}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    View Document
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 mb-4">No document has been uploaded for this client yet.</p>
          )}
          
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-1">Upload Word Document</label>
              <Input 
                id="file-upload"
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="bg-gray-950 border-gray-700 text-white"
              />
            </div>
            <Button
              onClick={handleFileUpload}
              disabled={!fileUpload || uploading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {uploading ? (
                <div className="flex items-center">
                  <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                  Uploading...
                </div>
              ) : 'Upload Document'}
            </Button>
          </div>
          
          {/* Test Upload Button for Debugging */}
          <div className="mt-3">
            <Button
              onClick={testUpload}
              className="bg-gray-600 hover:bg-gray-700"
              size="sm"
            >
              Test Upload (Debug)
            </Button>
          </div>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="mt-8 flex justify-end gap-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={isSaving}
          >
            {isSaving ? 
              <div className="flex items-center">
                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </div>
              : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}