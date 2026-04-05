import { useState } from "react";
import { ChatRoom } from "./ChatRoom";
import GroupChat from "./GroupChat";
import { Sidebar } from "../layout/Sidebar";
import { NotificationDropdown } from "./NotificationDropdown";
import { useAuth } from "../../contexts/AuthContext";
import { Sparkles, Atom } from "lucide-react";
import { ProfileModal } from "./ProfileModal";
import { QuantumHealthPopup } from "./QuantumHealthPopup";

export function ChatScreen() {
  const { user, logout } = useAuth();
  const initialUsername = user?.username || "unknown";
  
  const [currentChat, setCurrentChat] = useState<any>({ type: 'room', id: 'legacy', name: 'Legacy Room' });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuantumPopupOpen, setIsQuantumPopupOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white w-full overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 border-b border-zinc-800 bg-black flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            EntangleME
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <button
              onClick={() => setIsQuantumPopupOpen(!isQuantumPopupOpen)}
              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              title="Quantum Health"
            >
              <Atom className="w-5 h-5 text-blue-400" />
            </button>
            <QuantumHealthPopup 
              isOpen={isQuantumPopupOpen} 
              onClose={() => setIsQuantumPopupOpen(false)} 
            />
          </div>
          <NotificationDropdown />
          <div className="h-8 w-[1px] bg-zinc-800 mx-2" />
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 hover:bg-zinc-800/50 px-2 py-1 rounded-lg transition-colors group"
          >
             <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300">Welcome,</span>
             <span className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-blue-400">{initialUsername}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onSelectChat={setCurrentChat} />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {currentChat.type === 'group' ? (
            <GroupChat 
              groupId={currentChat.id} 
              name={currentChat.name} 
              onSelectChat={setCurrentChat} 
            />
          ) : (
            <ChatRoom 
              currentChat={currentChat} 
              currentUser={initialUsername} 
              onLeave={logout} 
            />
          )}
        </div>
      </div>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        userId={user?.id}
      />
    </div>
  );
}