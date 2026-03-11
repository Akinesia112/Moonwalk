// web-interface-design/app/components/RevisionManager.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useModification } from '@/app/lib/hooks/useModification';

interface RevisionManagerProps {
  artworkId: string;
  feedbackIds?: string[];
}

export function RevisionManager({ artworkId, feedbackIds = [] }: RevisionManagerProps) {
  const {
    revisions,
    revisionsLoading,
    revisionsError,
    loadRevisions,
    uploadRevision,
    feedbackItems,
  } = useModification();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [addressedFeedback, setAddressedFeedback] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadRevisions(artworkId);
  }, [artworkId, loadRevisions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAddressedToggle = (feedbackId: string) => {
    const newSet = new Set(addressedFeedback);
    if (newSet.has(feedbackId)) {
      newSet.delete(feedbackId);
    } else {
      newSet.add(feedbackId);
    }
    setAddressedFeedback(newSet);
  };

  const handleUploadRevision = async () => {
    if (!selectedFile) {
      alert('請選擇文件');
      return;
    }

    if (!revisionNotes.trim()) {
      alert('請填寫修訂說明');
      return;
    }

    setIsUploading(true);
    const success = await uploadRevision(
      artworkId,
      selectedFile,
      revisionNotes,
      Array.from(addressedFeedback)
    );

    if (success) {
      setSelectedFile(null);
      setRevisionNotes('');
      setAddressedFeedback(new Set());
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setIsUploading(false);
  };

  return (
    <div className="revision-manager">
      <h3>修訂版本管理</h3>

      {revisionsError && (
        <div className="error-banner">
          {revisionsError}
        </div>
      )}

      {/* 上傳新版本 */}
      <div className="upload-section">
        <h4>上傳新版本</h4>

        <div className="form-group">
          <label>選擇文件</label>
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <span className="file-name">
              {selectedFile ? selectedFile.name : '未選擇文件'}
            </span>
          </div>
        </div>

        {feedbackItems.length > 0 && (
          <div className="form-group">
            <label>已解決的回饋項目</label>
            <div className="feedback-checklist">
              {feedbackItems.map((item) => (
                <label key={item.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addressedFeedback.has(item.id)}
                    onChange={() => handleAddressedToggle(item.id)}
                    disabled={isUploading}
                  />
                  <span className="label-text">
                    {item.title}
                    <span className="severity" style={{ color: '#d32f2f' }}>
                      ({item.severity})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>修訂說明</label>
          <textarea
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="說明此版本的修改內容..."
            rows={3}
            disabled={isUploading}
          />
        </div>

        <button
          className="upload-btn"
          onClick={handleUploadRevision}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? '上傳中...' : '上傳版本'}
        </button>
      </div>

      {/* 版本歷史 */}
      <div className="revisions-history">
        <h4>版本歷史</h4>

        {revisionsLoading ? (
          <p className="loading">載入中...</p>
        ) : revisions.length === 0 ? (
          <p className="empty">暫無版本</p>
        ) : (
          <div className="revisions-list">
            {revisions.map((revision, index) => (
              <div key={revision.id} className="revision-item">
                <div className="revision-header">
                  <h5>v{revision.version}</h5>
                  <time>
                    {new Date(revision.created_at).toLocaleDateString('zh-TW')}
                  </time>
                </div>

                <p className="notes">{revision.notes}</p>

                {revision.feedback_addressed.length > 0 && (
                  <div className="addressed-feedback">
                    <strong>已解決的回饋:</strong>
                    <ul>
                      {revision.feedback_addressed.map((id) => {
                        const item = feedbackItems.find((f) => f.id === id);
                        return item ? <li key={id}>{item.title}</li> : null;
                      })}
                    </ul>
                  </div>
                )}

                <div className="revision-meta">
                  <small>由 {revision.created_by} 上傳</small>
                  <a href={revision.file_url} target="_blank" rel="noopener noreferrer">
                    查看文件
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}