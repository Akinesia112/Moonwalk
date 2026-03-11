// web-interface-design/app/components/ReferencesGrid.tsx
'use client';

import React, { useEffect } from 'react';
import { useSearch } from '@/app/lib/context/SearchContext';

interface ReferencesGridProps {
  pinnedOnly?: boolean;
  artworkId?: string;
}

export function ReferencesGrid({ pinnedOnly = false, artworkId }: ReferencesGridProps) {
  const { state, actions } = useSearch();
  const { currentProject, references, referencesLoading, referencesError } = state;

  useEffect(() => {
    if (currentProject) {
      actions.loadReferences(currentProject.id, {
        pinned_only: pinnedOnly,
        artwork_id: artworkId,
      });
    }
  }, [currentProject, pinnedOnly, artworkId]);

  if (!currentProject) {
    return <div className="empty-state">請先選擇項目</div>;
  }

  if (referencesLoading) {
    return <div className="loading">載入參考資料中...</div>;
  }

  if (referencesError) {
    return (
      <div className="error">
        {referencesError}
        <button onClick={() => actions.refreshReferences()}>重試</button>
      </div>
    );
  }

  if (references.length === 0) {
    return (
      <div className="empty-state">
        <p>未找到{pinnedOnly ? '主要' : ''}參考資料</p>
      </div>
    );
  }

  return (
    <div className="references-grid">
      <div className="grid-header">
        <h3>{pinnedOnly ? '主要參考資料' : '所有參考資料'}</h3>
        <span className="count">{references.length} 個</span>
      </div>

      <div className="grid">
        {references.map((ref) => (
          <ReferenceCard key={ref.id} reference={ref} />
        ))}
      </div>
    </div>
  );
}

function ReferenceCard({ reference }: { reference: any }) {
  return (
    <div className="reference-card">
      <div className="thumbnail-wrapper">
        <img
          src={reference.thumbnail_url}
          alt={reference.title}
          className="thumbnail"
          loading="lazy"
        />
        {reference.is_pinned && <span className="pinned-badge">釘選</span>}
      </div>

      <div className="card-content">
        <h4 className="title">{reference.title}</h4>

        <div className="metadata">
          <span className={`badge priority ${reference.priority}`}>
            {reference.priority}
          </span>
          <span className="badge category">{reference.category}</span>
        </div>

        {reference.note && (
          <p className="note">{reference.note}</p>
        )}

        <footer className="footer">
          <small className="timestamp">
            {new Date(reference.created_at).toLocaleDateString('zh-TW')}
          </small>
          <small className="uploader">by {reference.uploaded_by}</small>
        </footer>
      </div>
    </div>
  );
}