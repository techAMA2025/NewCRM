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
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => onTabChange('all')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            All Leads
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'all'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-700 text-gray-400'
            }`}>
              {allLeadsCount}
            </span>
          </button>
          
          <button
            onClick={() => onTabChange('callback')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'callback'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            My Callbacks
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'callback'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-700 text-gray-400'
            }`}>
              {callbackCount}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default BillcutLeadsTabs; 