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
        const callbackInfoRef = collection(crmDb, 'billcutLeads', leadId, 'callback_info');
        const callbackSnapshot = await getDocs(callbackInfoRef);
        
        if (!callbackSnapshot.empty) {
          const docRef = doc(crmDb, 'billcutLeads', leadId, 'callback_info', callbackSnapshot.docs[0].id);
          await updateDoc(docRef, {
            scheduled_dt: scheduledDateTime,
            scheduled_by: userName,
            updated_at: serverTimestamp()
          });
        }
      } else {
        // Create new callback info
        const callbackInfoRef = collection(crmDb, 'billcutLeads', leadId, 'callback_info');
        await addDoc(callbackInfoRef, {
          id: 'attempt_1',
          scheduled_dt: scheduledDateTime,
          scheduled_by: userName,
          created_at: serverTimestamp()
        });
      }

      toast.success(isEditing ? 'Callback updated successfully!' : 'Callback scheduled successfully!');
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-100">
            {isEditing ? 'Edit Callback' : 'Schedule Callback'}
          </h3>
          <button
            onClick={handleGoBack}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-300 mb-2">
            {isEditing ? 'Editing callback for: ' : 'Scheduling callback for: '} 
            <span className="font-medium text-blue-300">{leadName}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Callback Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={currentDate}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          {/* Time Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Callback Time
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={scheduledDate === currentDate ? currentTime : undefined}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          {/* Scheduled DateTime Preview */}
          {scheduledDate && scheduledTime && (
            <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
              <p className="text-sm text-gray-300">
                <span className="font-medium">Scheduled for:</span>
              </p>
              <p className="text-blue-300 font-medium">
                {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={!scheduledDate || !scheduledTime || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
          >
            {isSubmitting ? (isEditing ? 'Updating...' : 'Scheduling...') : (isEditing ? 'Update Callback' : 'Schedule Callback')}
          </button>
          <button
            onClick={handleGoBack}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            Clicked by mistake? Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallbackSchedulingModal; 