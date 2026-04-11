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
        className="block w-full pl-3 pr-10 py-2.5 text-sm border border-[#5A4C33]/20 bg-white text-[#5A4C33] focus:outline-none focus:ring-2 focus:ring-[#D2A02A]/30 focus:border-[#D2A02A] rounded-xl cursor-pointer hover:border-[#5A4C33]/40 transition-all duration-200 shadow-sm"
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-[#5A4C33]/40 hover:text-[#5A4C33] p-1 rounded"
            title="Clear date"
            type="button"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <FaCalendarAlt className="text-[#5A4C33]/40" />
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
        <label className="block text-xs text-[#5A4C33]/60 mb-1">{label}</label>
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
          calendarClassName="custom-datepicker-light"
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
        .custom-datepicker-light {
          background-color: #ffffff;
          border: 1px solid #5A4C3320;
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          font-family: inherit;
          color: #5A4C33;
          overflow: hidden;
        }

        .custom-datepicker-popper {
          z-index: 9999;
        }

        .react-datepicker__header {
          background-color: #F8F5EC;
          border-bottom: 1px solid #5A4C3310;
          border-radius: 0.75rem 0.75rem 0 0;
          padding-top: 12px;
        }

        .react-datepicker__current-month {
          color: #5A4C33;
          font-weight: 700;
          font-size: 0.9rem;
          margin-bottom: 8px;
        }

        .react-datepicker__day-name {
          color: #5A4C3360;
          font-size: 0.75rem;
          font-weight: 600;
          width: 2rem;
        }

        .react-datepicker__day {
          color: #5A4C33;
          font-size: 0.8rem;
          border-radius: 0.5rem;
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
          margin: 0.125rem;
          transition: all 0.2s;
        }

        .react-datepicker__day:hover {
          background-color: #D2A02A15;
          color: #D2A02A;
        }

        .react-datepicker__day--selected {
          background-color: #D2A02A !important;
          color: white !important;
          font-weight: 600;
        }

        .react-datepicker__day--today {
          background-color: transparent;
          color: #D2A02A;
          font-weight: 700;
          border: 1px solid #D2A02A40;
        }

        .react-datepicker__day--disabled {
          color: #5A4C3330;
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent;
          color: #5A4C3330;
        }

        .react-datepicker__day--outside-month {
          color: #5A4C3330;
        }

        .react-datepicker__navigation {
          top: 12px;
        }

        .react-datepicker__navigation-icon::before {
          border-color: #5A4C3360;
          border-width: 2px;
        }

        .react-datepicker__today-button {
          background-color: #F8F5EC;
          color: #D2A02A;
          border-top: 1px solid #5A4C3310;
          border-radius: 0 0 0.75rem 0.75rem;
          padding: 8px 0;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .react-datepicker__today-button:hover {
          background-color: #D2A02A10;
        }

        .react-datepicker__triangle {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default BillcutDateInput;
