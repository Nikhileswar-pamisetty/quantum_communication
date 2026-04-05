import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { api } from '@/api/client';
import { toast } from 'sonner';

export function CreateGroup({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  
  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await api.createGroup(name, [api.getCurrentUserId()!]);
      toast.success('Group created');
      setName('');
      onSuccess();
    } catch {
      toast.error('Failed to create group');
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto w-full mt-24">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">Create New Group</h2>
        <Input 
          placeholder="Group Name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          className="mb-6 text-white bg-zinc-800 border-zinc-700" 
        />
        <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            Create
        </Button>
      </div>
    </div>
  );
}
