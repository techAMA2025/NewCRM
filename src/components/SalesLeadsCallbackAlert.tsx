'use client'

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as crmDb } from '@/firebase/firebase';
import { useAuth } from '@/context/AuthContext';
import { searchCache } from '@/app/dashboard/superadmin/utils/cache';

interface UpcomingCallback {
  id: string;
  leadName: string;
  scheduledTime: Date;
  timeUntil: string;
  phone?: string;
  email?: string;
  assignedTo: string;
}

interface Lead {
  id: string;
  name: string;
  status: string;
  assignedTo: string;
  phone?: string;
  email?: string;
  callbackInfo?: {
    scheduled_dt: Date;
  } | null;
}

const SalesLeadsCallbackAlert = () => {
  const [upcomingCallbacks, setUpcomingCallbacks] = useState<UpcomingCallback[]>([]);
  const [shownToastIds, setShownToastIds] = useState<Set<string>>(new Set());
  const [leads, setLeads] = useState<Lead[]>([]);
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

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
    };
  }, []);

  // Fetch callback information for a lead
  const fetchCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfoRef = collection(crmDb, 'crm_leads', leadId, 'callback_info');
      const callbackSnapshot = await getDocs(callbackInfoRef);
      
      if (!callbackSnapshot.empty) {
        const callbackData = callbackSnapshot.docs[0].data();
        return {
          id: callbackData.id || 'attempt_1',
          scheduled_dt: callbackData.scheduled_dt?.toDate ? callbackData.scheduled_dt.toDate() : new Date(callbackData.scheduled_dt),
          scheduled_by: callbackData.scheduled_by || '',
          created_at: callbackData.created_at
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching callback info:', error);
      return null;
    }
  };

  const fetchLeads = async () => {
    if (!user || !isActive) return;

    try {
      // Check cache first - sales-specific cache for 3 minutes
      const cacheKey = `sales-callback-leads-${userName || 'all'}`;
      const cachedLeads = searchCache.get<Lead[]>(cacheKey);
      if (cachedLeads) {
        setLeads(cachedLeads);
        return;
      }

      const billcutLeadsRef = collection(crmDb, 'billcutLeads');
      // Optimize query - only get callback leads assigned to current user
      const querySnapshot = await getDocs(
        query(
          billcutLeadsRef,
          where('category', '==', 'Callback'),
          ...(userRole === 'sales' ? [where('assigned_to', '==', userName)] : [])
        )
      );

      const fetchedLeads = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const lead: Lead = {
            id: doc.id,
            name: data.name || data.Name || '',
            status: data.status || 'No Status',
            assignedTo: data.assignedTo || '',
            phone: data.phone || data.Phone || data.number || '',
            email: data.email || data.Email || '',
            callbackInfo: null
          };

          // Fetch callback info for callback leads
          if (lead.status === 'Callback') {
            lead.callbackInfo = await fetchCallbackInfo(lead.id);
          }

          return lead;
        })
      );

      // Cache for 3 minutes
      searchCache.set(cacheKey, fetchedLeads, 3 * 60 * 1000);
      setLeads(fetchedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Optimized polling with user activity tracking
  useEffect(() => {
    if (user) {
      fetchLeads();
      
      // Smart polling based on user activity
      const interval = setInterval(() => {
        // Only poll if user is active or was recently active (within 3 minutes)
        if (isActive || Date.now() - lastActivityRef.current < 3 * 60 * 1000) {
          fetchLeads();
        }
      }, 8 * 60 * 1000); // Increased from 5 to 8 minutes
      
      return () => clearInterval(interval);
    }
  }, [user, isActive]);

  // Check for upcoming callbacks within 30 minutes
  useEffect(() => {
    if (!user || !userRole || !userName) return;

    const checkUpcomingCallbacks = () => {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      
      const upcoming = leads
        .filter(lead => 
          lead.status === 'Callback' && 
          lead.callbackInfo && 
          lead.callbackInfo.scheduled_dt
        )
        // Filter based on user role and assignment
        .filter(lead => {
          // Admin users can see all callback alerts
          if (userRole === 'admin') {
            return true;
          }
          // Sales users can only see alerts for callbacks assigned to them
          return lead.assignedTo === userName;
        })
        .map(lead => {
          const scheduledTime = new Date(lead.callbackInfo!.scheduled_dt);
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
          timeUntil,
          phone: lead.phone,
          email: lead.email,
          assignedTo: lead.assignedTo
        }))
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

      setUpcomingCallbacks(upcoming);
      
      // Show toast for new upcoming callbacks
      upcoming.forEach(callback => {
        const toastId = `sales-callback-${callback.id}`;
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
  }, [leads, shownToastIds, user, userRole, userName]);

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
      new Notification('Sales Lead Callback Alert', {
        body: `${callback.leadName} - ${callback.scheduledTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })} (in ${callback.timeUntil})`,
        icon: '/favicon.ico'
      });
    }

    // Determine color based on scheduled date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const scheduledDay = new Date(callback.scheduledTime.getFullYear(), callback.scheduledTime.getMonth(), callback.scheduledTime.getDate());
    
    let toastClassName = "bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 border-2 border-blue-400 shadow-xl";
    let pulseColor = "bg-blue-400";
    let icon = "📞";
    
    if (scheduledDay.getTime() === today.getTime()) {
      // Today - Red
      toastClassName = "bg-gradient-to-r from-red-600 via-pink-500 to-rose-600 border-2 border-red-400 shadow-xl";
      pulseColor = "bg-red-400";
      icon = "🚨";
    } else if (scheduledDay.getTime() === tomorrow.getTime()) {
      // Tomorrow - Yellow
      toastClassName = "bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-600 border-2 border-yellow-400 shadow-xl";
      pulseColor = "bg-yellow-400";
      icon = "⚠️";
    } else if (callback.scheduledTime > now) {
      // Future dates - Green
      toastClassName = "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 border-2 border-green-400 shadow-xl";
      pulseColor = "bg-green-400";
      icon = "📅";
    } else {
      // Past due - Dark red
      toastClassName = "bg-gradient-to-r from-red-800 via-red-700 to-red-900 border-2 border-red-600 shadow-xl";
      pulseColor = "bg-red-300";
      icon = "⏰";
    }

    // Show toast notification with distinct design
    toast(
      <div className="min-w-0 flex-1">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className={`w-3 h-3 ${pulseColor} rounded-full animate-pulse shadow-lg`}></div>
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{icon}</span>
              <p className="text-sm font-bold text-white">
                Sales Lead Callback
              </p>
            </div>
            <p className="mt-2 text-sm text-white font-medium">
              {callback.leadName}
            </p>
            <p className="mt-1 text-sm text-white/80">
              ⏰ {callback.scheduledTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} (in {callback.timeUntil})
            </p>
            <p className="mt-1 text-sm text-white/70">
              📅 {callback.scheduledTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </p>
            {callback.assignedTo && (
              <p className="mt-1 text-sm text-white/80">
                👤 Assigned to: {callback.assignedTo}
              </p>
            )}
            {callback.phone && (
              <p className="mt-1 text-sm text-white/80">
                📱 {callback.phone}
              </p>
            )}
            {callback.email && (
              <p className="mt-1 text-sm text-white/80">
                ✉️ {callback.email}
              </p>
            )}
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => {
                  // Navigate to sales/leads page with callback tab
                  window.location.href = '/sales/leads?tab=callback';
                  toast.dismiss(toastId);
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-md"
              >
                View Callbacks
              </button>
              <button
                onClick={() => {
                  // Call the lead directly
                  if (callback.phone) {
                    window.open(`tel:${callback.phone}`, '_blank');
                  }
                  toast.dismiss(toastId);
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-md"
              >
                Call Now
              </button>
            </div>
          </div>
        </div>
      </div>,
      {
        toastId: toastId,
        position: "top-right",
        autoClose: false, // Stay until manually dismissed
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: toastClassName,
        closeButton: ({ closeToast }) => (
          <button
            onClick={closeToast}
            className="text-white hover:text-white/80 transition-colors"
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

export default SalesLeadsCallbackAlert; 