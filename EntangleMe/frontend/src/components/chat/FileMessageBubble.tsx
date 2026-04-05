import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

export const FileMessageBubble = ({ message, isMe, showSender }: { message: any, isMe: boolean, showSender: boolean }) => {
  const [fileType, setFileType] = useState<string>('');
  const [fileName, setFileName] = useState<string>('Attachment');
  const [fileSize, setFileSize] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/files/${message.file_id}`;
  const filePreviewUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/files/preview/${message.file_id}`;

  useEffect(() => {
    if (!message.file_id) {
      setLoading(false);
      return;
    }
    // Fetch headers via HEAD request to ascertain file type & size natively without downloading it
    fetch(fileUrl, { method: 'HEAD' })
      .then(res => {
        const cType = res.headers.get('content-type');
        if (cType) setFileType(cType);
        
        const cSize = res.headers.get('content-length');
        if (cSize) {
          const size = parseInt(cSize, 10);
          setFileSize((size / (1024 * 1024)).toFixed(1) + ' MB');
        }
        
        const cDisp = res.headers.get('content-disposition');
        if (cDisp) {
          const match = cDisp.match(/filename="?([^"]+)"?/);
          if (match && match[1]) setFileName(match[1]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [message.file_id, fileUrl]);

  const renderContent = () => {
    if (loading) return <div className="p-4 text-sm text-zinc-400 animate-pulse">Loading attachment...</div>;

    if (fileType.startsWith('image/')) {
      return (
        <div className="message-bubble flex flex-col gap-1 w-full">
          <img src={filePreviewUrl} alt={fileName}
            className="max-w-[200px] sm:max-w-xs rounded-lg cursor-pointer object-cover border border-zinc-700/50"
            onClick={() => window.open(fileUrl, '_blank')}
          />
          {message.content && message.content !== '📎 Attachment' && (
            <div className="text-[15px] text-zinc-100 pr-8 pb-1 whitespace-pre-wrap break-words">{message.content}</div>
          )}
        </div>
      );
    }
    if (fileType.startsWith('video/')) {
      return (
        <div className="message-bubble flex flex-col gap-1 w-full">
          <video controls className="max-w-[200px] sm:max-w-xs rounded-lg border border-zinc-700/50">
            <source src={fileUrl} type={fileType || "video/mp4"} />
          </video>
          {message.content && message.content !== '📎 Attachment' && (
            <div className="text-[15px] text-zinc-100 pr-8 pb-1 whitespace-pre-wrap break-words">{message.content}</div>
          )}
        </div>
      );
    }
    if (fileType.startsWith('audio/')) {
      return (
        <div className="message-bubble flex flex-col gap-1 w-full">
          <audio controls className="max-w-[200px] sm:max-w-xs">
            <source src={fileUrl} type={fileType || "audio/mpeg"} />
          </audio>
          {message.content && message.content !== '📎 Attachment' && (
            <div className="text-[15px] text-zinc-100 pr-8 pb-1 whitespace-pre-wrap break-words">{message.content}</div>
          )}
        </div>
      );
    }
    
    // Default document/others
    return (
      <div className="message-bubble flex flex-col gap-2 w-full mt-1">
        <div className="flex items-center gap-3 bg-zinc-800/60 p-3 rounded-lg border border-zinc-700/50 hover:bg-zinc-800 transition-colors">
          <span className="text-2xl">📄</span>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-zinc-200 truncate pr-2 max-w-[150px]">{fileName}</span>
            <span className="text-xs text-zinc-500">{fileSize || 'Unknown size'}</span>
          </div>
          <a href={fileUrl} download className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded transition-colors whitespace-nowrap hidden sm:block">
            ⬇️ Download
          </a>
        </div>
        <a href={fileUrl} download className="sm:hidden text-blue-400 text-xs bg-blue-500/10 px-3 py-2 rounded text-center mb-1">
           ⬇️ Download {fileName}
        </a>
        {message.content && message.content !== '📎 Attachment' && (
          <div className="text-[15px] text-zinc-100 pr-8 pb-1 whitespace-pre-wrap break-words">{message.content}</div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex flex-col relative max-w-[85%] px-3 py-1.5 min-w-[120px] shadow-sm",
      isMe ? "bg-[#005c4b] rounded-l-xl rounded-tr-xl rounded-br-[2px]" : "bg-[#202c33] rounded-r-xl rounded-tl-xl rounded-bl-[2px]"
    )}>
      {showSender && !isMe && (
        <div className="text-[11px] font-bold text-blue-400 mb-1 flex items-center gap-1 uppercase">
           {message.sender_username || message.sender || "Unknown"}
        </div>
      )}
      
      {renderContent()}

      {message.teleportation_result?.noise_detected && (
        <div className="text-[10px] text-yellow-500/80 font-bold mb-1 flex items-center gap-1 mt-1">
          <Info className="w-3 h-3" /> Quantum Noise Detected
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-1 select-none w-full">
        <span className="text-[9px] text-emerald-400/80 font-medium uppercase tracking-widest flex items-center gap-1">
           🔐 Quantum Secured
        </span>
        <span className="text-[10px] text-[#8696a0] font-medium opacity-80 shrink-0 whitespace-nowrap mt-0.5 ml-auto text-right">
          <span>{message.timestamp}</span>
          {isMe && <span className="text-blue-400 ml-1">✓✓</span>}
        </span>
      </div>
    </div>
  );
};
