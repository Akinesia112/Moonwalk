// web-interface-design/app/components/FeedbackPanel.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FeedbackItem, FeedbackType } from '@/app/lib/api/modificationApi';
import { useModification } from '@/app/lib/hooks/useModification';

interface FeedbackPanelProps {
  artworkId: string;
}

const FEEDBACK_TYPES: Record<FeedbackType, string> = {
  composition: '構圖',
  lighting: '光影',
  color: '色彩',
  style: '風格',
  motion: '動態',
  texture: '質感',
  exposure: '曝光',
  depth: '深度',
};

const SEVERITY_COLORS: Record<string, string> = {
  P0: '#d32f2f',
  P1: '#f57c00',
  P2: '#fbc02d',
};

export function FeedbackPanel({ artworkId }: FeedbackPanelProps) {
  const {
    feedbackItems,
    selectedFeedback,
    feedbackLoading,
    feedbackError,
    loadFeedback,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    selectFeedback,
    clearError,
  } = useModification();

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<FeedbackType>('composition');
  const [newSeverity, setNewSeverity] = useState<'P0' | 'P1' | 'P2'>('P1');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadFeedback(artworkId);
  }, [artworkId, loadFeedback]);

  const handleCreateFeedback = async () => {
    if (!newTitle.trim() || !newDescription.trim()) {
      alert('請填寫標題和描述');
      return;
    }

    setIsCreating(true);
    const success = await createFeedback({
      artwork_id: artworkId,
      type: newType,
      severity: newSeverity,
      title: newTitle,
      description: newDescription,
    });

    if (success) {
      setNewTitle('');
      setNewDescription('');
      setNewType('composition');
      setNewSeverity('P1');
    }
    setIsCreating(false);
  };

  const handleUpdateStatus = async (feedback_id: string, status: string) => {
    await updateFeedback(feedback_id, { status: status as any });
  };

  const handleDeleteFeedback = async (feedback_id: string) => {
    if (confirm('確認刪除此回饋項目?')) {
      await deleteFeedback(feedback_id);
    }
  };

  return (
    <div className="feedback-panel">
      <h3>回饋管理</h3>

      {feedbackError && (
        <div className="error-banner">
          {feedbackError}
          <button onClick={() => clearError('feedbackError')}>×</button>
        </div>
      )}

      <div className="feedback-creation">
        <h4>新增回饋</h4>

        <div className="form-group">
          <label>標題 *</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="例: 左側光影不足"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>類型</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value as FeedbackType)}>
              {Object.entries(FEEDBACK_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>嚴重程度</label>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as any)}
            >
              <option value="P0">嚴重 (P0)</option>
              <option value="P1">中等 (P1)</option>
              <option value="P2">輕微 (P2)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>描述 *</label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="詳細描述問題和建議..."
            rows={3}
          />
        </div>

        <button
          className="create-btn"
          onClick={handleCreateFeedback}
          disabled={isCreating || feedbackLoading}
        >
          {isCreating ? '新增中...' : '新增回饋'}
        </button>
      </div>

      <div className="feedback-list">
        <h4>回饋項目 ({feedbackItems.length})</h4>

        {feedbackLoading ? (
          <p className="loading">載入中...</p>
        ) : feedbackItems.length === 0 ? (
          <p className="empty">暫無回饋</p>
        ) : (
          <div className="items">
            {feedbackItems.map((item) => (
              <FeedbackItemCard
                key={item.id}
                item={item}
                isSelected={selectedFeedback?.id === item.id}
                onSelect={() => selectFeedback(item)}
                onStatusChange={(status) => handleUpdateStatus(item.id, status)}
                onDelete={() => handleDeleteFeedback(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackItemCard({
  item,
  isSelected,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  item: FeedbackItem;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(isSelected);

  const statusColors: Record<string, string> = {
    pending: '#fbc02d',
    in_progress: '#2196f3',
    resolved: '#388e3c',
    rejected: '#d32f2f',
  };

  const statusLabels: Record<string, string> = {
    pending: '待處理',
    in_progress: '進行中',
    resolved: '已解決',
    rejected: '已駁回',
  };

  return (
    <div
      className={`feedback-item ${isExpanded ? 'expanded' : ''}`}
      onClick={onSelect}
      style={{ borderLeftColor: SEVERITY_COLORS[item.severity] }}
    >
      <div className="item-header">
        <div className="item-title">
          <span className={`severity-badge ${item.severity.toLowerCase()}`}>
            {item.severity}
          </span>
          <span className="type">{FEEDBACK_TYPES[item.type]}</span>
          <h5>{item.title}</h5>
        </div>

        <button
          className="toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="item-detail">
          <p className="description">{item.description}</p>

          <div className="status-section">
            <label>狀態</label>
            <div className="status-buttons">
              {(['pending', 'in_progress', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  className={`status-btn ${item.status === status ? 'active' : ''}`}
                  onClick={() => onStatusChange(status)}
                  style={{
                    backgroundColor:
                      item.status === status ? statusColors[status] : '#f0f0f0',
                    color: item.status === status ? 'white' : '#666',
                  }}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="meta">
            <small>由 {item.created_by} 在 {new Date(item.created_at).toLocaleDateString()} 創建</small>
          </div>

          <button className="delete-btn" onClick={onDelete}>
            刪除
          </button>
        </div>
      )}
    </div>
  );
}