// web-interface-design/app/lib/api/searchApi.ts
import { API_BASE_URL } from './config';

// ============================================================
// TYPE DEFINITIONS (與 API.yaml 完全對應)
// ============================================================

export interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
}

export interface Reference {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string;
  priority: 'main' | 'secondary' | 'supplementary';
  category: 'Lighting' | 'Color' | 'Composition' | 'Style' | 'Texture' | 'Motion' | 'Mood' | 'VFX';
  note: string;
  is_pinned: boolean;
  confidentiality: string;
  uploaded_by: string;
  created_at: string;
}

export interface Artwork {
  id: string;
  shot_id: string;
  name: string;
  version: number;
  file_url: string;
  file_type: string;
  thumbnail_url: string;
  artist_note: string;
  tags: string[];
  status: string;
  uploaded_by: string;
}

export interface UploadResponse {
  id: string;
  file_url: string;
  thumbnail_url: string;
}

export type UploadType = 'reference' | 'artwork' | 'seed';
export type Priority = 'main' | 'secondary' | 'supplementary';
export type Category = 'Lighting' | 'Color' | 'Composition' | 'Style' | 'Texture' | 'Motion' | 'Mood' | 'VFX';

// ============================================================
// API REQUEST WRAPPER WITH ERROR HANDLING
// ============================================================

interface ApiError {
  code: string;
  message: string;
  details?: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 移除 Content-Type 如果是 FormData
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error: ApiError = {
          code: response.status.toString(),
          message: response.statusText,
        };

        try {
          error.details = await response.json();
        } catch {
          // 無法解析 JSON
        }

        throw new Error(JSON.stringify(error));
      }

      return await response.json();
    } catch (error) {
      console.error(`[API] ${endpoint} failed:`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// ============================================================
// SEARCH API IMPLEMENTATION
// ============================================================

const client = new ApiClient(API_BASE_URL);

export const searchApi = {
  // GET /search/projects
  getProjects: async (): Promise<Project[]> => {
    return client.get<Project[]>('/search/projects');
  },

  // POST /search/upload
  uploadImage: async (params: {
    type: UploadType;
    file: File;
    instruction?: string;
    project_id: string;
    shot_id?: string;
    priority?: Priority;
    category?: Category;
  }): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('type', params.type);
    formData.append('image', params.file);

    if (params.instruction) formData.append('instruction', params.instruction);
    formData.append('project_id', params.project_id);
    if (params.shot_id) formData.append('shot_id', params.shot_id);
    if (params.priority) formData.append('priority', params.priority);
    if (params.category) formData.append('category', params.category);

    return client.post<UploadResponse>('/search/upload', formData);
  },

  // POST /search/url
  importFromUrl: async (params: {
    url: string;
    instruction?: string;
    project_id: string;
    category?: Category;
  }): Promise<UploadResponse> => {
    return client.post<UploadResponse>('/search/url', params);
  },

  // GET /search/references
  getReferences: async (params: {
    project_id: string;
    pinned_only?: boolean;
    artwork_id?: string;
  }): Promise<Reference[]> => {
    const query = new URLSearchParams();
    query.append('project_id', params.project_id);
    if (params.pinned_only) query.append('pinned_only', 'true');
    if (params.artwork_id) query.append('artwork_id', params.artwork_id);

    return client.get<Reference[]>(`/search/references?${query}`);
  },

  // GET /search/references/{ref_id}
  getReferenceDetail: async (ref_id: string): Promise<Reference> => {
    return client.get<Reference>(`/search/references/${ref_id}`);
  },

  // GET /search/artworks
  getArtworks: async (params: {
    project_id: string;
    status?: string;
  }): Promise<Artwork[]> => {
    const query = new URLSearchParams();
    query.append('project_id', params.project_id);
    if (params.status) query.append('status', params.status);

    return client.get<Artwork[]>(`/search/artworks?${query}`);
  },

  // GET /search/artworks/{artwork_id}
  getArtworkDetail: async (artwork_id: string): Promise<Artwork> => {
    return client.get<Artwork>(`/search/artworks/${artwork_id}`);
  },
};

export default searchApi;