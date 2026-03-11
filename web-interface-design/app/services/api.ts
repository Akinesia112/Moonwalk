// web-interface-design/app/services/api.ts
const API_BASE_URL = 'http://140.112.29.139:5333';

// 通用 fetch 包裝
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  isFormData: boolean = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================
// SEARCH API
// ============================================================

export const searchApi = {
  // GET /search/projects
  getProjects: () =>
    apiRequest<Project[]>('/search/projects'),

  // POST /search/upload
  uploadImage: (data: {
    type: 'reference' | 'artwork' | 'seed';
    image: File;
    instruction?: string;
    project_id: string;
    shot_id?: string;
    priority?: 'main' | 'secondary' | 'supplementary';
    category?: string;
  }) => {
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('image', data.image);
    if (data.instruction) formData.append('instruction', data.instruction);
    formData.append('project_id', data.project_id);
    if (data.shot_id) formData.append('shot_id', data.shot_id);
    if (data.priority) formData.append('priority', data.priority);
    if (data.category) formData.append('category', data.category);

    return apiRequest<UploadResponse>(
      '/search/upload',
      'POST',
      formData,
      true
    );
  },

  // POST /search/url
  importFromUrl: (data: {
    url: string;
    instruction?: string;
    project_id: string;
    category?: string;
  }) =>
    apiRequest<UploadResponse>('/search/url', 'POST', data),

  // GET /search/references
  getReferences: (projectId: string, params?: {
    pinned_only?: boolean;
    artwork_id?: string;
  }) => {
    const query = new URLSearchParams({ project_id: projectId });
    if (params?.pinned_only) query.append('pinned_only', 'true');
    if (params?.artwork_id) query.append('artwork_id', params.artwork_id);
    return apiRequest<Reference[]>(`/search/references?${query}`);
  },

  // GET /search/references/{ref_id}
  getReferenceDetail: (refId: string) =>
    apiRequest<Reference>(`/search/references/${refId}`),

  // GET /search/artworks
  getArtworks: (projectId: string, params?: {
    status?: string;
  }) => {
    const query = new URLSearchParams({ project_id: projectId });
    if (params?.status) query.append('status', params.status);
    return apiRequest<Artwork[]>(`/search/artworks?${query}`);
  },

  // GET /search/artworks/{artwork_id}
  getArtworkDetail: (artworkId: string) =>
    apiRequest<Artwork>(`/search/artworks/${artworkId}`),
};

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
}

export interface UploadResponse {
  id: string;
  file_url: string;
  thumbnail_url: string;
}

export interface Reference {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string;
  priority: 'main' | 'secondary' | 'supplementary';
  category: string;
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