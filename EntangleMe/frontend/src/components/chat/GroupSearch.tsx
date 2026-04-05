import { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface GroupSearchProps {
  onJoinSuccess: (group: any) => void;
}

export function GroupSearch({ onJoinSuccess }: GroupSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const data = await api.searchGroups(query);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (group: any) => {
    try {
      await api.joinGroup(group.id);
      toast.success(`Joined ${group.name}!`);
      onJoinSuccess({ type: 'group', id: group.id, name: group.name });
      setOpen(false);
      setQuery('');
      setResults([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to join group");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
          <Search className="w-3 h-3 mr-1" />
          Join Group
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Search Groups</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="GroupName..." 
            className="bg-zinc-800 border-zinc-700 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        <ScrollArea className="h-64 mt-4 pr-4">
          <div className="space-y-2">
            {results.map(group => (
              <div 
                key={group.id} 
                className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">
                    #
                  </div>
                  <span>{group.name}</span>
                </div>
                <Button size="sm" variant="outline" className="border-zinc-700 text-xs" onClick={() => handleJoin(group)}>
                  Join
                </Button>
              </div>
            ))}
            {query && !isLoading && results.length === 0 && (
              <p className="text-center text-zinc-500 text-sm py-4">No groups found</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
