// web-interface-design/app/components/CreateChatDialog.tsx
'use client';

import React, { useState } from 'react';
import { useChat } from '@/app/lib/hooks/useChat';
import { ChatType, ChatContext } from '@/app/lib/api/chatApi';

interface CreateChatDialogProps {
  projectId: string;
  chatType: ChatType;
  isOpen: boolean;
  context?: ChatContext;
  onClose: () => void;
  onCreated?: (chatId: string) => void;
}

const CHAT_TYPE_DESCRIPTIONS: Record<ChatType, string> = {
  reference: '與參考資料對話，討論創作靈感和技巧',
  reflection: '記錄創作反思，與 AI 探討創作想法',
  analysis: '基於 AI 分析結果進行討論',
  compare: '比較作品與參考資料的異同',
  review: '審查回饋項目，討論改進方案',
  decision: '記錄關鍵決策過程',
};

export function CreateChatDialog({
  projectId,
  chatType,
  isOpen,
  context,
  onClose,
  onCreated,
}: CreateChatDialogProps) {
  const { createSession } = useChat();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('請輸入聊天標題');
      return;
    }

    setIsCreating(true);
    const session = await createSession({
      project_id: projectId,
      chat_type: chatType,
      title: title.trim(),
      description: description.trim() || undefined,
      context,
    });

    if (session) {
      onCreated?.(session.id);
      setTitle('');
      setDescription('');
      onClose();
    }

    setIsCreating(false);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>新建聊天會話</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-body">
          <div className="info-box">
            <p className="description">
              {CHAT_TYPE_DESCRIPTIONS[chatType]}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="title">聊天標題 *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 構圖問題討論"
              disabled={isCreating}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">描述 (可選)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="聊天主題的簡要說明..."
              rows={3}
              disabled={isCreating}
            />
          </div>

          {context && (
            <div className="context-info">
              <h4>聊天上下文</h4>
              <ul>
                {context.artwork_id && <li>作品 ID: {context.artwork_id}</li>}
                {context.reference_ids && (
                  <li>參考資料: {context.reference_ids.length} 個</li>
                )}
                {context.feedback_items && (
                  <li>回饋項目: {context.feedback_items.length} 個</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="cancel-btn" onClick={onClose} disabled={isCreating}>
            取消
          </button>
          <button
            className="confirm-btn"
            onClick={handleCreate}
            disabled={isCreating || !title.trim()}
          >
            {isCreating ? '創建中...' : '創建'}
          </button>
        </div>
      </div>
    </div>
  );
}