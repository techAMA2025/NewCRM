'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppUser } from './types';
import AppUsersTable from './components/AppUsersTable';
import EditUserModal from './components/EditUserModal';
import AddUserModal from './components/AddUserModal';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import { FiSearch } from 'react-icons/fi';
import { authFetch } from '@/lib/authFetch';

export default function AppUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastCreatedAt, setLastCreatedAt] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loggedInFilter, setLoggedInFilter] = useState('all');
  const [availableRoles, setAvailableRoles] = useState<string[]>(['admin', 'advocate', 'client', 'user']);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchUsers = useCallback(async (isLoadMore = false, query = '', role = 'all', status = 'all', loggedIn = 'all') => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '50' });
      
      if (query) params.append('search', query);
      if (role && role !== 'all') params.append('role', role);
      if (status && status !== 'all') params.append('status', status);
      if (loggedIn && loggedIn !== 'all') params.append('loggedIn', loggedIn);

      const hasComplexFilters = (role !== 'all' || status !== 'all' || loggedIn !== 'all');

      if (isLoadMore && lastCreatedAt && lastId && !hasComplexFilters) {
        params.append('lastCreatedAt', lastCreatedAt.toString());
        params.append('lastId', lastId);
      }

      // Add cache busting
      params.append('_t', Date.now().toString());

      const response = await authFetch(`/api/app-users?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTotal(data.total);
      
      if (isLoadMore) {
        setUsers(prev => {
          const existingIds = new Set(prev.map(u => u.id));
          const newUsers = data.users.filter((u: AppUser) => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });
      } else {
        setUsers(data.users);
        const knownRoles = ['admin', 'advocate', 'client', 'user'];
        const dynamicRoles = Array.from(new Set(data.users.map((u: AppUser) => u.role).filter(Boolean))) as string[];
        const mergedRoles = Array.from(new Set([...knownRoles, ...dynamicRoles])).sort();
        setAvailableRoles(mergedRoles);
      }

      setHasMore(data.hasMore);

      if (data.users.length > 0) {
        const lastUser = data.users[data.users.length - 1];
        // Handle Firestore Timestamp or number
        const createdAt = lastUser.created_at;
        const timestamp = typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt
          ? (createdAt as any).seconds 
          : createdAt;
          
        setLastCreatedAt(timestamp);
        setLastId(lastUser.id);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [lastCreatedAt, lastId]);

  useEffect(() => {
    // Initial load
    fetchUsers(false, searchQuery, roleFilter, statusFilter, loggedInFilter);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLastCreatedAt(null);
    setLastId(null);
    fetchUsers(false, searchQuery, roleFilter, statusFilter, loggedInFilter);
  };

  const handleFilterChange = (type: 'role' | 'status' | 'loggedIn', value: string) => {
      setLastCreatedAt(null);
      setLastId(null);
      if (type === 'role') {
          setRoleFilter(value);
          fetchUsers(false, searchQuery, value, statusFilter, loggedInFilter);
      } else if (type === 'status') {
          setStatusFilter(value);
          fetchUsers(false, searchQuery, roleFilter, value, loggedInFilter);
      } else {
          setLoggedInFilter(value);
          fetchUsers(false, searchQuery, roleFilter, statusFilter, value);
      }
  };

  const handleLoadMore = () => {
    if (roleFilter !== 'all' || statusFilter !== 'all' || loggedInFilter !== 'all') return; 
    fetchUsers(true, searchQuery, roleFilter, statusFilter, loggedInFilter);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
      try {
          const response = await authFetch('/api/app-users', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, status: newStatus })
          });
          
          if (!response.ok) throw new Error('Failed to update status');
          
          setUsers(prev => prev.map(user => 
              user.id === id ? { ...user, status: newStatus } : user
          ));
      } catch (error) {
          console.error('Error updating status:', error);
          setError('Failed to update user status');
      }
  };

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (id: string, data: Partial<AppUser>) => {
    try {
        const response = await authFetch('/api/app-users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data })
        });

        if (!response.ok) throw new Error('Failed to update user');
        
        // Optimistic update
        setUsers(prev => prev.map(user => 
            user.id === id ? { ...user, ...data } : user
        ));
    } catch (error) {
        console.error('Error updating user:', error);
        setError('Failed to update user details');
        throw error; // Re-throw to be handled by the modal
    }
  };

  const handleAddUser = async (data: Omit<AppUser, 'id' | 'created_at' | 'updated_at'>) => {
    try {
        const response = await authFetch('/api/app-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to add user');
        
        const result = await response.json();
        
        // Optimistic update or refetch
        // For simplicity, let's prepend the new user to the list if it matches current filters
        // But since filters might hide it, maybe just refetching or prepending is fine.
        // Let's prepend it to the current list.
        if (result.user) {
            setUsers(prev => [result.user, ...prev]);
            setTotal(prev => prev + 1);
        }
    } catch (error) {
        console.error('Error adding user:', error);
        setError('Failed to add new user');
        throw error;
    }
  };

  return (
    <OverlordSidebar>
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">App Users</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[#D2A02A] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-[#B8911E] transition-colors"
                    >
                        Add User
                    </button>
                    <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                        Total: {total.toLocaleString()}
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <form onSubmit={handleSearch} className="relative flex-grow max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
                    placeholder="Search by name or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>

                <div className="flex gap-2 w-full sm:w-auto">
                     <select 
                        value={roleFilter}
                        onChange={(e) => handleFilterChange('role', e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm rounded-md"
                     >
                        <option value="all">All Roles</option>
                        {availableRoles.map(role => (
                             <option key={role} value={role}>{role}</option>
                        ))}
                     </select>

                     <select 
                        value={statusFilter}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm rounded-md"
                     >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                     </select>

                     <select 
                        value={loggedInFilter}
                        onChange={(e) => handleFilterChange('loggedIn', e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm rounded-md"
                     >
                        <option value="all">All Users</option>
                        <option value="yes">Logged In</option>
                        <option value="no">Not Logged In</option>
                     </select>
                </div>
            </div>
        </header>
        
        <main className="flex-1 p-6">
          <div className="space-y-6">
             {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
             )}
             
             <AppUsersTable 
                users={users} 
                hasMore={hasMore} 
                loading={loading} 
                loadMore={handleLoadMore}
                onStatusChange={handleStatusUpdate}
                onEditUser={handleEditUser}
             />
          </div>
        </main>

        {selectedUser && (
            <EditUserModal 
                user={selectedUser}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveUser}
            />
        )}

        <AddUserModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddUser}
        />
      </div>
    </OverlordSidebar>
  );
}
