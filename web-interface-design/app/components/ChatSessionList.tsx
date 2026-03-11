// web-interface-design/app/components/ChatSessionList.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useChat } from '@/app/lib/hooks/useChat';
import { ChatType } from '@/app/lib/api/chatApi';

interface ChatSessionListProps {
  projectId: string;
  selectedChatId?: string;
  onSessionSelect?: (chatId: string) => void;
  onCreateNew?: (chatType: ChatType) => void;
}

const CHAT_TYPE_COLORS: Record<ChatType, string> = {
  reference: '#2196f3',
  reflection: '#ff9800',
  analysis: '#9c27b0',
  compare: '#4caf50',
  review: '#f44336',
  decision: '#607d8b',
};

const CHAT_TYPE_LABELS: Record<ChatType, string> = {
  reference: '參考資料',
  reflection: '創作反思',
  analysis: '分析',
  compare: '比較',
  review: '審查',
  decision: '決策',
};

export function ChatSessionList({
  projectId,
  selectedChatId,
  onSessionSelect,
  onCreateNew,
}: ChatSessionListProps) {
  const {
    sessions,
    sessionsLoading,
    sessionsError,
    loadSessions,
    deleteSession,
    clearError,
  } = useChat();

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [filterType, setFilterType] = useState<ChatType | 'all'>('all');

  useEffect(() => {
    loadSessions(projectId);
  }, [projectId, loadSessions]);

  const filteredSessions = sessions.filter(
    (s) => filterType === 'all' || s.chat_type === filterType
  );

  const handleDeleteSession = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (confirm('確認刪除此聊天會話?')) {
      await deleteSession(chatId);
    }
  };

  const handleCreateSession = (chatType: ChatType) => {
    onCreateNew?.(chatType);
    setShowCreateMenu(false);
  };

  return (
    <div className="chat-session-list">
      <div className="list-header">
        <h3>聊天會話</h3>
        <button
          className="create-btn"
          onClick={() => setShowCreateMenu(!showCreateMenu)}
          title="新建聊天"
        >
          +
        </button>
      </div>

      {showCreateMenu && (
        <div className="create-menu">
          {(Object.entries(CHAT_TYPE_LABELS) as [ChatType, string][]).map(
            ([type, label]) => (
              <button
                key={type}
                className="menu-item"
                onClick={() => handleCreateSession(type)}
                style={{ borderLeftColor: CHAT_TYPE_COLORS[type] }}
              >
                <span className="type-label">{label}</span>
                <span className="arrow">→</span>
              </button>
            )
          )}
        </div>
      )}

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          全部
        </button>
        {(Object.entries(CHAT_TYPE_LABELS) as [ChatType, string][]).map(
          ([type, label]) => (
            <button
              key={type}
              className={`filter-tab ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
              style={{
                borderBottomColor: filterType === type ? CHAT_TYPE_COLORS[type] : 'transparent',
              }}
            >
              {label}
            </button>
          )
        )}
      </div>

      {sessionsError && (
        <div className="error-banner">
          {sessionsError}
          <button onClick={() => clearError('sessionsError')}>×</button>
        </div>
      )}

      <div className="sessions">
        {sessionsLoading ? (
          <p className="loading">載入中...</p>
        ) : filteredSessions.length === 0 ? (
          <p className="empty">暫無聊天會話</p>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${selectedChatId === session.id ? 'selected' : ''}`}
              onClick={() => onSessionSelect?.(session.id)}
              style={{ borderLeftColor: CHAT_TYPE_COLORS[session.chat_type] }}
            >
              <div className="session-info">
                <h4>{session.title}</h4>
                <p className="session-type">
                  {CHAT_TYPE_LABELS[session.chat_type]}
                </p>
                <small className="session-meta">
                  {session.messages.length} 條消息
                </small>
              </div>

              <button
                className="delete-btn"
                onClick={(e) => handleDeleteSession(session.id, e)}
                title="刪除會話"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}