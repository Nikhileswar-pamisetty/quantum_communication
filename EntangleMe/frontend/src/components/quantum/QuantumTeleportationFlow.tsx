import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuantumTeleportationFlowProps {
  teleportationData?: any;
  className?: string;
}

interface FlowStepProps {
  step: number;
  title: string;
  description: string;
  icon: string;
  isActive: boolean;
  isCompleted: boolean;
  delay?: number;
  tag?: string;
}

const FlowStep = ({ step, title, description, icon, isActive, isCompleted, delay = 0, tag }: FlowStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={cn(
        'flex items-start space-x-4 p-3 rounded-lg border-2 transition-all',
        isCompleted
          ? 'bg-green-500/10 border-green-500/40 text-green-300'
          : isActive
          ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
        isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-400'
      )}>
        {isCompleted ? '✓' : step}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-base">{icon}</span>
          <h4 className="font-semibold text-sm">{title}</h4>
          {tag && (
            <span className={cn(
              'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
              tag === 'BB84' ? 'bg-[#cba6f7]/20 text-[#cba6f7]' : 'bg-blue-500/20 text-blue-400'
            )}>
              {tag}
            </span>
          )}
        </div>
        <p className="text-xs opacity-75">{description}</p>
      </div>
    </motion.div>
  );
};

const QuantumParticle = ({ isActive, isEntangled = false }: { isActive: boolean; isEntangled?: boolean }) => (
  <motion.div
    animate={{ scale: isActive ? [1, 1.2, 1] : 1, rotate: isEntangled ? 360 : 0 }}
    transition={{ duration: 2, repeat: isEntangled ? Infinity : 0 }}
    className={cn(
      'w-4 h-4 rounded-full',
      isEntangled ? 'bg-purple-500 shadow-lg shadow-purple-500/50' : isActive ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-zinc-600'
    )}
  />
);

// 8-step BB84 + Teleportation combined flow
const FLOW_STEPS = [
  {
    step: 1,
    title: 'BB84 Key Exchange',
    description: 'Alice and Bob exchange 256 random qubits over a quantum channel using rectilinear (+) and diagonal (×) bases',
    icon: '🔑',
    tag: 'BB84'
  },
  {
    step: 2,
    title: 'Eavesdropping Check',
    description: 'Sift matched bases, estimate QBER on a 25% sample. Abort if error rate > 11% (eavesdropper present)',
    icon: '🛡️',
    tag: 'BB84'
  },
  {
    step: 3,
    title: 'Bell Pair Created',
    description: 'Create an EPR pair by entangling qubits 1 and 2 using Hadamard ⊗ CNOT — quantum channel locked',
    icon: '⚛️',
    tag: 'QT'
  },
  {
    step: 4,
    title: 'Qubit Encoded',
    description: 'Alice encodes the message bit into qubit 0. Text is converted to binary and each bit teleported individually',
    icon: '📡',
    tag: 'QT'
  },
  {
    step: 5,
    title: 'Bell Measurement',
    description: 'Alice performs a Bell state measurement on qubits 0 and 1, collapsing the entangled state',
    icon: '📊',
    tag: 'QT'
  },
  {
    step: 6,
    title: 'Corrections Applied',
    description: 'Bob applies conditional CX and CZ gates on qubit 2 based on Alice\'s two classical measurement bits',
    icon: '🔧',
    tag: 'QT'
  },
  {
    step: 7,
    title: 'Message Encrypted',
    description: 'Reconstructed message is XOR-encrypted using the BB84 sifted key before storing — quantum-secure payload',
    icon: '🔐',
    tag: 'BB84'
  },
  {
    step: 8,
    title: 'Delivered Securely',
    description: 'Receiver decrypts with the shared BB84 key and reads the original message — end-to-end quantum secure',
    icon: '✅',
    tag: 'QT'
  }
];

export function QuantumTeleportationFlow({ teleportationData, className }: QuantumTeleportationFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= FLOW_STEPS.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlay = () => { setCurrentStep(0); setIsPlaying(true); };
  const handleReset = () => { setCurrentStep(0); setIsPlaying(false); };

  const progress = Math.round(((currentStep + 1) / FLOW_STEPS.length) * 100);

  return (
    <Card className={cn('p-6 bg-zinc-900 border-zinc-800', className)}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-white font-semibold text-base">BB84 + Quantum Teleportation Flow</h3>
          <p className="text-zinc-500 text-xs mt-0.5">8-step combined protocol</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="px-3 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors">
            Reset
          </button>
          <button
            onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full bg-[#cba6f7]/60 inline-block" />
          BB84 QKD step
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500/60 inline-block" />
          Quantum Teleportation step
        </div>
      </div>

      {/* Flow Steps */}
      <div className="space-y-2">
        {FLOW_STEPS.map((step, index) => (
          <FlowStep
            key={step.step}
            step={step.step}
            title={step.title}
            description={step.description}
            icon={step.icon}
            tag={step.tag}
            isActive={index === currentStep}
            isCompleted={index < currentStep}
            delay={index * 0.06}
          />
        ))}
      </div>

      {/* Quantum Particles */}
      <div className="mt-6">
        <h4 className="text-white font-semibold text-sm mb-3">Quantum Channel State</h4>
        <div className="flex justify-around items-center py-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex flex-col items-center gap-2">
            <QuantumParticle isActive={currentStep >= 0} />
            <span className="text-[10px] text-zinc-400">Alice (Q0)</span>
          </div>
          <motion.div
            animate={{ scale: currentStep >= 2 ? [1, 1.1, 1] : 1, opacity: currentStep >= 2 ? 1 : 0.3 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <QuantumParticle isActive={currentStep >= 2} isEntangled={currentStep >= 2 && currentStep <= 6} />
            <span className="text-zinc-400 text-lg">⟷</span>
            <QuantumParticle isActive={currentStep >= 2} isEntangled={currentStep >= 2 && currentStep <= 6} />
          </motion.div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] text-zinc-400">EPR (Q1⊗Q2)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <QuantumParticle isActive={currentStep >= 5} />
            <span className="text-[10px] text-zinc-400">Bob (Q2)</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-5">
        <div className="flex justify-between text-xs text-zinc-400 mb-2">
          <span>Step {currentStep + 1} / {FLOW_STEPS.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-[#cba6f7] via-blue-500 to-[#00a884] h-2 rounded-full"
          />
        </div>
      </div>

      {/* Current Step Info Card */}
      {FLOW_STEPS[currentStep] && (
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-zinc-800 rounded-lg border border-zinc-700"
        >
          <div className="text-xs text-zinc-300">
            <strong className="text-white">Step {currentStep + 1}:</strong> {FLOW_STEPS[currentStep].title}
            {' '}
            <span className="text-zinc-500">— {FLOW_STEPS[currentStep].description}</span>
          </div>
        </motion.div>
      )}
    </Card>
  );
}