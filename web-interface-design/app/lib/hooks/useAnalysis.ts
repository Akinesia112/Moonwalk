// web-interface-design/app/lib/hooks/useAnalysis.ts
'use client';

import { useState, useCallback } from 'react';
import {
  combinationApi,
  AnalysisResult,
  MetricAnalysis,
  AnalysisRequest,
} from '../api/combinationApi';

export interface AnalysisState {
  analysisResult: AnalysisResult | null;
  metrics: MetricAnalysis[];
  selectedMetric: MetricAnalysis | null;
  analyzing: boolean;
  error: string | null;
  progress: number; // 0-100
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    analysisResult: null,
    metrics: [],
    selectedMetric: null,
    analyzing: false,
    error: null,
    progress: 0,
  });

  // ============================================================
  // 開始分析
  // ============================================================

  const startAnalysis = useCallback(
    async (params: AnalysisRequest) => {
      setState((prev) => ({
        ...prev,
        analyzing: true,
        error: null,
        progress: 10,
      }));

      try {
        // 模擬進度更新（實際應由後端 WebSocket 推送）
        const progressInterval = setInterval(() => {
          setState((prev) => ({
            ...prev,
            progress: Math.min(prev.progress + Math.random() * 20, 90),
          }));
        }, 1000);

        const result = await combinationApi.analyze(params);

        clearInterval(progressInterval);

        setState((prev) => ({
          ...prev,
          analysisResult: result,
          metrics: result.metrics,
          analyzing: false,
          progress: 100,
        }));

        // 3 秒後重置進度條
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            progress: 0,
          }));
        }, 3000);

        return result;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          analyzing: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
          progress: 0,
        }));
        throw error;
      }
    },
    []
  );

  // ============================================================
  // 載入分析結果
  // ============================================================

  const loadMetrics = useCallback(async (artwork_id: string) => {
    setState((prev) => ({
      ...prev,
      analyzing: true,
      error: null,
    }));

    try {
      const metrics = await combinationApi.getMetrics(artwork_id);
      setState((prev) => ({
        ...prev,
        metrics,
        analyzing: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load metrics',
        analyzing: false,
      }));
    }
  }, []);

  // ============================================================
  // 選擇指標查看詳細
  // ============================================================

  const selectMetric = useCallback(async (metric: MetricAnalysis) => {
    setState((prev) => ({
      ...prev,
      selectedMetric: metric,
    }));
  }, []);

  // ============================================================
  // 清除錯誤
  // ============================================================

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  // ============================================================
  // 重置狀態
  // ============================================================

  const reset = useCallback(() => {
    setState({
      analysisResult: null,
      metrics: [],
      selectedMetric: null,
      analyzing: false,
      error: null,
      progress: 0,
    });
  }, []);

  return {
    ...state,
    startAnalysis,
    loadMetrics,
    selectMetric,
    clearError,
    reset,
  };
}