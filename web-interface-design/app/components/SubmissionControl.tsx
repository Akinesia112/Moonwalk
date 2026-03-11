// web-interface-design/app/components/SubmissionControl.tsx
'use client';

import React, { useState } from 'react';
import { useModification } from '@/app/lib/hooks/useModification';

interface SubmissionControlProps {
  artworkId: string;
  onSubmitted?: () => void;
}

export function SubmissionControl({ artworkId, onSubmitted }: SubmissionControlProps) {
  const {
    submitting,
    submitError,
    feedbackItems,
    submitArtwork,
    approveArtwork,
    rejectArtwork,
    clearError,
  } = useModification();

  const [mode, setMode] = useState<'view' | 'submit' | 'approve' | 'reject'>('view');
  const [submitNotes, setSubmitNotes] = useState('');
  const [approverNotes, setApproverNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Set<string>>(new Set());

  const pendingFeedback = feedbackItems.filter((item) => item.status === 'pending');

  const handleSubmit = async () => {
    if (pendingFeedback.length > 0) {
      if (!confirm(`仍有 ${pendingFeedback.length} 個待處理回饋，確定要提交?`)) {
        return;
      }
    }

    const success = await submitArtwork({
      artwork_id: artworkId,
      notes: submitNotes,
      status: 'submitted',
    });

    if (success) {
      setSubmitNotes('');
      setMode('view');
      onSubmitted?.();
    }
  };

  const handleApprove = async () => {
    const success = await approveArtwork(artworkId, approverNotes);

    if (success) {
      setApproverNotes('');
      setMode('view');
      onSubmitted?.();
    }
  };

  const handleReject = async () => {
    if (selectedFeedback.size === 0) {
      alert('請至少選擇一個回饋項目');
      return;
    }

    const success = await rejectArtwork(
      artworkId,
      rejectReason,
      Array.from(selectedFeedback)
    );

    if (success) {
      setRejectReason('');
      setSelectedFeedback(new Set());
      setMode('view');
      onSubmitted?.();
    }
  };

  return (
    <div className="submission-control">
      <h3>提交和批准</h3>

      {submitError && (
        <div className="error-banner">
          {submitError}
          <button onClick={() => clearError('submitError')}>×</button>
        </div>
      )}

      {mode === 'view' && (
        <div className="action-buttons">
          <button
            className="submit-btn"
            onClick={() => setMode('submit')}
            disabled={submitting}
          >
            提交作品
          </button>
          <button
            className="approve-btn"
            onClick={() => setMode('approve')}
            disabled={submitting}
          >
            批准
          </button>
          <button
            className="reject-btn"
            onClick={() => setMode('reject')}
            disabled={submitting}
          >
            駁回
          </button>
        </div>
      )}

      {mode === 'submit' && (
        <div className="form-section">
          <h4>提交作品</h4>

          {pendingFeedback.length > 0 && (
            <div className="warning">
              ⚠ 仍有 {pendingFeedback.length} 個待處理回饋:
              <ul>
                {pendingFeedback.map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-group">
            <label>提交說明</label>
            <textarea
              value={submitNotes}
              onChange={(e) => setSubmitNotes(e.target.value)}
              placeholder="說明提交的修改內容..."
              rows={3}
            />
          </div>

          <div className="button-group">
            <button
              className="confirm-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '確認提交'}
            </button>
            <button
              className="cancel-btn"
              onClick={() => setMode('view')}
              disabled={submitting}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {mode === 'approve' && (
        <div className="form-section">
          <h4>批准作品</h4>

          <div className="form-group">
            <label>批准備註 (可選)</label>
            <textarea
              value={approverNotes}
              onChange={(e) => setApproverNotes(e.target.value)}
              placeholder="批准人意見..."
              rows={3}
            />
          </div>

          <div className="button-group">
            <button
              className="confirm-btn"
              onClick={handleApprove}
              disabled={submitting}
            >
              {submitting ? '處理中...' : '確認批准'}
            </button>
            <button
              className="cancel-btn"
              onClick={() => setMode('view')}
              disabled={submitting}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {mode === 'reject' && (
        <div className="form-section">
          <h4>駁回作品</h4>

          <div className="form-group">
            <label>駁回原因 *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="說明駁回原因..."
              rows={3}
            />
          </div>

          {feedbackItems.length > 0 && (
            <div className="form-group">
              <label>相關回饋項目 *</label>
              <div className="feedback-checklist">
                {feedbackItems.map((item) => (
                  <label key={item.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedFeedback.has(item.id)}
                      onChange={() => {
                        const newSet = new Set(selectedFeedback);
                        if (newSet.has(item.id)) {
                          newSet.delete(item.id);
                        } else {
                          newSet.add(item.id);
                        }
                        setSelectedFeedback(newSet);
                      }}
                      disabled={submitting}
                    />
                    <span>{item.title} ({item.severity})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="button-group">
            <button
              className="reject-confirm-btn"
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting ? '處理中...' : '確認駁回'}
            </button>
            <button
              className="cancel-btn"
              onClick={() => setMode('view')}
              disabled={submitting}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}