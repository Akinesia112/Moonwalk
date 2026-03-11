// web-interface-design/app/components/ProjectSelector.tsx
'use client';

import React, { useEffect } from 'react';
import { useSearch } from '@/app/lib/context/SearchContext';

export function ProjectSelector() {
  const { state, actions } = useSearch();
  const { currentProject, projects, projectsLoading, projectsError } = state;

  useEffect(() => {
    if (projects.length === 0) {
      actions.loadProjects();
    }
  }, []);

  return (
    <div className="project-selector">
      <label htmlFor="project-select">項目</label>
      <select
        id="project-select"
        value={currentProject?.id || ''}
        onChange={(e) => {
          const project = projects.find((p) => p.id === e.target.value);
          if (project) {
            actions.setCurrentProject(project);
          }
        }}
        disabled={projectsLoading}
      >
        <option value="">選擇項目...</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name} ({project.client})
          </option>
        ))}
      </select>

      {projectsError && <div className="error">{projectsError}</div>}
      {projectsLoading && <div className="loading">載入項目中...</div>}
    </div>
  );
}