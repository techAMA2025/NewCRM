'use client'

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const AdminCloseAllButton = () => {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [hasActiveToasts, setHasActiveToasts] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is admin from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userRoleFromStorage = localStorage.getItem('userRole');
      setIsAdminUser(userRoleFromStorage === 'admin');
    }
  }, []);

  // Monitor for active callback toasts
  useEffect(() => {
    const checkActiveToasts = () => {
      if (typeof window !== 'undefined') {
        // Multiple approaches to find toasts
        let hasCallbackToasts = false;
        let toastCount = 0;

        // Method 1: Look for react-toastify toasts
        const toastifyToasts = document.querySelectorAll('.Toastify__toast');
        
        toastifyToasts.forEach((toastElement, index) => {
          const toastText = toastElement.textContent || '';
          
          if (toastText.includes('Callback') || 
              toastText.includes('Sales Lead') ||
              toastText.includes('Upcoming') ||
              toastText.includes('Assigned to:') ||
              toastText.includes('View Callbacks') ||
              toastText.includes('Call Now')) {
            hasCallbackToasts = true;
            toastCount++;
          }
        });

        // Method 2: Look for any element with callback-related IDs
        const toastsByTestId = document.querySelectorAll('[data-testid*="toast"]');
        
        toastsByTestId.forEach(toast => {
          const testId = toast.getAttribute('data-testid') || '';
          if (testId.includes('callback')) {
            hasCallbackToasts = true;
            toastCount++;
          }
        });

        // Method 3: Look for any div containing callback-related text
        const allDivs = document.querySelectorAll('div');
        let callbackDivs = 0;
        allDivs.forEach(div => {
          const text = div.textContent || '';
          if (text.includes('Sales Lead Callback') || 
              text.includes('Upcoming Callback Alert')) {
            const isVisible = div.offsetParent !== null;
            if (isVisible) {
              hasCallbackToasts = true;
              callbackDivs++;
            }
          }
        });

        setHasActiveToasts(hasCallbackToasts);
      }
    };

    // Check immediately
    checkActiveToasts();

    // Set up a mutation observer to watch for toast changes
    const observer = new MutationObserver(() => {
      setTimeout(checkActiveToasts, 100); // Small delay to let DOM settle
    });
    
    if (typeof window !== 'undefined') {
      // Observe the entire document body for changes
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // Also check periodically as a fallback
    const interval = setInterval(checkActiveToasts, 3000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Function to close all callback toasts
  const closeAllCallbacks = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    
    if (typeof window !== 'undefined') {
      let closedCount = 0;

      // Method 1: Dismiss by exact toast ID patterns we know are used
      const callbackIdPatterns = [
        'global-callback-',
        'sales-callback-',
        'callback-'
      ];

      // Try to dismiss toasts by their known ID patterns
      callbackIdPatterns.forEach(pattern => {
        // Try different ID formats (lead IDs can be various formats)
        for (let i = 0; i < 200; i++) {
          const patterns = [
            `${pattern}${i}`,
            `${pattern}lead${i}`,
            `${pattern}${i.toString().padStart(3, '0')}`,
            `${pattern}item${i}`
          ];
          
          patterns.forEach(id => {
            toast.dismiss(id);
            closedCount++;
          });
        }
      });

      // Method 2: Find actual toast elements and dismiss by their data-testid
      const toastElements = document.querySelectorAll('.Toastify__toast[data-testid]');
      toastElements.forEach(toastElement => {
        const toastText = toastElement.textContent || '';
        if (toastText.includes('Callback') || 
            toastText.includes('Sales Lead') ||
            toastText.includes('Upcoming')) {
          
          const testId = toastElement.getAttribute('data-testid');
          if (testId) {
            const toastId = testId.replace('toast-', '');
            toast.dismiss(toastId);
            closedCount++;
          }
        }
      });

      // Method 3: Use the nuclear option - dismiss ALL toasts
      toast.dismiss();
      
      // Force immediate state update
      setHasActiveToasts(false);
      
      // Re-check after a delay to see if any toasts remain
      setTimeout(() => {
        const remainingToasts = document.querySelectorAll('.Toastify__toast');
        
        if (remainingToasts.length === 0) {
          setHasActiveToasts(false);
        } else {
          // Check if remaining toasts are callback-related
          const hasCallbacks = Array.from(remainingToasts).some(toast => {
            const text = toast.textContent || '';
            return text.includes('Callback') || text.includes('Sales Lead');
          });
          setHasActiveToasts(hasCallbacks);
        }
      }, 300);
    }
  };

  // Only show if user is admin and there are active callback toasts
  if (!isAdminUser || !hasActiveToasts) {
    return null;
  }

  return (
    <>
      {/* Custom CSS for subtle animations */}
      <style jsx>{`
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0px) scale(1); }
        }
        
        .subtle-float { animation: subtle-float 4s ease-in-out infinite; }
        .fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
      
      {/* Top-right corner placement - above all toasts with higher z-index */}
      <div className="fixed top-4 right-4 z-[99999] fade-in">
        <div className="relative group subtle-float">
          {/* Subtle glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition duration-500"></div>
          
          {/* Main container with glassmorphism matching the CRM theme */}
          <div className="relative bg-gray-900/95 backdrop-blur-lg rounded-xl border border-gray-700/50 overflow-hidden shadow-2xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5"></div>
            
            {/* Button */}
            <button
              onClick={closeAllCallbacks}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onMouseDown={() => setIsPressed(true)}
              onMouseUp={() => setIsPressed(false)}
              className={`
                relative flex items-center gap-3 px-4 py-3 rounded-xl
                text-gray-300 hover:text-white
                transition-all duration-200 ease-out
                group/button cursor-pointer
                ${isHovered ? 'bg-gray-800/60' : 'bg-transparent'}
                ${isPressed ? 'scale-95' : isHovered ? 'scale-[1.02]' : ''}
              `}
              style={{ zIndex: 99999 }}
            >
              {/* Icon with subtle animation */}
              <div className={`transition-all duration-200 ${isHovered ? 'rotate-90 scale-110' : ''}`}>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-indigo-400"
                >
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </div>
              
              {/* Text with gradient effect */}
              <span className={`
                text-sm font-medium transition-all duration-200
                ${isHovered 
                  ? 'bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent' 
                  : 'text-gray-300'
                }
              `}>
                Close Callbacks
              </span>
              
              {/* Subtle indicator badge */}
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              </div>
              
              {/* Hover overlay effect */}
              <div className={`
                absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 
                rounded-xl opacity-0 group-hover/button:opacity-100 transition-opacity duration-200
              `}></div>
            </button>
            
            {/* Bottom border accent */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
          </div>
          
          {/* Tooltip on hover - positioned below button for top placement */}
          <div className={`
            absolute top-full right-0 mt-2 px-3 py-1.5 
            bg-gray-800/95 backdrop-blur-sm rounded-lg border border-gray-700
            text-xs text-gray-300 whitespace-nowrap
            transform transition-all duration-200
            ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}
          `}
          style={{ zIndex: 99999 }}
          >
            Dismiss all callback notifications
            <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800/95"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminCloseAllButton; 