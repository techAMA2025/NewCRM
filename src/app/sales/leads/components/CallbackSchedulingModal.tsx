import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

interface CallbackSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leadId: string;
  leadName: string;
  crmDb: any;
  isEditing?: boolean;
  existingCallbackInfo?: {
    id: string;
    scheduled_dt: Date;
    scheduled_by: string;
    created_at: any;
  } | null;
}

const CallbackSchedulingModal = ({
  isOpen,
  onClose,
  onConfirm,
  leadId,
  leadName,
  crmDb,
  isEditing = false,
  existingCallbackInfo = null
}: CallbackSchedulingModalProps) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current date and time for min values
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0].slice(0, 5);

  // Initialize with existing callback data when editing
  useEffect(() => {
    if (isEditing && existingCallbackInfo) {
      const existingDate = new Date(existingCallbackInfo.scheduled_dt);
      setScheduledDate(existingDate.toISOString().split('T')[0]);
      setScheduledTime(existingDate.toTimeString().split(' ')[0].slice(0, 5));
    } else {
      setScheduledDate('');
      setScheduledTime('');
    }
  }, [isEditing, existingCallbackInfo, isOpen]);

  const handleSubmit = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select both date and time for the callback');
      return;
    }

    // Validate that the scheduled datetime is in the future
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledDateTime <= now) {
      toast.error('Please select a future date and time for the callback');
      return;
    }

    setIsSubmitting(true);
    try {
      const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Unknown User' : 'Unknown User';
      
      if (isEditing && existingCallbackInfo) {
        // Update existing callback info
        const callbackInfoRef = collection(crmDb, 'crm_leads', leadId, 'callback_info');
        const callbackSnapshot = await getDocs(callbackInfoRef);
        
        if (!callbackSnapshot.empty) {
          const docRef = doc(crmDb, 'crm_leads', leadId, 'callback_info', callbackSnapshot.docs[0].id);
          await updateDoc(docRef, {
            scheduled_dt: scheduledDateTime,
            scheduled_by: userName,
            updated_at: serverTimestamp()
          });
        }
      } else {
        // Create new callback info
        const callbackInfoRef = collection(crmDb, 'crm_leads', leadId, 'callback_info');
        await addDoc(callbackInfoRef, {
          id: 'attempt_1',
          scheduled_dt: scheduledDateTime,
          scheduled_by: userName,
          created_at: serverTimestamp()
        });
      }

      toast.success(
        <div className="min-w-0 flex-1">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✅</span>
                <p className="text-sm font-bold text-white">
                  {isEditing ? 'Callback Updated' : 'Callback Scheduled'}
                </p>
              </div>
              <p className="mt-2 text-sm text-green-100 font-medium">
                {leadName}
              </p>
              <p className="mt-1 text-sm text-green-200">
                ⏰ {scheduledDateTime.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 border-2 border-green-400 shadow-xl",
        }
      );
      onConfirm();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update callback. Please try again.' : 'Failed to schedule callback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <h3 className="text-xl font-semibold text-gray-100 mb-4">
          {isEditing ? 'Edit Callback' : 'Schedule Callback'}
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-300 mb-2">
            Lead: <span className="font-medium">{leadName}</span>
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={currentDate}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={scheduledDate === currentDate ? currentTime : undefined}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !scheduledDate || !scheduledTime}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Callback' : 'Schedule Callback')}
          </button>
          <button
            onClick={handleGoBack}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallbackSchedulingModal; 