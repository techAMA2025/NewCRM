import React from 'react';

type TabType = 'all' | 'callback';

interface LeadsTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  callbackCount: number;
  allLeadsCount: number;
}

const LeadsTabs: React.FC<LeadsTabsProps> = ({
  activeTab,
  onTabChange,
  callbackCount,
  allLeadsCount
}) => {
  return (
    <div className="mb-6">
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => onTabChange('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            All Leads
            <span className="ml-2 bg-gray-700 text-gray-300 py-0.5 px-2 rounded-full text-xs">
              {allLeadsCount}
            </span>
          </button>
          
          <button
            onClick={() => onTabChange('callback')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'callback'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            Callbacks
            <span className="ml-2 bg-blue-600 text-white py-0.5 px-2 rounded-full text-xs">
              {callbackCount}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default LeadsTabs; 