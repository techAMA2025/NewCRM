"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebase/firebase';
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import { FaEnvelope, FaPaperclip, FaCheck, FaTimes, FaFile, FaDownload, FaSearch, FaEye, FaTimes as FaTimesCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';

interface Attachment {
  name: string;
  size: number;
  type: string;
}

interface Recipient {
  email: string;
  id: string;
  name: string;
  type: string;
}

interface EmailHistory {
  id: string;
  attachments: Attachment[];
  bankId: string | null;
  clientId: string | null;
  content: string;
  error: string | null;
  recipients: Recipient[];
  sentAt: any; // Firestore timestamp
  status: string;
  subject: string;
  userId: string;
}

export default function EmailHistoryPage() {
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailHistory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  
  useEffect(() => {
    // Access localStorage only on client side
    const role = localStorage.getItem('userRole');
    setUserRole(role || '');
  }, []);

  useEffect(() => {
    async function fetchEmailHistory() {
      try {
        const userId = auth.currentUser?.uid;
        const emailHistoryRef = collection(db, "emailHistory");
        const emailHistoryQuery = query(
          emailHistoryRef,
          orderBy("sentAt", "desc")
        );
        
        const snapshot = await getDocs(emailHistoryQuery);
        const historyData: EmailHistory[] = [];
        
        snapshot.forEach((doc) => {
          historyData.push({
            id: doc.id,
            ...doc.data(),
          } as EmailHistory);
        });
        
        setEmailHistory(historyData);
      } catch (err) {
        console.error("Error fetching email history:", err);
        setError("Failed to load email history. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchEmailHistory();
  }, []);
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'pending':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return <FaCheck className="text-green-500" />;
      case 'failed':
        return <FaTimes className="text-red-500" />;
      case 'pending':
        return <span className="inline-block h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></span>;
      default:
        return <span className="inline-block h-3 w-3 rounded-full bg-gray-500"></span>;
    }
  };
  
  const handleOpenModal = (email: EmailHistory) => {
    setSelectedEmail(email);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'unset'; // Enable scrolling again
  };

  const filteredEmails = emailHistory.filter(email => 
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.recipients.some(r => r.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    email.recipients.some(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {userRole === 'advocate' ? <AdvocateSidebar /> : <OverlordSidebar />}
      
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <FaEnvelope className="mr-3 text-purple-400" />
            Email History
          </h1>
          <p className="text-gray-400 mb-6">View the history of emails sent from your account</p>
          
          {/* Search bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-500" />
            </div>
            <input 
              type="text" 
              className="bg-gray-800/70 text-white w-full pl-10 pr-4 py-2 rounded-lg border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Search emails by subject or recipient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {loading ? (
            <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm border border-gray-700/50 shadow-xl flex justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                <p className="text-gray-300">Loading email history...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm border border-red-700/50 shadow-xl">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm border border-gray-700/50 shadow-xl">
              <p className="text-gray-300 text-center">
                {searchTerm ? "No emails matching your search." : "No email history found."}
              </p>
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-xl overflow-hidden backdrop-blur-sm border border-gray-700/50 shadow-xl">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900/50 text-gray-400 text-left">
                    <th className="p-4">Status</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4 hidden md:table-cell">Recipient</th>
                    <th className="p-4 hidden lg:table-cell">Date</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmails.map((email, index) => (
                    <tr 
                      key={email.id} 
                      className={`border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'
                      }`}
                      onClick={() => handleOpenModal(email)}
                    >
                      <td className="p-4">
                        <div className="flex items-center">
                          {getStatusIcon(email.status)}
                          <span className={`ml-2 ${getStatusColor(email.status)} text-sm hidden sm:inline-block`}>
                            {email.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div>
                            <p className="text-white font-medium truncate max-w-[200px] sm:max-w-[250px] md:max-w-[300px]">
                              {email.subject}
                            </p>
                            <p className="text-gray-400 text-xs truncate max-w-[200px] sm:max-w-[250px] md:max-w-[300px] md:hidden">
                              To: {email.recipients.map(r => r.name || r.email).join(', ')}
                            </p>
                          </div>
                          {email.attachments && email.attachments.length > 0 && (
                            <span className="ml-2">
                              <FaPaperclip className="text-gray-400 text-xs" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <p className="text-gray-300 truncate max-w-[150px]">
                          {email.recipients.length > 0
                            ? (email.recipients[0].name || email.recipients[0].email) + 
                              (email.recipients.length > 1 ? ` +${email.recipients.length - 1}` : '')
                            : 'No recipients'}
                        </p>
                      </td>
                      <td className="p-4 text-gray-300 text-sm hidden lg:table-cell">
                        {email.sentAt ? format(email.sentAt.toDate(), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 p-2 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(email);
                          }}
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Email Detail Modal */}
      {isModalOpen && selectedEmail && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm p-4">
          <div 
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700/50 shadow-2xl relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-700/50">
              <h2 className="text-2xl font-bold text-white truncate max-w-[80%]">
                {selectedEmail.subject}
              </h2>
              <button 
                className="text-gray-400 hover:text-white transition-colors text-xl"
                onClick={handleCloseModal}
              >
                <FaTimesCircle />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-grow">
              <div className="flex flex-wrap justify-between mb-6">
                <div className="mb-4 md:mb-0">
                  <p className="text-gray-400 text-sm">
                    <span className="font-medium text-gray-300">Status: </span>
                    <span className={getStatusColor(selectedEmail.status)}>
                      {selectedEmail.status} {getStatusIcon(selectedEmail.status)}
                    </span>
                  </p>
                  
                  <p className="text-gray-400 text-sm mt-2">
                    <span className="font-medium text-gray-300">Sent: </span>
                    {selectedEmail.sentAt ? format(selectedEmail.sentAt.toDate(), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </p>
                </div>
                
                <div>
                  {selectedEmail.error && (
                    <div className="p-3 mt-2 bg-red-900/30 border border-red-800/30 rounded-md max-w-md">
                      <p className="text-red-400 text-sm">
                        <span className="font-medium">Error: </span> 
                        {selectedEmail.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedEmail.recipients && selectedEmail.recipients.length > 0 && (
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-2">
                    <span className="font-medium text-gray-300">Recipients:</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.recipients.map((recipient) => (
                      <div 
                        key={recipient.id} 
                        className="bg-gray-700/30 rounded-md px-3 py-1.5 text-sm text-gray-300"
                      >
                        {recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-2">
                  <span className="font-medium text-gray-300">Message:</span>
                </p>
                <div className="bg-gray-700/20 border border-gray-700/30 rounded-lg p-4 text-gray-300 whitespace-pre-wrap">
                  {selectedEmail.content}
                </div>
              </div>
              
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">
                    <span className="font-medium text-gray-300">
                      <FaPaperclip className="inline-block mr-1" />
                      Attachments ({selectedEmail.attachments.length}):
                    </span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                    {selectedEmail.attachments.map((attachment, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gray-700/30 hover:bg-gray-700/50 transition-colors rounded-md p-3 text-sm text-gray-300 flex items-center"
                      >
                        <FaFile className="mr-2 text-blue-400" />
                        <div className="w-full">
                          <p className="w-full" title={attachment.name}>
                            {attachment.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-700/50 bg-gray-800/50">
              <button
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
