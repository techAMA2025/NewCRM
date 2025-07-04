'use client'

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db as crmDb, auth } from '@/firebase/firebase';
import { useAuth } from '@/context/AuthContext';
import { searchCache } from '@/app/dashboard/superadmin/utils/cache';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

interface UpcomingCallback {
  id: string;
  leadName: string;
  scheduledTime: Date;
  timeUntil: string;
  assignedTo: string;
}

interface Lead {
  id: string;
  name: string;
  status: string;
  assignedTo: string;
  callbackInfo?: {
    scheduled_dt: Date;
  } | null;
}

const GlobalCallbackAlert = () => {
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
      const callbackInfoRef = collection(crmDb, 'billcutLeads', leadId, 'callback_info');
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

  // Fetch all billcut leads with callback info
  const fetchLeads = async () => {
    if (!user || !isActive) return;

    try {
      // Check cache first - use shorter cache for callback alerts (2 minutes)
      const cacheKey = `callback-leads-${userName || 'global'}`;
      const cachedLeads = searchCache.get<Lead[]>(cacheKey);
      if (cachedLeads) {
        setLeads(cachedLeads);
        return;
      }

      const billcutLeadsRef = collection(crmDb, 'billcutLeads');
      const querySnapshot = await getDocs(query(billcutLeadsRef, where('category', '==', 'Callback')));

      const fetchedLeads = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const lead: Lead = {
            id: doc.id,
            name: data.name || '',
            status: data.category || 'No Status',
            assignedTo: data.assigned_to || '',
            callbackInfo: null
          };

          // Fetch callback info for callback leads
          if (lead.status === 'Callback') {
            lead.callbackInfo = await fetchCallbackInfo(lead.id);
          }

          return lead;
        })
      );

      // Cache the results for 2 minutes
      searchCache.set(cacheKey, fetchedLeads, 2 * 60 * 1000);
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

  // Fetch leads when user changes
  useEffect(() => {
    if (user) {
      fetchLeads();
      // Increase polling interval from 5 minutes to 10 minutes to reduce reads
      const interval = setInterval(() => {
        // Only poll if user is active or was active recently
        if (isActive || Date.now() - lastActivityRef.current < 5 * 60 * 1000) {
          fetchLeads();
        }
      }, 10 * 60 * 1000); // Changed from 5 to 10 minutes
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
          assignedTo: lead.assignedTo
        }))
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

      setUpcomingCallbacks(upcoming);
      
      // Show toast for new upcoming callbacks
      upcoming.forEach(callback => {
        const toastId = `global-callback-${callback.id}`;
        if (!shownToastIds.has(toastId)) {
          showCallbackToast(callback, toastId);
          setShownToastIds(prev => new Set([...prev, toastId]));
        }
      });
    };

    // Check immediately
    checkUpcomingCallbacks();
    
    // Check every 2 minutes instead of every minute
    const interval = setInterval(checkUpcomingCallbacks, 2 * 60 * 1000); // Changed from 60000 to 2 minutes
    
    return () => clearInterval(interval);
  }, [leads, shownToastIds, user, userRole, userName, isActive]);

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
            {callback.assignedTo && (
              <p className="mt-1 text-sm text-yellow-200">
                👤 Assigned to: {callback.assignedTo}
              </p>
            )}
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

export default GlobalCallbackAlert; 