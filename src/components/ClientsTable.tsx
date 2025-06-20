import { useState } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Sun, Moon, Edit, Trash2, FileText } from 'lucide-react'
import { Client } from '@/app/clients/types'

// Helper function to format source display name and get color
const formatSourceName = (source: string): { name: string; color: string } => {
  if (!source) return { name: 'Manual Entry', color: 'text-gray-500' };
  const normalizedSource = source.replace(/\s*\d+\s*/g, '').trim().toLowerCase();
  switch (normalizedSource) {
    case 'credsettlee':
      return { name: 'Cred Settle', color: 'text-blue-500' };
    case 'ama':
      return { name: 'AMA', color: 'text-green-500' };
    case 'settleloans':
      return { name: 'Settle Loans', color: 'text-purple-500' };
    case 'billcut':
      return { name: 'Bill Cut', color: 'text-orange-500' };
    case 'manual':
      return { name: 'Manual Entry', color: 'text-gray-500' };
    default:
      return { name: source, color: 'text-gray-400' };
  }
};

interface ClientsTableProps {
  clients: Client[]
  onViewDetails: (client: Client) => void
  onEditClient: (client: Client) => void
  onDeleteClient: (client: Client) => void
  onAdvocateStatusChange: (clientId: string, newStatus: string) => void
  selectedClients: Set<string>
  onSelectAll: (checked: boolean) => void
  onSelectClient: (clientId: string, checked: boolean) => void
  theme?: 'light' | 'dark'
  onThemeChange?: (theme: 'light' | 'dark') => void
  openDocumentViewer: (documentUrl: string, documentName: string) => void
}

export default function ClientsTable({
  clients,
  onViewDetails,
  onEditClient,
  onDeleteClient,
  onAdvocateStatusChange,
  selectedClients,
  onSelectAll,
  onSelectClient,
  theme = 'light',
  onThemeChange,
  openDocumentViewer
}: ClientsTableProps) {
  const isDark = theme === 'dark'

  const toggleTheme = () => {
    if (onThemeChange) {
      onThemeChange(isDark ? 'light' : 'dark')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="sm"
          className={`${
            isDark 
              ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700' 
              : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
          } h-8 w-8 p-0`}
        >
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className={`rounded-lg border overflow-hidden text-xs ${
        isDark 
          ? 'border-gray-700 bg-gray-900 text-gray-200' 
          : 'border-gray-300 bg-white text-gray-800'
      }`}>
        <Table>
          <TableHeader className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
            <TableRow className={isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} w-[32px] p-1.5`}>
                <input
                  type="checkbox"
                  className={`rounded ${
                    isDark 
                      ? 'border-gray-600 text-blue-400 focus:ring-blue-400 bg-gray-700' 
                      : 'border-gray-300 text-blue-500 focus:ring-blue-500 bg-white'
                  } h-3 w-3`}
                  checked={selectedClients.size === clients.length && clients.length > 0}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1.5`}>Name</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1.5`}>Phone</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1.5`}>City</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1.5`}>Advocate</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1.5`}>Status</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1.5`}>Sales By</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-right p-1.5`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => (
              <TableRow 
                key={client.id} 
                className={isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}
              >
                <TableCell className="p-1.5">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      isDark 
                        ? 'border-gray-600 text-blue-400 focus:ring-blue-400 bg-gray-700' 
                        : 'border-gray-300 text-blue-500 focus:ring-blue-500 bg-white'
                    } h-3 w-3`}
                    checked={selectedClients.has(client.id)}
                    onChange={(e) => onSelectClient(client.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell className={`font-medium p-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  <div className="flex flex-col">
                    <span className="font-medium">{client.name.toUpperCase()}</span>
                    <span className={`text-[10px] ${formatSourceName(client.source_database || '').color}`}>
                      {formatSourceName(client.source_database || '').name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="p-1.5">{client.phone}</TableCell>
                <TableCell className="p-1.5">{client.city}</TableCell>
                <TableCell className="p-1.5">
                  <div className="flex flex-col">
                    <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                      {client.alloc_adv || 'Unassigned'}
                    </span>
                    {client.alloc_adv_secondary && (
                      <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Secondary: {client.alloc_adv_secondary}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="p-1.5">
                  <Select 
                    value={client.adv_status || 'Pending'} 
                    onValueChange={(value) => onAdvocateStatusChange(client.id, value)}
                  >
                    <SelectTrigger className={`w-[90px] h-5 px-1.5 py-0 text-[10px] border ${
                      client.adv_status === 'Active' 
                        ? isDark
                          ? 'bg-green-900/50 text-green-400 border-green-700'
                          : 'bg-green-50 text-green-600 border-green-200'
                        : client.adv_status === 'Dropped'
                        ? isDark
                          ? 'bg-red-900/50 text-red-400 border-red-700'
                          : 'bg-red-50 text-red-600 border-red-200'
                        : isDark
                          ? 'bg-yellow-900/50 text-yellow-400 border-yellow-700'
                          : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={isDark ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-300'}>
                      <SelectItem value="Active" className={isDark ? 'text-green-400' : 'text-green-600'}>Active</SelectItem>
                      <SelectItem value="Dropped" className={isDark ? 'text-red-400' : 'text-red-600'}>Dropped</SelectItem>
                      <SelectItem value="Not Responding" className={isDark ? 'text-yellow-400' : 'text-yellow-600'}>Not Responding</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1.5">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    {client.assignedTo || 'Unassigned'}
                  </span>
                </TableCell>
                <TableCell className="p-1.5">
                  <div className="flex items-center justify-end space-x-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDetails(client)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditClient(client)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    {client.documentUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-purple-500 hover:text-purple-600"
                        onClick={() => openDocumentViewer(client.documentUrl as string, client.documentName || 'Client Document')}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDeleteClient(client)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 