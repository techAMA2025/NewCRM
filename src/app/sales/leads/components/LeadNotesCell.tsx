import { useState, useRef, useEffect } from 'react';
import { FaHistory, FaSave } from 'react-icons/fa';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';

type LeadNotesCellProps = {
  lead: any;
  fetchNotesHistory?: (leadId: string) => Promise<void>;
  crmDb: any;
  user?: any;
};

const LeadNotesCell = ({ lead, fetchNotesHistory, crmDb, user }: LeadNotesCellProps) => {
  const [note, setNote] = useState(lead.lastNote || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    // Remove automatic history fetching on component load
    // Only load notes information, not the full history
    setIsInitialLoad(false);
    setNote(lead.lastNote || '');
  }, [lead.id, lead.lastNote]);
  
  const handleSaveNote = async () => {
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
          console.log('User from localStorage:', userString); // Debug log
          loggedInUser = userString ? JSON.parse(userString) : {};
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
          loggedInUser = {};
        }
      }
      
      // Extract user name with proper fallbacks
      const userName = loggedInUser?.displayName || 
                       loggedInUser?.name || 
                       loggedInUser?.email || 
                       'Unknown User';
      
      console.log('Using user name:', userName); // Debug log
      console.log('Note content:', note); // Debug log
      
      // Create the note object
      const noteData = {
        leadId: lead.id,
        content: note,
        createdBy: userName,
        createdById: loggedInUser?.uid || '',
        createdAt: serverTimestamp(),
        displayDate: new Date().toLocaleString()
      };
      
      console.log('Saving note data:', noteData); // Debug log
      
      // Add to history subcollection within crm_leads
      const historyCollectionRef = collection(crmDb, 'crm_leads', lead.id, 'history');
      const docRef = await addDoc(historyCollectionRef, noteData);
      console.log('Note saved with ID:', docRef.id); // Debug log
      
      // Update the lead with reference to latest note
      const leadRef = doc(crmDb, 'crm_leads', lead.id);
      await updateDoc(leadRef, {
        lastNote: note,
        lastNoteDate: serverTimestamp(),
        lastNoteBy: userName
      });
      
      toast.success('Note saved successfully');
      
      // Refresh notes history if function is provided
      if (fetchNotesHistory) {
        await fetchNotesHistory(lead.id);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewHistory = () => {
    setShowHistory(!showHistory);
    // Only fetch notes history when toggling to show history
    if (!showHistory && fetchNotesHistory) {
      fetchNotesHistory(lead.id);
    }
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
        
        {/* <div className="text-xs mt-2 text-gray-300">
          <div className="font-medium mb-1">Current Notes:</div>
          <div className="italic text-gray-400">
            {isInitialLoad ? (
              <div className="text-blue-400">Loading notes...</div>
            ) : lead.lastNote ? (
              <div className="border-l-2 border-gray-500 pl-2">
                <div>{lead.lastNote}</div>
                <div className="text-gray-500 text-xs mt-1">
                  By {lead.lastNoteBy || 'Unknown'} on {lead.lastNoteDate && typeof lead.lastNoteDate.toDate === 'function' 
                    ? lead.lastNoteDate.toDate().toLocaleString() 
                    : 'Unknown date'}
                </div>
              </div>
            ) : (
              'No notes available'
            )}
          </div>
        </div> */}
        
        {/* {showHistory && lead.notesHistory && lead.notesHistory.length > 0 && (
          <div className="text-xs mt-2 text-gray-300">
            <div className="font-medium mb-1">Notes History:</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {lead.notesHistory.map((historyItem: any, index: number) => (
                <div key={index} className="border-l-2 border-gray-600 pl-2 pb-2">
                  <div>{historyItem.content}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    By {historyItem.createdBy || 'Unknown'} on {
                      historyItem.displayDate || 
                      (historyItem.createdAt && typeof historyItem.createdAt.toDate === 'function'
                        ? historyItem.createdAt.toDate().toLocaleString()
                        : 'Unknown date')
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )} */}
      </div>
    </td>
  );
};

export default LeadNotesCell; 