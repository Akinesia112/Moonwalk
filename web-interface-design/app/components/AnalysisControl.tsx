// web-interface-design/app/components/AnalysisControl.tsx
'use client';

import React, { useState } from 'react';
import { useSearch } from '@/app/lib/context/SearchContext';
import { useAnalysis } from '@/app/lib/hooks/useAnalysis';
import { AnalysisRequest } from '@/app/lib/api/combinationApi';

interface AnalysisControlProps {
  artworkId: string;
  referenceIds: string[];
  briefContext?: Record<string, any>;
  onAnalysisComplete?: () => void;
}

export function AnalysisControl({
  artworkId,
  referenceIds,
  briefContext,
  onAnalysisComplete,
}: AnalysisControlProps) {
  const { state: searchState } = useSearch();
  const { analyzing, progress, error, startAnalysis, clearError } = useAnalysis();
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!searchState.currentProject) {
    return <div className="analysis-control disabled">請先選擇項目</div>;
  }

  if (referenceIds.length === 0) {
    return (
      <div className="analysis-control disabled">
        請至少選擇一個參考資料
      </div>
    );
  }

  const handleAnalyze = async () => {
    try {
      const params: AnalysisRequest = {
        artwork_id: artworkId,
        reference_ids: referenceIds,
        brief_context: briefContext || {},
      };

      const result = await startAnalysis(params);
      onAnalysisComplete?.();

      // 顯示成功提示
      console.log('Analysis completed:', result);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  return (
    <div className="analysis-control">
      <div className="control-header">
        <h3>AI 智能分析</h3>
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '簡化' : '進階'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={clearError}>×</button>
        </div>
      )}

      <div className="analysis-info">
        <p>
          將分析作品與 <strong>{referenceIds.length}</strong> 個參考資料
        </p>
        <p className="subtext">
          16 個 AI Agent 將在 8 個維度進行並行分析（每個維度 2 個 Agent）
        </p>
      </div>

      {showAdvanced && (
        <div className="advanced-options">
          <label>
            <input type="checkbox" defaultChecked />
            包含構圖分析
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            包含光影分析
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            包含色彩分析
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            包含質感分析
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            包含動態分析
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            包含深度分析
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            包含曝光分析
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            包含風格分析
          </label>
        </div>
      )}

      <button
        className="analyze-btn"
        onClick={handleAnalyze}
        disabled={analyzing}
      >
        {analyzing ? '分析進行中...' : '開始分析'}
      </button>

      {analyzing && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-text">{Math.round(progress)}% 完成</p>
          <p className="progress-hint">
            16 個 AI Agent 正在並行分析中...
          </p>
        </div>
      )}
    </div>
  );
}