"use client";

import { useState, forwardRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { FaCalendarAlt } from 'react-icons/fa';
import 'react-datepicker/dist/react-datepicker.css';

interface CustomDateInputProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  label?: string;
  className?: string;
}

// Custom input component for react-datepicker
const CustomInput = forwardRef<HTMLInputElement, any>(
  ({ value, onClick, placeholder, onClear }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        value={value}
        onClick={onClick}
        placeholder={placeholder}
        readOnly
        className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 shadow-sm"
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
            title="Clear date"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <FaCalendarAlt className="text-gray-400" />
      </div>
    </div>
  )
);

CustomInput.displayName = 'CustomInput';

const CustomDateInput = ({ 
  value, 
  onChange, 
  placeholder = "Select date", 
  min, 
  max, 
  label,
  className = "" 
}: CustomDateInputProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );

  // Update internal state if external value changes
  useEffect(() => {
    setSelectedDate(value ? new Date(value) : null);
  }, [value]);

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      // Format date in local timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      onChange(dateString);
    } else {
      onChange('');
    }
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange('');
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">{label}</label>
      )}
      
      <div className="w-full">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          dateFormat="MMM d, yyyy"
          placeholderText={placeholder}
          minDate={min ? new Date(min + 'T00:00:00') : undefined}
          maxDate={max ? new Date(max + 'T23:59:59') : undefined}
          showPopperArrow={false}
          customInput={
            <CustomInput 
              placeholder={placeholder}
              onClear={handleClear}
            />
          }
          calendarClassName="custom-datepicker"
          popperClassName="custom-datepicker-popper"
          todayButton="Today"
          calendarStartDay={0}
          fixedHeight
        />
      </div>

      <style jsx global>{`
        .custom-datepicker {
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          font-family: inherit;
          overflow: hidden;
          background-color: white;
        }

        .dark .custom-datepicker {
          background-color: #1f2937;
          border-color: #374151;
          color: white;
        }

        .custom-datepicker-popper {
          z-index: 1000;
        }

        .react-datepicker__header {
          background-color: #f9fafb;
          border-bottom: 1px solid #f3f4f6;
          border-radius: 16px 16px 0 0;
          padding-top: 12px;
        }

        .dark .react-datepicker__header {
          background-color: #111827;
          border-bottom-color: #374151;
        }

        .react-datepicker__current-month {
          color: #111827;
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 8px;
        }

        .dark .react-datepicker__current-month {
          color: #f3f4f6;
        }

        .react-datepicker__day-name {
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          width: 36px;
        }

        .react-datepicker__day {
          color: #374151;
          font-size: 13px;
          border-radius: 12px;
          width: 36px;
          height: 36px;
          line-height: 36px;
          margin: 2px;
          transition: all 0.2s;
        }

        .dark .react-datepicker__day {
          color: #d1d5db;
        }

        .react-datepicker__day:hover {
          background-color: #eef2ff;
          color: #4f46e5;
        }

        .dark .react-datepicker__day:hover {
          background-color: #312e81;
          color: #a5b4fc;
        }

        .react-datepicker__day--selected {
          background-color: #4f46e5 !important;
          color: white !important;
          font-weight: 700;
        }

        .react-datepicker__day--today {
          color: #4f46e5;
          font-weight: 700;
          position: relative;
        }

        .react-datepicker__day--today::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: #4f46e5;
          border-radius: 50%;
        }

        .react-datepicker__day--disabled {
          color: #d1d5db;
          cursor: not-allowed;
        }

        .dark .react-datepicker__day--disabled {
          color: #4b5563;
        }

        .react-datepicker__navigation {
          top: 14px;
        }

        .react-datepicker__today-button {
          background-color: #4f46e5;
          color: white;
          border: none;
          border-radius: 0 0 16px 16px;
          padding: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .react-datepicker__today-button:hover {
          background-color: #4338ca;
        }

        .react-datepicker__triangle {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CustomDateInput;
