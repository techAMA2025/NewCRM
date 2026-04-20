import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiHome, FiUsers, FiClipboard, FiSettings, FiBarChart2, FiDatabase, FiLogOut, FiUserPlus, FiShare2, FiBriefcase, FiCalendar, FiCheckSquare, FiBarChart, FiPieChart, FiCreditCard, FiChevronDown, FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import { FaBalanceScale, FaMoneyBillWave, FaUserFriends, FaFolder, FaFileAlt, FaEnvelopeOpenText, FaHandshake, FaClipboardList, FaMoneyCheckAlt, FaMobileAlt, FaBell, FaQuestionCircle, FaCommentDots, FaInfoCircle } from 'react-icons/fa';
import { getAuth, signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { app } from '@/firebase/firebase';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, isActive }) => {
  return (
    <Link
      href={href}
      className={`flex items-center px-2 py-2 mb-2 rounded-lg transition-all duration-200 group hover:bg-indigo-700 ${
        isActive ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:text-white'
      }`}
      style={{
        fontSize: '12px',
      }}
    >
      <div className={`flex-shrink-0 mr-3 text-md transition-all duration-200 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
        {icon}
      </div>
      <span className="font-medium truncate">{label}</span>
      {isActive && <div className="absolute left-0 w-1 h-8 bg-indigo-400 rounded-r-full" />}
    </Link>
  );
};

interface DropdownNavItemProps {
  icon: React.ReactNode;
  label: string;
  children: NavItemProps[];
  isExpanded: boolean;
  pathname: string;
}

const DropdownNavItem: React.FC<DropdownNavItemProps> = ({ icon, label, children, isExpanded, pathname }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasActiveChild = children.some(child => pathname === child.href);

  useEffect(() => {
    if (hasActiveChild) {
      setIsOpen(true);
    }
  }, [hasActiveChild]);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-2 py-2 rounded-lg transition-all duration-200 group hover:bg-indigo-700 ${
          hasActiveChild ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:text-white'
        }`}
        style={{
          fontSize: '12px',
        }}
      >
        <div className="flex items-center min-w-0">
          <div className={`flex-shrink-0 mr-3 text-md transition-all duration-200 ${hasActiveChild ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
            {icon}
          </div>
          {isExpanded && <span className="font-medium truncate">{label}</span>}
        </div>
        {isExpanded && (
          <div className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <FiChevronDown className="text-sm" />
          </div>
        )}
      </button>
      
      {isExpanded && isOpen && (
        <div className="ml-4 mt-1 space-y-1">
          {children.map((child) => (
            <NavItem
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              isActive={pathname === child.href}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface NavigationGroup {
  type: 'single' | 'dropdown';
  item?: NavItemProps;
  icon?: React.ReactNode;
  label?: string;
  children?: NavItemProps[];
}

interface OverlordSidebarProps {
  children?: React.ReactNode;
}

const OverlordSidebar: React.FC<OverlordSidebarProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Fetch username from localStorage on client-side only
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('userName');
      setUsername(storedUsername || 'User');
    }
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const navigationGroups: NavigationGroup[] = [
    {
      type: 'single',
      item: { href: '/dashboard', icon: <FiHome />, label: 'Dashboard', isActive: false }
    },
    {
      type: 'dropdown',
      icon: <FiUsers />,
      label: 'User & Client Management',
      children: [
        { href: '/admin/users', icon: <FiUsers />, label: 'User Management', isActive: false },
        { href: '/clients', icon: <FiBriefcase />, label: 'Clients', isActive: false },
        { href: '/clientalloc', icon: <FiUserPlus />, label: 'Client Allocation', isActive: false },
        { href: '/assigntasks', icon: <FiCheckSquare />, label: 'Assign Tasks', isActive: false },
      ]
    },
    {
      type: 'dropdown',
      icon: <FiBarChart2 />,
      label: 'Leads',
      children: [
        { href: '/ama_leads', icon: <FiBarChart2 />, label: 'Sales & Leads', isActive: false },
        { href: '/billcutleads', icon: <FiBarChart2 />, label: 'Billcut Leads', isActive: false },
        { href: '/iprkaro-leads', icon: <FaBalanceScale />, label: 'IPRKaro Leads', isActive: false },
        { href: '/appDisputes', icon: <FiClipboard />, label: 'App Leads', isActive: false },
        { href: '/targets', icon: <FiClipboard />, label: 'Targets', isActive: false },
      ]
    },
    {
      type: 'dropdown',
      icon: <FaMoneyBillWave />,
      label: 'Payments',
      children: [
        { href: '/paymentrequests', icon: <FaMoneyBillWave />, label: 'Approve Sales Payment', isActive: false },
        { href: '/advocate/ops-payments-approval', icon: <FaMoneyCheckAlt />, label: 'Approve Ops Payment', isActive: false },
        { href: '/advocate/ops-payments-request', icon: <FaMoneyCheckAlt />, label: 'Request Ops Payment', isActive: false },
        { href: '/paymentreminder', icon: <FiCreditCard />, label: 'OPS Payment Details', isActive: false },
        { href: '/payapproval', icon: <FaMoneyCheckAlt />, label: 'Request Sales Payment', isActive: false },
        { href: '/billcutpay', icon: <FaMoneyBillWave />, label: 'Billcut Pay', isActive: false },
      ]
    },
    {
      type: 'dropdown',
      icon: <FaFileAlt />,
      label: 'Legal & Documents',
      children: [
        { href: '/arbtracker', icon: <FaBalanceScale />, label: 'Arbitration', isActive: false },
        { href: '/pendingletters', icon: <FiClipboard />, label: 'Pending Letters', isActive: false },
        { href: '/manage-templates', icon: <FaFileAlt />, label: 'Manage Templates', isActive: false },
        { href: '/advocate/documents', icon: <FaFileAlt />, label: 'Documents', isActive: false },
      ]
    },
    {
      type: 'dropdown',
      icon: <FaEnvelopeOpenText />,
      label: 'Communication',
      children: [
        { href: '/advocate/emailcompose', icon: <FaEnvelopeOpenText />, label: 'Compose Email', isActive: false },
        { href: '/send-agreement', icon: <FaEnvelopeOpenText />, label: 'Sales Email', isActive: false },
      ]
    },
    {
      type: 'dropdown',
      icon: <FiPieChart />,
      label: 'Reports',
      children: [
        { href: '/billcutLeadReport', icon: <FiPieChart />, label: 'Lead Reports', isActive: false },
        { href: '/opsreport', icon: <FiBarChart />, label: 'Operations Report', isActive: false },
        { href: '/settlement-analysis', icon: <FiBarChart2 />, label: 'Settlement Analysis', isActive: false },
      ]
    },
    {
      type: 'dropdown',
      icon: <FaMobileAlt />,
      label: 'AMA App',
      children: [
        { href: '/appUsers', icon: <FaUserFriends />, label: 'Team and Clients', isActive: false },
        { href: '/appLeads', icon: <FiBarChart2 />, label: 'Users', isActive: false },
        { href: '/ama-app/notifications', icon: <FaBell />, label: 'Notifications', isActive: false },
        { href: '/appQueries', icon: <FaQuestionCircle />, label: 'Queries', isActive: false },
        { href: '/feedback', icon: <FaCommentDots />, label: 'Feedback', isActive: false },
        { href: '/ama-questions', icon: <FaInfoCircle />, label: 'AMA', isActive: false },
        { href: '/app-updates', icon: <FiRefreshCw />, label: 'App Updates', isActive: false },
      ]
    },
    {
      type: 'single',
      item: { href: '/settlement-tracker', icon: <FaHandshake />, label: 'Settlement Tracker', isActive: false }
    },
    {
      type: 'single',
      item: { href: '/escalations', icon: <FaCommentDots />, label: 'Escalations', isActive: false }
    },
    {
      type: 'single',
      item: { href: '/blogs-management', icon: <FaHandshake />, label: 'Blogs Management', isActive: false }
    }
  ];

  const handleLogout = async () => {
    try {
      const auth = getAuth(app); 
      await signOut(auth);
      localStorage.removeItem('userName');
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="h-screen flex transition-all duration-300 relative">
      {/* Sidebar Overlay (Mobile) */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed md:relative inset-y-0 left-0 z-50 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col bg-gray-900 shadow-xl overflow-hidden flex-shrink-0 h-full`}
        style={{
          width: isExpanded ? '250px' : '64px'
        }}
      >
        <div className="sticky top-0 z-10 bg-gray-900">
          <div className="flex items-center justify-between px-2 py-5">
            {isExpanded ? (
              <div className="flex items-center">
                <div className="p-2 mr-2 bg-indigo-600 rounded-lg shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                    <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-white tracking-tight">Welcome,</h1>
                  {username && <span className="text-sm text-gray-400 font-medium tracking-wide">Overlord {username}</span>}
                </div>
              </div>
            ) : (
              <div className="p-2 mx-auto bg-indigo-600 rounded-lg shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <button 
              onClick={toggleSidebar} 
              className="p-1.5 text-gray-400 rounded-full hover:bg-gray-800 hover:text-white transition-colors duration-200"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                {isExpanded ? (
                  <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                )}
              </svg>
            </button>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">
          <nav>
            {navigationGroups.map((group, index) => {
              if (group.type === 'single' && group.item) {
                return (
                  <NavItem
                    key={group.item.href}
                    href={group.item.href}
                    icon={group.item.icon}
                    label={isExpanded ? group.item.label : ''}
                    isActive={pathname === group.item.href}
                  />
                );
              } else if (group.type === 'dropdown' && group.icon && group.label && group.children) {
                return (
                  <DropdownNavItem
                    key={`dropdown-${index}`}
                    icon={group.icon}
                    label={group.label}
                    children={group.children}
                    isExpanded={isExpanded}
                    pathname={pathname}
                  />
                );
              }
              return null;
            })}
          </nav>
        </div>
        
        <div className="w-full px-3 py-4 bg-gray-900 border-t border-gray-800/50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]">
          <div className="h-px mb-4 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-400 transition-all duration-200 rounded-lg hover:bg-red-700/80 hover:text-white group"
          >
            <FiLogOut className="mr-3 text-lg group-hover:scale-110 transition-transform duration-200" />
            {isExpanded && <span className="font-semibold tracking-wide">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area - Only render if children are provided */}
      {children && (
        <div className="flex-1 h-screen overflow-y-auto bg-gray-100 relative">
          {/* Mobile Header Toggle (Only if sidebar is hidden or it's mobile) */}
          {!isMobileOpen && (
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden fixed top-4 left-4 z-30 p-2 bg-gray-900 text-white rounded-lg shadow-xl hover:bg-gray-800 transition-all opacity-90 backdrop-blur-sm"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
};

export default OverlordSidebar;
