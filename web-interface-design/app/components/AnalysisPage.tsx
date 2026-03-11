// web-interface-design/app/components/AnalysisPage.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearch } from '@/app/lib/context/SearchContext';
import { useAnalysis } from '@/app/lib/hooks/useAnalysis';
import { AnalysisControl } from './AnalysisControl';
import { MetricsPanel } from './MetricsPanel';
import { IssuesList } from './IssuesList';

interface AnalysisPageProps {
  artworkId: string;
  referenceIds?: string[];
}

export function AnalysisPage({
  artworkId,
  referenceIds = [],
}: AnalysisPageProps) {
  const { state: searchState } = useSearch();
  const {
    metrics,
    selectedMetric,
    analyzing,
    analysisResult,
    selectMetric,
    loadMetrics,
  } = useAnalysis();

  const [activeTab, setActiveTab] = useState<'metrics' | 'issues'>('metrics');

  // 載入已存在的分析結果
  useEffect(() => {
    if (artworkId) {
      loadMetrics(artworkId);
    }
  }, [artworkId, loadMetrics]);

  const handleAnalysisComplete = () => {
    // 自動載入新的分析結果
    if (artworkId) {
      loadMetrics(artworkId);
    }
  };

  return (
    <div className="analysis-page">
      <div className="page-header">
        <h2>作品分析</h2>
        <div className="breadcrumb">
          <span>{searchState.currentProject?.name}</span>
          <span>/</span>
          <span>作品 {artworkId}</span>
        </div>
      </div>

      <div className="analysis-layout">
        {/* 左側：控制面板 */}
        <aside className="control-sidebar">
          <AnalysisControl
            artworkId={artworkId}
            referenceIds={referenceIds}
            briefContext={searchState.currentProject ? {
              project_id: searchState.currentProject.id,
            } : undefined}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </aside>

        {/* 右側：結果面板 */}
        <main className="results-panel">
          <div className="tab-navigation">
            <button
              className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              指標分析 ({metrics.length})
            </button>
            <button
              className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
              onClick={() => setActiveTab('issues')}
            >
              檢出問題 ({analysisResult?.issues.length || 0})
            </button>
          </div>

          {activeTab === 'metrics' && (
            <MetricsPanel
              metrics={metrics}
              selectedMetric={selectedMetric}
              onMetricSelect={selectMetric}
              loading={analyzing}
            />
          )}

          {activeTab === 'issues' && (
            <IssuesList
              issues={analysisResult?.issues || []}
              onIssueSelect={(issue) => {
                // 可選：當選擇問題時，高亮對應的指標
                const metric = metrics.find((m) => m.name === issue.type);
                if (metric) {
                  selectMetric(metric);
                  setActiveTab('metrics');
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}