import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ItemsPerPageProps {
  clientsPerPage: number;
  setClientsPerPage: (perPage: number) => void;
  setCurrentPage: (page: number) => void;
}

export default function ItemsPerPage({ clientsPerPage, setClientsPerPage, setCurrentPage }: ItemsPerPageProps) {
  return (
    <Select 
      value={clientsPerPage.toString()} 
      onValueChange={(value) => {
        setClientsPerPage(parseInt(value));
        setCurrentPage(1); // Reset to first page when changing items per page
      }}
    >
      <SelectTrigger className="w-[120px] bg-gray-700 border-gray-600 text-white">
        <SelectValue placeholder="10 per page" />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700 text-white">
        <SelectItem value="10">10 per page</SelectItem>
        <SelectItem value="20">20 per page</SelectItem>
        <SelectItem value="50">50 per page</SelectItem>
        <SelectItem value="100">100 per page</SelectItem>
      </SelectContent>
    </Select>
  );
} 