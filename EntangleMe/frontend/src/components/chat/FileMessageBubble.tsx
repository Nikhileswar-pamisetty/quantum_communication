import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

const FileMessageBubble = ({ message, isMe, showSender }: { message: any, isMe: boolean, showSender: boolean }) => {
  const fileUrl = `/api/v1/files/preview/${message.file_id}`;
  const fileName = message.content; // filename stored in content
  const ext = fileName.split('.').pop()?.toLowerCase();
  const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext || '');
  const timestamp = message.timestamp || '';

  if (isImage) {
    return (
      <div>
        <img
          src={fileUrl}
          alt={fileName}
          style={{ maxWidth: '250px', borderRadius: '8px' }}
          onClick={() => window.open(fileUrl)}
        />
        <div>🔐 Quantum Secured • {timestamp}</div>
      </div>
    );
  }

  return (
    <div>
      📎 {fileName} <a href={fileUrl} download>⬇️ Download</a>
    </div>
  );
};
export { FileMessageBubble };
