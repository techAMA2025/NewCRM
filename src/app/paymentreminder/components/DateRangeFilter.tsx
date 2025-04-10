import React from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "lucide-react";
import { format } from 'date-fns';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  setDateRange: (start: Date | null, end: Date | null) => void;
  setCurrentPage: (page: number) => void;
}

export default function DateRangeFilter({ 
  startDate, 
  endDate, 
  setDateRange, 
  setCurrentPage 
}: DateRangeFilterProps) {
  
  const getDisplayText = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'dd/MM/yy')} - ${format(endDate, 'dd/MM/yy')}`;
    }
    if (startDate) {
      return `From ${format(startDate, 'dd/MM/yy')}`;
    }
    if (endDate) {
      return `Until ${format(endDate, 'dd/MM/yy')}`;
    }
    return 'Date Range';
  };

  // Preset date ranges
  const setLastWeek = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setDateRange(start, end);
    setCurrentPage(1);
  };

  const setLastMonth = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    setDateRange(start, end);
    setCurrentPage(1);
  };

  const setLast3Months = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    setDateRange(start, end);
    setCurrentPage(1);
  };

  const setLast6Months = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    setDateRange(start, end);
    setCurrentPage(1);
  };

  const clearDateRange = () => {
    setDateRange(null, null);
    setCurrentPage(1);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-gray-700 border-gray-600 text-white">
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
        <DropdownMenuItem onClick={setLastWeek} className="hover:bg-gray-700">
          Last 7 days
        </DropdownMenuItem>
        <DropdownMenuItem onClick={setLastMonth} className="hover:bg-gray-700">
          Last 30 days
        </DropdownMenuItem>
        <DropdownMenuItem onClick={setLast3Months} className="hover:bg-gray-700">
          Last 3 months
        </DropdownMenuItem>
        <DropdownMenuItem onClick={setLast6Months} className="hover:bg-gray-700">
          Last 6 months
        </DropdownMenuItem>
        <DropdownMenuItem onClick={clearDateRange} className="hover:bg-gray-700 text-red-400">
          Clear date filter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 