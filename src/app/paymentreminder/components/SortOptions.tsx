import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpDown } from "lucide-react";

interface SortOptionsProps {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: string) => void;
}

export default function SortOptions({ sortField, sortDirection, handleSort }: SortOptionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-gray-700 border-gray-600 text-white">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          Sort by
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
        <DropdownMenuItem onClick={() => handleSort('clientName')} className="hover:bg-gray-700">
          Client Name {sortField === 'clientName' && (sortDirection === 'asc' ? '↑' : '↓')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('pendingAmount')} className="hover:bg-gray-700">
          Pending Amount {sortField === 'pendingAmount' && (sortDirection === 'asc' ? '↑' : '↓')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('paidAmount')} className="hover:bg-gray-700">
          Paid Amount {sortField === 'paidAmount' && (sortDirection === 'asc' ? '↑' : '↓')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('progress')} className="hover:bg-gray-700">
          Progress {sortField === 'progress' && (sortDirection === 'asc' ? '↑' : '↓')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('startDate')} className="hover:bg-gray-700">
          Start Date {sortField === 'startDate' && (sortDirection === 'asc' ? '↑' : '↓')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 