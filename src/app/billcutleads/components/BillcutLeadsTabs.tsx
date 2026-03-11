import React from 'react';

type TabType = 'all' | 'callback';

interface BillcutLeadsTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  callbackCount: number;
  allLeadsCount: number;
}

const BillcutLeadsTabs: React.FC<BillcutLeadsTabsProps> = ({
  activeTab,
  onTabChange,
  callbackCount,
  allLeadsCount
}) => {
  return (
    <div className="mb-6">
      <div className="border-b border-gray-700/50">
        <nav className="-mb-px flex space-x-4 md:space-x-8" aria-label="Tabs">
          <button
            onClick={() => onTabChange('all')}
            className={`whitespace-nowrap py-2.5 px-3 md:px-6 border-b-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            All Leads
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
              {allLeadsCount}
            </span>
          </button>
          
          <button
            onClick={() => onTabChange('callback')}
            className={`whitespace-nowrap py-2.5 px-3 md:px-6 border-b-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-all duration-300 flex items-center ${
              activeTab === 'callback'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            My Callbacks
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'callback' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
              {callbackCount}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default BillcutLeadsTabs; 