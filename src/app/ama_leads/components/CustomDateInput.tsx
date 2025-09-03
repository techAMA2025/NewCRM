"use client";

import { useState, forwardRef } from 'react';
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
        className="w-full pl-3 pr-10 py-2 text-sm border border-[#5A4C33]/20 bg-[#ffffff] text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md cursor-pointer hover:border-[#D2A02A]/50 transition-colors"
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-[#5A4C33]/50 hover:text-[#5A4C33] p-1 rounded"
            title="Clear date"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <FaCalendarAlt className="text-[#5A4C33]/50" />
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

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      // Format date in local timezone, not UTC to avoid timezone issues
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

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs text-[#5A4C33]/70 mb-1">{label}</label>
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
          calendarClassName="custom-datepicker"
          popperClassName="custom-datepicker-popper"
          todayButton="Today"
          calendarStartDay={0}
          fixedHeight
        />
      </div>

      <style jsx global>{`
        .custom-datepicker {
          border: 1px solid rgba(90, 76, 51, 0.2);
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          font-family: inherit;
        }

        .custom-datepicker-popper {
          z-index: 1000;
        }

        .react-datepicker__header {
          background-color: #F8F5EC;
          border-bottom: 1px solid rgba(90, 76, 51, 0.1);
          border-radius: 8px 8px 0 0;
        }

        .react-datepicker__current-month {
          color: #5A4C33;
          font-weight: 600;
          font-size: 14px;
        }

        .react-datepicker__day-name {
          color: rgba(90, 76, 51, 0.7);
          font-size: 12px;
          font-weight: 500;
        }

        .react-datepicker__day {
          color: #5A4C33;
          font-size: 12px;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          line-height: 32px;
          margin: 2px;
        }

        .react-datepicker__day:hover {
          background-color: #F8F5EC;
          color: #D2A02A;
        }

        .react-datepicker__day--selected {
          background-color: #D2A02A;
          color: white;
          font-weight: 600;
        }

        .react-datepicker__day--selected:hover {
          background-color: #B8911E;
        }

        .react-datepicker__day--today {
          background-color: #F8F5EC;
          color: #D2A02A;
          font-weight: 600;
          border: 1px solid #D2A02A;
        }

        .react-datepicker__day--disabled {
          color: rgba(90, 76, 51, 0.3);
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent;
          color: rgba(90, 76, 51, 0.3);
        }

        .react-datepicker__day--outside-month {
          color: rgba(90, 76, 51, 0.3);
        }

        .react-datepicker__navigation {
          background: none;
          border: none;
          outline: none;
          color: rgba(90, 76, 51, 0.7);
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
        }

        .react-datepicker__navigation:hover {
          background-color: #F8F5EC;
          color: #5A4C33;
        }

        .react-datepicker__navigation-icon::before {
          border-color: rgba(90, 76, 51, 0.7);
        }

        .react-datepicker__today-button {
          background-color: #D2A02A;
          color: white;
          border: none;
          border-radius: 0 0 8px 8px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .react-datepicker__today-button:hover {
          background-color: #B8911E;
        }

        .react-datepicker__triangle {
          display: none;
        }

        .react-datepicker-wrapper {
          width: 100%;
        }

        .react-datepicker__input-container {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default CustomDateInput; 