'use client'

import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import { FaPlus, FaSearch, FaLink, FaCheck, FaTimes, FaFileSignature, FaEnvelope } from 'react-icons/fa'
import NewArbitrationCaseModal, { ArbitrationCaseData } from './components/NewArbitrationCaseModel'
import EditArbitrationCaseModal from './components/EditArbitrationCaseModal'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/firebase/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { initializeApp, getApp } from 'firebase/app'

// Firebase configuration - copy this from your firebase.ts file
// You may want to move this to an environment variable or config file
const firebaseConfig = {
    apiKey: "AIzaSyD72I02Uf1sg8TEJuanvXuwrA00LqWlbls",

    authDomain: "amacrm-76fd1.firebaseapp.com",
  
    databaseURL: "https://amacrm-76fd1-default-rtdb.firebaseio.com",
  
    projectId: "amacrm-76fd1",
  
    storageBucket: "amacrm-76fd1.firebasestorage.app",
  
    messagingSenderId: "1008668372239",
   
    appId: "1:1008668372239:web:03cca86d1675df6450227a",
  
    measurementId: "G-X1B7CKLRST",
};

// Initialize Firebase if it hasn't been initialized yet
let app: any;
try {
  app = getApp();
} catch (error) {
  app = initializeApp(firebaseConfig);
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending decision': return 'bg-purple-100 text-purple-800';
      case 'new filing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

// Boolean indicator component
const BooleanIndicator = ({ value }: { value: boolean }) => {
  return value ? 
    <FaCheck className="text-green-500" /> : 
    <FaTimes className="text-red-500" />
}

// Boolean indicator component with label
const BooleanIndicatorWithLabel = ({ value, label }: { value: boolean, label: string }) => {
  return (
    <div className="flex items-center">
      {value ? 
        <FaCheck className="text-green-500 mr-1" /> : 
        <FaTimes className="text-red-500 mr-1" />}
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// Add these new interfaces after the existing ones
interface RemarkHistory {
  remark: string;
  timestamp: any;
  advocateName: string;
}

export default function ArbitrationTracker() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cases, setCases] = useState<any[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [currentCase, setCurrentCase] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('advocate') // Default to advocate
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null) // Track which case is currently sending an email
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({});
  const [latestRemarks, setLatestRemarks] = useState<{ [key: string]: string }>({});
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCaseHistory, setSelectedCaseHistory] = useState<RemarkHistory[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  
  // Get user role from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole')
    if (storedRole) {
      setUserRole(storedRole.toLowerCase())
    }
  }, [])
  
  // Fetch arbitration cases from Firestore
  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true)
        const arbitrationRef = collection(db, 'arbitration')
        const q = query(arbitrationRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        
        const caseData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure teamEmails is always an array for consistency
          teamEmails: Array.isArray(doc.data().teamEmails) 
            ? doc.data().teamEmails 
            : [] // If not an array, use empty array instead of trying to split
        }))
        
        setCases(caseData)

        // Fetch latest remarks for all cases
        await Promise.all(caseData.map(caseItem => fetchLatestRemark(caseItem.id)));
      } catch (error) {
        console.error('Error fetching arbitration cases:', error)
        alert('Failed to load cases. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchCases()
  }, [])
  
  // Filter cases based on search term and status filter
  const filteredCases = cases.filter(arbitrationCase => {
    const matchesSearch = 
      searchTerm === '' || 
      arbitrationCase.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.bankName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      filterStatus === '' || 
      arbitrationCase.status?.toLowerCase() === filterStatus.toLowerCase()
    
    return matchesSearch && matchesStatus
  })
  
  const handleOpenModal = () => {
    setIsModalOpen(true)
  }
  
  const handleCloseModal = () => {
    setIsModalOpen(false)
  }
  
  const handleSubmitCase = async (caseData: ArbitrationCaseData) => {
    try {
      // Generate case ID
      
      // Prepare data for Firestore
      const newCaseData = {
        ...caseData,
        createdAt: serverTimestamp(),
        // teamEmails is already an array, no need to split
        teamEmails: Array.isArray(caseData.teamEmails) ? caseData.teamEmails : []
      }
      
      // Add document to Firestore
      const arbitrationRef = collection(db, 'arbitration')
      const docRef = await addDoc(arbitrationRef, newCaseData)
      
      // Add to local state (with ID from Firestore)
      setCases(prevCases => [
        {
          ...newCaseData,
          firestoreId: docRef.id
        },
        ...prevCases
      ])
    } catch (error) {
      console.error('Error adding arbitration case:', error)
      alert('Failed to create case. Please try again.')
    }
  }

  const handleSendEmailAndCalendar = async (arbitrationCase: any) => {
    try {
      // Set the current case as sending an email
      setSendingEmailFor(arbitrationCase.id);
      
      // Email functionality - teamEmails should already be an array
      const recipients = Array.isArray(arbitrationCase.teamEmails) 
        ? arbitrationCase.teamEmails 
        : []
      
      console.log(`Sending email to: ${recipients.join(', ')}`)
      
      // Calculate start and end date time from date and time strings
      const startDate = new Date(arbitrationCase.startDate + 'T' + arbitrationCase.time);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1); // Default to 1 hour meeting
      
      // Use the Firebase app that we initialized at the top of the file
      const functions = getFunctions(app);
      const createCalendarEventFunction = httpsCallable(functions, 'createCalendarEvent');
      
      // Add console log to see what we're sending
      const eventData = {
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        type: arbitrationCase.type,
        clientName: arbitrationCase.clientName,
        bankName: arbitrationCase.bankName,
        adv_name: arbitrationCase.adv_name,
        meetLink: arbitrationCase.meetLink,
        notes: arbitrationCase.notes,
        id: arbitrationCase.id,
        startDate: arbitrationCase.startDate,
        time: arbitrationCase.time,
        teamEmails: recipients
      };
      
      console.log('Sending event data to Cloud Function:', eventData);
      
      // Try to call the Cloud Function
      try {
        const result = await createCalendarEventFunction(eventData);
        console.log('Function result:', result);
        
        // Update the database to mark this case as having been sent
        const caseRef = doc(db, 'arbitration', arbitrationCase.id);
        await updateDoc(caseRef, {
          emailSent: true,
          emailSentBy: localStorage.getItem('userName') || 'Unknown user',
          emailSentAt: serverTimestamp()
        });
        
        // Update the local state
        setCases(prevCases => 
          prevCases.map(c => 
            c.id === arbitrationCase.id 
              ? { 
                  ...c, 
                  emailSent: true, 
                  emailSentBy: localStorage.getItem('userName') || 'Unknown user'
                } 
              : c
          )
        );
        
        // Show success notification
        alert(`Email and calendar invitation sent to team for case ${arbitrationCase.id}`);
      } catch (functionError: any) {
        console.error('Cloud Function error:', functionError);
        alert('There was an issue with the email service. Please contact your administrator with this message: ' + 
              (functionError.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error details:', error);
      alert('Failed to send email: ' + (error.message || 'Unknown error'));
    } finally {
      // Clear the sending state regardless of success or failure
      setSendingEmailFor(null);
    }
  }

  const handleOpenEditModal = (arbitrationCase: any) => {
    console.log('Opening edit modal with case:', arbitrationCase);
    
    // Make sure we're passing the complete case object including the document ID
    setCurrentCase({
      ...arbitrationCase,
      // If the document ID isn't already in the object, make sure it's included
      firestoreId: arbitrationCase.id  // In Firestore this should be the document ID
    });
    
    setIsEditModalOpen(true);
  }
  
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
  }
  
  const handleUpdateCase = async (id: string, updatedCaseData: ArbitrationCaseData) => {
    try {
      // We no longer need to update Firestore here
      // That's now handled directly in the EditArbitrationCaseModal component
      
      // Ensure we properly update the UI state to reflect email status changes
      // This ensures Send button becomes available again when relevant fields are edited
      setCases(prevCases => 
        prevCases.map(c => {
          if (c.id === id) {
            // Create updated case with all new values
            const updatedCase = { ...c, ...updatedCaseData };
            
            // Check if emailSent was specifically set to false in the updates
            // This happens when important fields like date, time, etc. change
            if (updatedCaseData.hasOwnProperty('emailSent') && updatedCaseData.emailSent === false) {
              console.log('Email status reset for case:', id);
              // Make sure UI reflects this reset status
              updatedCase.emailSent = false;
              updatedCase.emailSentBy = null;
              updatedCase.emailSentAt = null;
            }
            
            return updatedCase;
          }
          return c;
        })
      );
      
      // No need for explicit alert since toast is shown in the modal
    } catch (error) {
      console.error('Error updating local state:', error);
    }
  }

  const fetchLatestRemark = async (caseId: string) => {
    try {
      const historyRef = collection(db, 'arbitration', caseId, 'history');
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const latestRemark = snapshot.docs[0].data().remark;
        setLatestRemarks(prev => ({ ...prev, [caseId]: latestRemark }));
        setRemarks(prev => ({ ...prev, [caseId]: latestRemark }));
      }
    } catch (error) {
      console.error("Error fetching latest remark:", error);
    }
  };

  const handleRemarkChange = (caseId: string, value: string) => {
    setRemarks(prev => ({ ...prev, [caseId]: value }));
  };

  const handleSaveRemark = async (caseId: string) => {
    try {
      const advocateName = localStorage.getItem("userName") || "Unknown Advocate";
      const remarkText = remarks[caseId]?.trim();
      
      if (!remarkText) {
        alert("Please enter a remark before saving");
        return;
      }

      const historyRef = collection(db, 'arbitration', caseId, 'history');
      await addDoc(historyRef, {
        remark: remarkText,
        timestamp: serverTimestamp(),
        advocateName
      });

      // Update latest remarks
      setLatestRemarks(prev => ({ ...prev, [caseId]: remarkText }));
      setRemarks(prev => ({ ...prev, [caseId]: remarkText }));
      alert("Remark saved successfully");
    } catch (error) {
      console.error("Error saving remark:", error);
      alert("Failed to save remark");
    }
  };

  const handleViewHistory = async (caseId: string) => {
    try {
      const historyRef = collection(db, 'arbitration', caseId, 'history');
      const q = query(historyRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      
      const history = snapshot.docs.map(doc => ({
        ...doc.data()
      } as RemarkHistory));

      setSelectedCaseHistory(history);
      setSelectedCaseId(caseId);
      setIsHistoryModalOpen(true);
    } catch (error) {
      console.error("Error fetching history:", error);
      alert("Failed to fetch history");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {userRole === 'overlord' ? <OverlordSidebar /> : <AdvocateSidebar />}
      
      <div className="flex-1 p-8">
        <Toaster position="top-right" />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Arbitration Tracker</h1>
          <p className="text-gray-600 mt-2">Monitor and manage all your arbitration cases</p>
        </div>
        
        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleOpenModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
            >
              <FaPlus className="mr-2" />
              New Case
            </button>
            
            <select 
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in progress">In Progress</option>
              <option value="pending decision">Pending Decision</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search cases..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
         {/* Summary Cards */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 font-medium">Total Cases</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{cases.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 font-medium">In Progress</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {cases.filter(c => c.status?.toLowerCase() === 'in progress').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 font-medium">Upcoming (7 days)</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {cases.filter(c => {
                // Calculate upcoming cases based on startDate
                if (!c.startDate) return false;
                
                const caseDate = new Date(c.startDate);
                const today = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7);
                
                return caseDate >= today && caseDate <= nextWeek;
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 font-medium">Missing Documents</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {cases.filter(c => !c.vakalatnama || !c.onlineLinkLetter).length}
            </p>
          </div>
        </div>
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64 mt-5">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {/* Cases Table */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mt-5">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No arbitration cases found. Click "New Case" to add one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Advocate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank 
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Meet 
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vakalatnama
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Online Link Letter
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email Sent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Edited By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remarks
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCases.map((arbitrationCase, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {arbitrationCase.clientName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {arbitrationCase.adv_name || 'Not assigned'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {arbitrationCase.type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {arbitrationCase.startDate}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {arbitrationCase.time}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <StatusBadge status={arbitrationCase.status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {arbitrationCase.bankName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {arbitrationCase.meetLink ? (
                            <a 
                              href={arbitrationCase.meetLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <FaLink className="mr-1" /> Join
                            </a>
                          ) : (
                            "Not available"
                          )}
                        </td>
                        <td className="px-20 py-4 whitespace-nowrap text-sm text-center">
                          <BooleanIndicator value={arbitrationCase.vakalatnama} />
                        </td>
                        <td className="px-20 py-4 whitespace-nowrap text-sm text-center">
                          <BooleanIndicator value={arbitrationCase.onlineLinkLetter} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button
                            className="flex items-center text-gray-600 hover:text-indigo-600"
                            title={Array.isArray(arbitrationCase.teamEmails) 
                              ? arbitrationCase.teamEmails.join(', ')
                              : String(arbitrationCase.teamEmails)}
                          >
                            <FaEnvelope className="mr-1" /> Team
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {arbitrationCase.emailSent ? (
                            <div className="text-green-600" title={`Sent by ${arbitrationCase.emailSentBy || 'Unknown'}`}>
                              <FaCheck className="inline mr-1" /> Sent
                            </div>
                          ) : (
                            <div className="text-gray-500">
                              <FaTimes className="inline mr-1" /> Not sent
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {arbitrationCase.lastedit_by || 'Not edited yet'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-2">
                            <textarea
                              value={remarks[arbitrationCase.id] || ""}
                              onChange={(e) => handleRemarkChange(arbitrationCase.id, e.target.value)}
                              placeholder="Enter remark..."
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSaveRemark(arbitrationCase.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors duration-200"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => handleViewHistory(arbitrationCase.id)}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors duration-200"
                              >
                                History
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button 
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            onClick={() => handleOpenEditModal(arbitrationCase)}
                          >
                            Edit
                          </button>
                          <button 
                            className={`text-white px-2 py-1 rounded ${
                              arbitrationCase.emailSent 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : sendingEmailFor === arbitrationCase.id
                                  ? 'bg-indigo-400 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                            onClick={() => !arbitrationCase.emailSent && sendingEmailFor === null && handleSendEmailAndCalendar(arbitrationCase)}
                            disabled={arbitrationCase.emailSent || sendingEmailFor === arbitrationCase.id}
                            title={
                              arbitrationCase.emailSent 
                                ? 'Email already sent' 
                                : sendingEmailFor === arbitrationCase.id
                                  ? 'Sending email...'
                                  : 'Send email to team'
                            }
                          >
                            {arbitrationCase.emailSent 
                              ? 'Sent' 
                              : sendingEmailFor === arbitrationCase.id
                                ? 'Sending...'
                                : 'Send'
                            }
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
       
      </div>
      
      {/* New Arbitration Case Modal */}
      <NewArbitrationCaseModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitCase}
      />
      
      {/* Edit Arbitration Case Modal */}
      <EditArbitrationCaseModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleUpdateCase}
        caseData={currentCase}
      />

      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Remark History</h2>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedCaseHistory.map((history, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-purple-600 font-medium">{history.advocateName}</span>
                    <span className="text-gray-500 text-sm">
                      {history.timestamp?.toDate?.()?.toLocaleString('en-IN') || 'Unknown date'}
                    </span>
                  </div>
                  <p className="text-gray-700">{history.remark}</p>
                </div>
              ))}
              
              {selectedCaseHistory.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No remarks history available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
