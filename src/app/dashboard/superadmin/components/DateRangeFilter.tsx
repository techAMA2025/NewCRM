import React from 'react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  isFilterApplied: boolean;
  isLoading: boolean;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  isFilterApplied,
  isLoading,
  onStartDateChange,
  onEndDateChange,
  onApplyFilter,
  onClearFilter
}) => {
  // Helper to get current month info
  const getCurrentMonthInfo = () => {
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[now.getMonth()];
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-gray-800/70 rounded-lg border border-gray-700">
      <div>
        <label htmlFor="start-date" className="block text-xs text-blue-200 mb-1">From Date</label>
        <input
          id="start-date"
          type="date"
          className="bg-gray-700 text-white px-2 py-1 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>
      
      <div>
        <label htmlFor="end-date" className="block text-xs text-blue-200 mb-1">To Date</label>
        <input
          id="end-date"
          type="date"
          className="bg-gray-700 text-white px-2 py-1 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
      
      <div className="flex gap-1 self-end mb-0.5">
        <button
          onClick={onApplyFilter}
          className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors text-xs"
          disabled={isLoading}
        >
          Apply Filter
        </button>
        
        <button
          onClick={onClearFilter}
          className="px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors text-xs"
          disabled={isLoading || (!startDate && !endDate)}
        >
          Clear Filter
        </button>
      </div>
      
      {isFilterApplied && startDate && endDate && (
        <div className="ml-auto text-xs text-blue-200">
          {(() => {
            const now = new Date();
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Check if this is current month filter
            const isCurrentMonth = start.getMonth() === now.getMonth() && 
                                   start.getFullYear() === now.getFullYear() &&
                                   start.getDate() === 1 &&
                                   end.getDate() === now.getDate() &&
                                   end.getMonth() === now.getMonth() &&
                                   end.getFullYear() === now.getFullYear();
            
            if (isCurrentMonth) {
              return `📅 Current Month (${getCurrentMonthInfo()})`;
            } else {
              return ;
            }
          })()}
        </div>
      )}
    </div>
  );
}; 