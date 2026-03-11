"use client"
import { createContext, useContext, useState, ReactNode } from "react"

interface ProjectContextType {
  projectId: string
  setProjectId: (id: string) => void
}

const ProjectContext = createContext<ProjectContextType>({
  projectId: "proj_001",
  setProjectId: () => {},
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState("proj_001")
  return (
    <ProjectContext.Provider value={{ projectId, setProjectId }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
