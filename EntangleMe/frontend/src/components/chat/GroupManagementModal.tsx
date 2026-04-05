import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupAction: (group: any) => void;
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({ isOpen, onClose, onGroupAction }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'join' && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const newGroup = await api.createGroup(groupName, []);
      onGroupAction(newGroup);
      setGroupName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const results = await api.searchGroups(searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      console.error('Search failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (group: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.joinGroup(group.id);
      onGroupAction(group);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#1e1e2e] shadow-2xl border border-[#313244]">
        <div className="flex border-b border-[#313244]">
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'create' ? 'text-[#cba6f7] border-b-2 border-[#cba6f7]' : 'text-[#a6adc8] hover:text-white'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Create New Group
          </button>
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'join' ? 'text-[#cba6f7] border-b-2 border-[#cba6f7]' : 'text-[#a6adc8] hover:text-white'
            }`}
            onClick={() => setActiveTab('join')}
          >
            Join Existing Group
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#a6adc8] mb-2">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-xl bg-[#313244] border-none text-white p-3 focus:ring-2 focus:ring-[#cba6f7] outline-none"
                  placeholder="Enter group name..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-[#a6adc8] hover:bg-[#313244] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !groupName.trim()}
                  className="px-6 py-2 rounded-xl bg-[#cba6f7] text-[#1e1e2e] font-bold hover:bg-[#b4befe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-[#313244] border-none text-white p-3 focus:ring-2 focus:ring-[#cba6f7] outline-none"
                  placeholder="Search group names..."
                  autoFocus
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 mb-6 thin-scrollbar">
                {searchResults.length > 0 ? (
                  searchResults.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#313244] border border-transparent hover:border-[#cba6f7]/30 transition-all"
                    >
                      <div>
                        <div className="text-white font-medium">{group.name}</div>
                        <div className="text-xs text-[#a6adc8]">{group.member_count || 0} members</div>
                      </div>
                      <button
                        onClick={() => handleJoin(group)}
                        disabled={isLoading}
                        className="px-4 py-1.5 rounded-lg bg-[#cba6f7]/10 text-[#cba6f7] text-sm font-medium hover:bg-[#cba6f7] hover:text-[#1e1e2e] transition-all"
                      >
                        Join
                      </button>
                    </div>
                  ))
                ) : searchQuery.length >= 2 ? (
                  <div className="text-center py-8 text-[#a6adc8] text-sm italic">
                    {isLoading ? 'Searching...' : 'No groups found matching your search.'}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#a6adc8] text-sm italic">
                    Type at least 2 characters to search...
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-[#a6adc8] hover:bg-[#313244] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupManagementModal;
