'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, addDoc, query, orderBy, where, limit, serverTimestamp, updateDoc, deleteDoc, doc, startAfter, getCountFromServer, Timestamp } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from '@/context/AuthContext'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import SearchableDropdown from '@/components/SearchableDropdown'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { FaGripVertical, FaPlus, FaSearch, FaTrash, FaSun, FaMoon } from 'react-icons/fa'
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

// Interface for escalation data
interface Escalation {
  id: string
  clientId: string
  clientName: string
  phone: string
  email: string
  alloc_adv: string
  alloc_adv_secondary: string
  assignedTo: string
  concern: string
  salesRemark: string
  opsRemark: string
  status: string
  createdAt: any
  createdBy: string
}

// Interface for client data
interface Client {
  id: string
  name: string
  phone: string
  email: string
  alloc_adv: string
  alloc_adv_secondary: string
  assignedTo: string
}

const DEFAULT_COLUMNS = [
  { id: 'date', label: 'Date', width: 120 },
  { id: 'client', label: 'Client Details', width: 250 },
  { id: 'advocates', label: 'Advocates (P/S)', width: 200 },
  { id: 'details', label: 'Escalation Details & Remarks', width: 600 },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'actions', label: 'Action', width: 60 },
];

function SortableHeader({ 
  id, 
  children, 
  isDarkMode,
  width,
  onResize
}: { 
  id: string; 
  children: React.ReactNode; 
  isDarkMode: boolean;
  width?: number;
  onResize: (id: string, newWidth: number) => void;
}) {
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
    zIndex: isDragging ? 50 : 'auto',
    width: width ? `${width}px` : 'auto',
    minWidth: width ? `${width}px` : 'auto',
    maxWidth: width ? `${width}px` : 'auto',
    cursor: 'move',
    borderRight: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
    borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startWidth = width || 150;

    const handleMouseMove = (mouseEvent: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (mouseEvent.pageX - startX));
      onResize(id, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider select-none group relative whitespace-nowrap ${
        isDarkMode ? 'text-gray-400 bg-gray-900/40' : 'text-gray-500 bg-gray-50/50'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1 overflow-hidden pointer-events-none">
        <div className="p-1 -ml-1 flex-shrink-0">
          <FaGripVertical className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity" />
        </div>
        <span className="truncate flex-1">{children}</span>
      </div>
      
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-20 pointer-events-auto"
      />
    </th>
  );
}

const EscalationsPage = () => {
  const { user, userRole, userName, loading: authLoading } = useAuth()
  const router = useRouter()
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [concern, setConcern] = useState('')
  const [salesRemark, setSalesRemark] = useState('')
  const [opsRemark, setOpsRemark] = useState('')
  const [status, setStatus] = useState('Open')
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [totalCount, setTotalCount] = useState(0)
  
  // Custom columns state
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('escalations-theme');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('escalations-theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Drag Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check access
  useEffect(() => {
    if (!authLoading && user && userRole) {
      const allowedRoles = ['admin', 'advocate', 'overlord']
      if (!allowedRoles.includes(userRole)) {
        router.push('/dashboard')
      }
    }
  }, [user, userRole, authLoading, router])

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Clients for the dropdown
      const clientsSnapshot = await getDocs(collection(db, 'clients'))
      const clientsData: Client[] = []
      clientsSnapshot.forEach((doc) => {
        const data = doc.data()
        clientsData.push({
          id: doc.id,
          name: data.name || 'Unknown',
          phone: data.phone || '',
          email: data.email || '',
          alloc_adv: data.alloc_adv || 'Not Assigned',
          alloc_adv_secondary: data.alloc_adv_secondary || 'Not Assigned',
          assignedTo: data.assignedTo || 'Not Assigned'
        })
      })
      setClients(clientsData.sort((a, b) => a.name.localeCompare(b.name)))

      // Fetch Escalations
      const escalationsRef = collection(db, 'escalations')
      let q = query(escalationsRef, orderBy('createdAt', 'desc'))
      
      if (filterStatus !== 'All') {
        q = query(q, where('status', '==', filterStatus))
      }

      const snapshot = await getDocs(q)
      const escalationsData: Escalation[] = []
      snapshot.forEach((doc) => {
        escalationsData.push({ id: doc.id, ...doc.data() } as Escalation)
      })
      setEscalations(escalationsData)
      setTotalCount(escalationsData.length)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterStatus])

  const handleColumnResize = (id: string, newWidth: number) => {
    setColumnWidths(prev => ({ ...prev, [id]: newWidth }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !concern) {
      toast.error('Please select a client and enter a concern')
      return
    }

    setSubmitting(true)
    try {
      const client = clients.find(c => c.id === selectedClient)
      if (!client) throw new Error('Client not found')

      const escalationData = {
        clientId: client.id,
        clientName: client.name,
        phone: client.phone,
        email: client.email,
        alloc_adv: client.alloc_adv,
        alloc_adv_secondary: client.alloc_adv_secondary,
        assignedTo: client.assignedTo,
        concern,
        salesRemark,
        opsRemark,
        status,
        createdAt: serverTimestamp(),
        createdBy: userName || 'Unknown'
      }

      await addDoc(collection(db, 'escalations'), escalationData)
      toast.success('Escalation created successfully')
      setIsDialogOpen(false)
      // Reset form
      setSelectedClient('')
      setConcern('')
      setSalesRemark('')
      setOpsRemark('')
      setStatus('Open')
      fetchData()
    } catch (error) {
      console.error('Error adding escalation:', error)
      toast.error('Failed to create escalation')
    } finally {
      setSubmitting(false)
    }
  }

  const updateEscalationStatus = async (id: string, newStatus: string) => {
    try {
      const escalationRef = doc(db, 'escalations', id)
      await updateDoc(escalationRef, { status: newStatus })
      setEscalations(prev => prev.map(esc => esc.id === id ? { ...esc, status: newStatus } : esc))
      toast.success('Status updated')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this escalation?')) return

    try {
      await deleteDoc(doc(db, 'escalations', id))
      setEscalations(prev => prev.filter(esc => esc.id !== id))
      toast.success('Escalation deleted successfully')
    } catch (error) {
      console.error('Error deleting escalation:', error)
      toast.error('Failed to delete escalation')
    }
  }

  const filteredEscalations = escalations.filter(esc => 
    esc.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    esc.phone.includes(searchTerm) ||
    esc.concern.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const renderSidebar = () => {
    if (userRole === 'admin') return <AdminSidebar />
    if (userRole === 'advocate') return <AdvocateSidebar />
    if (userRole === 'overlord') return <OverlordSidebar />
    return null
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {renderSidebar()}
      
      <main className="flex-1 overflow-y-auto p-2 md:p-4">
        <div className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Escalations</h1>
              <p className="text-gray-500 mt-1">Manage and track client concerns and escalations.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}
              >
                {isDarkMode ? <FaSun className="h-4 w-4 text-yellow-400" /> : <FaMoon className="h-4 w-4 text-indigo-600" />}
              </Button>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
              >
                <FaPlus className="mr-2 h-4 w-4" /> Add Escalation
              </Button>
            </div>
          </div>

          <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white'} backdrop-blur-sm border shadow-xl`}>
            <CardHeader className="border-b border-gray-800/50 pb-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="relative w-full md:w-96">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search by client, phone or concern..."
                    className={`pl-10 placeholder:text-gray-400 ${isDarkMode ? 'bg-gray-950/50 border-gray-800 text-white' : 'bg-white text-gray-950 border-gray-200'}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-filter" className="whitespace-nowrap">Filter Status:</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="status-filter" className={`w-40 ${isDarkMode ? 'bg-gray-950/50 border-gray-800 text-white' : 'bg-white text-gray-950 border-gray-200'}`}>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-20 text-center text-gray-500">Loading escalations...</div>
              ) : (
                <div className="min-w-full">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <table className="w-full border-collapse">
                        <thead>
                          <SortableContext
                            items={columns.map(c => c.id)}
                            strategy={horizontalListSortingStrategy}
                          >
                            <tr className={isDarkMode ? 'bg-gray-900/80' : 'bg-gray-50'}>
                              {columns.map((column) => (
                                <SortableHeader
                                  key={column.id}
                                  id={column.id}
                                  isDarkMode={isDarkMode}
                                  width={columnWidths[column.id] || column.width}
                                  onResize={handleColumnResize}
                                >
                                  {column.label}
                                </SortableHeader>
                              ))}
                            </tr>
                          </SortableContext>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-200'}`}>
                          {filteredEscalations.length === 0 ? (
                            <tr>
                              <td colSpan={columns.length} className="p-8 text-center text-gray-500">
                                No escalations found.
                              </td>
                            </tr>
                          ) : (
                            filteredEscalations.map((esc) => (
                              <tr key={esc.id} className={`${isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'} transition-colors`}>
                                {columns.map((col) => {
                                  const width = columnWidths[col.id] || col.width;
                                  const cellStyle = { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };
                                  
                                  if (col.id === 'date') return <td key={col.id} style={cellStyle} className="px-2 py-2 text-[10px] text-gray-400">{formatDate(esc.createdAt)}</td>
                                  if (col.id === 'client') return (
                                    <td key={col.id} style={cellStyle} className="px-2 py-2 text-[11px] leading-tight">
                                      <div className={`font-bold uppercase tracking-tight truncate mb-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{esc.clientName}</div>
                                      <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium`}>{esc.phone}</div>
                                      <div className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} truncate`}>{esc.email}</div>
                                    </td>
                                  )
                                  if (col.id === 'advocates') return (
                                    <td key={col.id} style={cellStyle} className="px-2 py-2 text-[11px] leading-tight">
                                      <div className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'} font-medium mb-0.5`}>
                                        <span className={`text-[9px] font-bold opacity-60 uppercase mr-1 inline-block w-4 ${isDarkMode ? 'text-emerald-500/70' : 'text-emerald-600'}`}>P:</span>{esc.alloc_adv}
                                      </div>
                                      <div className={`${isDarkMode ? 'text-violet-400' : 'text-violet-700'} font-medium mb-1`}>
                                        <span className={`text-[9px] font-bold opacity-60 uppercase mr-1 inline-block w-4 ${isDarkMode ? 'text-violet-500/70' : 'text-violet-600'}`}>S:</span>{esc.alloc_adv_secondary}
                                      </div>
                                      <div className={`text-[10px] border-t pt-1 ${isDarkMode ? 'text-amber-400/70 border-gray-800/50' : 'text-amber-700 border-gray-200'}`}>
                                        <span className={`text-[8px] font-bold opacity-40 uppercase mr-1`}>BY:</span>{esc.assignedTo}
                                      </div>
                                    </td>
                                  )
                                  if (col.id === 'details') return (
                                    <td key={col.id} style={cellStyle} className="px-2 py-2 text-[11px] leading-relaxed">
                                      <div className={`p-2 rounded-md border mb-1.5 shadow-sm ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20 shadow-rose-900/10' : 'bg-rose-50 border-rose-200 shadow-rose-500/5'}`}>
                                        <span className={`text-[9px] font-black uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Concern</span>
                                        <div className={`italic font-medium break-words leading-tight ${isDarkMode ? 'text-rose-100/90' : 'text-rose-900'}`}>{esc.concern}</div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                                        <div className={`p-1.5 rounded border shadow-sm ${isDarkMode ? 'bg-sky-500/5 border-sky-500/20 shadow-sky-900/5' : 'bg-sky-50 border-sky-200 shadow-sky-500/5'}`}>
                                          <span className={`text-[8px] font-black uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>Sales Remark</span>
                                          <div className={`line-clamp-2 hover:line-clamp-none transition-all duration-300 ${isDarkMode ? 'text-sky-100/70' : 'text-sky-900'}`}>{esc.salesRemark || '-'}</div>
                                        </div>
                                        <div className={`p-1.5 rounded border shadow-sm ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20 shadow-amber-900/5' : 'bg-amber-50 border-amber-200 shadow-amber-500/5'}`}>
                                          <span className={`text-[8px] font-black uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Ops Remark</span>
                                          <div className={`line-clamp-2 hover:line-clamp-none transition-all duration-300 ${isDarkMode ? 'text-amber-100/70' : 'text-amber-900'}`}>{esc.opsRemark || '-'}</div>
                                        </div>
                                      </div>
                                    </td>
                                  )
                                  if (col.id === 'status') return (
                                    <td key={col.id} style={cellStyle} className="px-2 py-2">
                                      <Select 
                                        value={esc.status} 
                                        onValueChange={(val) => updateEscalationStatus(esc.id, val)}
                                      >
                                        <SelectTrigger className={`h-7 text-[9px] uppercase font-bold tracking-wider ${
                                          esc.status === 'Open' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                          esc.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                          'bg-green-500/10 text-green-500 border-green-500/20'
                                        }`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Open">Open</SelectItem>
                                          <SelectItem value="In Progress">In Progress</SelectItem>
                                          <SelectItem value="Closed">Closed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </td>
                                  )
                                  if (col.id === 'actions') return (
                                    <td key={col.id} style={cellStyle} className="px-2 py-2 text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(esc.id)}
                                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-500/10 transition-colors p-0"
                                      >
                                        <FaTrash className="h-3 w-3" />
                                      </Button>
                                    </td>
                                  )
                                  return <td key={col.id} style={cellStyle}></td>
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </DndContext>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle>Add New Escalation</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new escalation for a client and assign initial remarks.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <SearchableDropdown
                options={clients.map(c => ({ value: c.id, label: `${c.name} (${c.phone})` }))}
                value={selectedClient}
                onChange={setSelectedClient}
                placeholder="Search Client..."
                className="bg-white text-black border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="concern">Concern</Label>
              <Textarea 
                id="concern" 
                placeholder="What is the client's concern?" 
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                className="bg-white text-black border-gray-300 placeholder:text-gray-400"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesRemark">Sales Remark</Label>
                <Textarea 
                  id="salesRemark" 
                  placeholder="Sales perspective..." 
                  value={salesRemark}
                  onChange={(e) => setSalesRemark(e.target.value)}
                  className="bg-white text-black border-gray-300 text-xs placeholder:text-gray-400"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opsRemark">Ops Remark</Label>
                <Textarea 
                  id="opsRemark" 
                  placeholder="Operations perspective..." 
                  value={opsRemark}
                  onChange={(e) => setOpsRemark(e.target.value)}
                  className="bg-white text-black border-gray-300 text-xs placeholder:text-gray-400"
                  rows={3}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial-status">Initial Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white text-black border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className={isDarkMode ? 'border-gray-800 hover:bg-gray-800' : ''}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {submitting ? 'Creating...' : 'Create Escalation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EscalationsPage
