// web-interface-design/app/lib/api/chatApi.ts
import { API_BASE_URL } from './config';

// ============================================================
// TYPE DEFINITIONS — 對應 API.yaml
// ============================================================

export type ChatType = 'reference' | 'reflection' | 'analysis' | 'compare' | 'review' | 'decision';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'failed' | 'read';

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  type?: 'text' | 'image' | 'reference' | 'suggestion';
  attachments?: ChatAttachment[];
  metadata?: Record<string, any>;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'reference' | 'code';
  url: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  artwork_id?: string;
  project_id: string;
  chat_type: ChatType;
  title: string;
  description?: string;
  participants: string[];
  messages: ChatMessage[];
  context?: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ChatContext {
  artwork_id?: string;
  reference_ids?: string[];
  feedback_items?: string[];
  brief?: string;
  analysis_results?: Record<string, any>;
  previous_decisions?: string[];
}

// ============================================================
// API CLIENT
// ============================================================

class ChatApiClient {
  private baseUrl: string;
  private webSocketUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // 將 http:// 轉換為 ws://，https:// 轉換為 wss://
    this.webSocketUrl = baseUrl
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:');
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
      console.error(`[Chat API] ${endpoint} failed:`, error);
      throw error;
    }
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // WebSocket 連接用於實時聊天
  connectWebSocket(
    chatId: string,
    onMessage: (message: ChatMessage) => void,
    onError?: (error: Event) => void
  ): WebSocket {
    const ws = new WebSocket(`${this.webSocketUrl}/suggestion/chat/${chatId}/stream`);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage;
        onMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };

    return ws;
  }
}

const client = new ChatApiClient(API_BASE_URL);

// ============================================================
// CHAT API ENDPOINTS
// ============================================================

export const chatApi = {
  // ============================================================
  // 聊天會話管理
  // ============================================================

  // POST /suggestion/chat/sessions
  createSession: async (params: {
    project_id: string;
    chat_type: ChatType;
    title: string;
    description?: string;
    context?: ChatContext;
  }): Promise<ChatSession> => {
    return client.post('/suggestion/chat/sessions', params);
  },

  // GET /suggestion/chat/sessions/{project_id}
  getSessions: async (project_id: string): Promise<ChatSession[]> => {
    return client.get(`/suggestion/chat/sessions/${project_id}`);
  },

  // GET /suggestion/chat/sessions/{project_id}/{chat_id}
  getSession: async (project_id: string, chat_id: string): Promise<ChatSession> => {
    return client.get(`/suggestion/chat/sessions/${project_id}/${chat_id}`);
  },

  // PUT /suggestion/chat/sessions/{chat_id}
  updateSession: async (chat_id: string, updates: Partial<ChatSession>): Promise<ChatSession> => {
    return client.put(`/suggestion/chat/sessions/${chat_id}`, updates);
  },

  // DELETE /suggestion/chat/sessions/{chat_id}
  deleteSession: async (chat_id: string): Promise<{ success: boolean }> => {
    return client.delete(`/suggestion/chat/sessions/${chat_id}`);
  },

  // ============================================================
  // 聊天消息
  // ============================================================

  // POST /suggestion/chat/{chat_id}/messages
  sendMessage: async (
    chat_id: string,
    content: string,
    attachments?: ChatAttachment[]
  ): Promise<ChatMessage> => {
    return client.post(`/suggestion/chat/${chat_id}/messages`, {
      content,
      attachments,
    });
  },

  // GET /suggestion/chat/{chat_id}/messages
  getMessages: async (
    chat_id: string,
    limit?: number,
    offset?: number
  ): Promise<ChatMessage[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return client.get(`/suggestion/chat/${chat_id}/messages${query}`);
  },

  // DELETE /suggestion/chat/{chat_id}/messages/{message_id}
  deleteMessage: async (chat_id: string, message_id: string): Promise<{ success: boolean }> => {
    return client.delete(`/suggestion/chat/${chat_id}/messages/${message_id}`);
  },

  // ============================================================
  // 特殊聊天類型端點
  // ============================================================

  // POST /suggestion/chat/reference
  // 與參考資料相關的聊天
  chatWithReference: async (params: {
    chat_id: string;
    content: string;
    reference_ids: string[];
  }): Promise<ChatMessage> => {
    return client.post('/suggestion/chat/reference', params);
  },

  // POST /suggestion/chat/reflection
  // 創作反思聊天
  chatWithReflection: async (params: {
    chat_id: string;
    content: string;
    artwork_id: string;
  }): Promise<ChatMessage> => {
    return client.post('/suggestion/chat/reflection', params);
  },

  // POST /suggestion/chat/analysis
  // 分析聊天
  chatWithAnalysis: async (params: {
    chat_id: string;
    content: string;
    analysis_results: Record<string, any>;
    artwork_id: string;
  }): Promise<ChatMessage> => {
    return client.post('/suggestion/chat/analysis', params);
  },

  // POST /suggestion/chat/compare
  // 比較聊天
  chatWithCompare: async (params: {
    chat_id: string;
    content: string;
    artwork_id: string;
    reference_id: string;
  }): Promise<ChatMessage> => {
    return client.post('/suggestion/chat/compare', params);
  },

  // POST /suggestion/chat/review
  // 審查聊天
  chatWithReview: async (params: {
    chat_id: string;
    content: string;
    feedback_items: string[];
    artwork_id: string;
  }): Promise<ChatMessage> => {
    return client.post('/suggestion/chat/review', params);
  },

  // POST /suggestion/chat/decision
  // 決策聊天
  chatWithDecision: async (params: {
    chat_id: string;
    content: string;
    decision_context: Record<string, any>;
    project_id: string;
  }): Promise<ChatMessage> => {
    return client.post('/suggestion/chat/decision', params);
  },

  // ============================================================
  // WebSocket 連接
  // ============================================================

  connectChatStream: (
    chat_id: string,
    onMessage: (message: ChatMessage) => void,
    onError?: (error: Event) => void
  ): WebSocket => {
    return client.connectWebSocket(chat_id, onMessage, onError);
  },
};

export default chatApi;