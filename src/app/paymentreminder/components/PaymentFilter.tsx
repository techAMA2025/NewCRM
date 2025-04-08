import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IndianRupee } from "lucide-react";

interface PaymentFilterProps {
  filterPaid: string | null;
  setFilterPaid: (paid: string | null) => void;
  setCurrentPage: (page: number) => void;
}

export default function PaymentFilter({ filterPaid, setFilterPaid, setCurrentPage }: PaymentFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-gray-700 border-gray-600 text-white">
          <IndianRupee className="mr-2 h-4 w-4" />
          {filterPaid ? `Payment: ${filterPaid}` : "Filter Payment"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
        <DropdownMenuItem onClick={() => {
          setFilterPaid(null);
          setCurrentPage(1);
        }} className="hover:bg-gray-700">
          All Payments
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          setFilterPaid('fullypaid');
          setCurrentPage(1);
        }} className="hover:bg-gray-700">
          Fully Paid
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          setFilterPaid('partiallypaid');
          setCurrentPage(1);
        }} className="hover:bg-gray-700">
          Partially Paid
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          setFilterPaid('notpaid');
          setCurrentPage(1);
        }} className="hover:bg-gray-700">
          Not Paid
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 