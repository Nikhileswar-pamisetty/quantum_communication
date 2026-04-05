import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { api } from '@/api/client';
import { User, Activity, Bell, Shield, Settings, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ProfileModal({ isOpen, onClose, userId }: ProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [noiseEnabled, setNoiseEnabled] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      api.getUserProfile(userId).then(data => {
        setProfile(data);
        setNoiseEnabled(data.noise_enabled);
      });
    }
  }, [isOpen, userId]);

  const handleToggleNoise = async (enabled: boolean) => {
    try {
      await api.toggleNoise(enabled);
      setNoiseEnabled(enabled);
      toast.success(`Quantum Noise ${enabled ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <User className="w-5 h-5 text-blue-500" />
             User Profile
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-8">
          {/* Main Profile Info */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-4xl font-bold shadow-2xl border-4 border-zinc-900">
              {profile.username?.[0]?.toUpperCase()}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight">{profile.username}</h2>
              <p className="text-zinc-500 text-sm">{profile.email}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-1">
               <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                 <Zap className="w-3 h-3 text-yellow-500" /> Total Bits
               </div>
               <p className="text-xl font-bold text-zinc-100">{profile.total_bits_teleported}</p>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-1">
               <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                 <Activity className="w-3 h-3 text-[#00a884]" /> Fidelity
               </div>
               <p className="text-xl font-bold text-zinc-100">{(profile.fidelity_score * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest pb-2 border-b border-zinc-800">
               <Settings className="w-4 h-4" /> Personal Settings
             </div>
             
             <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold flex items-center gap-2 leading-none">
                    Quantum Noise Simulation
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-tighter">Pro</span>
                  </h4>
                  <p className="text-xs text-zinc-500 pr-4">Introduce 5-10% random bit flip errors for realistic simulation.</p>
                </div>
                <Switch 
                  checked={noiseEnabled}
                  onCheckedChange={handleToggleNoise}
                />
             </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-white">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
