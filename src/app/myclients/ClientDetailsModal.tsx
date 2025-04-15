'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaBriefcase, 
  FaIdCard, 
  FaRupeeSign, 
  FaRegCalendarAlt, 
  FaUniversity, 
  FaClipboardList, 
  FaInfoCircle, 
  FaUserTie, 
  FaTags, 
  FaFileAlt
} from 'react-icons/fa';

// Define the Bank type to match Firebase structure
interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
}

// Define the Client type to match Firebase structure
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  city: string;
  lastModified: any; // Timestamp from Firebase
  creditCardDues: string;
  personalLoanDues: string;
  monthlyIncome: string;
  monthlyFees: string;
  assignedTo: string;
  assignedToId: string;
  alloc_adv: string;
  alloc_adv_at: any; // Timestamp from Firebase
  banks: Bank[];
  remarks: string;
  queries: string;
  salesNotes: string;
  source_database: string;
  tenure: string;
  occupation: string;
  aadharNumber: string;
  convertedFromLead: boolean;
  convertedAt: any; // Timestamp from Firebase
  leadId: string;
  startDate: string;
  message: string;
}

interface ClientDetailsModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  formatDate: (timestamp: any) => string;
}

export default function ClientDetailsModal({ client, isOpen, onClose, formatDate }: ClientDetailsModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-[#f5f5f5] dark:bg-[#30261d] text-left align-middle shadow-xl transition-all">
                <div className={`h-2 w-full ${
                  client.status === 'Converted' ? 'bg-[#d39f10]' :
                  client.status === 'Pending' ? 'bg-[#d39f10]/70' : 'bg-[#d39f10]/40'
                }`}></div>
                
                <div className="p-6">
                  <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-bold text-gray-900 dark:text-white flex items-center"
                    >
                      <FaUser className="mr-2 text-green-500" />
                      {client.name}
                      <span
                        className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                          client.status === 'Converted'
                            ? 'bg-[#d39f10]/20 text-[#30261d] dark:bg-[#d39f10]/30 dark:text-[#f5f5f5]'
                            : client.status === 'Pending'
                            ? 'bg-[#d39f10]/10 text-[#30261d] dark:bg-[#d39f10]/20 dark:text-[#f5f5f5]'
                            : 'bg-[#f5f5f5] text-[#30261d] dark:bg-[#30261d]/80 dark:text-[#f5f5f5]'
                        }`}
                      >
                        {client.status}
                      </span>
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last updated: {formatDate(client.lastModified)}
                    </p>
                  </div>
                  
                  <div className="mt-6 space-y-8 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Personal Information */}
                    <div className="bg-[#f5f5f5] dark:bg-[#30261d] rounded-lg overflow-hidden shadow">
                      <div className="bg-[#30261d] dark:bg-[#d39f10]/20 px-4 py-2">
                        <h4 className="font-bold text-[#f5f5f5] dark:text-[#FFFFFF] flex items-center">
                          <FaUser className="mr-2" />
                          Personal Information
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                <FaUser />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                              <p className="font-medium dark:text-gray-200">{client.name}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                <FaPhone />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                              <p className="font-medium dark:text-gray-200">{client.phone}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                <FaEnvelope />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                              <p className="font-medium dark:text-gray-200">{client.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                <FaMapMarkerAlt />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-xs text-gray-500 dark:text-gray-400">City</p>
                              <p className="font-medium dark:text-gray-200">{client.city}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                <FaBriefcase />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Occupation</p>
                              <p className="font-medium dark:text-gray-200">{client.occupation}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                <FaIdCard />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Aadhar Number</p>
                              <p className="font-medium dark:text-gray-200">{client.aadharNumber}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Financial Information */}
                    <div className="bg-[#f5f5f5] dark:bg-[#30261d] rounded-lg overflow-hidden shadow">
                      <div className="bg-[#30261d] dark:bg-[#d39f10]/20 px-4 py-2">
                        <h4 className="font-bold text-[#f5f5f5] dark:text-[#FFFFFF] flex items-center">
                          <FaRupeeSign className="mr-2" />
                          Financial Information
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded-lg shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaRupeeSign />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Income</p>
                                <p className="font-bold text-[#d39f10] dark:text-[#d39f10]">₹{client.monthlyIncome}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded-lg shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaRupeeSign />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Fees</p>
                                <p className="font-bold text-[#d39f10] dark:text-[#d39f10]">₹{client.monthlyFees}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded-lg shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaRupeeSign />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Credit Card Dues</p>
                                <p className="font-bold text-[#d39f10] dark:text-[#d39f10]">₹{client.creditCardDues}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded-lg shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaRupeeSign />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Personal Loan Dues</p>
                                <p className="font-bold text-[#d39f10] dark:text-[#d39f10]">₹{client.personalLoanDues}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded-lg shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaRegCalendarAlt />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Tenure</p>
                                <p className="font-bold text-[#d39f10] dark:text-[#d39f10]">{client.tenure} months</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded-lg shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaRegCalendarAlt />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                                <p className="font-bold text-[#d39f10] dark:text-[#d39f10]">{client.startDate}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Bank Information */}
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center">
                            <FaUniversity className="mr-2 text-blue-500" />
                            Bank Details
                          </h4>
                          {client.banks && client.banks.length > 0 ? (
                            <div className="space-y-3">
                              {client.banks.map((bank) => (
                                <div key={bank.id} className="bg-[#f5f5f5] dark:bg-[#30261d] p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                                  <div className="text-md font-medium text-blue-600 dark:text-blue-400 mb-2">
                                    {bank.bankName} - {bank.loanType}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-2 rounded">
                                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Account Number</span>
                                      <span className="font-medium dark:text-gray-300">{bank.accountNumber}</span>
                                    </div>
                                    <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-2 rounded">
                                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Loan Amount</span>
                                      <span className="font-medium text-green-600 dark:text-green-400">₹{bank.loanAmount}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded">
                              No bank details available
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Information */}
                    <div className="bg-[#f5f5f5] dark:bg-[#30261d] rounded-lg overflow-hidden shadow">
                      <div className="bg-[#30261d] dark:bg-[#d39f10]/20 px-4 py-2">
                        <h4 className="font-bold text-[#f5f5f5] dark:text-[#FFFFFF] flex items-center">
                          <FaInfoCircle className="mr-2" />
                          Status Information
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#f5f5f5] dark:bg-[#30261d] text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaTags />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Source</p>
                                <p className="font-medium dark:text-gray-200">{client.source_database}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#f5f5f5] dark:bg-[#30261d] text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaUserTie />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Assigned To</p>
                                <p className="font-medium dark:text-gray-200">{client.assignedTo}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded shadow-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#f5f5f5] dark:bg-[#30261d] text-[#30261d] dark:text-[#f5f5f5]">
                                  <FaUserTie />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Advisor</p>
                                <p className="font-medium dark:text-gray-200">{client.alloc_adv || 'Not assigned'}</p>
                              </div>
                            </div>
                          </div>
                          
                          {client.alloc_adv_at && (
                            <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded shadow-sm">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#f5f5f5] dark:bg-[#30261d] text-[#30261d] dark:text-[#f5f5f5]">
                                    <FaRegCalendarAlt />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Advisor Assigned On</p>
                                  <p className="font-medium dark:text-gray-200">{formatDate(client.alloc_adv_at)}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {client.convertedFromLead && (
                            <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-3 rounded shadow-sm">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#d39f10]/10 dark:bg-[#d39f10]/20 text-[#30261d] dark:text-[#f5f5f5]">
                                    <FaRegCalendarAlt />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Converted At</p>
                                  <p className="font-medium text-[#d39f10] dark:text-[#d39f10]">{formatDate(client.convertedAt)}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Notes Section */}
                    <div className="bg-[#f5f5f5] dark:bg-[#30261d] rounded-lg overflow-hidden shadow">
                      <div className="bg-[#30261d] dark:bg-[#d39f10]/20 px-4 py-2">
                        <h4 className="font-bold text-[#f5f5f5] dark:text-[#FFFFFF] flex items-center">
                          <FaFileAlt className="mr-2" />
                          Notes & Remarks
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="space-y-4">
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-4 rounded shadow-sm border-l-4 border-yellow-300">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                              <FaClipboardList className="mr-1 text-yellow-600" />
                              Sales Notes
                            </p>
                            <p className="text-sm dark:text-gray-300">
                              {client.salesNotes || 'No sales notes available'}
                            </p>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-4 rounded shadow-sm border-l-4 border-blue-300">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                              <FaClipboardList className="mr-1 text-blue-600" />
                              Client Remarks
                            </p>
                            <p className="text-sm dark:text-gray-300">
                              {client.remarks || 'No remarks available'}
                            </p>
                          </div>
                          
                          <div className="bg-[#f5f5f5] dark:bg-[#30261d] p-4 rounded shadow-sm border-l-4 border-green-300">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                              <FaClipboardList className="mr-1 text-green-600" />
                              Client Queries
                            </p>
                            <p className="text-sm dark:text-gray-300">
                              {client.queries || 'No queries available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-md border border-transparent bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 transition-colors duration-300"
                      onClick={onClose}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 