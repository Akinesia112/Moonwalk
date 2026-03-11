// web-interface-design/app/lib/api/combinationApi.ts
import { API_BASE_URL } from './config';

// ============================================================
// TYPE DEFINITIONS — 對應 API.yaml
// ============================================================

export type Metric = 
  | 'Composition'
  | 'Light'
  | 'Color'
  | 'Texture'
  | 'Motion'
  | 'Depth'
  | 'Exposure'
  | 'Style';

export type MetricStatus = 'red' | 'yellow' | 'green';
export type IssueSeverity = 'P0' | 'P1' | 'P2';
export type Agent = 'J' | 'K'; // 兩個不同的 AI Agent

export interface AgentOpinion {
  agent: Agent;
  severity: IssueSeverity;
  confidence: number; // 0-1
  opinion: string;
}

export interface MetricAnalysis {
  id: string;
  name: Metric;
  status: MetricStatus; // 紅/黃/綠燈
  ref_basis: string; // 參考依據
  agent_opinions: AgentOpinion[];
  debate: string; // Agent 間的辯論過程
  consensus: string; // 最終共識
}

export interface Issue {
  id: string;
  type: Metric;
  severity: IssueSeverity;
  title: string;
  summary: string;
  recommended_edit: {
    action: string;
    rationale: string;
    acceptance_criteria: string;
    estimated_cost: string;
  };
}

export interface AnalysisResult {
  artwork_id: string;
  metrics: MetricAnalysis[];
  issues: Issue[];
  timestamp: string;
  status: 'completed' | 'in_progress' | 'failed';
}

export interface AnalysisRequest {
  artwork_id: string;
  reference_ids: string[];
  brief_context: Record<string, any>;
}

// ============================================================
// API CLIENT
// ============================================================

class CombinationApiClient {
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
      console.error(`[Combination API] ${endpoint} failed:`, error);
      throw error;
    }
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
}

const client = new CombinationApiClient(API_BASE_URL);

// ============================================================
// COMBINATION API ENDPOINTS
// ============================================================

export const combinationApi = {
  // POST /combination/analyze
  // 觸發 16 agents 並行分析
  analyze: async (params: AnalysisRequest): Promise<AnalysisResult> => {
    return client.post<AnalysisResult>('/combination/analyze', {
      artwork_id: params.artwork_id,
      reference_ids: params.reference_ids,
      brief_context: params.brief_context,
    });
  },

  // GET /combination/metrics/{artwork_id}
  // 取得 8 個指標的整體分析結果
  getMetrics: async (artwork_id: string): Promise<MetricAnalysis[]> => {
    return client.get<MetricAnalysis[]>(`/combination/metrics/${artwork_id}`);
  },

  // GET /combination/metrics/{artwork_id}/{metric_id}
  // 取得單一指標的詳細分析
  getMetricDetail: async (
    artwork_id: string,
    metric_id: string
  ): Promise<MetricAnalysis> => {
    return client.get<MetricAnalysis>(
      `/combination/metrics/${artwork_id}/${metric_id}`
    );
  },

  // GET /combination/deltas/{artwork_id}/{ref_id}
  // 取得 artwork 與 reference 的差異清單
  getDeltas: async (artwork_id: string, ref_id: string): Promise<any[]> => {
    return client.get<any[]>(`/combination/deltas/${artwork_id}/${ref_id}`);
  },

  // POST /combination/deltas/{artwork_id}/{ref_id}
  // 重新觸發差異比較分析
  analyzeDeltas: async (
    artwork_id: string,
    ref_id: string,
    brief_context: Record<string, any>
  ): Promise<any[]> => {
    return client.post<any[]>(
      `/combination/deltas/${artwork_id}/${ref_id}`,
      { brief_context }
    );
  },

  // POST /combination/compare
  // 比較 artwork 與 reference（用於 Split/Wipe/Side-by-side）
  compare: async (params: {
    artwork_id: string;
    reference_id: string;
    mode: 'split' | 'wipe' | 'side_by_side';
  }): Promise<{ artwork_url: string; reference_url: string }> => {
    return client.post<any>('/combination/compare', params);
  },

  // POST /combination/analyze_feedback
  // AI 綜合所有回饋項目
  analyzeFeedback: async (
    feedbackItems: any[]
  ): Promise<{
    key_findings: string[];
    conflicts: string[];
    suggested_order: string[];
  }> => {
    return client.post<any>('/combination/analyze_feedback', {
      feedback_items: feedbackItems,
    });
  },
};

export default combinationApi;