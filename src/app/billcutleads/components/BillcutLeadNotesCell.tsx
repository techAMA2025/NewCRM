import { useState } from 'react';
import { FaSave, FaHistory } from 'react-icons/fa';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { toast } from 'react-toastify';

type BillcutLeadNotesCellProps = {
  lead: {
    id: string;
    salesNotes: string;
  };
  fetchNotesHistory: (leadId: string) => Promise<void>;
  crmDb: any;
  user: any;
  updateLead: (id: string, data: any) => Promise<boolean>;
};

const BillcutLeadNotesCell = ({ lead, fetchNotesHistory, crmDb, user, updateLead }: BillcutLeadNotesCellProps) => {
  const [note, setNote] = useState(lead.salesNotes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    
    setIsLoading(true);
    try {
      // Save the note to the lead's salesNotes field
      await updateLead(lead.id, { salesNotes: note });

      // Add to salesNotes subcollection within the lead document
      const leadDocRef = doc(crmDb, 'billcutLeads', lead.id);
      const salesNotesRef = collection(leadDocRef, 'salesNotes');
      await addDoc(salesNotesRef, {
        content: note,
        createdAt: serverTimestamp(),
        createdBy: user?.displayName || 'Unknown',
        createdById: user?.uid || 'unknown',
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

  return (
    <td className="px-4 py-3">
      <div className="flex flex-col space-y-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add sales notes..."
          className="text-sm w-full bg-gray-700 border border-gray-600 rounded p-2 text-gray-200 resize-none"
          rows={2}
        />
        
        <div className="flex space-x-2">
          <button
            onClick={handleSaveNote}
            disabled={isLoading || !note.trim()}
            className="flex items-center justify-center px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white transition-colors"
          >
            <FaSave className="mr-1" /> {isLoading ? 'Saving...' : 'Save'}
          </button>
          
          <button
            onClick={handleViewHistory}
            className="flex items-center justify-center px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
          >
            <FaHistory className="mr-1" /> {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>
      </div>
    </td>
  );
};

export default BillcutLeadNotesCell; 