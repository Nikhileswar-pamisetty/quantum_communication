import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Search, UserPlus, X, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface MemberManagerProps {
  groupId: string;
  onUpdate: () => void;
}

export function MemberManager({ groupId, onUpdate }: MemberManagerProps) {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      const data = await api.getGroupMembers(groupId);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const user = await api.getUserByUsername(query);
      setSearchResult(user);
    } catch (err) {
      toast.error("User not found");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!searchResult) return;
    setIsLoading(true);
    try {
      await api.addMemberToGroup(groupId, searchResult.id);
      toast.success(`Added ${searchResult.username}`);
      setSearchResult(null);
      setQuery('');
      fetchMembers();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await api.removeMemberFromGroup(groupId, userId);
      toast.success("Member removed");
      fetchMembers();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Add New Member</h3>
        <div className="flex gap-2">
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Username..." 
            className="flex-1 bg-zinc-800 border-zinc-700 h-10"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button size="sm" onClick={handleSearch} disabled={isSearching} className="bg-zinc-700 hover:bg-zinc-600">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        
        {searchResult && (
          <div className="mt-2 p-3 bg-zinc-800/80 rounded-lg flex items-center justify-between border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                {searchResult.username[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium">{searchResult.username}</span>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-xs h-8">
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserPlus className="w-3 h-3 mr-1" />}
              Add
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Current Members</h3>
        <ScrollArea className="h-64 rounded-lg bg-zinc-800/20 border border-zinc-800/50 p-2">
          <div className="space-y-1">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                     {member.username[0].toUpperCase()}
                   </div>
                   <div className="flex flex-col">
                     <span className="text-sm font-medium">{member.username}</span>
                     {member.role === 'admin' && (
                       <span className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1">
                         <Shield className="w-2.5 h-2.5" /> Admin
                       </span>
                     )}
                   </div>
                </div>
                {member.role !== 'admin' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemove(member.id)} 
                    className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
