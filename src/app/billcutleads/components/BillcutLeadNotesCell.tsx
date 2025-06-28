import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { toast } from 'react-toastify';

type BillcutLeadNotesCellProps = {
  lead: {
    id: string;
    salesNotes: string;
  };
  fetchNotesHistory: (leadId: string) => Promise<void>;
  crmDb: any;
  updateLead: (id: string, data: any) => Promise<boolean>;
  disabled?: boolean;
};

const BillcutLeadNotesCell = ({ lead, fetchNotesHistory, crmDb, updateLead, disabled }: BillcutLeadNotesCellProps) => {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingLatestNote, setIsLoadingLatestNote] = useState(true);

  // Fetch the latest sales note on component mount
  useEffect(() => {
    const fetchLatestNote = async () => {
      setIsLoadingLatestNote(true);
      try {
        const leadDocRef = doc(crmDb, 'billcutLeads', lead.id);
        const salesNotesRef = collection(leadDocRef, 'salesNotes');
        
        // Query for the latest note from subcollection
        const q = query(salesNotesRef, orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Use the latest note from subcollection
          const latestNote = querySnapshot.docs[0].data();
          setNote(latestNote.content || '');
        } else {
          // Fall back to sales_notes from main document
          setNote(lead.salesNotes || '');
        }
      } catch (error) {
        console.error('Error fetching latest note:', error);
        // Fall back to sales_notes from main document in case of error
        setNote(lead.salesNotes || '');
      } finally {
        setIsLoadingLatestNote(false);
      }
    };

    fetchLatestNote();
  }, [lead.id, lead.salesNotes, crmDb]);

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    
    setIsLoading(true);
    try {
      // Get userName from localStorage
      const userName = localStorage.getItem('userName') || 'Unknown';
      
      // Save the note to the lead's salesNotes field
      await updateLead(lead.id, { salesNotes: note });

      // Add to salesNotes subcollection within the lead document
      const leadDocRef = doc(crmDb, 'billcutLeads', lead.id);
      const salesNotesRef = collection(leadDocRef, 'salesNotes');
      await addDoc(salesNotesRef, {
        content: note,
        createdAt: serverTimestamp(),
        createdBy: userName,
        displayDate: new Date().toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: true
        })
      });

      toast.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistory = async () => {
    if (!showHistory) {
      await fetchNotesHistory(lead.id);
    }
    setShowHistory(!showHistory);
  };

  if (isLoadingLatestNote) {
    return (
      <td className="px-4 py-3">
        <div className="flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading...</div>
        </div>
      </td>
    );
  }

  return (
    <td className="px-4 py-3">
      <div className="flex flex-col space-y-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={disabled ? "Sales notes (read-only)" : "Add sales notes..."}
          className={`text-sm w-full rounded p-2 resize-none ${
            disabled
              ? 'bg-gray-800/50 border-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 border-gray-600 text-gray-200'
          }`}
          rows={2}
          disabled={disabled}
        />
        
        <div className="flex space-x-2">
          <button
            onClick={handleSaveNote}
            disabled={isLoading || !note.trim() || disabled}
            className="flex items-center justify-center px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          
          <button
            onClick={handleViewHistory}
            className="flex items-center justify-center px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
          >
            Show History
          </button>
        </div>
      </div>
    </td>
  );
};

export default BillcutLeadNotesCell; 