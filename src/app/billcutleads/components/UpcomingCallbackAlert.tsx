import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface UpcomingCallback {
  id: string;
  leadName: string;
  scheduledTime: Date;
  timeUntil: string;
}

interface UpcomingCallbackAlertProps {
  leads: any[];
  isVisible: boolean;
  onViewCallbacks?: () => void;
  onDismiss?: () => void;
}

const UpcomingCallbackAlert = ({ 
  leads, 
  isVisible, 
  onViewCallbacks, 
  onDismiss 
}: UpcomingCallbackAlertProps) => {
  const [upcomingCallbacks, setUpcomingCallbacks] = useState<UpcomingCallback[]>([]);
  const [shownToastIds, setShownToastIds] = useState<Set<string>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check for upcoming callbacks within 30 minutes
  useEffect(() => {
    const checkUpcomingCallbacks = () => {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      
      const upcoming = leads
        .filter(lead => 
          lead.status === 'Callback' && 
          lead.callbackInfo && 
          lead.callbackInfo.scheduled_dt
        )
        .map(lead => {
          const scheduledTime = new Date(lead.callbackInfo.scheduled_dt);
          return {
            lead,
            scheduledTime,
            timeUntil: getTimeUntil(scheduledTime)
          };
        })
        .filter(({ scheduledTime }) => 
          scheduledTime >= now && scheduledTime <= thirtyMinutesFromNow
        )
        .map(({ lead, scheduledTime, timeUntil }) => ({
          id: lead.id,
          leadName: lead.name,
          scheduledTime,
          timeUntil
        }))
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

      setUpcomingCallbacks(upcoming);
      
      // Show toast for new upcoming callbacks
      upcoming.forEach(callback => {
        const toastId = `callback-${callback.id}`;
        if (!shownToastIds.has(toastId)) {
          showCallbackToast(callback, toastId);
          setShownToastIds(prev => new Set([...prev, toastId]));
        }
      });
    };

    // Check immediately
    checkUpcomingCallbacks();
    
    // Check every minute
    const interval = setInterval(checkUpcomingCallbacks, 60000);
    
    return () => clearInterval(interval);
  }, [leads, shownToastIds]);

  const getTimeUntil = (scheduledTime: Date): string => {
    const now = new Date();
    const diffMs = scheduledTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Less than 1 minute';
    if (diffMins === 1) return '1 minute';
    return `${diffMins} minutes`;
  };

  const showCallbackToast = (callback: UpcomingCallback, toastId: string) => {
    // Play notification sound if available
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Upcoming Callback Alert', {
        body: `${callback.leadName} - ${callback.scheduledTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })} (in ${callback.timeUntil})`,
        icon: '/favicon.ico'
      });
    }

    // Show toast notification
    toast(
      <div className="min-w-0 flex-1">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-white">
              ⚠️ Upcoming Callback Alert
            </p>
            <p className="mt-1 text-sm text-yellow-100">
              <span className="font-medium">{callback.leadName}</span>
            </p>
            <p className="mt-1 text-sm text-yellow-200">
              Scheduled for: {callback.scheduledTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} (in {callback.timeUntil})
            </p>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => {
                  onViewCallbacks?.();
                  toast.dismiss(toastId);
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                View Callbacks
              </button>
            </div>
          </div>
        </div>
      </div>,
      {
        toastId: toastId,
        position: "top-right",
        autoClose: false, // Stay until manually dismissed
        hideProgressBar: true, // Hide progress bar since it won't auto-close
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: "bg-gradient-to-r from-yellow-600 via-orange-500 to-red-500 border-2 border-yellow-400",
        closeButton: ({ closeToast }) => (
          <button
            onClick={closeToast}
            className="text-white hover:text-yellow-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ),
      }
    );
  };

  // Don't render anything - we're using toasts instead
  return null;
};

export default UpcomingCallbackAlert; 