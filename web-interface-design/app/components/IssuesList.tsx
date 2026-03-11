// web-interface-design/app/components/IssuesList.tsx
'use client';

import React, { useState } from 'react';
import { Issue } from '@/app/lib/api/combinationApi';

interface IssuesListProps {
  issues: Issue[];
  onIssueSelect?: (issue: Issue) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  P0: '#d32f2f', // 紅
  P1: '#f57c00', // 橙
  P2: '#fbc02d', // 黃
};

const SEVERITY_LABELS: Record<string, string> = {
  P0: '嚴重',
  P1: '中等',
  P2: '輕微',
};

export function IssuesList({ issues, onIssueSelect }: IssuesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (issues.length === 0) {
    return (
      <div className="issues-list empty">
        <p>✓ 無問題發現</p>
      </div>
    );
  }

  // 按嚴重程度排序
  const sorted = [...issues].sort((a, b) => {
    const order = { P0: 0, P1: 1, P2: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="issues-list">
      <h3>檢出問題 ({issues.length})</h3>

      <div className="severity-legend">
        {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
          <div key={key} className="legend-item">
            <span
              className="color-box"
              style={{ backgroundColor: SEVERITY_COLORS[key] }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="issues">
        {sorted.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            isExpanded={expandedId === issue.id}
            onToggle={() => setExpandedId(
              expandedId === issue.id ? null : issue.id
            )}
            onSelect={() => onIssueSelect?.(issue)}
          />
        ))}
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  isExpanded,
  onToggle,
  onSelect,
}: {
  issue: Issue;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      className={`issue-card ${isExpanded ? 'expanded' : ''}`}
      style={{ borderLeftColor: SEVERITY_COLORS[issue.severity] }}
    >
      <div className="issue-header" onClick={onToggle}>
        <div className="issue-title">
          <span className={`severity-badge ${issue.severity.toLowerCase()}`}>
            {issue.severity}
          </span>
          <span className="metric-type">{issue.type}</span>
          <h4>{issue.title}</h4>
        </div>
        <button className="toggle-btn" aria-expanded={isExpanded}>
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="issue-detail">
          <p className="summary">{issue.summary}</p>

          <div className="recommended-edit">
            <h5>建議編輯</h5>

            <div className="edit-item">
              <label>動作:</label>
              <p>{issue.recommended_edit.action}</p>
            </div>

            <div className="edit-item">
              <label>理由:</label>
              <p>{issue.recommended_edit.rationale}</p>
            </div>

            <div className="edit-item">
              <label>驗收標準:</label>
              <p>{issue.recommended_edit.acceptance_criteria}</p>
            </div>

            <div className="edit-item">
              <label>預估成本:</label>
              <p>{issue.recommended_edit.estimated_cost}</p>
            </div>
          </div>

          <button className="select-btn" onClick={onSelect}>
            選擇此問題
          </button>
        </div>
      )}
    </div>
  );
}