import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { authFetch } from '@/lib/authFetch';

interface CallbackSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leadId: string;
  leadName: string;
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
      
      const method = isEditing ? "PUT" : "POST"
      const body = {
        leadId,
        callbackDocId: existingCallbackInfo?.id,
        scheduledDateTime: scheduledDateTime.toISOString(),
        userName
      }

      const response = await authFetch("/api/bill-cut-leads/callback-info", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

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
    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleGoBack}></div>
      <div className="bg-[#F8F5EC] rounded-2xl p-6 md:p-8 w-full max-w-md border border-[#5A4C33]/10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#5A4C33] italic tracking-tight uppercase">
            {isEditing ? 'Edit Callback' : 'Schedule Callback'}
          </h3>
          <button
            onClick={handleGoBack}
            className="p-2 hover:bg-white rounded-xl text-[#5A4C33]/40 hover:text-[#5A4C33] transition-all duration-200 border border-transparent hover:border-[#5A4C33]/10 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-[#5A4C33]/60 font-bold">
            {isEditing ? 'Editing callback for: ' : 'Scheduling callback for: '} 
            <span className="text-[#D2A02A] italic">“{leadName}”</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Date Input */}
          <div>
            <label className="block text-[10px] font-bold text-[#D2A02A] uppercase tracking-widest mb-2 px-1">
              Callback Date *
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={currentDate}
              className="w-full px-4 py-3 bg-white border border-[#5A4C33]/20 rounded-xl text-[#5A4C33] font-bold focus:outline-none focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] transition-all duration-200 shadow-sm"
              required
            />
          </div>

          {/* Time Input */}
          <div>
            <label className="block text-[10px] font-bold text-[#D2A02A] uppercase tracking-widest mb-2 px-1">
              Callback Time *
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={scheduledDate === currentDate ? currentTime : undefined}
              className="w-full px-4 py-3 bg-white border border-[#5A4C33]/20 rounded-xl text-[#5A4C33] font-bold focus:outline-none focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] transition-all duration-200 shadow-sm"
              required
            />
          </div>

          {/* Scheduled DateTime Preview */}
          {scheduledDate && scheduledTime && (
            <div className="bg-white/60 p-4 rounded-xl border border-[#5A4C33]/10 shadow-inner mt-6">
              <p className="text-[10px] uppercase font-bold text-[#5A4C33]/40 tracking-widest mb-2 px-1">
                Scheduled for
              </p>
              <p className="text-[#D2A02A] font-bold italic px-1 leading-relaxed">
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

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSubmit}
            disabled={!scheduledDate || !scheduledTime || isSubmitting}
            className="flex-1 px-4 py-3 bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all duration-200 shadow-md active:scale-[0.98]"
          >
            {isSubmitting ? (isEditing ? 'Updating...' : 'Scheduling...') : (isEditing ? 'Update Callback' : 'Schedule Callback')}
          </button>
          <button
            onClick={handleGoBack}
            className="flex-1 px-4 py-3 bg-[#5A4C33] hover:bg-[#4A3C2A] text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-md active:scale-[0.98] leading-tight"
          >
            Cancel Action
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallbackSchedulingModal; 