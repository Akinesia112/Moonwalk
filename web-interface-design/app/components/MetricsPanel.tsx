// web-interface-design/app/components/MetricsPanel.tsx
'use client';

import React from 'react';
import { MetricAnalysis } from '@/app/lib/api/combinationApi';

interface MetricsPanelProps {
  metrics: MetricAnalysis[];
  selectedMetric?: MetricAnalysis | null;
  onMetricSelect?: (metric: MetricAnalysis) => void;
  loading?: boolean;
}

const METRIC_LABELS: Record<string, string> = {
  Composition: '構圖',
  Light: '光影',
  Color: '色彩',
  Texture: '質感',
  Motion: '動態',
  Depth: '深度',
  Exposure: '曝光',
  Style: '風格',
};

const STATUS_LABELS: Record<string, string> = {
  red: '需改進',
  yellow: '可優化',
  green: '優秀',
};

export function MetricsPanel({
  metrics,
  selectedMetric,
  onMetricSelect,
  loading,
}: MetricsPanelProps) {
  if (loading) {
    return <div className="metrics-panel loading">分析中...</div>;
  }

  if (metrics.length === 0) {
    return <div className="metrics-panel empty">無分析結果</div>;
  }

  return (
    <div className="metrics-panel">
      <h3>AI 分析指標</h3>

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            isSelected={selectedMetric?.id === metric.id}
            onSelect={() => onMetricSelect?.(metric)}
          />
        ))}
      </div>

      {selectedMetric && (
        <MetricDetailPanel metric={selectedMetric} />
      )}
    </div>
  );
}

function MetricCard({
  metric,
  isSelected,
  onSelect,
}: {
  metric: MetricAnalysis;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`metric-card ${metric.status} ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="metric-header">
        <h4>{METRIC_LABELS[metric.name]}</h4>
        <span className={`status-light ${metric.status}`} />
      </div>

      <div className="status-label">
        {STATUS_LABELS[metric.status]}
      </div>

      <div className="metric-preview">
        <p className="consensus">{metric.consensus}</p>
      </div>

      <div className="agent-icons">
        {metric.agent_opinions.map((opinion) => (
          <span
            key={opinion.agent}
            className={`agent-badge ${opinion.severity.toLowerCase()}`}
            title={`Agent ${opinion.agent}: ${opinion.opinion}`}
          >
            {opinion.agent}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricDetailPanel({ metric }: { metric: MetricAnalysis }) {
  return (
    <div className="metric-detail-panel">
      <div className="detail-header">
        <h4>{METRIC_LABELS[metric.name]} — 詳細分析</h4>
        <span className={`status-badge ${metric.status}`}>
          {STATUS_LABELS[metric.status]}
        </span>
      </div>

      <section className="section">
        <h5>參考依據</h5>
        <p className="ref-basis">{metric.ref_basis}</p>
      </section>

      <section className="section">
        <h5>Agent 意見</h5>
        <div className="agent-opinions">
          {metric.agent_opinions.map((opinion) => (
            <div key={opinion.agent} className="opinion-card">
              <div className="opinion-header">
                <strong>Agent {opinion.agent}</strong>
                <span className={`severity ${opinion.severity.toLowerCase()}`}>
                  {opinion.severity}
                </span>
                <span className="confidence">
                  信心度: {(opinion.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="opinion-text">{opinion.opinion}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h5>Agent 辯論</h5>
        <div className="debate">
          <p>{metric.debate}</p>
        </div>
      </section>

      <section className="section">
        <h5>最終共識</h5>
        <div className="consensus">
          <p>{metric.consensus}</p>
        </div>
      </section>
    </div>
  );
}