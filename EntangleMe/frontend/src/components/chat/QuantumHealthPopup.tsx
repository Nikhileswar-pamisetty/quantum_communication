import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Activity, Zap, Wind, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuantumHealthPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuantumHealthPopup({ isOpen, onClose }: QuantumHealthPopupProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        // Only close if we didn't just click the opening button
        // Since the button is outside this ref, we just stop propagation on the button,
        // or ensure the button is not counting as part of this overlay block.
        // Or simple: check if clicked node has closest button container
        const target = event.target as HTMLElement;
        if (!target.closest('button[title="Quantum Health"]')) {
           onClose();
        }
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchStats = async () => {
      if (!user?.id) return;
      try {
        const profile = await api.getUserProfile(user.id);
        setStats(profile);
      } catch (err) {
        console.error("Error fetching quantum stats", err);
      }
    };

    if (isOpen) {
      fetchStats();
      interval = setInterval(fetchStats, 5000); // Polling every 5s while open
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, user?.id]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute top-12 right-0 w-80 z-50 origin-top-right cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-[#1a2228] border-zinc-700 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-zinc-800/80">
              <Activity className="w-5 h-5 text-[#00a884]" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">Quantum Health</h3>
            </div>
            
            {!stats ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 bg-black/30 rounded-lg border border-white/5">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Bits Teleported</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-zinc-100">{stats.total_bits_teleported || 0}</span>
                      <Zap className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 bg-black/30 rounded-lg border border-white/5">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Success Rate</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#00a884]">
                        {stats.total_bits_teleported > 0 
                          ? ((stats.total_bits_teleported - stats.total_noise_events) / stats.total_bits_teleported * 100).toFixed(1)
                          : "100.0"}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Quantum Fidelity</span>
                    <span className="text-sm font-bold text-blue-400">
                      {isNaN(stats.fidelity_score) ? 100 : (stats.fidelity_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={isNaN(stats.fidelity_score) ? 100 : stats.fidelity_score * 100} 
                    className="h-2 bg-zinc-950/50 border border-zinc-800" 
                  />
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-zinc-300 font-medium">EPR Pair Locked</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-500/10 rounded-md border border-purple-500/20">
                    <Wind className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs text-purple-400 font-bold">{stats.total_noise_events || 0}</span>
                    <span className="text-[10px] text-purple-400/80 font-medium uppercase tracking-wider">Hits</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
