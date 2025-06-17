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
import { Eye, Sun, Moon } from 'lucide-react'

interface Client {
  id: string
  name: string
  phone: string
  email: string
  status: string
  city: string
  occupation: string
  aadharNumber: string
  assignedTo: string
  alloc_adv?: string
  alloc_adv_secondary?: string
  adv_status?: string
}

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
  onThemeChange
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
                  {client.name}
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
                <TableCell className="text-right p-1.5">
                  <div className="flex justify-end gap-1">
                    <Button
                      onClick={() => onViewDetails(client)}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white h-5 w-5 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => onEditClient(client)}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white h-5 w-5 p-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </Button>
                    <Button
                      onClick={() => onDeleteClient(client)}
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white h-5 w-5 p-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
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