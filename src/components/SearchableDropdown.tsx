"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  className = "",
  isLoading = false,
  loadingText = "Loading..."
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected option for display
  const selectedOption = options.find(option => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case "Enter":
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex].value);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSearchTerm("");
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputClick = () => {
    if (!disabled && !isLoading) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const defaultClassName = "w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm";

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`${defaultClassName} ${className} ${
          disabled || isLoading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } flex items-center justify-between`}
        onClick={handleInputClick}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : "")}
          onChange={handleInputChange}
          placeholder={isLoading ? loadingText : placeholder}
          disabled={disabled || isLoading}
          className="bg-transparent border-none outline-none flex-1 text-white placeholder-gray-500"
          autoComplete="off"
        />
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && !disabled && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-gray-400 text-sm">
              No options found
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  index === highlightedIndex
                    ? "bg-purple-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                } ${option.value === value ? "bg-purple-700 text-white" : ""}`}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 