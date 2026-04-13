'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faNewspaper, 
  faShieldAlt, 
  faBalanceScale, 
  faChartPie, 
  faPlus, 
  faArrowRight,
  faGlobe,
  faKeyboard,
  faRocket
} from '@fortawesome/free-solid-svg-icons';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import dynamic from 'next/dynamic';
import { onAuthStateChanged } from 'firebase/auth';
import { auth as mainAuth } from '@/firebase/firebase';
import { useRouter } from 'next/navigation';

// Dynamically import the source-specific dashboards
const AmaBlogs = dynamic(() => import('./components/ama-blogs'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>
});

const CredSettleBlogs = dynamic(() => import('./components/credsettle-blogs'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>
});

const IprkaroBlogs = dynamic(() => import('./components/iprkaro-blogs'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>
});

const MultiPublishManager = dynamic(() => import('./components/MultiPublishManager'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>
});

type ProjectSource = 'ama' | 'credsettle' | 'iprkaro' | 'multipublish';

const BlogsManagementHub = () => {
  const [activeProject, setActiveProject] = useState<ProjectSource>('ama');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    
    // Main CRM Auth Check
    const unsubscribe = onAuthStateChanged(mainAuth, (user) => {
      if (!user) {
        console.log('[Auth] No user found in Blogs Hub, redirecting to login...');
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (!isMounted) return null;

  const projects = [
    { 
      id: 'ama' as ProjectSource, 
      name: 'AMA Legal', 
      icon: faShieldAlt, 
      color: 'indigo', 
      description: 'Main legal blogs and news.',
      url: 'https://amalegalsolutions.com'
    },
    { 
      id: 'credsettle' as ProjectSource, 
      name: 'CredSettle', 
      icon: faBalanceScale, 
      color: 'emerald', 
      description: 'Debt settlement and finance.',
      url: 'https://credsettle.com'
    },
    { 
      id: 'iprkaro' as ProjectSource, 
      name: 'IPRKaro', 
      icon: faGlobe, 
      color: 'amber', 
      description: 'Intellectual property rights.',
      url: 'https://iprkaro.com'
    },
    { 
      id: 'multipublish' as ProjectSource, 
      name: 'Multi-Publish', 
      icon: faRocket, 
      color: 'indigo', 
      description: 'Publish to all domains at once.',
      url: '#'
    },
  ];

  return (
    <OverlordSidebar>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Hub Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-lg">
                    <FontAwesomeIcon icon={faNewspaper} className="text-white text-xl" />
                  </div>
                  Blog Control Center
                </h1>
                <p className="text-gray-500 mt-1">Manage content across all project domains from a single switchboard.</p>
              </div>

              <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-xl">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setActiveProject(project.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                      activeProject === project.id 
                        ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <FontAwesomeIcon icon={project.icon} className={activeProject === project.id ? 'text-indigo-600' : 'text-gray-400'} />
                    {project.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Hub Stats / Quick Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  whileHover={{ y: -4 }}
                  onClick={() => setActiveProject(project.id)}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 ${
                    activeProject === project.id 
                      ? 'border-indigo-500 bg-indigo-50/30' 
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg bg-white shadow-sm ring-1 ring-black/5`}>
                      <FontAwesomeIcon icon={project.icon} className={`text-lg text-${project.color}-600`} />
                    </div>
                    {activeProject === project.id && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mt-4">{project.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{project.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Content</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-gray-300 text-xs" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Project Content */}
        <div className="flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeProject}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeProject === 'ama' && <AmaBlogs />}
              {activeProject === 'credsettle' && <CredSettleBlogs />}
              {activeProject === 'iprkaro' && <IprkaroBlogs />}
              {activeProject === 'multipublish' && <MultiPublishManager />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </OverlordSidebar>
  );
};

export default BlogsManagementHub;
