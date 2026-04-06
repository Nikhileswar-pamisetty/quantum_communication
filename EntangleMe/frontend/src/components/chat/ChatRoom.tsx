import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TeleportationResult } from '@/types/quantum';
import { api } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { QuantumVisualizer } from '../quantum/QuantumVisualizer';
import { Send, Hash, User as UserIcon, Shield, Info, MoreVertical, Paperclip, ChevronRight, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { MemberManager } from './MemberManager';
import { FileMessageBubble } from './FileMessageBubble';

interface ChatRoomProps {
  currentChat: { type: string, id: string, name: string };
  currentUser: string;
  onLeave: () => void;
}

export function ChatRoom({ currentChat, currentUser, onLeave }: ChatRoomProps) {
  const currentUserId = localStorage.getItem('user_id');
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const [teleportProgress, setTeleportProgress] = useState(0);
  const [lastTeleportationResult, setLastTeleportationResult] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large. Max 25MB");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    const validTypes = [".jpg",".jpeg",".png",".gif",".webp",".mp4",".mov",".mp3",".wav",".pdf",".txt",".zip"];
    const ext = "." + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(ext)) {
      toast.error("File type not supported");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    setSelectedFile(file);
  };

  const fetchMessages = async () => {
    try {
      const currentUserId = api.getCurrentUserId();
      const msgs = await api.getDirectMessages(currentChat.id);
      
      const formatted = msgs.map((m: any) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        message_type: m.message_type || "text",
        file_id: m.file_id || null,
        created_at: m.created_at,
        sender: m.sender_id === currentUserId ? currentUser : 'Other',
        teleportation_result: m.teleportation_result,
        status: m.status,
        timestamp: new Date(m.created_at).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })
      }));
      
      setMessages(prev => {
        const optimisticIds = prev.filter(p => typeof p.id === 'string' && p.id.startsWith('temp-')).map(p => p.id);
        const newMsgs = formatted.filter((f: any) => !optimisticIds.includes(f.id));
        const pendingOptimistic = prev.filter(p => typeof p.id === 'string' && p.id.startsWith('temp-'));
        const finalMsgs = [...newMsgs, ...pendingOptimistic].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        console.log('messages:', finalMsgs);
        console.log('message types:', finalMsgs.map(m => m.message_type));
        
        return finalMsgs;
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [currentChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (isSending || (!textMessage.trim() && !selectedFile)) return;
    
    setIsSending(true);
    setTeleportProgress(0);

    try {
      if (selectedFile) {
        setUploadStatus('⚛️ Generating Quantum Key...');
        await new Promise(r => setTimeout(r, 1000));
        
        setUploadStatus('📤 Uploading file...');
        
        const progressInterval = setInterval(() => {
          setTeleportProgress(prev => Math.min(prev + 10, 90));
        }, 300);
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const token = localStorage.getItem('token');
        const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/files/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        clearInterval(progressInterval);
        
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          console.error('Upload failed:', uploadRes.status, errText);
          throw new Error('Upload failed');
        }
        const fileData = await uploadRes.json();
        console.log('Upload success, file data:', fileData);
        
        const result = await api.sendDirectMessage({
          receiver_id: currentChat.id,
          content: fileData.file_name || selectedFile.name,
          message_type: 'file',
          file_id: fileData.id
        });
        
        setTeleportProgress(100);
        
        const newFileMessage = {
          id: result.id || `temp-${Date.now()}`,
          sender: currentUser,
          sender_id: currentUserId,
          content: fileData.file_name || selectedFile.name,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          message_type: 'file',
          file_id: fileData.id,
          teleportation_result: result.teleportation_result,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, newFileMessage]);

        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTextMessage('');
        
        toast.success('⚛️ File Teleportation Successful!');
        fetchMessages();
      } else {
        const textToSend = textMessage.trim();
        const progressInterval = setInterval(() => {
          setTeleportProgress(prev => Math.min(prev + (100 / (textToSend.length * 8)) * 10, 90));
        }, 200);

        const payload = {
          receiver_id: currentChat.id,
          content: textToSend,
          message_type: 'text'
        };
        
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/direct/messages`, {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error('Failed to send message');
        const result = await res.json();

        clearInterval(progressInterval);
        setTeleportProgress(100);
        setTextMessage('');

        if (result) {
          if (result.teleportation_result?.noise_detected) {
            toast.warning('⚠️ Quantum Noise Detected', {
              description: 'Teleported message may be slightly corrupted.'
            });
          } else {
            toast.success('⚛️ Quantum Teleportation Successful!');
          }
          
          if (result.teleportation_result) setLastTeleportationResult(result.teleportation_result);
          fetchMessages();
        }
      }
    } catch (error) {
      console.error('Teleportation failed:', error);
      toast.error('Quantum Teleportation Failed');
    } finally {
      setTimeout(() => {
        setIsSending(false);
        setTeleportProgress(0);
        setUploadStatus('');
      }, 1000);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      if (currentChat.type === 'direct') {
        await api.deleteDirectMessage(messageId);
      } else if (currentChat.type === 'group') {
        await api.deleteGroupMessage(currentChat.id, messageId);
      }
      toast.success('Message deleted');
      fetchMessages();
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] w-full border-l border-zinc-800/50">
      {/* WhatsApp style Header */}
      <div className="h-[60px] px-4 flex items-center justify-between bg-[#202c33] select-none border-b border-zinc-800/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 overflow-hidden shrink-0 border border-zinc-600/30">
            {currentChat.type === 'group' ? <Users className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold text-zinc-100 text-[15px]">{currentChat.name}</h3>
            <p className="text-[11px] text-zinc-400 tracking-wide font-medium">
              {currentChat.type === 'group' ? `${members.length} members` : 'Quantum Secure'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {lastTeleportationResult && (
            <div className="mr-4">
              <QuantumVisualizer 
                teleportationResult={lastTeleportationResult}
                bit={lastTeleportationResult.sent_bit as any}
              />
            </div>
          )}
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 rounded-full">
                <Info className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
              <DialogHeader>
                <DialogTitle>{currentChat.type === 'group' ? 'Group Details' : 'Contact Info'}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="flex flex-col items-center gap-4 border-b border-zinc-800 pb-6 mb-6">
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center text-3xl border border-blue-500/20">
                    {currentChat.name[0].toUpperCase()}
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold">{currentChat.name}</h2>
                    <p className="text-zinc-500 text-sm mt-1 uppercase tracking-tighter font-semibold">{currentChat.type} chat</p>
                  </div>
                </div>

                {currentChat.type === 'group' && (
                  <MemberManager groupId={currentChat.id} onUpdate={fetchMessages} />
                )}
                
                <div className="mt-6 flex flex-col gap-2">
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-400 italic">
                    All messages in this session are teleported bit by bit using EPR pairs and Bell state measurements.
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* WhatsApp Wallpaper style bg */}
      <div 
        className="flex-1 overflow-hidden relative flex flex-col"
        style={{ 
          backgroundColor: '#0b141a',
          backgroundImage: 'radial-gradient(#1c2c33 0.5px, transparent 0.5px)',
          backgroundSize: '20px 20px'
        }}
      >
        <ScrollArea className="flex-1 px-4 md:px-10 lg:px-20">
          <div className="space-y-4 py-6 min-h-full flex flex-col justify-end">
            <div className="flex justify-center mb-4">
              <div className="bg-[#1c2c33] text-[11px] text-[#8696a0] px-3 py-1 rounded-lg uppercase font-bold tracking-widest border border-zinc-800/10">
                Quantum Encrypted
              </div>
            </div>
            
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const isMe = message.sender === currentUser || message.sender === api.getCurrentUserId();
                const showSender = currentChat.type !== 'direct' && !isMe;
                const hasNoise = message.teleportation_result?.noise_detected;
                
                return (
                  <motion.div
                    key={`${message.id}-${index}`}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={cn("flex w-full group/msg", isMe ? "justify-end" : "justify-start")}
                  >
                    {message.message_type === 'file' ? (
                       <FileMessageBubble key={message.id} message={message} isMe={isMe} showSender={showSender} />
                    ) : (
                      <div key={message.id} className={cn(
                        "flex flex-col relative max-w-[85%] px-3 py-1.5 min-w-[100px] shadow-sm",
                        isMe ? "bg-[#005c4b] rounded-l-xl rounded-tr-xl rounded-br-[2px]" : "bg-[#202c33] rounded-r-xl rounded-tl-xl rounded-bl-[2px]"
                      )}>
                        {showSender && (
                          <div className="text-[11px] font-bold text-blue-400 mb-1 flex items-center gap-1 uppercase">
                             {message.sender}
                          </div>
                        )}
                        <div className="text-[15px] text-zinc-100 pr-8 pb-1 whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                        
                        {hasNoise && (
                          <div className="text-[10px] text-yellow-500/80 font-bold mb-1 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Quantum Noise Detected
                          </div>
                        )}

                        <div className="absolute right-1.5 bottom-1 flex items-center gap-1 select-none">
                          <span className="text-[10px] text-[#8696a0] font-medium opacity-80">{message.timestamp}</span>
                          {isMe && (
                             <div className="flex text-blue-400">
                               <ChevronRight className="w-2 h-2 -mr-1" />
                               <ChevronRight className="w-2 h-2" />
                             </div>
                          )}
                        </div>

                        {isMe && (
                          <button 
                            onClick={() => handleDeleteMessage(message.id)}
                            className="absolute -left-8 top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity text-zinc-600 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Quantum Teleportation Loading Overlay */}
      <AnimatePresence>
        {isSending && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#202c33] border border-zinc-700 shadow-2xl p-4 rounded-2xl w-[300px] z-50 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-2 text-[#00a884] font-bold">
              <span className="animate-pulse">{uploadStatus || '⚛️ Quantum Teleporting...'}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
               <motion.div 
                 className="bg-[#00a884] h-full"
                 initial={{ width: 0 }}
                 animate={{ width: `${teleportProgress}%` }}
               />
            </div>
            <div className="text-[10px] text-zinc-500">
              Applying Bell State Measurement on EPR pair...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp style Footer */}
      <div className="px-4 py-3 bg-[#202c33] flex flex-col gap-2">
        {selectedFile && (
          <div className="flex items-center gap-3 p-3 bg-[#2a3942] rounded-xl max-w-md border border-zinc-700 w-fit shrink-0 mb-1">
            <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              📎 {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
            <button onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }} className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full p-1 ml-2 transition-colors">
              ✕
            </button>
            {selectedFile.type.startsWith('image/') && (
              <img src={URL.createObjectURL(selectedFile)} alt="preview" className="w-10 h-10 object-cover rounded-md border border-zinc-600 ml-2" />
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.mp3,.wav,.pdf,.txt,.zip"
            onChange={handleFileSelect}
          />
          <button onClick={() => fileInputRef.current?.click()} className="text-xl hover:bg-zinc-800 p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10 shrink-0 text-zinc-400">
            📎
          </button>
          <div className="flex-1 relative">
            <Input 
              placeholder="Quantum Teleport Message..."
              className="bg-[#2a3942] border-none text-zinc-200 placeholder:text-zinc-500 h-10 pr-12 rounded-xl focus-visible:ring-0"
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value.slice(0, 50))}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isSending}
            />
            <div className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold",
              textMessage.length === 50 ? "text-orange-500" : "text-zinc-500"
            )}>
              {textMessage.length}/50
            </div>
          </div>
          <Button 
            size="icon" 
            className={cn(
              "rounded-full h-11 w-11 shrink-0 shadow-lg active:scale-90 transition-all",
              isSending ? "bg-zinc-700" : "bg-[#00a884] hover:bg-[#008f72]"
            )}
            onClick={handleSend}
            disabled={isSending || (!textMessage.trim() && !selectedFile)}
          >
            <Send className="w-5 h-5 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Trash2 } from 'lucide-react';
