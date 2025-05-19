"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebase/firebase';
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import { FaEnvelope, FaPaperclip, FaCheck, FaTimes, FaFile, FaDownload } from 'react-icons/fa';
import { format } from 'date-fns';

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
  
  useEffect(() => {
    async function fetchEmailHistory() {
      try {
        // if (!auth.currentUser) {
        //   setError("You must be logged in to view email history");
        //   setLoading(false);
        //   return;
        // }
        
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
  
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <AdvocateSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <FaEnvelope className="mr-3 text-purple-400" />
            Email History
          </h1>
          <p className="text-gray-400 mb-8">View the history of emails sent from your account</p>
          
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
          ) : emailHistory.length === 0 ? (
            <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm border border-gray-700/50 shadow-xl">
              <p className="text-gray-300 text-center">No email history found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {emailHistory.map((email) => (
                <div 
                  key={email.id} 
                  className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50 shadow-xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-white">{email.subject}</h2>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${getStatusColor(email.status)}`}>
                        {email.status}
                      </span>
                      {getStatusIcon(email.status)}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm">
                      <span className="font-medium text-gray-300">Sent:</span>{' '}
                      {email.sentAt ? format(email.sentAt.toDate(), 'MMM d, yyyy h:mm a') : 'N/A'}
                    </p>
                    
                    {email.recipients && email.recipients.length > 0 && (
                      <div className="mt-2">
                        <p className="text-gray-400 text-sm mb-1">
                          <span className="font-medium text-gray-300">To:</span>
                        </p>
                        <div className="flex flex-wrap gap-2 ml-2">
                          {email.recipients.map((recipient) => (
                            <div 
                              key={recipient.id} 
                              className="bg-gray-700/30 rounded-md px-2 py-1 text-sm text-gray-300 flex items-center"
                            >
                              <span>{recipient.name} &lt;{recipient.email}&gt;</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {email.error && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-md">
                      <p className="text-red-400 text-sm">
                        <span className="font-medium">Error: </span> 
                        {email.error}
                      </p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-medium text-gray-300">Content:</span>
                    </p>
                    <div className="bg-gray-700/30 rounded-md p-4 text-gray-300 whitespace-pre-wrap text-sm">
                      {email.content}
                    </div>
                  </div>
                  
                  {email.attachments && email.attachments.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-sm mb-2">
                        <span className="font-medium text-gray-300">
                          <FaPaperclip className="inline-block mr-1" />
                          Attachments ({email.attachments.length}):
                        </span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 ml-2">
                        {email.attachments.map((attachment, idx) => (
                          <div 
                            key={idx} 
                            className="bg-gray-700/30 rounded-md p-2 text-sm text-gray-300 flex items-center"
                          >
                            <FaFile className="mr-2 text-blue-400" />
                            <div className="overflow-hidden text-ellipsis">
                              <p className="truncate" title={attachment.name}>
                                {attachment.name}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                            <button 
                              className="ml-auto text-blue-400 hover:text-blue-300 transition-colors"
                              title="Download attachment"
                              disabled
                            >
                              <FaDownload />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
