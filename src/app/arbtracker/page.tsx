'use client'

import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import AssistantSidebar from '@/components/navigation/AssistantSidebar'
import { FaPlus, FaSearch, FaCheck, FaTimes, FaGripVertical } from 'react-icons/fa'
import { Moon, Sun } from 'lucide-react'
import NewArbitrationCaseModal, { ArbitrationCaseData } from './components/NewArbitrationCaseModel'
import EditArbitrationCaseModal from './components/EditArbitrationCaseModal'
import CustomDateInput from './components/CustomDateInput'
import { db } from '@/firebase/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ThemeToggle } from '@/components/ThemeToggle'

// Column Definitions
const DEFAULT_COLUMNS = [
  { id: 'date', label: 'Date', width: 'w-32' },
  { id: 'clientName', label: 'Client Name', width: 'w-48' },
  { id: 'clientAdvocate', label: 'Client Advocate', width: 'w-40' },
  { id: 'advocate', label: 'Case Advocate', width: 'w-32' },
  { id: 'time', label: 'Time', width: 'w-24' },
  { id: 'hearing', label: 'Hearing #', width: 'w-24' },
  { id: 'status', label: 'Status', width: 'w-32' },
  { id: 'paymentStatus', label: 'Payment Status', width: 'w-40' },
  { id: 'payAmount', label: 'Pay Amount', width: 'w-32' },
  { id: 'remarks', label: 'Remarks', width: 'w-64' },
  { id: 'bank', label: 'Bank', width: 'w-32' },
  { id: 'vkl', label: 'VKL', width: 'w-16' },
  { id: 'sod', label: 'SOD', width: 'w-16' },
  { id: 'actions', label: 'Actions', width: 'w-24' },
];

// Sortable Header Component
function SortableHeader({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-400 select-none group relative whitespace-nowrap`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2">
        <FaGripVertical className="opacity-0 group-hover:opacity-100 text-gray-400" />
        {children}
      </div>
    </th>
  );
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'pending decision': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'new filing': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300';
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
        className="w-full px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-xs h-16 resize-none focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-800 dark:text-gray-200"
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
  columnOrder,
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
        case 'Paid': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
        case 'Partially Paid': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
        case 'Not Paid': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
        default: return 'bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300';
      }
    }
 
    // Initialize state from props (in case of re-render/update from parent)
    useEffect(() => {
      setPaymentStatus(c.paymentStatus || 'Select');
      setPayAmount(c.payAmount ? Number(c.payAmount).toLocaleString('en-IN') : '');
    }, [c.paymentStatus, c.payAmount]);

    const renderCell = (colId: string) => {
      switch (colId) {
        case 'date':
          return <td key="date" className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(c.startDate)}</td>;
        case 'clientName':
          return (
            <td key="clientName" className="px-6 py-5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              <div className="font-bold">{c.clientName}</div>
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 uppercase tracking-wide">{c.type}</div>
            </td>
          );
        case 'clientAdvocate':
          return <td key="clientAdvocate" className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 italic font-medium">{c.clientAdvocate || '-'}</td>;
        case 'advocate':
          return <td key="advocate" className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{c.adv_name || '-'}</td>;
        case 'time':
          return <td key="time" className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">{formatTime(c.time) || '-'}</td>;
        case 'hearing':
          return <td key="hearing" className="px-6 py-5 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-400 font-bold">#{c.hearingCount || 1}</td>;
        case 'status':
          return <td key="status" className="px-6 py-5 whitespace-nowrap"><StatusBadge status={c.status} /></td>;
        case 'paymentStatus':
          return (
            <td key="paymentStatus" className="px-6 py-5 whitespace-nowrap">
              <select 
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className={`px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer w-full font-medium ${getPaymentStatusColor(paymentStatus)}`}
              >
                  <option value="Select" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">Select</option>
                  <option value="Not Paid" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">Not Paid</option>
                  <option value="Partially Paid" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">Partially Paid</option>
                  <option value="Paid" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">Paid</option>
              </select>
            </td>
          );
        case 'payAmount':
          return (
            <td key="payAmount" className="px-6 py-5 whitespace-nowrap">
              <div className="flex items-center gap-2">
                  <input 
                      type="text" 
                      value={payAmount}
                      onChange={handleAmountChange}
                      placeholder="0"
                      className="w-24 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-800 dark:text-white"
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
          );
        case 'remarks':
          return (
            <td key="remarks" className="px-6 py-5 whitespace-nowrap">
               <RemarkInput caseId={c.id} initialValue={c.remarks} onSave={handleSaveRemark} onHistory={handleHistory} />
            </td>
          );
        case 'bank':
          return <td key="bank" className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={c.bankName}>{c.bankName}</td>;
        case 'vkl':
          return (
            <td key="vkl" className="px-6 py-5 whitespace-nowrap text-center">
              <div className="flex justify-center"><BooleanIndicator value={c.vakalatnama} /></div>
            </td>
          );
        case 'sod':
          return (
            <td key="sod" className="px-6 py-5 whitespace-nowrap text-center">
              <div className="flex justify-center"><BooleanIndicator value={c.sod} /></div>
            </td>
          );
        case 'actions':
          return (
            <td key="actions" className="px-6 py-5 whitespace-nowrap text-right">
              <div className="flex justify-end items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleOpenEditModal(c)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-bold text-xs">EDIT</button>
                 <button onClick={() => handleDeleteCase(c.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-bold text-xs">DEL</button>
              </div>
            </td>
          );
        default:
          return null;
      }
    };
 
    return (
       <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all group border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          {columnOrder.map((col: { id: string }) => renderCell(col.id))}
       </tr>
    )
}

export default function ArbitrationTracker() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cases, setCases] = useState<any[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [currentCase, setCurrentCase] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('advocate')
  
  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedCaseHistory, setSelectedCaseHistory] = useState<any[]>([])

  // Column State
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [isMounted, setIsMounted] = useState(false)

  // Drag Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsMounted(true)
    const storedRole = localStorage.getItem('userRole')
    if (storedRole) {
      setUserRole(storedRole.toLowerCase().trim())
    }

    // Load columns from localStorage
    const savedColumns = localStorage.getItem('arbtracker-columns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        // Ensure we merge with defaults to handle any schema changes or missing new columns
        // But for reordering, we prioritize saved order.
        // Simple check: if lengths match, use saved. If not, revert to default.
        if (parsed.length === DEFAULT_COLUMNS.length) {
            setColumns(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved columns", e);
      }
    }
  }, [])

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true)
        const arbitrationRef = collection(db, 'arbitration')
        const q = query(arbitrationRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        
        const caseData: any[] = snapshot.docs.map(doc => {
          const data = doc.data();
          const normalizedTime = data.time ? normalizeTimeForStorage(data.time) : '';
          return {
            ...data,
            id: doc.id,
            time: normalizedTime
          }
        })

        // Fetch client advocates from clients collection
        const clientsRef = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        const clientMap: Record<string, string> = {};
        clientsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                // Normalize key: lowercase and trim
                const normalizedKey = data.name.toLowerCase().trim().replace(/\s+/g, ' ');
                clientMap[normalizedKey] = data.alloc_adv || '';
            }
        });

        const enrichedCases = caseData.map(c => {
            const normalizedLookupName = (c.clientName || '').toLowerCase().trim().replace(/\s+/g, ' ');
            return {
                ...c,
                clientAdvocate: c.clientAdvocate || clientMap[normalizedLookupName] || '-'
            };
        });
        
        setCases(enrichedCases)
      } catch (error) {
        console.error('Error fetching arbitration cases:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCases()
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newColumns = arrayMove(items, oldIndex, newIndex);
        
        // Save to localStorage
        localStorage.setItem('arbtracker-columns', JSON.stringify(newColumns));
        
        return newColumns;
      });
    }
  };
  
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
          if (!fromDate && !toDate) return true;
          const start = fromDate ? new Date(fromDate) : null;
          if (start) start.setHours(0, 0, 0, 0);
          const end = toDate ? new Date(toDate) : null;
          if (end) end.setHours(23, 59, 59, 999);

          if (start && end) return caseDate >= start && caseDate <= end;
          if (start) return caseDate >= start;
          if (end) return caseDate <= end;
          return true;
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
    const wrappedChildren = <div className="p-4 lg:p-8 w-full min-h-screen bg-gray-50 dark:bg-black transition-colors">{children}</div>;
    switch (userRole) {
      case 'overlord': return <OverlordSidebar>{wrappedChildren}</OverlordSidebar>;
      case 'assistant': return <div className="flex"><AssistantSidebar />{wrappedChildren}</div>;
      default: return <div className="flex"><AdvocateSidebar />{wrappedChildren}</div>;
    }
  };

  if (!isMounted) return null; // Prevent hydration mismatch with localStorage

  return renderSidebar(
    <div className="w-full">
      <Toaster position="top-right" />
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Arbitration Tracker</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">Monitor and manage all your arbitration cases in real-time.</p>
        </div>
        <ThemeToggle />
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenModal}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl flex items-center hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold whitespace-nowrap"
          >
            <FaPlus className="mr-2 text-xs" /> New Case
          </button>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2" />
          <select 
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
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
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
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
            <div className="flex items-center gap-2">
              <CustomDateInput 
                value={fromDate} 
                onChange={setFromDate}
                placeholder="From Date"
                max={toDate || undefined}
              />
              <CustomDateInput 
                value={toDate} 
                onChange={setToDate}
                placeholder="To Date"
                min={fromDate || undefined}
              />
            </div>
          )}
        </div>
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
          <input 
            type="text" 
            placeholder="Search clients, banks, or IDs..." 
            className="pl-11 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl w-64 lg:w-80 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none shadow-sm transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Filtered Cases</p>
          <p className="text-4xl font-black text-gray-900 dark:text-white mt-2">{filteredCases.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">In Progress</p>
          <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{filteredCases.filter(c => c.status?.toLowerCase() === 'in progress').length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Missing Documents</p>
          <p className="text-4xl font-black text-red-500 dark:text-red-400 mt-2">{filteredCases.filter(c => !c.vakalatnama || !c.sod).length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-[4px] border-indigo-50 border-t-indigo-600"></div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <FaSearch className="text-gray-200 dark:text-gray-600 text-3xl" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">No cases found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                      <tr>
                        <SortableContext 
                          items={columns} 
                          strategy={horizontalListSortingStrategy}
                        >
                          {columns.map((column) => (
                            <SortableHeader key={column.id} id={column.id}>
                              {column.label}
                            </SortableHeader>
                          ))}
                        </SortableContext>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredCases.map((c) => (
                        <ArbitrationRow 
                          key={c.id} 
                          c={c} 
                          columnOrder={columns}
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
             </DndContext>
          </div>
        )}
      </div>

      <NewArbitrationCaseModal isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleSubmitCase} />
      <EditArbitrationCaseModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onUpdate={handleUpdateCase} caseData={currentCase} />
      
       {/* History Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 p-4 w-full max-w-2xl shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Remark History
                </h2>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {selectedCaseHistory.map((history, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {history.updatedBy || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {history.timestamp?.toDate?.()?.toLocaleString("en-IN") || "Unknown date"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {history.remark}
                    </p>
                  </div>
                ))}
                {selectedCaseHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
