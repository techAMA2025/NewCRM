import { Button } from "@/components/ui/button";
import { Grid3X3, List } from "lucide-react";

interface ViewToggleProps {
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
}

export default function ViewToggle({ viewMode, setViewMode }: ViewToggleProps) {
  return (
    <Button 
      variant="outline" 
      className="bg-gray-700 border-gray-600 text-white"
      onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
    >
      {viewMode === 'list' ? <Grid3X3 className="h-4 w-4 mr-2" /> : <List className="h-4 w-4 mr-2" />}
      {viewMode === 'list' ? 'Grid View' : 'List View'}
    </Button>
  );
} 