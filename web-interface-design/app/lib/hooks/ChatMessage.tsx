// web-interface-design/app/components/ChatMessage.tsx
'use client';

import React from 'react';
import { ChatMessage, ChatAttachment } from '@/app/lib/api/chatApi';

interface ChatMessageProps {
  message: ChatMessage;
  isOwn: boolean;
  onDelete?: () => void;
}

export function ChatMessageComponent({ message, isOwn, onDelete }: ChatMessageProps) {
  const isLoading = message.status === 'sending';
  const isFailed = message.status === 'failed';

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '✗';
      default:
        return '';
    }
  };

  return (
    <div className={`chat-message ${isOwn ? 'own' : 'other'}`}>
      <div className="message-content">
        <div className="message-text">
          {message.content}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        <div className="message-meta">
          <time>{formatTime(message.created_at)}</time>
          <span className="status-icon" title={message.status}>
            {getStatusIcon()}
          </span>
        </div>
      </div>

      {isOwn && (
        <button
          className="delete-btn"
          onClick={onDelete}
          title="刪除消息"
          aria-label="刪除消息"
        >
          ×
        </button>
      )}
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  return (
    <div className="attachment">
      <div className="attachment-icon">
        {getAttachmentIcon(attachment.type)}
      </div>
      <div className="attachment-info">
        <p className="title">{attachment.title || 'Attachment'}</p>
        {attachment.description && (
          <p className="description">{attachment.description}</p>
        )}
      </div>
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        查看
      </a>
    </div>
  );
}

function getAttachmentIcon(type: string): string {
  const icons: Record<string, string> = {
    image: '🖼',
    file: '📄',
    reference: '📚',
    code: '💻',
  };
  return icons[type] || '📎';
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 今天
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // 昨天
  if (diff < 2 * 24 * 60 * 60 * 1000) {
    return '昨天 ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }

  // 本週
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('zh-TW', { weekday: 'short' });
  }

  // 默認格式
  return date.toLocaleDateString('zh-TW');
}