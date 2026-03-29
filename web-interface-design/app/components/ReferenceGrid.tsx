// web-interface-design/app/components/ReferenceGrid.tsx
'use client';

import React, { useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';

interface ReferenceGridProps {
  projectId: string;
  artworkId?: string;
  pinnedOnly?: boolean;
}

export function ReferenceGrid({
  projectId,
  artworkId,
  pinnedOnly = false,
}: ReferenceGridProps) {
  const { references, loading, loadReferences } = useSearch();

  useEffect(() => {
    loadReferences(projectId, {
      pinned_only: pinnedOnly,
      artwork_id: artworkId,
    });
  }, [projectId, artworkId, pinnedOnly, loadReferences]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="reference-grid">
      <h3>{pinnedOnly ? 'Main References' : 'All References'}</h3>
      <div className="grid">
        {references.map((ref) => (
          <div key={ref.id} className="reference-card">
            <img
              src={ref.thumbnail_url}
              alt={ref.title}
              className="thumbnail"
            />
            <div className="info">
              <h4>{ref.title}</h4>
              <div className="metadata">
                <span className={`priority ${ref.priority}`}>
                  {ref.priority}
                </span>
                <span className="category">{ref.category}</span>
              </div>
              {ref.note && <p className="note">{ref.note}</p>}
              <small className="timestamp">
                {new Date(ref.created_at).toLocaleDateString()}
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}