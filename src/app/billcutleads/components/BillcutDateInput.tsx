"use client";

import { useState, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import { FaCalendarAlt } from 'react-icons/fa';
import 'react-datepicker/dist/react-datepicker.css';

interface BillcutDateInputProps {
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
        className="block w-full pl-3 pr-10 py-2.5 text-sm border border-gray-700 bg-[#0b1437] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-xl cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-sm"
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-gray-400 hover:text-gray-200 p-1 rounded"
            title="Clear date"
            type="button"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const BillcutDateInput = ({ 
  value, 
  onChange, 
  placeholder = "Select date", 
  min, 
  max, 
  label,
  className = "" 
}: BillcutDateInputProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    } else {
      setSelectedDate(null);
    }
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
        <label className="block text-xs text-gray-400 mb-1">{label}</label>
      )}
      
      <div className="w-full">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          dateFormat="MMM d, yyyy"
          placeholderText={placeholder}
          minDate={min ? new Date(min + 'T00:00:00') : undefined}
          maxDate={max ? new Date(max + 'T23:59:59') : new Date()}
          showPopperArrow={false}
          customInput={
            <CustomInput 
              placeholder={placeholder}
              onClear={handleClear}
            />
          }
          calendarClassName="custom-datepicker-dark"
          popperClassName="custom-datepicker-popper"
          todayButton="Today"
          calendarStartDay={0}
          fixedHeight
          popperContainer={({ children }) => {
            if (typeof window === 'undefined') return null;
            return createPortal(children, document.body);
          }}
        />
      </div>

      <style jsx global>{`
        .custom-datepicker-dark {
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          font-family: inherit;
          color: #e5e7eb;
        }

        .custom-datepicker-popper {
          z-index: 9999;
        }

        .react-datepicker__header {
          background-color: #111827;
          border-bottom: 1px solid #374151;
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .react-datepicker__current-month {
          color: #e5e7eb;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .react-datepicker__day-name {
          color: #9ca3af;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .react-datepicker__day {
          color: #e5e7eb;
          font-size: 0.75rem;
          border-radius: 0.25rem;
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
          margin: 0.125rem;
        }

        .react-datepicker__day:hover {
          background-color: #374151;
          color: #60a5fa;
        }

        .react-datepicker__day--selected {
          background-color: #3b82f6;
          color: white;
          font-weight: 600;
        }

        .react-datepicker__day--selected:hover {
          background-color: #2563eb;
        }

        .react-datepicker__day--today {
          background-color: #1f2937;
          color: #60a5fa;
          font-weight: 600;
          border: 1px solid #3b82f6;
        }

        .react-datepicker__day--disabled {
          color: #4b5563;
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent;
          color: #4b5563;
        }

        .react-datepicker__day--outside-month {
          color: #4b5563;
        }

        .react-datepicker__navigation {
          top: 0.5rem;
        }

        .react-datepicker__navigation-icon::before {
          border-color: #9ca3af;
        }

        .react-datepicker__today-button {
          background-color: #374151;
          color: #e5e7eb;
          border-top: 1px solid #374151;
          border-radius: 0 0 0.5rem 0.5rem;
          padding: 0.5rem 1rem;
          font-weight: 500;
        }

        .react-datepicker__today-button:hover {
          background-color: #4b5563;
        }

        .react-datepicker__triangle {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default BillcutDateInput;
