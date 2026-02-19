'use client'

import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import AssistantSidebar from '@/components/navigation/AssistantSidebar'
import { FaPlus, FaSearch, FaCheck, FaTimes } from 'react-icons/fa'
import NewArbitrationCaseModal, { ArbitrationCaseData } from './components/NewArbitrationCaseModel'
import EditArbitrationCaseModal from './components/EditArbitrationCaseModal'
import { db } from '@/firebase/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore'

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

// Date formatting function
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB'); // This formats as dd/mm/yyyy
}

// Time formatting function to handle invalid dates and different formats
const formatTime = (timeString: string | undefined | null): string => {
  if (!timeString) return '';
  
  const time = String(timeString).trim();
  const invalidPatterns = ['invalid', 'nan', 'null', 'undefined'];
  if (invalidPatterns.some(pattern => time.toLowerCase().includes(pattern))) return '';
  
  if (time.includes('T') && time.includes('Z')) {
    try {
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    } catch (e) {}
  }
  
  const match = time.match(/([0-1][0-9]|2[0-3]):[0-5][0-9]/);
  return match ? match[0] : '';
}

// Normalize time value to HH:mm format
const normalizeTimeForStorage = (timeValue: string | undefined | null): string => {
  if (!timeValue) return '';
  const normalized = formatTime(timeValue);
  return normalized || '';
}

const RemarkInput = ({ 
  caseId, 
  initialValue, 
  onSave,
  onHistory
}: { 
  caseId: string
  initialValue: string
  onSave: (id: string, value: string) => Promise<void>
  onHistory: (id: string) => void
}) => {
  const [value, setValue] = useState(initialValue || '')
  const [isSaving, setIsSaving] = useState(false)

  // Sync with initialValue if it changes from outside
  useEffect(() => { setValue(initialValue || '') }, [initialValue])

  const handleSave = async () => {
     if (value === initialValue && value !== '') return; // Allow empty save? Or require change.
     setIsSaving(true);
     await onSave(caseId, value);
     setIsSaving(false);
  }

  return (
    <div className="flex flex-col space-y-1 min-w-[150px]">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add remark..."
        className="w-full px-2 py-1 border border-gray-200 rounded text-xs h-16 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
      />
      <div className="flex justify-end space-x-1">
        <button
            onClick={() => onHistory(caseId)}
            className="px-2 py-1 text-[10px] bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
            Hist
        </button>
        <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-2 py-1 text-[10px] bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
            {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

const ArbitrationRow = ({ 
  c, 
  formatDate, 
  formatTime, 
  StatusBadge, 
  BooleanIndicator, 
  handleOpenEditModal, 
  handleDeleteCase,
  handleHistory
}: any) => {
   const [paymentStatus, setPaymentStatus] = useState(c.paymentStatus || 'Select');
   const [payAmount, setPayAmount] = useState(c.payAmount || '');
   
    // Wrapper for save
    const handleSavePayment = async () => {
         try {
             const caseRef = doc(db, 'arbitration', c.id);
             await updateDoc(caseRef, {
                 paymentStatus,
                 payAmount: payAmount.toString().replace(/,/g, '') // Sanitize
             });
             // Optional: Toast success
              const toast = (window as any).toast || console.log;
         } catch (error) {
             console.error(error);
             alert('Failed to save payment details');
         }
    }
 
    const handleSaveRemark = async (id: string, val: string) => {
         try {
             const caseRef = doc(db, 'arbitration', id);
             // Save to history subcollection
              const historyRef = collection(db, "arbitration", id, "remarks_history")
              // Check if user name is available in localStorage
              const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') : 'Unknown';
              
              await addDoc(historyRef, {
                 remark: val,
                 timestamp: serverTimestamp(),
                 updatedBy: userName || 'Unknown' 
              })
              
             await updateDoc(caseRef, { remarks: val });
         } catch (e) {
             console.error(e);
             alert('Failed to save remark');
         }
    }
    
    // Helper for formatting
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       const val = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
       if (!val) { setPayAmount(''); return; }
       
       // Handle multiple dots
       if ((val.match(/\./g) || []).length > 1) return;
 
       if (val.endsWith('.')) { 
           // allow typing decimal
            const parts = val.split('.');
            setPayAmount(Number(parts[0]).toLocaleString('en-IN') + '.');
       } else {
         // preserve decimal part if exists
         const parts = val.split('.');
         if (parts.length > 1) {
             setPayAmount(Number(parts[0]).toLocaleString('en-IN') + '.' + parts[1]);
         } else {
             setPayAmount(Number(val).toLocaleString('en-IN'));
         }
       }
    }
 
    // Helper for payment status color
    const getPaymentStatusColor = (status: string) => {
      switch (status) {
        case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
        case 'Partially Paid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'Not Paid': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-white border-gray-200 text-gray-700';
      }
    }
 
    // Initialize state from props (in case of re-render/update from parent)
    useEffect(() => {
      setPaymentStatus(c.paymentStatus || 'Select');
      setPayAmount(c.payAmount ? Number(c.payAmount).toLocaleString('en-IN') : '');
    }, [c.paymentStatus, c.payAmount]);
 
    return (
       <tr className="hover:bg-gray-50/80 transition-all group">
          <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">{formatDate(c.startDate)}</td>
          <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
              <div className="font-bold">{c.clientName}</div>
              <div className="text-xs text-indigo-600 font-semibold mt-0.5 uppercase tracking-wide">{c.type}</div>
          </td>
          <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{c.adv_name || '-'}</td>
          <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">{formatTime(c.time) || '-'}</td>
          <td className="px-6 py-5 whitespace-nowrap text-sm text-indigo-600 font-bold">#{c.hearingCount || 1}</td>
          <td className="px-6 py-5 whitespace-nowrap"><StatusBadge status={c.status} /></td>
          
          {/* New Columns */}
         <td className="px-6 py-5 whitespace-nowrap">
             <select 
                 value={paymentStatus}
                 onChange={(e) => setPaymentStatus(e.target.value)}
                 className={`px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer w-full font-medium ${getPaymentStatusColor(paymentStatus)}`}
             >
                 <option value="Select" className="bg-white text-gray-700">Select</option>
                 <option value="Not Paid" className="bg-white text-gray-700">Not Paid</option>
                 <option value="Partially Paid" className="bg-white text-gray-700">Partially Paid</option>
                 <option value="Paid" className="bg-white text-gray-700">Paid</option>
             </select>
         </td>
        <td className="px-6 py-5 whitespace-nowrap">
            <div className="flex items-center gap-2">
                <input 
                    type="text" 
                    value={payAmount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="w-24 px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                   onClick={handleSavePayment}
                   className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors shadow-sm"
                   title="Save Amount"
                >
                    <FaCheck className="text-xs" />
                </button>
            </div>
        </td>
        <td className="px-6 py-5 whitespace-nowrap">
             <RemarkInput caseId={c.id} initialValue={c.remarks} onSave={handleSaveRemark} onHistory={handleHistory} />
        </td>

         <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 truncate max-w-[150px]" title={c.bankName}>{c.bankName}</td>
         <td className="px-6 py-5 whitespace-nowrap text-center">
            <div className="flex justify-center"><BooleanIndicator value={c.vakalatnama} /></div>
         </td>
         <td className="px-6 py-5 whitespace-nowrap text-center">
            <div className="flex justify-center"><BooleanIndicator value={c.sod} /></div>
         </td>
         <td className="px-6 py-5 whitespace-nowrap text-right">
             <div className="flex justify-end items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenEditModal(c)} className="text-indigo-600 hover:text-indigo-900 font-bold text-xs">EDIT</button>
                <button onClick={() => handleDeleteCase(c.id)} className="text-red-600 hover:text-red-900 font-bold text-xs">DEL</button>
             </div>
         </td>
      </tr>
   )
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
  const [userRole, setUserRole] = useState<string>('advocate')
  
  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedCaseHistory, setSelectedCaseHistory] = useState<any[]>([])

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole')
    if (storedRole) {
      setUserRole(storedRole.toLowerCase().trim())
    }
  }, [])

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true)
        const arbitrationRef = collection(db, 'arbitration')
        const q = query(arbitrationRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        
        const caseData = snapshot.docs.map(doc => {
          const data = doc.data();
          const normalizedTime = data.time ? normalizeTimeForStorage(data.time) : '';
          return {
            id: doc.id,
            ...data,
            time: normalizedTime
          }
        })
        
        setCases(caseData)
      } catch (error) {
        console.error('Error fetching arbitration cases:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCases()
  }, [])
  
  const handleHistory = async (caseId: string) => {
      setIsHistoryModalOpen(true)
      setSelectedCaseHistory([]) // clear previous
      try {
          const historyRef = collection(db, 'arbitration', caseId, 'remarks_history')
          const q = query(historyRef, orderBy('timestamp', 'desc'))
          const snapshot = await getDocs(q)
          const history = snapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id
          }))
          setSelectedCaseHistory(history)
      } catch (e) {
          console.error(e)
      }
  }

  const filteredCases = cases.filter(arbitrationCase => {
    const matchesSearch = 
      searchTerm === '' || 
      arbitrationCase.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.bankName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      filterStatus === '' || 
      arbitrationCase.status?.toLowerCase() === filterStatus.toLowerCase()
    
    const matchesDate = (() => {
      if (!dateFilter || !arbitrationCase.startDate) return true;
      const caseDate = new Date(arbitrationCase.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      
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
          endDate.setHours(23, 59, 59, 999); 
          return caseDate >= startDate && caseDate <= endDate;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB.getTime() - dateA.getTime();
  });

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)
  
  const handleSubmitCase = async (caseData: ArbitrationCaseData) => {
    try {
      const newCaseData = {
        ...caseData,
        time: normalizeTimeForStorage(caseData.time),
        createdAt: serverTimestamp()
      }
      const arbitrationRef = collection(db, 'arbitration')
      const docRef = await addDoc(arbitrationRef, newCaseData)
      setCases(prevCases => [{ ...newCaseData, id: docRef.id }, ...prevCases])
    } catch (error) {
      console.error('Error adding arbitration case:', error)
    }
  }

  const handleOpenEditModal = (arbitrationCase: any) => {
    setCurrentCase({ ...arbitrationCase, firestoreId: arbitrationCase.id });
    setIsEditModalOpen(true);
  }
  
  const handleCloseEditModal = () => setIsEditModalOpen(false)
  
  const handleUpdateCase = async (id: string, updatedCaseData: ArbitrationCaseData) => {
    setCases(prevCases => 
      prevCases.map(c => c.id === id ? { ...c, ...updatedCaseData } : c)
    );
  }

  const handleDeleteCase = async (caseId: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this case?')) return;
      await deleteDoc(doc(db, 'arbitration', caseId));
      setCases(prevCases => prevCases.filter(c => c.id !== caseId));
    } catch (error) {
      console.error('Error deleting case:', error);
    }
  };

  const renderSidebar = (children: React.ReactNode) => {
    const wrappedChildren = <div className="p-4 lg:p-8 w-full min-h-screen bg-gray-50">{children}</div>;
    switch (userRole) {
      case 'overlord': return <OverlordSidebar>{wrappedChildren}</OverlordSidebar>;
      case 'assistant': return <div className="flex"><AssistantSidebar />{wrappedChildren}</div>;
      default: return <div className="flex"><AdvocateSidebar />{wrappedChildren}</div>;
    }
  };

  return renderSidebar(
    <div className="w-full">
      <Toaster position="top-right" />
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Arbitration Tracker</h2>
        <p className="text-gray-500 mt-2 text-base">Monitor and manage all your arbitration cases in real-time.</p>
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenModal}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl flex items-center hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold whitespace-nowrap"
          >
            <FaPlus className="mr-2 text-xs" /> New Case
          </button>
          <div className="h-8 w-px bg-gray-200 mx-2" />
          <select 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in progress">In Progress</option>
            <option value="pending decision">Pending Decision</option>
            <option value="completed">Completed</option>
          </select>
          <select 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="">All Dates</option>
            <option value="7days">Next 7 Days</option>
            <option value="2weeks">Next 2 Weeks</option>
            <option value="30days">Next 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input 
            type="text" 
            placeholder="Search clients, banks, or IDs..." 
            className="pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl w-64 lg:w-80 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Filtered Cases</p>
          <p className="text-4xl font-black text-gray-900 mt-2">{filteredCases.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">In Progress</p>
          <p className="text-4xl font-black text-indigo-600 mt-2">{filteredCases.filter(c => c.status?.toLowerCase() === 'in progress').length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Missing Documents</p>
          <p className="text-4xl font-black text-red-500 mt-2">{filteredCases.filter(c => !c.vakalatnama || !c.sod).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-[4px] border-indigo-50 border-t-indigo-600"></div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FaSearch className="text-gray-200 text-3xl" />
            </div>
            <p className="text-gray-500 font-medium text-lg">No cases found</p>
            <p className="text-gray-400 text-sm">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client Name</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Advocate</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hearing #</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Status</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pay Amount</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bank</th>
                      <th className="px-6 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">VKL</th>
                      <th className="px-6 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">SOD</th>
                      <th className="px-6 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredCases.map((c) => (
                      <ArbitrationRow 
                        key={c.id} 
                        c={c} 
                        formatDate={formatDate}
                        formatTime={formatTime}
                        StatusBadge={StatusBadge}
                        BooleanIndicator={BooleanIndicator}
                        handleOpenEditModal={handleOpenEditModal}
                        handleDeleteCase={handleDeleteCase}
                        handleHistory={handleHistory}
                      />
                    ))}
                  </tbody>
            </table>
          </div>
        )}
      </div>

      <NewArbitrationCaseModal isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleSubmitCase} />
      <EditArbitrationCaseModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onUpdate={handleUpdateCase} caseData={currentCase} />
      
       {/* History Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg border border-gray-300 p-4 w-full max-w-2xl shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Remark History
                </h2>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {selectedCaseHistory.map((history, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-purple-600">
                        {history.updatedBy || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {history.timestamp?.toDate?.()?.toLocaleString("en-IN") || "Unknown date"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">
                      {history.remark}
                    </p>
                  </div>
                ))}
                {selectedCaseHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
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
