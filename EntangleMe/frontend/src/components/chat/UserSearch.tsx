import { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface UserSearchProps {
  onSelectUser: (user: any) => void;
}

export function UserSearch({ onSelectUser }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingUsernames, setPendingUsernames] = useState<string[]>([]);
  const [friendUsernames, setFriendUsernames] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const [data, friends] = await Promise.all([
        api.searchUsers(query),
        api.getFriends()
      ]);
      setResults(data);
      setFriendUsernames(friends.map((f: any) => f.username));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendRequest = async (username: string) => {
    try {
      await api.sendFriendRequest(username);
      toast.success(`Request sent to ${username}`);
      setPendingUsernames(prev => [...prev, username]);
    } catch (err) {
      toast.error("Failed to send request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-zinc-400 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 shadow-none">
          <Search className="w-4 h-4 mr-2" />
          Find contacts...
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Username..." 
            className="bg-zinc-800 border-zinc-700 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        <ScrollArea className="h-64 mt-4 pr-1">
          <div className="space-y-2">
            {results.map(user => {
              const isFriend = friendUsernames.includes(user.username);
              const isPending = pendingUsernames.includes(user.username);
              
              return (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/20 border border-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-500/10">
                        {user.username[0].toUpperCase()}
                      </div>
                      {user.is_online && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{user.username}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                        {user.is_online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  
                  {isFriend ? (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 text-xs h-8 px-3 font-bold uppercase tracking-wider" 
                      onClick={() => {
                        onSelectUser({ type: 'direct', id: user.id, name: user.username });
                        setOpen(false);
                      }}
                    >
                      Chat
                    </Button>
                  ) : isPending ? (
                    <span className="text-[10px] text-zinc-500 font-bold uppercase py-1.5 px-3 bg-zinc-800 rounded-md border border-zinc-700/50">Sent</span>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => sendRequest(user.username)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-8 px-3 font-bold uppercase tracking-wider"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Request
                    </Button>
                  )}
                </div>
              );
            })}
            {query && !isLoading && results.length === 0 && (
              <p className="text-center text-zinc-500 text-sm py-4">No users found</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
