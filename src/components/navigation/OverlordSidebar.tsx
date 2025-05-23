import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiHome, FiUsers, FiClipboard, FiSettings, FiBarChart2, FiDatabase, FiLogOut, FiUserPlus, FiShare2, FiBriefcase, FiCalendar, FiCheckSquare } from 'react-icons/fi';
import { FaBalanceScale, FaMoneyBillWave, FaUserFriends, FaFolder, FaFileAlt, FaEnvelopeOpenText, FaHandshake, FaClipboardList, FaMoneyCheckAlt } from 'react-icons/fa';
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
      className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-200 group hover:bg-indigo-700 ${
        isActive ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:text-white'
      }`}
    >
      <div className={`mr-3 text-xl transition-all duration-200 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
        {icon}
      </div>
      <span className="font-medium">{label}</span>
      {isActive && <div className="absolute left-0 w-1 h-8 bg-indigo-400 rounded-r-full" />}
    </Link>
  );
};

const OverlordSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [username, setUsername] = useState<string>('');

  React.useEffect(() => {
    // Fetch username from localStorage on client-side only
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('userName');
      setUsername(storedUsername || 'User');
    }
  }, []);

  const navItems = [
    { href: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { href: '/admin/users', icon: <FiUsers />, label: 'User Management' },
    { href: '/sales/leads', icon: <FiBarChart2 />, label: 'Sales & Leads' },
    { href: '/targets', icon: <FiClipboard />, label: 'Targets' },
    { href: '/paymentrequests', icon: <FaMoneyBillWave />, label: 'Payment Requests' },
    { href: '/monthlypayreq', icon: <FiCalendar />, label: 'Monthly Payment Requests' },
    { href: '/clients', icon: <FiBriefcase />, label: 'Clients' },
    { href: '/clientalloc', icon: <FiUserPlus />, label: 'Client Allocation' },
    { href: '/assigntasks', icon: <FiCheckSquare />, label: 'Assign Tasks' },
    { href: '/arbtracker', icon: <FaBalanceScale />, label: 'Arbitration' },
    { href: '/pendingletters', icon: <FiClipboard/>, label: 'Pending Letters' },
    { href: '/payapproval', icon: <FaMoneyCheckAlt />, label: 'Payment Approvals' },
    { href: '/advocate/documents', icon: <FaFileAlt />, label: 'Documents' },
    { href: '/advocate/emailcompose', icon: <FaEnvelopeOpenText />, label: 'Compose Email' },
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
    <div className="relative min-h-screen transition-all duration-300 bg-gray-900 shadow-xl"
         style={{ width: expanded ? '260px' : '80px' }}>
      <div className="sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-5">
          {expanded ? (
            <div className="flex items-center">
              <div className="p-2 mr-2 bg-indigo-600 rounded-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white">Welcome,</h1>
                {username && <span className="text-sm text-gray-300">Overlord {username}</span>}
              </div>
            </div>
          ) : (
            <div className="p-2 mx-auto bg-indigo-600 rounded-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="p-1 text-gray-400 rounded-full hover:bg-gray-800 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              {expanded ? (
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        </div>
        
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
      </div>
      
      <div className="px-3 py-4">
        <nav>
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={expanded ? item.label : ''}
              isActive={pathname === item.href}
            />
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-0 w-full px-3 py-4">
        <div className="h-px mb-4 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-gray-300 transition-all duration-200 rounded-lg hover:bg-red-700 hover:text-white"
        >
          <FiLogOut className="mr-3 text-xl" />
          {expanded && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default OverlordSidebar;
