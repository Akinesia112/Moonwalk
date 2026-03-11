// web-interface-design/app/lib/api/modificationApi.ts
import { API_BASE_URL } from './config';

// ============================================================
// TYPE DEFINITIONS — 對應 API.yaml
// ============================================================

export type FeedbackType = 
  | 'composition'
  | 'lighting'
  | 'color'
  | 'style'
  | 'motion'
  | 'texture'
  | 'exposure'
  | 'depth';

export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';
export type AnnotationType = 'circle' | 'arrow' | 'text' | 'rectangle' | 'freehand';

// Canvas 註釋
export interface CanvasAnnotation {
  id: string;
  type: AnnotationType;
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: Array<{ x: number; y: number }>;
  };
  color: string;
  opacity: number;
  label?: string;
  timestamp: string;
  created_by: string;
}

// 回饋項目
export interface FeedbackItem {
  id: string;
  artwork_id: string;
  type: FeedbackType;
  severity: 'P0' | 'P1' | 'P2';
  title: string;
  description: string;
  status: FeedbackStatus;
  assignee?: string;
  reference_points?: string[];
  canvas_annotation_ids?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 藝術家反思筆記
export interface ReflectionNote {
  id: string;
  artwork_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// 標籤
export interface Label {
  id: string;
  artwork_id: string;
  name: string;
  color?: string;
  created_at: string;
}

// 修訂版本
export interface Revision {
  id: string;
  artwork_id: string;
  version: number;
  file_url: string;
  thumbnail_url: string;
  notes: string;
  feedback_addressed: string[];
  created_at: string;
  created_by: string;
}

// 決策日誌
export interface Decision {
  id: string;
  project_id: string;
  artwork_id?: string;
  decision_type: 'feedback' | 'revision' | 'approval' | 'rejection' | 'note';
  title: string;
  description: string;
  related_items: string[];
  created_by: string;
  created_at: string;
}

// Draft 反饋綜合
export interface FeedbackDraft {
  id: string;
  artwork_id: string;
  supervisor_feedback: string;
  ai_feedback: string;
  client_feedback: string;
  synthesis: string;
  status: 'draft' | 'submitted' | 'approved';
  created_at: string;
  updated_at: string;
}

// ============================================================
// API CLIENT
// ============================================================

class ModificationApiClient {
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

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[Modification API] ${endpoint} failed:`, error);
      throw error;
    }
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

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
}

const client = new ModificationApiClient(API_BASE_URL);

// ============================================================
// MODIFICATION API ENDPOINTS
// ============================================================

export const modificationApi = {
  // ============================================================
  // Canvas 註釋相關
  // ============================================================

  // POST /Modification/canvas/{artwork_id}
  saveCanvasAnnotations: async (
    artwork_id: string,
    annotations: CanvasAnnotation[]
  ): Promise<{ saved_count: number }> => {
    return client.post(
      `/Modification/canvas/${artwork_id}`,
      { annotations }
    );
  },

  // GET /Modification/canvas/{artwork_id}
  getCanvasAnnotations: async (artwork_id: string): Promise<CanvasAnnotation[]> => {
    return client.get(`/Modification/canvas/${artwork_id}`);
  },

  // DELETE /Modification/canvas/{artwork_id}/{annotation_id}
  deleteCanvasAnnotation: async (
    artwork_id: string,
    annotation_id: string
  ): Promise<{ success: boolean }> => {
    return client.delete(
      `/Modification/canvas/${artwork_id}/${annotation_id}`
    );
  },

  // ============================================================
  // 回饋項目相關
  // ============================================================

  // POST /Modification/feedback
  createFeedback: async (params: {
    artwork_id: string;
    type: FeedbackType;
    severity: 'P0' | 'P1' | 'P2';
    title: string;
    description: string;
    canvas_annotation_ids?: string[];
  }): Promise<FeedbackItem> => {
    return client.post('/Modification/feedback', params);
  },

  // GET /Modification/feedback/{artwork_id}
  getFeedback: async (artwork_id: string): Promise<FeedbackItem[]> => {
    return client.get(`/Modification/feedback/${artwork_id}`);
  },

  // PUT /Modification/feedback/{feedback_id}
  updateFeedback: async (
    feedback_id: string,
    updates: Partial<FeedbackItem>
  ): Promise<FeedbackItem> => {
    return client.put(`/Modification/feedback/${feedback_id}`, updates);
  },

  // DELETE /Modification/feedback/{feedback_id}
  deleteFeedback: async (feedback_id: string): Promise<{ success: boolean }> => {
    return client.delete(`/Modification/feedback/${feedback_id}`);
  },

  // ============================================================
  // 反思筆記相關
  // ============================================================

  // POST /Modification/reflection/{artwork_id}
  createReflectionNote: async (
    artwork_id: string,
    content: string
  ): Promise<ReflectionNote> => {
    return client.post(`/Modification/reflection/${artwork_id}`, { content });
  },

  // GET /Modification/reflection/{artwork_id}
  getReflectionNote: async (artwork_id: string): Promise<ReflectionNote> => {
    return client.get(`/Modification/reflection/${artwork_id}`);
  },

  // PUT /Modification/reflection/{artwork_id}
  updateReflectionNote: async (
    artwork_id: string,
    content: string
  ): Promise<ReflectionNote> => {
    return client.put(`/Modification/reflection/${artwork_id}`, { content });
  },

  // ============================================================
  // 標籤相關
  // ============================================================

  // POST /Modification/labels/{artwork_id}
  createLabel: async (
    artwork_id: string,
    name: string,
    color?: string
  ): Promise<Label> => {
    return client.post(`/Modification/labels/${artwork_id}`, { name, color });
  },

  // GET /Modification/labels/{artwork_id}
  getLabels: async (artwork_id: string): Promise<Label[]> => {
    return client.get(`/Modification/labels/${artwork_id}`);
  },

  // DELETE /Modification/labels/{label_id}
  deleteLabel: async (label_id: string): Promise<{ success: boolean }> => {
    return client.delete(`/Modification/labels/${label_id}`);
  },

  // ============================================================
  // 修訂版本相關
  // ============================================================

  // POST /Modification/revisions/{artwork_id}
  uploadRevision: async (
    artwork_id: string,
    file: File,
    notes: string,
    feedback_addressed: string[]
  ): Promise<Revision> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('notes', notes);
    formData.append('feedback_addressed', JSON.stringify(feedback_addressed));

    return client.post(`/Modification/revisions/${artwork_id}`, formData);
  },

  // GET /Modification/revisions/{artwork_id}
  getRevisions: async (artwork_id: string): Promise<Revision[]> => {
    return client.get(`/Modification/revisions/${artwork_id}`);
  },

  // GET /Modification/revisions/{artwork_id}/{revision_id}
  getRevisionDetail: async (
    artwork_id: string,
    revision_id: string
  ): Promise<Revision> => {
    return client.get(`/Modification/revisions/${artwork_id}/${revision_id}`);
  },

  // ============================================================
  // 決策日誌相關
  // ============================================================

  // POST /Modification/decision
  createDecision: async (params: {
    project_id: string;
    artwork_id?: string;
    decision_type: 'feedback' | 'revision' | 'approval' | 'rejection' | 'note';
    title: string;
    description: string;
    related_items?: string[];
  }): Promise<Decision> => {
    return client.post('/Modification/decision', params);
  },

  // GET /Modification/decision/{project_id}
  getDecisions: async (project_id: string): Promise<Decision[]> => {
    return client.get(`/Modification/decision/${project_id}`);
  },

  // ============================================================
  // 反饋綜合相關
  // ============================================================

  // POST /Modification/feedback/draft
  saveFeedbackDraft: async (
    artwork_id: string,
    draft: Partial<FeedbackDraft>
  ): Promise<FeedbackDraft> => {
    return client.post(`/Modification/feedback/draft`, {
      artwork_id,
      ...draft,
    });
  },

  // GET /Modification/feedback/draft/{artwork_id}
  getFeedbackDraft: async (artwork_id: string): Promise<FeedbackDraft> => {
    return client.get(`/Modification/feedback/draft/${artwork_id}`);
  },

  // PUT /Modification/feedback/draft
  updateFeedbackDraft: async (
    artwork_id: string,
    updates: Partial<FeedbackDraft>
  ): Promise<FeedbackDraft> => {
    return client.put(`/Modification/feedback/draft`, {
      artwork_id,
      ...updates,
    });
  },

  // ============================================================
  // 提交相關
  // ============================================================

  // POST /Modification/submit
  submitArtwork: async (params: {
    artwork_id: string;
    revision_id?: string;
    notes?: string;
    status: string;
  }): Promise<{ success: boolean; message: string }> => {
    return client.post('/Modification/submit', params);
  },

  // POST /Modification/approve
  approveArtwork: async (params: {
    artwork_id: string;
    approver_notes?: string;
  }): Promise<{ success: boolean; message: string }> => {
    return client.post('/Modification/approve', params);
  },

  // POST /Modification/reject
  rejectArtwork: async (params: {
    artwork_id: string;
    reason: string;
    feedback_items: string[];
  }): Promise<{ success: boolean; message: string }> => {
    return client.post('/Modification/reject', params);
  },
};

export default modificationApi;