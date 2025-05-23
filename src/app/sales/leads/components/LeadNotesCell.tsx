import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { FaHistory, FaSave } from 'react-icons/fa';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';

type LeadNotesCellProps = {
  lead: any;
  fetchNotesHistory?: (leadId: string) => Promise<void>;
  crmDb: any;
  user?: any;
};

const LeadNotesCellComponent = ({ lead, fetchNotesHistory, crmDb, user }: LeadNotesCellProps) => {
  const [note, setNote] = useState(lead.lastNote || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Reset note when lead changes
  useEffect(() => {
    setIsInitialLoad(false);
    setNote(lead.lastNote || '');
  }, [lead.id, lead.lastNote]);
  
  // Memoize handlers
  const handleSaveNote = useCallback(async () => {
    if (!note.trim()) {
      toast.error('Please enter a note before saving');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get user info from localStorage if not provided via props
      let loggedInUser = user;
      
      if (!loggedInUser) {
        try {
          const userString = localStorage.getItem('user');
          loggedInUser = userString ? JSON.parse(userString) : {};
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
          loggedInUser = {};
        }
      }
      
      // Extract user name with proper fallbacks
      const userName = loggedInUser?.userName || 
                       loggedInUser?.name || 
                       loggedInUser?.email || 
                       'Unknown User';
      
      // Create the note object
      const noteData = {
        leadId: lead.id,
        content: note,
        createdBy: userName,
        createdById: loggedInUser?.uid || '',
        createdAt: serverTimestamp(),
        displayDate: new Date().toLocaleString()
      };
      
      // Add note to history
      const historyRef = collection(crmDb, 'crm_leads', lead.id, 'history');
      await addDoc(historyRef, noteData);
      
      // Update lead with latest note
      const leadRef = doc(crmDb, 'crm_leads', lead.id);
      await updateDoc(leadRef, {
        lastNote: note,
        lastModified: serverTimestamp()
      });
      
      toast.success('Note saved successfully');
      
      // Fetch updated history if needed
      if (showHistory && fetchNotesHistory) {
        await fetchNotesHistory(lead.id);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsLoading(false);
    }
  }, [note, lead.id, user, crmDb, showHistory, fetchNotesHistory]);

  const handleViewHistory = useCallback(async () => {
    if (fetchNotesHistory) {
      setShowHistory(true);
      await fetchNotesHistory(lead.id);
    }
  }, [lead.id, fetchNotesHistory]);

  return (
    <td className="px-4 py-3">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add notes here..."
            className="w-full h-20 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200 placeholder-gray-500"
          />
        </div>
        <div className="flex justify-between items-center">
          <button
            onClick={handleViewHistory}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
            disabled={isLoading}
          >
            <FaHistory className="mr-1" />
            View History
          </button>
          <button
            onClick={handleSaveNote}
            disabled={isLoading}
            className={`text-xs px-2 py-1 rounded flex items-center ${
              isLoading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            <FaSave className="mr-1" />
            {isLoading ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </td>
  );
};

// Memoize the component with proper type checking and comparison function
const LeadNotesCell = memo<LeadNotesCellProps>(LeadNotesCellComponent, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.lead.lastNote === nextProps.lead.lastNote &&
    prevProps.user?.uid === nextProps.user?.uid
  );
});

export default LeadNotesCell; 