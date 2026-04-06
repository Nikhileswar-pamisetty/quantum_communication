import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import GroupManagementModal from '../chat/GroupManagementModal';
import { MessageSquare, Users, LogOut, PlusCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ onSelectChat }: { onSelectChat: (chat: any) => void }) {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      if (!user?.id) return;
      const [convs, friends, usersData, groupsData] = await Promise.all([
        api.getConversations(),
        api.getFriends(),
        api.getOnlineUsers(),
        api.getGroups()
      ]);
      
      const friendIds = friends.map((f: any) => f.id);
      const filteredConvs = convs.filter((c: any) => friendIds.includes(c.id));
      
      setConversations(filteredConvs);
      setOnlineUsers(usersData);
      setGroups(groupsData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSelect = (chat: any) => {
    setSelectedId(chat.id);
    onSelectChat(chat);
  };

  const filteredChats = conversations.filter(chat =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-80 border-r border-zinc-800 bg-black shrink-0 overflow-hidden">
      
      {/* Header + Search Bar (Fixed at top, never scrolls) */}
      <div className="shrink-0 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-white leading-tight">{user?.username}</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Online</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Local Filter Search Bar */}
        <div className="px-4 py-4 border-b border-zinc-800/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input 
              placeholder="Find contacts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-700 text-white shadow-none focus-visible:ring-1 focus-visible:ring-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Chat List (Scrollable below search bar) */}
      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <div className="space-y-1">
          {filteredChats.length > 0 ? filteredChats.map(c => {
            const isOnline = onlineUsers.some(u => u.id === c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleSelect({ type: 'direct', id: c.id, name: c.username })}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                  selectedId === c.id ? "bg-zinc-800/80 text-white" : "text-zinc-400 hover:bg-zinc-900"
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg border border-zinc-700/50 group-hover:border-zinc-500/50 transition-colors">
                    {c.username[0].toUpperCase()}
                  </div>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-zinc-100 group-hover:text-white transition-colors capitalize truncate">{c.username}</h4>
                    {c.last_message_time && (
                      <span className="text-[10px] text-zinc-600">
                        {new Date(c.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {c.last_message_type === 'file' ? `📎 ${c.last_message_content || c.last_message || 'File'}` : (c.last_message_content || c.last_message || "Start quantum chat")}
                  </p>
                </div>
              </button>
            );
          }) : (
            <div className="py-10 text-center px-4">
              <div className="w-12 h-12 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-zinc-700" />
              </div>
              <p className="text-sm text-zinc-500">{searchQuery ? "No contacts found" : "No recent conversations."}</p>
            </div>
          )}

          {/* Legacy Room Link */}
          {(!searchQuery || "legacy room".includes(searchQuery.toLowerCase())) && (
            <div className="pt-2 border-t border-zinc-800/50 mt-4 mx-2">
              <button
                onClick={() => handleSelect({ type: 'room', id: 'legacy', name: 'Legacy Room' })}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                  selectedId === 'legacy' ? "bg-blue-600/20 text-blue-400" : "text-blue-500/60 hover:bg-blue-600/10"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  🌀
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-sm">Legacy Entangle Room</h4>
                  <p className="text-[10px] opacity-70">Shared quantum space</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Groups Section (Scrollable separately below chats) */}
      <div className="shrink-0 overflow-y-auto max-h-48 border-t border-zinc-800 bg-zinc-950/30 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-md z-10 px-4 py-3 flex items-center justify-between border-b border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-400">
            <Users className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Groups</h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-6 h-6 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10"
            onClick={() => setIsGroupModalOpen(true)}
            title="Join or Create Group"
          >
            <PlusCircle className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-2 space-y-1">
          {groups.length > 0 ? groups.map(g => (
            <button
              key={g.id}
              onClick={() => handleSelect({ type: 'group', id: g.id, name: g.name })}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                selectedId === g.id ? "bg-zinc-800/80 text-white" : "text-zinc-400 hover:bg-zinc-900"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-zinc-700/50 group-hover:border-zinc-500/50 flex items-center justify-center text-lg transition-colors shrink-0">
                #
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">{g.name}</h4>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {g.last_message || "No messages yet"}
                </p>
              </div>
            </button>
          )) : (
            <div className="py-4 text-center px-4">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">No groups joined</p>
            </div>
          )}
        </div>
      </div>

      <GroupManagementModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        onGroupAction={(g) => { fetchData(); handleSelect({ type: 'group', id: g.id, name: g.name }); }} 
      />
    </div>
  );
}
