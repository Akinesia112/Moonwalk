const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://140.112.29.139:5333"

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  // search
  getProjects: () => request("/search/projects"),
  getProjectStats: (projectId: string) => request(`/Understanding/project/${projectId}/stats`),
  getProjectActivity: (projectId: string) => request(`/Understanding/project/${projectId}/activity`),
  getReferences: (projectId: string, pinnedOnly?: boolean) =>
    request(`/search/references?project_id=${projectId}${pinnedOnly ? "&pinned_only=true" : ""}`),
  getArtworks: (projectId: string) => request(`/search/artworks?project_id=${projectId}`),
  getBrief: (projectId: string) => request(`/Understanding/brief/${projectId}`),

  // upload
  uploadImage: (body: FormData) =>
    fetch(`${BASE_URL}/search/upload`, { method: "POST", body }).then(r => r.json()),
  importUrl: (body: object) => request("/search/url", { method: "POST", body: JSON.stringify(body) }),

  // references
  updateReference: (refId: string, body: object) =>
    request(`/Modification/reference/${refId}`, { method: "PUT", body: JSON.stringify(body) }),
  batchUpdateReferences: (references: object[]) =>
    request("/Modification/references/batch", { method: "PUT", body: JSON.stringify({ references }) }),
  seedToRef: (projectId: string, seeds: object[]) =>
    request("/Modification/references/seed_to_ref", { method: "POST", body: JSON.stringify({ project_id: projectId, seeds }) }),

  // brief
  saveBrief: (body: object) =>
    request("/Modification/project/brief", { method: "POST", body: JSON.stringify(body) }),
  analyzeBrief: (body: object) =>
    request("/Modification/project/brief/analyze", { method: "POST", body: JSON.stringify(body) }),

  // artworks
  updateArtwork: (artworkId: string, body: object) =>
    request(`/Modification/artwork/${artworkId}`, { method: "PUT", body: JSON.stringify(body) }),
  analyzeArtwork: (body: object) =>
    request("/combination/analyze", { method: "POST", body: JSON.stringify(body) }),
  getMetrics: (artworkId: string) => request(`/combination/metrics/${artworkId}`),

  // feedback
  getFeedback: (artworkId: string) => request(`/Understanding/artwork/${artworkId}/feedback`),
  addFeedback: (artworkId: string, body: object) =>
    request(`/Modification/artwork/${artworkId}/feedback`, { method: "POST", body: JSON.stringify(body) }),
  updateFeedback: (feedbackId: string, body: object) =>
    request(`/Modification/feedback/${feedbackId}`, { method: "PUT", body: JSON.stringify(body) }),

  // chat
  chatReference: (body: object) =>
    request("/suggestion/chat/reference", { method: "POST", body: JSON.stringify(body) }),
  chatBrief: (body: object) =>
    request("/suggestion/chat/brief", { method: "POST", body: JSON.stringify(body) }),
  chatAnalysis: (body: object) =>
    request("/suggestion/chat/analysis", { method: "POST", body: JSON.stringify(body) }),
  chatReview: (body: object) =>
    request("/suggestion/chat/review", { method: "POST", body: JSON.stringify(body) }),
  chatCompare: (body: object) =>
    request("/suggestion/chat/compare", { method: "POST", body: JSON.stringify(body) }),
  chatReflection: (body: object) =>
    request("/suggestion/chat/reflection", { method: "POST", body: JSON.stringify(body) }),
}
