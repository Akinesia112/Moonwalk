// web-interface-design/app/components/ChatPage.tsx
'use client';

import React, { useState } from 'react';
import { useSearch } from '@/app/lib/context/SearchContext';
import { ChatType } from '@/app/lib/api/chatApi';
import { ChatSessionList } from './ChatSessionList';
import { ChatWindow } from './ChatWindow';
import { CreateChatDialog } from './CreateChatDialog';

interface ChatPageProps {
  projectId: string;
  currentUser: string;
}

export function ChatPage({ projectId, currentUser }: ChatPageProps) {
  const { state: searchState } = useSearch();
  const [selectedChatId, setSelectedChatId] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<ChatType>('reference');

  const handleCreateNew = (chatType: ChatType) => {
    setCreateDialogType(chatType);
    setShowCreateDialog(true);
  };

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  if (!searchState.currentProject) {
    return (
      <div className="chat-page empty">
        <p>請先選擇項目</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="page-header">
        <h2>AI 聊天助手</h2>
        <div className="breadcrumb">
          <span>{searchState.currentProject.name}</span>
        </div>
      </div>

      <div className="chat-layout">
        {/* 左側：會話列表 */}
        <aside className="sidebar">
          <ChatSessionList
            projectId={projectId}
            selectedChatId={selectedChatId}
            onSessionSelect={setSelectedChatId}
            onCreateNew={handleCreateNew}
          />
        </aside>

        {/* 右側：聊天窗口 */}
        <main className="main-content">
          {selectedChatId ? (
            <ChatWindow
              projectId={projectId}
              chatId={selectedChatId}
              currentUser={currentUser}
            />
          ) : (
            <div className="empty-state">
              <h3>選擇或創建聊天會話</h3>
              <p>從左側列表選擇一個聊天，或點擊 + 按鈕創建新聊天</p>
              <div className="quick-actions">
                {(
                  ['reference', 'reflection', 'analysis', 'compare', 'review', 'decision'] as ChatType[]
                ).map((type) => (
                  <button
                    key={type}
                    className="action-btn"
                    onClick={() => handleCreateNew(type)}
                  >
                    開始 {getChatTypeEmoji(type)} {getChatTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <CreateChatDialog
        projectId={projectId}
        chatType={createDialogType}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleChatCreated}
      />
    </div>
  );
}

function getChatTypeLabel(chatType: ChatType): string {
  const labels: Record<ChatType, string> = {
    reference: '參考資料聊天',
    reflection: '創作反思',
    analysis: '分析討論',
    compare: '比較作品',
    review: '審查回饋',
    decision: '決策記錄',
  };
  return labels[chatType];
}

function getChatTypeEmoji(chatType: ChatType): string {
  const emojis: Record<ChatType, string> = {
    reference: '📚',
    reflection: '💭',
    analysis: '🔍',
    compare: '⚖️',
    review: '✅',
    decision: '📋',
  };
  return emojis[chatType];
}