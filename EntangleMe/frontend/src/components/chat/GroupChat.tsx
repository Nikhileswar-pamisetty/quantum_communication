import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Users, MoreVertical, Info, Trash2, Edit2, UserPlus, 
  X, Shield, Send, ChevronRight, Check
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from '../ui/dialog';
import { Input } from '../ui/input';
import { FileMessageBubble } from './FileMessageBubble';

interface GroupChatProps {
  groupId: string;
  name: string;
  onSelectChat: (chat: any) => void;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId, name, onSelectChat }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const [teleportProgress, setTeleportProgress] = useState(0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userSearchResult, setUserSearchResult] = useState<any>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = api.getCurrentUserId();

  const fetchGroupData = async () => {
    try {
      const [msgs, membersList, groups] = await Promise.all([
        api.getGroupMessages(groupId),
        api.getGroupMembers(groupId),
        api.getGroups()
      ]);
      
      const currentGroup = groups.find((g: any) => g.id === groupId);
      setGroupInfo(currentGroup);
      setMembers(membersList);
      setNewName(currentGroup?.name || name);
      
      const formatted = msgs.map((m: any) => ({
        ...m,
        isMe: m.sender_id === currentUserId,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message_type: m.message_type,
        file_id: m.file_id
      }));
      setMessages(formatted);
      console.log('messages:', formatted);
      console.log('message types:', formatted.map((m: any) => m.message_type));
    } catch (err) {
      console.error('Failed to fetch group data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
    const interval = setInterval(fetchGroupData, 3000);
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isAdmin = groupInfo?.created_by === currentUserId;

  const handleSendText = async () => {
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
        
        if (!uploadRes.ok) throw new Error('Upload failed');
        const fileData = await uploadRes.json();
        
        const payload: any = {
          receiver_id: '',
          text_content: textMessage.trim() || '📎 Attachment',
          group_id: groupId,
          file_id: fileData.id,
          message_type: 'file'
        };

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/quantum-text/teleport-text`, {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error('Failed to send file message');
        const result = await res.json();
        
        setTeleportProgress(100);
        
        const newFileMessage = {
          id: result.message_id || `temp-${Date.now()}`,
          sender_id: currentUserId,
          sender_username: 'Me',
          content: textMessage.trim() || '📎 Attachment',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message_type: 'file',
          file_id: fileData.id,
          teleportation_result: result.teleportation_result,
          created_at: new Date().toISOString(),
          isMe: true
        };
        setMessages(prev => [...prev, newFileMessage]);

        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTextMessage('');
        
        toast.success('⚛️ Group Teleportation Successful!');
        fetchGroupData();
      } else {
        const textToSend = textMessage.trim();
        const progressInterval = setInterval(() => {
          setTeleportProgress(prev => Math.min(prev + 5, 90));
        }, 200);

        const result = await api.teleportText(
          '', textToSend, 'group', groupId
        );

        clearInterval(progressInterval);
        setTeleportProgress(100);
        setTextMessage('');

        if (result) {
          if (result.noise_detected) {
            toast.warning('⚠️ Quantum Noise Detected', {
              description: 'Teleported message may be slightly corrupted.'
            });
          } else {
            toast.success('⚛️ Group Teleportation Successful!');
          }
          fetchGroupData();
        }
      }
    } catch (err) {
      toast.error('Failed to teleport message');
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
      await api.deleteGroupMessage(groupId, messageId);
      toast.success('Message deleted');
      fetchGroupData();
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };
  // ... existing rename, delete group, search user, member management ...

  const handleRename = async () => {
    if (!newName.trim() || newName === groupInfo?.name) return;
    try {
      await api.renameGroup(groupId, newName);
      toast.success('Group renamed');
      setIsRenaming(false);
      fetchGroupData();
    } catch (err) {
      toast.error('Failed to rename group');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
    try {
      await api.deleteGroup(groupId);
      toast.success('Group deleted');
      onSelectChat({ type: 'room', id: 'legacy', name: 'Legacy Room' });
    } catch (err) {
      toast.error('Failed to delete group');
    }
  };

  const handleSearchUser = async () => {
    if (!searchUserQuery.trim()) return;
    setIsSearchingUser(true);
    try {
      const user = await api.getUserByUsername(searchUserQuery);
      setUserSearchResult(user);
    } catch (err) {
      toast.error('User not found');
      setUserSearchResult(null);
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await api.addMemberToGroup(groupId, userId);
      toast.success('Member added');
      setUserSearchResult(null);
      setSearchUserQuery('');
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.removeMemberFromGroup(groupId, userId);
      toast.success('Member removed');
      fetchGroupData();
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a]">
      {/* Header */}
      <div className="h-[60px] px-4 flex items-center justify-between bg-[#202c33] border-b border-zinc-800/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#cba6f7]/10 flex items-center justify-center text-[#cba6f7] border border-[#cba6f7]/20">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold text-zinc-100 text-[15px]">{groupInfo?.name || name}</h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              {members.length} members
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100 rounded-full">
                <Info className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Group Information</DialogTitle>
              </DialogHeader>
              
              <div className="py-4 space-y-6">
                {/* Info Card */}
                <div className="flex flex-col items-center gap-4 bg-zinc-800/20 p-6 rounded-2xl border border-zinc-800">
                  <div className="w-20 h-20 rounded-2xl bg-[#cba6f7]/10 flex items-center justify-center text-[#cba6f7] text-3xl border border-[#cba6f7]/20">
                    <Users className="w-10 h-10" />
                  </div>
                  <div className="text-center w-full">
                    {isRenaming ? (
                      <div className="flex gap-2">
                        <Input 
                          value={newName} 
                          onChange={(e) => setNewName(e.target.value)}
                          className="bg-zinc-800 border-zinc-700"
                          autoFocus
                        />
                        <Button onClick={handleRename} className="bg-[#cba6f7] text-[#1e1e2e]">Save</Button>
                        <Button variant="ghost" onClick={() => setIsRenaming(false)}><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <h2 className="text-xl font-bold">{groupInfo?.name}</h2>
                        {isAdmin && (
                          <button onClick={() => setIsRenaming(true)} className="text-zinc-500 hover:text-white">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-zinc-500 text-xs mt-1 uppercase font-bold tracking-widest">
                      Admin: {members.find(m => m.id === groupInfo?.created_by)?.username || 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Member Management */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Members</h4>
                    <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded-full">{members.length}</span>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Search username to add..." 
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 h-9 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                      />
                      <Button size="sm" onClick={handleSearchUser} disabled={isSearchingUser} className="bg-zinc-700">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {userSearchResult && (
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                      <span className="text-sm ml-2">{userSearchResult.username}</span>
                      <Button size="sm" onClick={() => handleAddMember(userSearchResult.id)} className="bg-blue-600 text-xs h-7">Add</Button>
                    </div>
                  )}

                  <ScrollArea className="max-h-[200px] rounded-xl border border-zinc-800/50 p-1">
                    <div className="space-y-1">
                      {members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs border border-zinc-700/50">
                              {member.username[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{member.username} {member.id === currentUserId && '(You)'}</span>
                              {member.id === groupInfo?.created_by && (
                                <span className="text-[10px] text-[#cba6f7] font-bold uppercase flex items-center gap-1">
                                  <Shield className="w-2.5 h-2.5" /> Admin
                                </span>
                              )}
                            </div>
                          </div>
                          {isAdmin && member.id !== groupInfo?.created_by && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveMember(member.id)}
                              className="h-7 w-7 text-zinc-500 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Admin Danger Zone */}
                {isAdmin && (
                  <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <div className="text-xs text-zinc-500 font-medium italic">Admin control section</div>
                    <Button 
                      variant="ghost" 
                      onClick={handleDelete}
                      className="text-red-400 hover:bg-red-400/10 text-xs gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Group
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-hidden relative"
        style={{ 
          backgroundColor: '#0b141a',
          backgroundImage: 'radial-gradient(#1c2c33 0.5px, transparent 0.5px)',
          backgroundSize: '20px 20px'
        }}
      >
        <ScrollArea className="h-full px-4 md:px-10 lg:px-20">
          <div className="space-y-3 py-6 min-h-full flex flex-col justify-end">
            <div className="flex justify-center mb-6">
              <div className="bg-[#1c2c33] text-[10px] text-[#8696a0] px-4 py-1 rounded-full uppercase font-bold tracking-[0.2em] border border-zinc-800/10 flex items-center gap-2">
                <Shield className="w-3 h-3" /> Quantum Secure Group
              </div>
            </div>

            <AnimatePresence initial={false}>
              {messages.map((m, idx) => {
                const hasNoise = m.teleportation_result?.noise_detected;
                return (
                  <motion.div
                    key={`${m.id}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={cn("flex w-full group/msg", m.isMe ? "justify-end" : "justify-start")}
                  >
                    {m.message_type === 'file' ? (
                      <FileMessageBubble message={{...m, sender: m.sender_username}} isMe={m.isMe} showSender={!m.isMe} />
                    ) : (
                      <div className={cn(
                        "flex flex-col relative max-w-[85%] px-3 py-1.5 min-w-[80px] shadow-sm",
                        m.isMe ? "bg-[#005c4b] rounded-l-xl rounded-tr-xl rounded-br-[2px]" : "bg-[#202c33] rounded-r-xl rounded-tl-xl rounded-bl-[2px]"
                      )}>
                        {!m.isMe && (
                          <div className="text-[11px] font-bold text-[#fbc02d] mb-0.5 tracking-tight flex items-center gap-1">
                            {m.sender_username || "Unknown"}
                          </div>
                        )}
                        
                        <div className="text-[15px] text-zinc-100 pr-8 pb-1 whitespace-pre-wrap break-words">
                          {m.content}
                        </div>

                        {hasNoise && (
                          <div className="text-[10px] text-yellow-500/80 font-bold mb-1 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Quantum Noise Detected
                          </div>
                        )}

                        <div className="absolute right-1.5 bottom-1 flex items-center gap-1">
                          <span className="text-[10px] text-[#8696a0] font-medium opacity-60">{m.timestamp}</span>
                          {m.isMe && <Check className="w-3 h-3 text-blue-400 opacity-60" />}
                        </div>

                        {m.isMe && (
                          <button 
                            onClick={() => handleDeleteMessage(m.id)}
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

        {/* Loading Overlay */}
        <AnimatePresence>
          {isSending && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#202c33] border border-zinc-700 shadow-2xl p-4 rounded-2xl w-[280px] z-50 flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-2 text-[#00a884] font-bold text-xs">
                <span className="animate-pulse whitespace-nowrap">{uploadStatus || '⚛️ Quantum Teleporting...'}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-[#00a884] h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${teleportProgress}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 bg-[#202c33] flex flex-col gap-2">
        {selectedFile && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-[#2a3942] rounded-xl max-w-md border border-zinc-700 w-fit shrink-0 mb-1">
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
        <div className="flex items-center gap-3 w-full">
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
            placeholder="Teleport to group..."
            className="bg-[#2a3942] border-none text-zinc-200 placeholder:text-zinc-500 h-10 pr-12 rounded-xl focus-visible:ring-0"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value.slice(0, 50))}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
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
          onClick={handleSendText}
          disabled={isSending || !textMessage.trim()}
          className={cn(
            "rounded-full h-11 w-11 shrink-0 shadow-lg transition-transform active:scale-90",
            isSending ? "bg-zinc-700" : "bg-[#00a884] hover:bg-[#008f72]"
          )}
        >
          <Send className="w-5 h-5 text-white" />
        </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
