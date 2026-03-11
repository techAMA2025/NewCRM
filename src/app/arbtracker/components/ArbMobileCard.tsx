"use client"

import React, { useState, useEffect } from "react"
import { FaCalendarAlt, FaUser, FaClock, FaHistory, FaEdit, FaTrash, FaCheck, FaUniversity, FaMoneyBillWave } from "react-icons/fa"
import { db } from "@/firebase/firebase"
import { updateDoc, doc, addDoc, collection, serverTimestamp } from "firebase/firestore"

interface ArbMobileCardProps {
  c: any
  formatDate: (date: string) => string
  formatTime: (time: string) => string
  StatusBadge: React.FC<{ status: string }>
  BooleanIndicator: React.FC<{ value: boolean }>
  handleOpenEditModal: (c: any) => void
  handleDeleteCase: (id: string) => void
  handleHistory: (id: string) => void
}

// Internal RemarkInput for mobile context if not shared
const MobileRemarkInput = ({ 
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

  useEffect(() => { setValue(initialValue || '') }, [initialValue])

  const handleSave = async () => {
     setIsSaving(true);
     await onSave(caseId, value);
     setIsSaving(false);
  }

  return (
    <div className="flex flex-col space-y-2 w-full mt-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add remark..."
        className="w-full px-3 py-2 border rounded-xl text-xs h-20 resize-none transition-all outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onHistory(caseId)}
          className="px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all active:scale-95 bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-400"
        >
          LOG
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg bg-indigo-600 text-white transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-900/20"
        >
          {isSaving ? 'Saving...' : 'SAVE REMARK'}
        </button>
      </div>
    </div>
  )
}

export default function ArbMobileCard({
  c,
  formatDate,
  formatTime,
  StatusBadge,
  BooleanIndicator,
  handleOpenEditModal,
  handleDeleteCase,
  handleHistory
}: ArbMobileCardProps) {
  const [paymentStatus, setPaymentStatus] = useState(c.paymentStatus || 'Select');
  const [payAmount, setPayAmount] = useState(c.payAmount ? Number(c.payAmount).toLocaleString('en-IN') : '');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    setPaymentStatus(c.paymentStatus || 'Select');
    setPayAmount(c.payAmount ? Number(c.payAmount).toLocaleString('en-IN') : '');
  }, [c.paymentStatus, c.payAmount]);

  const handleSavePayment = async () => {
    setIsSavingPayment(true);
    try {
      const caseRef = doc(db, 'arbitration', c.id);
      await updateDoc(caseRef, {
        paymentStatus,
        payAmount: payAmount.toString().replace(/,/g, '')
      });
    } catch (error) {
      console.error(error);
      alert('Failed to save payment details');
    } finally {
      setIsSavingPayment(false);
    }
  }

  const handleSaveRemark = async (id: string, val: string) => {
    try {
      const caseRef = doc(db, 'arbitration', id);
      const historyRef = collection(db, "arbitration", id, "remarks_history");
      const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') : 'Unknown';
      
      await addDoc(historyRef, {
        remark: val,
        timestamp: serverTimestamp(),
        updatedBy: userName || 'Unknown' 
      });
      
      await updateDoc(caseRef, { remarks: val });
    } catch (e) {
      console.error(e);
      alert('Failed to save remark');
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    if (!val) { setPayAmount(''); return; }
    if ((val.match(/\./g) || []).length > 1) return;

    if (val.endsWith('.')) { 
      const parts = val.split('.');
      setPayAmount(Number(parts[0]).toLocaleString('en-IN') + '.');
    } else {
      const parts = val.split('.');
      if (parts.length > 1) {
        setPayAmount(Number(parts[0]).toLocaleString('en-IN') + '.' + parts[1]);
      } else {
        setPayAmount(Number(val).toLocaleString('en-IN'));
      }
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'Partially Paid': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'Not Paid': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      default: return 'bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  }

  return (
    <div className="p-4 rounded-2xl border mb-4 shadow-xl transition-all bg-white border-gray-100 dark:bg-gray-900/50 dark:border-gray-800">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-sm uppercase tracking-tight text-gray-900 dark:text-white">{c.clientName}</h3>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-500 border border-indigo-500/20">{c.type}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <FaCalendarAlt className="text-[10px] text-gray-500" />
              <span className="text-[10px] text-gray-500 font-medium">{formatDate(c.startDate)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FaClock className="text-[10px] text-gray-500" />
              <span className="text-[10px] text-gray-500 font-medium">{formatTime(c.time) || '-'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => handleOpenEditModal(c)} className="p-2 bg-indigo-600/10 text-indigo-500 rounded-lg active:scale-95 transition-all"><FaEdit className="text-xs" /></button>
           <button onClick={() => handleDeleteCase(c.id)} className="p-2 bg-red-600/10 text-red-500 rounded-lg active:scale-95 transition-all"><FaTrash className="text-xs" /></button>
        </div>
      </div>

      {/* Tags Row */}
      <div className="flex flex-wrap gap-2 mb-4">
         <StatusBadge status={c.status} />
         <div className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <span className="text-[8px] uppercase font-black opacity-50">HEARING</span>
            <span>#{c.hearingCount || 1}</span>
         </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
         <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Advocate</span>
            <div className="flex items-center gap-1.5">
               <FaUser className="text-[10px] text-indigo-500" />
               <span className="text-[11px] font-medium truncate text-gray-700 dark:text-gray-200">{c.adv_name || '-'}</span>
            </div>
         </div>
         <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Bank</span>
            <div className="flex items-center gap-1.5">
               <FaUniversity className="text-[10px] text-amber-500" />
               <span className="text-[11px] font-medium truncate text-gray-700 dark:text-gray-200">{c.bankName || '-'}</span>
            </div>
         </div>
      </div>

      {/* Payment Section */}
      <div className="p-3 rounded-xl mb-4 border bg-gray-50/50 border-gray-100 dark:bg-black/20 dark:border-gray-800">
         <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Payment Details</span>
         <div className="grid grid-cols-2 gap-3 mb-2">
            <select 
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className={`px-2 py-1.5 border rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none w-full font-bold transition-all ${getPaymentStatusColor(paymentStatus)}`}
            >
                <option value="Select" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">Select</option>
                <option value="Not Paid" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">Not Paid</option>
                <option value="Partially Paid" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">Partial</option>
                <option value="Paid" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">Paid</option>
            </select>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                   <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                   <input 
                      type="text" 
                      value={payAmount}
                      onChange={handleAmountChange}
                      placeholder="0"
                      className="w-full pl-5 pr-2 py-1.5 border rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none bg-white border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                   />
                </div>
                <button 
                   onClick={handleSavePayment}
                   disabled={isSavingPayment}
                   className="p-2 bg-green-500 text-white rounded-lg active:scale-90 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
                >
                   <FaCheck className="text-[10px]" />
                </button>
            </div>
         </div>
      </div>

      {/* Indicators */}
      <div className="flex items-center gap-4 mb-4 px-1">
         <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-gray-500 uppercase">VKL</span>
            <BooleanIndicator value={c.vakalatnama} />
         </div>
         <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-gray-500 uppercase">SOD</span>
            <BooleanIndicator value={c.sod} />
         </div>
      </div>

      {/* Remark */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
         <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Remarks</span>
         <MobileRemarkInput 
            caseId={c.id} 
            initialValue={c.remarks} 
            onSave={handleSaveRemark} 
            onHistory={handleHistory} 
         />
      </div>
    </div>
  )
}
