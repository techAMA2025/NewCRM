import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";

interface StatusFilterProps {
  statusFilter: string | null;
  setStatusFilter: (status: string | null) => void;
  setCurrentPage: (page: number) => void;
}

export default function StatusFilter({ statusFilter, setStatusFilter }: StatusFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-gray-700 border-gray-600 text-white">
          <Filter className="mr-2 h-4 w-4" />
          {statusFilter ? `Status: ${statusFilter}` : "Filter Status"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
        <DropdownMenuItem onClick={() => setStatusFilter(null)} className="hover:bg-gray-700">
          All Statuses
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatusFilter('pending')} className="hover:bg-gray-700">
          Pending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatusFilter('partial')} className="hover:bg-gray-700">
          Partial
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatusFilter('overdue')} className="hover:bg-gray-700">
          Overdue
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatusFilter('completed')} className="hover:bg-gray-700">
          Completed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 