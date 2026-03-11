// web-interface-design/app/components/ArtworksList.tsx
'use client';

import React, { useEffect } from 'react';
import { useSearch } from '@/app/lib/context/SearchContext';

interface ArtworksListProps {
  status?: string;
  layout?: 'grid' | 'list';
}

export function ArtworksList({ status, layout = 'grid' }: ArtworksListProps) {
  const { state, actions } = useSearch();
  const { currentProject, artworks, artworksLoading, artworksError } = state;

  useEffect(() => {
    if (currentProject) {
      actions.loadArtworks(currentProject.id, { status });
    }
  }, [currentProject, status]);

  if (!currentProject) {
    return <div className="empty-state">請先選擇項目</div>;
  }

  if (artworksLoading) {
    return <div className="loading">載入作品中...</div>;
  }

  if (artworksError) {
    return (
      <div className="error">
        {artworksError}
        <button onClick={() => actions.refreshArtworks()}>重試</button>
      </div>
    );
  }

  if (artworks.length === 0) {
    return <div className="empty-state">未找到作品</div>;
  }

  return (
    <div className={`artworks-${layout}`}>
      <div className="list-header">
        <h3>作品列表</h3>
        <span className="count">{artworks.length} 部</span>
      </div>

      <div className={layout === 'grid' ? 'grid' : 'list'}>
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} layout={layout} />
        ))}
      </div>
    </div>
  );
}

function ArtworkCard({
  artwork,
  layout,
}: {
  artwork: any;
  layout: 'grid' | 'list';
}) {
  return (
    <div className={`artwork-card ${layout}`}>
      <div className="thumbnail-wrapper">
        <img
          src={artwork.thumbnail_url}
          alt={artwork.name}
          className="thumbnail"
          loading="lazy"
        />
        <span className={`status-badge ${artwork.status}`}>
          {artwork.status}
        </span>
      </div>

      <div className="card-content">
        <h4 className="title">{artwork.name}</h4>
        <p className="shot-id">Shot {artwork.shot_id}</p>

        {artwork.artist_note && (
          <p className="note">{artwork.artist_note}</p>
        )}

        <div className="tags">
          {artwork.tags.map((tag: string) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <footer className="footer">
          <small>v{artwork.version}</small>
          <small>{artwork.file_type}</small>
        </footer>
      </div>
    </div>
  );
}