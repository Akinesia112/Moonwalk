// web-interface-design/app/hooks/useSearch.ts
import { useState, useCallback } from 'react';
import { searchApi, Reference, Artwork, Project } from '../services/api';

export function useSearch() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 載入所有項目
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchApi.getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  // 載入參考資料
  const loadReferences = useCallback(async (
    projectId: string,
    params?: { pinned_only?: boolean; artwork_id?: string }
  ) => {
    setLoading(true);
    try {
      const data = await searchApi.getReferences(projectId, params);
      setReferences(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load references');
    } finally {
      setLoading(false);
    }
  }, []);

  // 載入作品
  const loadArtworks = useCallback(async (
    projectId: string,
    params?: { status?: string }
  ) => {
    setLoading(true);
    try {
      const data = await searchApi.getArtworks(projectId, params);
      setArtworks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artworks');
    } finally {
      setLoading(false);
    }
  }, []);

  // 上傳圖片
  const uploadImage = useCallback(async (file: File, data: {
    type: 'reference' | 'artwork' | 'seed';
    instruction?: string;
    project_id: string;
    shot_id?: string;
    priority?: string;
    category?: string;
  }) => {
    setLoading(true);
    try {
      const result = await searchApi.uploadImage({
        ...data,
        image: file,
      });
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 從 URL 導入
  const importFromUrl = useCallback(async (url: string, data: {
    instruction?: string;
    project_id: string;
    category?: string;
  }) => {
    setLoading(true);
    try {
      const result = await searchApi.importFromUrl({
        ...data,
        url,
      });
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    projects,
    references,
    artworks,
    loading,
    error,
    loadProjects,
    loadReferences,
    loadArtworks,
    uploadImage,
    importFromUrl,
  };
}