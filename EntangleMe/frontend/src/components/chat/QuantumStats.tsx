import React from 'react';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Activity, Zap, Wind, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuantumStatsProps {
  stats: {
    total_bits_teleported: number;
    total_noise_events: number;
    total_messages_sent: number;
    fidelity_score: number;
  };
}

export function QuantumStats({ stats }: QuantumStatsProps) {
  const successRate = stats.total_bits_teleported > 0 
    ? ((stats.total_bits_teleported - stats.total_noise_events) / stats.total_bits_teleported * 100).toFixed(1)
    : "100.0";

  return (
    <Card className="bg-[#202c33]/50 border-zinc-800 p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-[#00a884]" />
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Quantum Health</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Bits Teleported</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-zinc-100">{stats.total_bits_teleported}</span>
            <Zap className="w-3 h-3 text-yellow-500 opacity-50" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Success Rate</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-[#00a884]">{successRate}%</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex justify-between items-end mb-1">
          <span className="text-[10px] text-zinc-500 font-bold uppercase">Quantum Fidelity</span>
          <span className="text-xs font-bold text-blue-400">{(stats.fidelity_score * 100).toFixed(1)}%</span>
        </div>
        <Progress value={stats.fidelity_score * 100} className="h-1.5 bg-zinc-800" />
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-blue-500" />
          <span className="text-[10px] text-zinc-400 font-medium">EPR Pair Locked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] text-zinc-400 font-medium">{stats.total_noise_events} Noise hits</span>
        </div>
      </div>
    </Card>
  );
}
