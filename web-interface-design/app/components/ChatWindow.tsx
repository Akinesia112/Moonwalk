// web-interface-design/app/components/ChatWindow.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/app/lib/hooks/useChat';
import { ChatMessageComponent } from './ChatMessage';

interface ChatWindowProps {
  projectId: string;
  chatId: string;
  currentUser: string;
  onSessionTitleChange?: (title: string) => void;
}

export function ChatWindow({
  projectId,
  chatId,
  currentUser,
  onSessionTitleChange,
}: ChatWindowProps) {
  const {
    currentSession,
    messages,
    messagesLoading,
    messagesError,
    sending,
    sendError,
    isConnected,
    selectSession,
    sendMessage,
    deleteMessage,
    clearError,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 載入聊天會話
  useEffect(() => {
    selectSession(projectId, chatId);
  }, [projectId, chatId, selectSession]);

  // 自動滾動到最新消息
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // 檢測用戶滾動
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setAutoScroll(isNearBottom);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !currentSession) return;

    const content = inputValue;
    setInputValue('');

    await sendMessage(currentSession.id, content);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentSession) return;

    if (confirm('確認刪除此消息?')) {
      await deleteMessage(currentSession.id, messageId);
    }
  };

  if (messagesLoading) {
    return (
      <div className="chat-window loading">
        <div className="loading-spinner" />
        <p>載入聊天中...</p>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="chat-window empty">
        <p>未選擇聊天會話</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="header-info">
          <h3>{currentSession.title}</h3>
          <p className="chat-type">{getChatTypeLabel(currentSession.chat_type)}</p>
          <div className="connection-status">
            <span
              className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            />
            <span>{isConnected ? '已連接' : '已斷開'}</span>
          </div>
        </div>
      </div>

      <div
        className="messages-container"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messagesError && (
          <div className="error-banner">
            {messagesError}
            <button onClick={() => clearError('messagesError')}>×</button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="empty-state">
            <p>暫無消息</p>
            <small>從下方開始聊天吧</small>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                isOwn={message.role === 'user'}
                onDelete={() => handleDeleteMessage(message.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {sendError && (
        <div className="error-banner">
          {sendError}
          <button onClick={() => clearError('sendError')}>×</button>
        </div>
      )}

      <form className="message-input-form" onSubmit={handleSendMessage}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="輸入消息... (按 Shift+Enter 換行，Enter 發送)"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e as any);
            }
          }}
          disabled={sending}
          rows={3}
        />

        <div className="input-footer">
          <button
            type="submit"
            className="send-btn"
            disabled={sending || !inputValue.trim()}
          >
            {sending ? '發送中...' : '發送'}
          </button>
        </div>
      </form>
    </div>
  );
}

function getChatTypeLabel(chatType: string): string {
  const labels: Record<string, string> = {
    reference: '參考資料聊天',
    reflection: '創作反思聊天',
    analysis: '分析聊天',
    compare: '比較聊天',
    review: '審查聊天',
    decision: '決策聊天',
  };
  return labels[chatType] || chatType;
}