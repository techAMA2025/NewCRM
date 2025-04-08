import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
}

export default function SearchBar({ searchQuery, setSearchQuery, setCurrentPage }: SearchBarProps) {
  return (
    <div className="flex-1 w-full md:w-auto relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
      <Input
        placeholder="Search clients by name, email or phone..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1); // Reset to first page on search
        }}
        className="pl-8 bg-gray-700 border-gray-600 text-white w-full"
      />
    </div>
  );
} 