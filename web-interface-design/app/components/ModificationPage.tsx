// web-interface-design/app/components/ModificationPage.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearch } from '@/app/lib/context/SearchContext';
import { useModification } from '@/app/lib/hooks/useModification';
import { CanvasAnnotator } from './CanvasAnnotator';
import { FeedbackPanel } from './FeedbackPanel';
import { RevisionManager } from './RevisionManager';
import { SubmissionControl } from './SubmissionControl';

interface ModificationPageProps {
  artworkId: string;
  artworkUrl: string;
}

export function ModificationPage({ artworkId, artworkUrl }: ModificationPageProps) {
  const { state: searchState } = useSearch();
  const {
    reflectionNote,
    labels,
    loadReflectionNote,
    loadLabels,
    updateReflectionNote,
    createLabel,
    deleteLabel,
  } = useModification();

  const [activeTab, setActiveTab] = useState<'canvas' | 'feedback' | 'revision' | 'submit'>(
    'canvas'
  );
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#2196f3');
  const [isAddingLabel, setIsAddingLabel] = useState(false);

  useEffect(() => {
    loadReflectionNote(artworkId);
    loadLabels(artworkId);
  }, [artworkId, loadReflectionNote, loadLabels]);

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return;

    setIsAddingLabel(true);
    await createLabel(artworkId, newLabelName, newLabelColor);
    setNewLabelName('');
    setIsAddingLabel(false);
  };

  return (
    <div className="modification-page">
      <div className="page-header">
        <h2>作品編輯和提交</h2>
        <div className="breadcrumb">
          <span>{searchState.currentProject?.name}</span>
          <span>/</span>
          <span>作品 {artworkId}</span>
        </div>
      </div>

      <div className="modification-layout">
        {/* 左側：Canvas 和 Tabs */}
        <main className="main-content">
          <div className="tab-navigation">
            <button
              className={`tab ${activeTab === 'canvas' ? 'active' : ''}`}
              onClick={() => setActiveTab('canvas')}
            >
              Canvas 標註
            </button>
            <button
              className={`tab ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              回饋管理
            </button>
            <button
              className={`tab ${activeTab === 'revision' ? 'active' : ''}`}
              onClick={() => setActiveTab('revision')}
            >
              修訂版本
            </button>
            <button
              className={`tab ${activeTab === 'submit' ? 'active' : ''}`}
              onClick={() => setActiveTab('submit')}
            >
              提交和批准
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'canvas' && (
              <CanvasAnnotator artworkUrl={artworkUrl} artworkId={artworkId} />
            )}

            {activeTab === 'feedback' && <FeedbackPanel artworkId={artworkId} />}

            {activeTab === 'revision' && <RevisionManager artworkId={artworkId} />}

            {activeTab === 'submit' && (
              <SubmissionControl artworkId={artworkId} />
            )}
          </div>
        </main>

        {/* 右側：反思筆記和標籤 */}
        <aside className="sidebar">
          <div className="reflection-section">
            <h4>我的創作反思</h4>
            <textarea
              className="reflection-textarea"
              value={reflectionNote?.content || ''}
              onChange={(e) => updateReflectionNote(artworkId, e.target.value)}
              placeholder="記錄您的創作想法和反思..."
              rows={8}
            />
          </div>

          <div className="labels-section">
            <h4>標籤</h4>

            <div className="labels-list">
              {labels.map((label) => (
                <div key={label.id} className="label-item" style={{ backgroundColor: label.color }}>
                  <span>{label.name}</span>
                  <button
                    onClick={() => deleteLabel(label.id)}
                    className="delete-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="label-input-group">
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="新標籤名稱..."
              />
              <input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
              />
              <button
                onClick={handleAddLabel}
                disabled={isAddingLabel || !newLabelName.trim()}
              >
                {isAddingLabel ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}