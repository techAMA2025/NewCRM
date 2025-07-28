'use client'

import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import { FaPlus, FaSearch, FaLink, FaCheck, FaTimes, FaFileSignature, FaEnvelope, FaCalendarAlt } from 'react-icons/fa'
import NewArbitrationCaseModal, { ArbitrationCaseData } from './components/NewArbitrationCaseModel'
import EditArbitrationCaseModal from './components/EditArbitrationCaseModal'
import { v4 as uuidv4 } from 'uuid'
import { db, app, functions } from '@/firebase/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, limit, deleteDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions' 

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
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

// Boolean indicator component
const BooleanIndicator = ({ value }: { value: boolean }) => {
  return value ? 
    <FaCheck className="text-green-500 text-xs" /> : 
    <FaTimes className="text-red-500 text-xs" />
}

// Boolean indicator component with label
const BooleanIndicatorWithLabel = ({ value, label }: { value: boolean, label: string }) => {
  return (
    <div className="flex items-center">
      {value ? 
        <FaCheck className="text-green-500 mr-0.5 text-xs" /> : 
        <FaTimes className="text-red-500 mr-0.5 text-xs" />}
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

// Add these new interfaces after the existing ones
interface RemarkHistory {
  remark: string;
  timestamp: any;
  advocateName: string;
}

// Date formatting function
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB'); // This formats as dd/mm/yyyy
}

export default function ArbitrationTracker() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
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
  
  // Filter cases based on search term, status filter, and date filter
  const filteredCases = cases.filter(arbitrationCase => {
    const matchesSearch = 
      searchTerm === '' || 
      arbitrationCase.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.bankName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      filterStatus === '' || 
      arbitrationCase.status?.toLowerCase() === filterStatus.toLowerCase()
    
    // Date filtering logic
    const matchesDate = (() => {
      if (!dateFilter || !arbitrationCase.startDate) return true;
      
      const caseDate = new Date(arbitrationCase.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      switch (dateFilter) {
        case '7days':
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          return caseDate >= today && caseDate <= nextWeek;
        
        case '2weeks':
          const twoWeeks = new Date(today);
          twoWeeks.setDate(today.getDate() + 14);
          return caseDate >= today && caseDate <= twoWeeks;
        
        case '30days':
          const thirtyDays = new Date(today);
          thirtyDays.setDate(today.getDate() + 30);
          return caseDate >= today && caseDate <= thirtyDays;
        
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // Set to end of day
          return caseDate >= startDate && caseDate <= endDate;
        
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
    // Sort by date with priority: today first, then future dates, then past dates
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1; // Cases without dates go to the end
    if (!b.startDate) return -1;
    
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Check if dates are today, future, or past
    const isAToday = dateA.getTime() === today.getTime();
    const isBToday = dateB.getTime() === today.getTime();
    const isAFuture = dateA > today;
    const isBFuture = dateB > today;
    const isAPast = dateA < today;
    const isBPast = dateB < today;
    
    // Today's cases come first
    if (isAToday && !isBToday) return -1;
    if (!isAToday && isBToday) return 1;
    
    // If both are today, sort by time if available
    if (isAToday && isBToday) {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      return 0;
    }
    
    // Future dates come next, sorted in ascending order
    if (isAFuture && isBFuture) {
      return dateA.getTime() - dateB.getTime();
    }
    if (isAFuture && !isBFuture) return -1;
    if (!isAFuture && isBFuture) return 1;
    
    // Past dates come last, sorted in descending order (most recent past first)
    if (isAPast && isBPast) {
      return dateB.getTime() - dateA.getTime();
    }
    if (isAPast && !isBPast) return 1;
    if (!isAPast && isBPast) return -1;
    
    return 0;
  });
  
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

  const handleDeleteCase = async (caseId: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
        return;
      }

      // Delete the document from Firestore
      await deleteDoc(doc(db, 'arbitration', caseId));

      // Update local state
      setCases(prevCases => prevCases.filter(c => c.id !== caseId));
      alert('Case deleted successfully');
    } catch (error) {
      console.error('Error deleting case:', error);
      alert('Failed to delete case. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {userRole === 'overlord' ? (
        <OverlordSidebar>
          <div className="flex-1 p-4">
            <Toaster position="top-right" />
            
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Arbitration Tracker</h1>
              <p className="text-gray-600 mt-1 text-sm">Monitor and manage all your arbitration cases</p>
            </div>
            
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleOpenModal}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 transition-colors text-sm"
                >
                  <FaPlus className="mr-1.5 text-xs" />
                  New Case
                </button>
                
                <select 
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in progress">In Progress</option>
                  <option value="pending decision">Pending Decision</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Date Filter */}
                <div className="flex items-center space-x-2">
                  <select 
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="">All Dates</option>
                    <option value="7days">Next 7 Days</option>
                    <option value="2weeks">Next 2 Weeks</option>
                    <option value="30days">Next 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {dateFilter === 'custom' && (
                    <div className="flex items-center space-x-1">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-xs"
                        placeholder="Start Date"
                      />
                      <span className="text-gray-500 text-xs">to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-xs"
                        placeholder="End Date"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="relative">
                <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search cases..."
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg w-48 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
             {/* Summary Cards */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 font-medium">Filtered Cases</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{filteredCases.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 font-medium">In Progress</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {filteredCases.filter(c => c.status?.toLowerCase() === 'in progress').length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 font-medium">Upcoming (7 days)</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {filteredCases.filter(c => {
                    if (!c.startDate) return false;
                    const caseDate = new Date(c.startDate);
                    const today = new Date();
                    const nextWeek = new Date();
                    nextWeek.setDate(today.getDate() + 7);
                    return caseDate >= today && caseDate <= nextWeek;
                  }).length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 font-medium">Missing Documents</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {filteredCases.filter(c => !c.vakalatnama || !c.onlineLinkLetter).length}
                </p>
              </div>
            </div>
            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center h-48 mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            )}
            
            {/* Cases Table */}
            {!loading && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden mt-4">
                {filteredCases.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 text-sm">No arbitration cases found. Click "New Case" to add one.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                             Name
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Advocate
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                             Date
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Bank 
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Meet 
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Vakalatnama
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Online Link Letter
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Email Sent
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Last Edited By
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Remarks
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCases.map((arbitrationCase, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {arbitrationCase.clientName}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.adv_name || 'Not assigned'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.type}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {formatDate(arbitrationCase.startDate)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.time}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <StatusBadge status={arbitrationCase.status} />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.bankName}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.meetLink ? (
                                <a 
                                  href={arbitrationCase.meetLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  <FaLink className="mr-1 text-xs" /> Join
                                </a>
                              ) : (
                                "Not available"
                              )}
                            </td>
                            <td className="px-12 py-2 whitespace-nowrap text-xs text-center">
                              <BooleanIndicator value={arbitrationCase.vakalatnama} />
                            </td>
                            <td className="px-12 py-2 whitespace-nowrap text-xs text-center">
                              <BooleanIndicator value={arbitrationCase.onlineLinkLetter} />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              {arbitrationCase.emailSent ? (
                                <div className="text-green-600" title={`Sent by ${arbitrationCase.emailSentBy || 'Unknown'}`}>
                                  <FaCheck className="inline mr-1 text-xs" /> Sent
                                </div>
                              ) : (
                                <div className="text-gray-500">
                                  <FaTimes className="inline mr-1 text-xs" /> Not sent
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.lastEditedBy || 'Unknown'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={remarks[arbitrationCase.id] || ''}
                                  onChange={(e) => handleRemarkChange(arbitrationCase.id, e.target.value)}
                                  placeholder="Add remark..."
                                  className="w-20 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={() => handleSaveRemark(arbitrationCase.id)}
                                  className="px-1 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => handleViewHistory(arbitrationCase.id)}
                                  className="px-1 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  History
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleOpenEditModal(arbitrationCase)}
                                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCase(arbitrationCase.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Delete
                                </button>
                                {!arbitrationCase.emailSent && (
                                  <button
                                    onClick={() => handleSendEmailAndCalendar(arbitrationCase)}
                                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Send Email
                                  </button>
                                )}
                              </div>
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
        </OverlordSidebar>
      ) : (
        <>
          <AdvocateSidebar />
          <div className="flex-1 p-4">
            <Toaster position="top-right" />
            
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Arbitration Tracker</h1>
              <p className="text-gray-600 mt-1 text-sm">Monitor and manage all your arbitration cases</p>
            </div>
            
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleOpenModal}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 transition-colors text-sm"
                >
                  <FaPlus className="mr-1.5 text-xs" />
                  New Case
                </button>
                
                <select 
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in progress">In Progress</option>
                  <option value="pending decision">Pending Decision</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Date Filter */}
                <div className="flex items-center space-x-2">
                  <select 
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="">All Dates</option>
                    <option value="7days">Next 7 Days</option>
                    <option value="2weeks">Next 2 Weeks</option>
                    <option value="30days">Next 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {dateFilter === 'custom' && (
                    <div className="flex items-center space-x-1">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-xs"
                        placeholder="Start Date"
                      />
                      <span className="text-gray-500 text-xs">to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-xs"
                        placeholder="End Date"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="relative">
                <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search cases..."
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg w-48 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
             {/* Summary Cards */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 font-medium">Filtered Cases</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{filteredCases.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 font-medium">In Progress</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {filteredCases.filter(c => c.status?.toLowerCase() === 'in progress').length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 font-medium">Upcoming (7 days)</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {filteredCases.filter(c => {
                    if (!c.startDate) return false;
                    const caseDate = new Date(c.startDate);
                    const today = new Date();
                    const nextWeek = new Date();
                    nextWeek.setDate(today.getDate() + 7);
                    return caseDate >= today && caseDate <= nextWeek;
                  }).length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 font-medium">Missing Documents</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {filteredCases.filter(c => !c.vakalatnama || !c.onlineLinkLetter).length}
                </p>
              </div>
            </div>
            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center h-48 mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            )}
            
            {/* Cases Table */}
            {!loading && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden mt-4">
                {filteredCases.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 text-sm">No arbitration cases found. Click "New Case" to add one.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                             Name
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Advocate
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                             Date
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Bank 
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Meet 
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Vakalatnama
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Online Link Letter
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Email Sent
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Last Edited By
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Remarks
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCases.map((arbitrationCase, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {arbitrationCase.clientName}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.adv_name || 'Not assigned'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.type}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {formatDate(arbitrationCase.startDate)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.time}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <StatusBadge status={arbitrationCase.status} />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.bankName}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.meetLink ? (
                                <a 
                                  href={arbitrationCase.meetLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  <FaLink className="mr-1 text-xs" /> Join
                                </a>
                              ) : (
                                "Not available"
                              )}
                            </td>
                            <td className="px-12 py-2 whitespace-nowrap text-xs text-center">
                              <BooleanIndicator value={arbitrationCase.vakalatnama} />
                            </td>
                            <td className="px-12 py-2 whitespace-nowrap text-xs text-center">
                              <BooleanIndicator value={arbitrationCase.onlineLinkLetter} />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              {arbitrationCase.emailSent ? (
                                <div className="text-green-600" title={`Sent by ${arbitrationCase.emailSentBy || 'Unknown'}`}>
                                  <FaCheck className="inline mr-1 text-xs" /> Sent
                                </div>
                              ) : (
                                <div className="text-gray-500">
                                  <FaTimes className="inline mr-1 text-xs" /> Not sent
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {arbitrationCase.lastEditedBy || 'Unknown'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={remarks[arbitrationCase.id] || ''}
                                  onChange={(e) => handleRemarkChange(arbitrationCase.id, e.target.value)}
                                  placeholder="Add remark..."
                                  className="w-20 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={() => handleSaveRemark(arbitrationCase.id)}
                                  className="px-1 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => handleViewHistory(arbitrationCase.id)}
                                  className="px-1 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  History
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleOpenEditModal(arbitrationCase)}
                                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCase(arbitrationCase.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Delete
                                </button>
                                {!arbitrationCase.emailSent && (
                                  <button
                                    onClick={() => handleSendEmailAndCalendar(arbitrationCase)}
                                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Send Email
                                  </button>
                                )}
                              </div>
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
        </>
      )}
      
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl p-4 w-full max-w-xl animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Remark History</h2>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-full h-6 w-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {selectedCaseHistory.map((history, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-purple-600 font-medium text-xs">{history.advocateName}</span>
                    <span className="text-gray-500 text-[10px]">
                      {history.timestamp?.toDate?.()?.toLocaleString('en-IN') || 'Unknown date'}
                    </span>
                  </div>
                  <p className="text-gray-700 text-xs">{history.remark}</p>
                </div>
              ))}
              
              {selectedCaseHistory.length === 0 && (
                <div className="text-center text-gray-500 py-6 text-sm">
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
