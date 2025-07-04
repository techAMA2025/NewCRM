import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '@/context/AuthContext';
import { searchCache } from '@/app/dashboard/superadmin/utils/cache';

interface UpcomingCallback {
  id: string;
  name: string;
  phone: string;
  scheduledTime: Date;
  timeUntil: string;
  assignedTo: string;
}

interface UpcomingCallbackAlertProps {
  leads: any[];
  isVisible: boolean;
  onViewCallbacks?: () => void;
  onDismiss?: () => void;
}

const UpcomingCallbackAlert: React.FC = () => {
  const [upcomingCallbacks, setUpcomingCallbacks] = useState<UpcomingCallback[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { user, userRole, userName } = useAuth();
  
  // Track user activity to optimize polling
  const [isActive, setIsActive] = useState(true);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsActive(!document.hidden);
      if (!document.hidden) {
        lastActivityRef.current = Date.now();
      }
    };

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      setIsActive(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
    };
  }, []);

  const fetchUpcomingCallbacks = async () => {
    if (!user || !userName || !isActive) return;

    try {
      // Check cache first - 90 second cache for callbacks
      const cacheKey = `upcoming-callbacks-${userName}`;
      const cachedCallbacks = searchCache.get<UpcomingCallback[]>(cacheKey);
      if (cachedCallbacks) {
        setUpcomingCallbacks(cachedCallbacks);
        setIsVisible(cachedCallbacks.length > 0);
        return;
      }

      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const billcutLeadsRef = collection(db, 'billcutLeads');
      
      // Optimize query - filter by category and user assignment
      let callbackQuery = query(
        billcutLeadsRef,
        where('category', '==', 'Callback'),
        orderBy('scheduled_dt', 'asc'),
        limit(20) // Limit results to reduce reads
      );

      // For sales users, add assignment filter
      if (userRole === 'sales') {
        callbackQuery = query(
          billcutLeadsRef,
          where('category', '==', 'Callback'),
          where('assigned_to', '==', userName),
          orderBy('scheduled_dt', 'asc'),
          limit(10) // Fewer results for sales users
        );
      }

      const querySnapshot = await getDocs(callbackQuery);
      
      const callbacks: UpcomingCallback[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.scheduled_dt) {
          const scheduledTime = data.scheduled_dt.toDate();
          
          // Only include callbacks within 30 minutes
          if (scheduledTime >= now && scheduledTime <= thirtyMinutesFromNow) {
            // Filter by user role
            const shouldInclude = userRole === 'admin' || data.assigned_to === userName;
            
            if (shouldInclude) {
              callbacks.push({
                id: doc.id,
                name: data.name || 'Unknown',
                phone: data.phone || '',
                scheduledTime,
                timeUntil: getTimeUntil(scheduledTime),
                assignedTo: data.assigned_to || 'Unassigned'
              });
            }
          }
        }
      });

      // Sort by scheduled time
      callbacks.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

      // Cache for 90 seconds
      searchCache.set(cacheKey, callbacks, 90 * 1000);
      
      setUpcomingCallbacks(callbacks);
      setIsVisible(callbacks.length > 0);
    } catch (error) {
      console.error('Error fetching upcoming callbacks:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUpcomingCallbacks();
      
      // Smart polling - check every 3 minutes instead of every minute
      const interval = setInterval(() => {
        // Only fetch if user is active or was active in last 2 minutes
        if (isActive || Date.now() - lastActivityRef.current < 2 * 60 * 1000) {
          fetchUpcomingCallbacks();
        }
      }, 3 * 60 * 1000); // Changed from 60000 (1 minute) to 3 minutes
      
      return () => clearInterval(interval);
    }
  }, [user, userRole, userName, isActive]);

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
        body: `${callback.name} - ${callback.scheduledTime.toLocaleTimeString('en-US', {
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
              <span className="font-medium">{callback.name}</span>
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
                  // Navigate to billcutleads page with callback tab
                  window.location.href = '/billcutleads?tab=callback';
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