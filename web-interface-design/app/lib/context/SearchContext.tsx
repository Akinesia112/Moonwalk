// web-interface-design/app/lib/context/SearchContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { searchApi, Project, Reference, Artwork } from '../api/searchApi';

// ============================================================
// CONTEXT STATE TYPES
// ============================================================

export interface SearchContextState {
  // 項目
  currentProject: Project | null;
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;

  // 參考資料
  references: Reference[];
  referencesLoading: boolean;
  referencesError: string | null;

  // 作品
  artworks: Artwork[];
  artworksLoading: boolean;
  artworksError: string | null;

  // 上傳狀態
  uploading: boolean;
  uploadError: string | null;
  uploadProgress: number;

  // 分析狀態
  analysisInProgress: boolean;
  selectedArtworkForAnalysis: string | null;
}


export interface SearchContextActions {
  // 項目操作
  setCurrentProject: (project: Project) => void;
  loadProjects: () => Promise<void>;

  // 參考資料操作
  loadReferences: (projectId: string, params?: {
    pinned_only?: boolean;
    artwork_id?: string;
  }) => Promise<void>;
  refreshReferences: () => Promise<void>;

  // 作品操作
  loadArtworks: (projectId: string, params?: { status?: string }) => Promise<void>;
  refreshArtworks: () => Promise<void>;

  // 上傳操作
  uploadImage: (file: File, params: {
    type: 'reference' | 'artwork' | 'seed';
    instruction?: string;
    project_id: string;
    shot_id?: string;
    priority?: string;
    category?: string;
  }) => Promise<string | null>;

  importFromUrl: (url: string, params: {
    instruction?: string;
    project_id: string;
    category?: string;
  }) => Promise<string | null>;

  clearError: (field: 'projects' | 'references' | 'artworks' | 'upload') => void;
  reset: () => void;
   
  setSelectedArtworkForAnalysis: (artworkId: string | null) => void;
}

// ============================================================
// CONTEXT CREATION
// ============================================================

const SearchContext = createContext<{
  state: SearchContextState;
  actions: SearchContextActions;
} | undefined>(undefined);

const initialState: SearchContextState = {
  currentProject: null,
  projects: [],
  projectsLoading: false,
  projectsError: null,
  references: [],
  referencesLoading: false,
  referencesError: null,
  artworks: [],
  artworksLoading: false,
  artworksError: null,
  uploading: false,
  uploadError: null,
  uploadProgress: 0,
};

// ============================================================
// CONTEXT PROVIDER
// ============================================================

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchContextState>(initialState);

  // ============================================================
  // 項目操作
  // ============================================================

  const loadProjects = useCallback(async () => {
    setState((prev) => ({ ...prev, projectsLoading: true, projectsError: null }));
    try {
      const projects = await searchApi.getProjects();
      setState((prev) => ({
        ...prev,
        projects,
        projectsLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        projectsError: error instanceof Error ? error.message : 'Failed to load projects',
        projectsLoading: false,
      }));
    }
  }, []);

  const setCurrentProject = useCallback((project: Project) => {
    setState((prev) => ({
      ...prev,
      currentProject: project,
      references: [],
      artworks: [],
    }));
  }, []);

  // ============================================================
  // 參考資料操作
  // ============================================================

  const loadReferences = useCallback(
    async (projectId: string, params?: {
      pinned_only?: boolean;
      artwork_id?: string;
    }) => {
      setState((prev) => ({
        ...prev,
        referencesLoading: true,
        referencesError: null,
      }));
      try {
        const references = await searchApi.getReferences({
          project_id: projectId,
          ...params,
        });
        setState((prev) => ({
          ...prev,
          references,
          referencesLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          referencesError: error instanceof Error ? error.message : 'Failed to load references',
          referencesLoading: false,
        }));
      }
    },
    []
  );

  const refreshReferences = useCallback(async () => {
    if (state.currentProject) {
      await loadReferences(state.currentProject.id);
    }
  }, [state.currentProject, loadReferences]);

  // ============================================================
  // 作品操作
  // ============================================================

  const loadArtworks = useCallback(
    async (projectId: string, params?: { status?: string }) => {
      setState((prev) => ({
        ...prev,
        artworksLoading: true,
        artworksError: null,
      }));
      try {
        const artworks = await searchApi.getArtworks({
          project_id: projectId,
          ...params,
        });
        setState((prev) => ({
          ...prev,
          artworks,
          artworksLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          artworksError: error instanceof Error ? error.message : 'Failed to load artworks',
          artworksLoading: false,
        }));
      }
    },
    []
  );

  const refreshArtworks = useCallback(async () => {
    if (state.currentProject) {
      await loadArtworks(state.currentProject.id);
    }
  }, [state.currentProject, loadArtworks]);

  // ============================================================
  // 上傳操作
  // ============================================================

  const uploadImage = useCallback(
    async (file: File, params: {
      type: 'reference' | 'artwork' | 'seed';
      instruction?: string;
      project_id: string;
      shot_id?: string;
      priority?: string;
      category?: string;
    }): Promise<string | null> => {
      setState((prev) => ({
        ...prev,
        uploading: true,
        uploadError: null,
        uploadProgress: 0,
      }));

      try {
        const result = await searchApi.uploadImage({
          file,
          type: params.type,
          instruction: params.instruction,
          project_id: params.project_id,
          shot_id: params.shot_id,
          priority: params.priority as any,
          category: params.category as any,
        });

        setState((prev) => ({
          ...prev,
          uploading: false,
          uploadProgress: 100,
        }));

        // 自動刷新對應清單
        if (params.type === 'reference') {
          await refreshReferences();
        } else if (params.type === 'artwork') {
          await refreshArtworks();
        }

        return result.id;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          uploadError: error instanceof Error ? error.message : 'Upload failed',
          uploading: false,
        }));
        return null;
      }
    },
    [refreshReferences, refreshArtworks]
  );

  const importFromUrl = useCallback(
    async (url: string, params: {
      instruction?: string;
      project_id: string;
      category?: string;
    }): Promise<string | null> => {
      setState((prev) => ({
        ...prev,
        uploading: true,
        uploadError: null,
      }));

      try {
        const result = await searchApi.importFromUrl({
          url,
          ...params,
        });

        setState((prev) => ({
          ...prev,
          uploading: false,
        }));

        await refreshReferences();
        return result.id;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          uploadError: error instanceof Error ? error.message : 'Import failed',
          uploading: false,
        }));
        return null;
      }
    },
    [refreshReferences]
  );

  // ============================================================
  // 工具方法
  // ============================================================

  const clearError = useCallback((field: 'projects' | 'references' | 'artworks' | 'upload') => {
    setState((prev) => ({
      ...prev,
      [`${field}Error`]: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const value = {
    state,
    actions: {
      loadProjects,
      setCurrentProject,
      loadReferences,
      refreshReferences,
      loadArtworks,
      refreshArtworks,
      uploadImage,
      importFromUrl,
      clearError,
      reset,
    },
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

// ============================================================
// CUSTOM HOOK
// ============================================================

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}