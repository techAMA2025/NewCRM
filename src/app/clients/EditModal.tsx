'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { User, Search, ChevronDown, X } from 'lucide-react'
import { FaRupeeSign } from 'react-icons/fa'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { format } from 'date-fns'
import { getBankData } from '../../data/bankData'

interface Client {
  id: string
  name: string
  phone: string
  altPhone: string
  email: string
  status: string
  city: string
  occupation: string
  aadharNumber: string
  panNumber?: string
  dob?: string
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
  request_letter?: boolean
  shouldGenerateAgreement?: boolean
  feePercentage?: string
  client_app_status?: {
    index: string;
    remarks: string;
    createdAt: number;
    createdBy: string;
  }[];
}

interface UserType {
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
  advocates: UserType[]
  allSources: string[]
  isSaving: boolean
  handleEditInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSelectChange: (name: string, value: string | boolean) => void
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

interface BankFormProps {
  bank: any
  onUpdate: (bankId: string, field: string, value: string) => void
  onRemove: (bankId: string) => void
}

const BankForm = ({ bank, onUpdate, onRemove }: BankFormProps) => {
  const [bankData, setBankData] = useState<Record<string, any>>({});
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadBankData = async () => {
      try {
        const data = await getBankData();
        setBankData(data);
      } catch (error) {
        console.error('Error loading bank data:', error);
      } finally {
        setIsLoadingBanks(false);
      }
    };
    loadBankData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const bankNames = useMemo(() => {
    return Object.keys(bankData).sort((a, b) => a.localeCompare(b));
  }, [bankData]);

  const filteredBanks = useMemo(() => {
    return bankNames.filter(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bankNames, searchTerm]);

  const getBankLabelText = (fieldType: string, loanType: string) => {
    if (fieldType === 'accountNumber') {
      return loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number';
    } else if (fieldType === 'loanAmount') {
      return loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount';
    }
    return '';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative">
      <button
        onClick={() => onRemove(bank.id)}
        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-900/50 hover:bg-red-800 text-red-300 flex items-center justify-center"
        title="Remove bank"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Loan Type</label>
          <Select 
            value={bank.loanType} 
            onValueChange={(value) => onUpdate(bank.id, 'loanType', value)}
          >
            <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 text-white border-gray-700">
              <SelectItem value="Personal Loan">Personal Loan</SelectItem>
              <SelectItem value="Credit Card">Credit Card</SelectItem>
              <SelectItem value="Business Loan">Business Loan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div ref={dropdownRef} className="relative">
          <label className="text-sm text-gray-400 block mb-1">Bank Name</label>
          <div 
            className="mt-1 block w-full bg-gray-950 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white cursor-pointer flex justify-between items-center"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className={bank.bankName ? 'text-white' : 'text-gray-400'}>
              {bank.bankName || "Select Bank"}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>

          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 flex flex-col">
              <div className="p-2 border-b border-gray-700 sticky top-0 bg-gray-800 z-20">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search bank..."
                    className="w-full bg-gray-950 border border-gray-700 rounded-md py-1.5 pl-8 pr-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {isLoadingBanks ? (
                  <div className="px-3 py-2 text-sm text-gray-400 text-center">Loading banks...</div>
                ) : filteredBanks.length > 0 ? (
                  filteredBanks.map((bankName) => (
                    <div
                      key={bankName}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-700 text-sm ${bank.bankName === bankName ? 'bg-blue-900 text-blue-100' : 'text-gray-200'}`}
                      onClick={() => {
                        onUpdate(bank.id, 'bankName', bankName);
                        setIsDropdownOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      {bankName}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-400 text-center">No banks found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">
            {getBankLabelText('accountNumber', bank.loanType)}
          </label>
          <Input 
            value={bank.accountNumber}
            onChange={(e) => onUpdate(bank.id, 'accountNumber', e.target.value)}
            className="bg-gray-950 border-gray-700 text-white"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">
            {getBankLabelText('loanAmount', bank.loanType)}
          </label>
          <Input 
            value={bank.loanAmount}
            onChange={(e) => onUpdate(bank.id, 'loanAmount', e.target.value)}
            placeholder="₹"
            className="bg-gray-950 border-gray-700 text-white"
          />
        </div>
      </div>
    </div>
  );
};

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
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
            <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
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
                <label className="text-sm text-gray-400 block mb-1">Alt Phone</label>
                <Input 
                  name="altPhone"
                  value={client.altPhone}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div className="sm:col-span-2">
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
                <label className="text-sm text-gray-400 block mb-1">DOB</label>
                <Input 
                  name="dob"
                  type="date"
                  value={client.dob || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Aadhar</label>
                <Input 
                  name="aadharNumber"
                  value={client.aadharNumber}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">PAN</label>
                <Input 
                  name="panNumber"
                  value={client.panNumber || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400 block mb-1">Occupation</label>
                <Input 
                  name="occupation"
                  value={client.occupation}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>
          
          {/* Assignment & Financial */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4 text-purple-400 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Assignment & Status
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="Renewal">Renewal</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Primary Advocate</label>
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
                  <label className="text-sm text-gray-400 block mb-1">Secondary Advocate</label>
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
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
                <FaRupeeSign className="h-4 w-4 mr-2" />
                Financials
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Income</label>
                  <Input 
                    name="monthlyIncome"
                    value={client.monthlyIncome || ''}
                    onChange={handleEditInputChange}
                    className="bg-gray-950 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Fees</label>
                  <Input 
                    name="monthlyFees"
                    value={client.monthlyFees || ''}
                    onChange={handleEditInputChange}
                    className="bg-gray-950 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">CC Dues</label>
                  <Input 
                    name="creditCardDues"
                    value={client.creditCardDues || ''}
                    onChange={handleEditInputChange}
                    className="bg-gray-950 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">PL Dues</label>
                  <Input 
                    name="personalLoanDues"
                    value={client.personalLoanDues || ''}
                    onChange={handleEditInputChange}
                    className="bg-gray-950 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Tenure</label>
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
                    type="date"
                    value={client.startDate || ''}
                    onChange={handleEditInputChange}
                    className="bg-gray-950 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Source</label>
                  <Select 
                    value={client.source_database || 'none'} 
                    onValueChange={(value) => handleSelectChange('source_database', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                      <SelectValue placeholder="Source" />
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
                <BankForm 
                  key={bank.id}
                  bank={bank}
                  onUpdate={handleBankChange}
                  onRemove={handleRemoveBank}
                />
              ))}
            </div>
          )}
        </div>

        {/* Document Upload Section */}
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
          <h3 className="font-semibold text-lg mb-4 text-purple-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Document Management
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {client.documentUrl ? (
                <div className="p-3 bg-gray-900 rounded-lg border border-gray-800 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-white font-medium truncate">{client.documentName || 'Document'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded: {client.documentUploadedAt ? 
                        formatTimestamp(client.documentUploadedAt) : 'Unknown date'}
                    </p>
                  </div>
                  <Button
                    onClick={() => openDocumentViewer(client.documentUrl || "", client.documentName || "Document")}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 mt-3 w-full"
                  >
                    View Document
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-gray-900 rounded-lg border border-gray-800 border-dashed h-full flex items-center justify-center">
                  <p className="text-gray-400 text-sm">No document uploaded</p>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Upload New</label>
                <Input 
                  id="file-upload"
                  type="file"
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="bg-gray-950 border-gray-700 text-white text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleFileUpload}
                  disabled={!fileUpload || uploading}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                  size="sm"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button
                  onClick={testUpload}
                  className="bg-gray-700 hover:bg-gray-600 text-xs"
                  size="sm"
                >
                  Test
                </Button>
              </div>

              {/* Agreement Regeneration Section */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="regenerate-agreement"
                    checked={client.shouldGenerateAgreement || false}
                    onChange={(e) => handleSelectChange('shouldGenerateAgreement', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                  />
                  <label
                    htmlFor="regenerate-agreement"
                    className="text-sm font-medium leading-none text-gray-300 cursor-pointer"
                  >
                    Regenerate Agreement
                  </label>
                </div>
                
                {client.shouldGenerateAgreement && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                    <label className="text-sm text-gray-400 block mb-1">Fee Percentage (%)</label>
                    <Input 
                      name="feePercentage"
                      value={client.feePercentage || ''}
                      onChange={handleEditInputChange}
                      placeholder="e.g. 15"
                      type="number"
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Required for regenerating the agreement document.
                    </p>
                  </div>
                )}
              </div>
            </div>
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
            className="bg-amber-600 hover:bg-amber-700 text-white px-8"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}