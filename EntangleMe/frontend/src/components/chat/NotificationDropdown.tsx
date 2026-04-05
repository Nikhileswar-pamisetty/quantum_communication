import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Bell, Check, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function NotificationDropdown() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const [requestsData, notificationsData] = await Promise.all([
        api.getPendingRequests(),
        api.getNotifications()
      ]);
      setRequests(requestsData);
      setNotifications(notificationsData);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const [notifications, setNotifications] = useState<any[]>([]);

  const handleAction = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await api.updateFriendRequest(requestId, status);
      toast.success(`Request ${status}`);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      toast.error(`Failed to ${status} request`);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notification: any) => {
    handleMarkRead(notification.id);
    if (notification.type === 'friend_accepted') {
      navigate(`/chat?user=${notification.sender_id}`);
    } else if (notification.type === 'group_message') {
      navigate(`/chat?group=${notification.group_id}`);
    } else if (notification.type === 'direct_message') {
      navigate(`/chat?user=${notification.sender_id}`);
    }
    setIsOpen(false);
  };

  const totalCount = requests.length + notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold border-2 border-[#0b141a]">
            {totalCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100">Notifications</h3>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                {totalCount} New
              </span>
            </div>
            
            <ScrollArea className="max-h-96">
              <div className="p-2 space-y-2">
                {/* Friend Requests */}
                {requests.map(req => (
                  <div key={req.id} className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-100 truncate">{req.sender_username}</p>
                        <p className="text-[10px] text-zinc-500 truncate uppercase tracking-tighter">Sent you a friend request</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAction(req.id, 'accepted')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleAction(req.id, 'rejected')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs h-8">Reject</Button>
                    </div>
                  </div>
                ))}

                {/* General Notifications */}
                {notifications.filter(n => !n.is_read).map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className="p-3 rounded-lg bg-zinc-800/10 border border-zinc-800/30 flex items-start gap-3 group cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 leading-normal">{n.content}</p>
                      <p className="text-[9px] text-zinc-600 mt-1 uppercase font-bold tracking-tighter">{n.type}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }} 
                      className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity text-zinc-600"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {totalCount === 0 && (
                  <div className="py-12 text-center text-zinc-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-xs">No new notifications</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
