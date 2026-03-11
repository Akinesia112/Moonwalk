(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/lib/api/config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// web-interface-design/app/lib/api/config.ts
__turbopack_context__.s([
    "API_BASE_URL",
    ()=>API_BASE_URL,
    "API_TIMEOUT",
    ()=>API_TIMEOUT
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const API_BASE_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:5000") || 'http://140.112.29.139:5333';
const API_TIMEOUT = 30000;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/lib/api/searchApi.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// web-interface-design/app/lib/api/searchApi.ts
__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "searchApi",
    ()=>searchApi
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/api/config.ts [app-client] (ecmascript)");
;
class ApiClient {
    baseUrl;
    constructor(baseUrl){
        this.baseUrl = baseUrl;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        // 移除 Content-Type 如果是 FormData
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            if (!response.ok) {
                const error = {
                    code: response.status.toString(),
                    message: response.statusText
                };
                try {
                    error.details = await response.json();
                } catch  {
                // 無法解析 JSON
                }
                throw new Error(JSON.stringify(error));
            }
            return await response.json();
        } catch (error) {
            console.error(`[API] ${endpoint} failed:`, error);
            throw error;
        }
    }
    async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET'
        });
    }
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
    }
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}
// ============================================================
// SEARCH API IMPLEMENTATION
// ============================================================
const client = new ApiClient(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]);
const searchApi = {
    // GET /search/projects
    getProjects: async ()=>{
        return client.get('/search/projects');
    },
    // POST /search/upload
    uploadImage: async (params)=>{
        const formData = new FormData();
        formData.append('type', params.type);
        formData.append('image', params.file);
        if (params.instruction) formData.append('instruction', params.instruction);
        formData.append('project_id', params.project_id);
        if (params.shot_id) formData.append('shot_id', params.shot_id);
        if (params.priority) formData.append('priority', params.priority);
        if (params.category) formData.append('category', params.category);
        return client.post('/search/upload', formData);
    },
    // POST /search/url
    importFromUrl: async (params)=>{
        return client.post('/search/url', params);
    },
    // GET /search/references
    getReferences: async (params)=>{
        const query = new URLSearchParams();
        query.append('project_id', params.project_id);
        if (params.pinned_only) query.append('pinned_only', 'true');
        if (params.artwork_id) query.append('artwork_id', params.artwork_id);
        return client.get(`/search/references?${query}`);
    },
    // GET /search/references/{ref_id}
    getReferenceDetail: async (ref_id)=>{
        return client.get(`/search/references/${ref_id}`);
    },
    // GET /search/artworks
    getArtworks: async (params)=>{
        const query = new URLSearchParams();
        query.append('project_id', params.project_id);
        if (params.status) query.append('status', params.status);
        return client.get(`/search/artworks?${query}`);
    },
    // GET /search/artworks/{artwork_id}
    getArtworkDetail: async (artwork_id)=>{
        return client.get(`/search/artworks/${artwork_id}`);
    }
};
const __TURBOPACK__default__export__ = searchApi;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/lib/context/SearchContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// web-interface-design/app/lib/context/SearchContext.tsx
__turbopack_context__.s([
    "SearchProvider",
    ()=>SearchProvider,
    "useSearch",
    ()=>useSearch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/api/searchApi.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
// ============================================================
// CONTEXT CREATION
// ============================================================
const SearchContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const initialState = {
    currentProject: null,
    projects: [],
    projectsLoading: false,
    projectsError: null,
    references: [],
    referencesLoading: false,
    referencesError: null,
    artworks: [],
    artworksLoading: false,
    artworksError: null,
    uploading: false,
    uploadError: null,
    uploadProgress: 0
};
function SearchProvider({ children }) {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialState);
    // ============================================================
    // 項目操作
    // ============================================================
    const loadProjects = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[loadProjects]": async ()=>{
            setState({
                "SearchProvider.useCallback[loadProjects]": (prev)=>({
                        ...prev,
                        projectsLoading: true,
                        projectsError: null
                    })
            }["SearchProvider.useCallback[loadProjects]"]);
            try {
                const projects = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchApi"].getProjects();
                setState({
                    "SearchProvider.useCallback[loadProjects]": (prev)=>({
                            ...prev,
                            projects,
                            projectsLoading: false
                        })
                }["SearchProvider.useCallback[loadProjects]"]);
            } catch (error) {
                setState({
                    "SearchProvider.useCallback[loadProjects]": (prev)=>({
                            ...prev,
                            projectsError: error instanceof Error ? error.message : 'Failed to load projects',
                            projectsLoading: false
                        })
                }["SearchProvider.useCallback[loadProjects]"]);
            }
        }
    }["SearchProvider.useCallback[loadProjects]"], []);
    const setCurrentProject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[setCurrentProject]": (project)=>{
            setState({
                "SearchProvider.useCallback[setCurrentProject]": (prev)=>({
                        ...prev,
                        currentProject: project,
                        references: [],
                        artworks: []
                    })
            }["SearchProvider.useCallback[setCurrentProject]"]);
        }
    }["SearchProvider.useCallback[setCurrentProject]"], []);
    // ============================================================
    // 參考資料操作
    // ============================================================
    const loadReferences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[loadReferences]": async (projectId, params)=>{
            setState({
                "SearchProvider.useCallback[loadReferences]": (prev)=>({
                        ...prev,
                        referencesLoading: true,
                        referencesError: null
                    })
            }["SearchProvider.useCallback[loadReferences]"]);
            try {
                const references = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchApi"].getReferences({
                    project_id: projectId,
                    ...params
                });
                setState({
                    "SearchProvider.useCallback[loadReferences]": (prev)=>({
                            ...prev,
                            references,
                            referencesLoading: false
                        })
                }["SearchProvider.useCallback[loadReferences]"]);
            } catch (error) {
                setState({
                    "SearchProvider.useCallback[loadReferences]": (prev)=>({
                            ...prev,
                            referencesError: error instanceof Error ? error.message : 'Failed to load references',
                            referencesLoading: false
                        })
                }["SearchProvider.useCallback[loadReferences]"]);
            }
        }
    }["SearchProvider.useCallback[loadReferences]"], []);
    const refreshReferences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[refreshReferences]": async ()=>{
            if (state.currentProject) {
                await loadReferences(state.currentProject.id);
            }
        }
    }["SearchProvider.useCallback[refreshReferences]"], [
        state.currentProject,
        loadReferences
    ]);
    // ============================================================
    // 作品操作
    // ============================================================
    const loadArtworks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[loadArtworks]": async (projectId, params)=>{
            setState({
                "SearchProvider.useCallback[loadArtworks]": (prev)=>({
                        ...prev,
                        artworksLoading: true,
                        artworksError: null
                    })
            }["SearchProvider.useCallback[loadArtworks]"]);
            try {
                const artworks = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchApi"].getArtworks({
                    project_id: projectId,
                    ...params
                });
                setState({
                    "SearchProvider.useCallback[loadArtworks]": (prev)=>({
                            ...prev,
                            artworks,
                            artworksLoading: false
                        })
                }["SearchProvider.useCallback[loadArtworks]"]);
            } catch (error) {
                setState({
                    "SearchProvider.useCallback[loadArtworks]": (prev)=>({
                            ...prev,
                            artworksError: error instanceof Error ? error.message : 'Failed to load artworks',
                            artworksLoading: false
                        })
                }["SearchProvider.useCallback[loadArtworks]"]);
            }
        }
    }["SearchProvider.useCallback[loadArtworks]"], []);
    const refreshArtworks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[refreshArtworks]": async ()=>{
            if (state.currentProject) {
                await loadArtworks(state.currentProject.id);
            }
        }
    }["SearchProvider.useCallback[refreshArtworks]"], [
        state.currentProject,
        loadArtworks
    ]);
    // ============================================================
    // 上傳操作
    // ============================================================
    const uploadImage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[uploadImage]": async (file, params)=>{
            setState({
                "SearchProvider.useCallback[uploadImage]": (prev)=>({
                        ...prev,
                        uploading: true,
                        uploadError: null,
                        uploadProgress: 0
                    })
            }["SearchProvider.useCallback[uploadImage]"]);
            try {
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchApi"].uploadImage({
                    file,
                    type: params.type,
                    instruction: params.instruction,
                    project_id: params.project_id,
                    shot_id: params.shot_id,
                    priority: params.priority,
                    category: params.category
                });
                setState({
                    "SearchProvider.useCallback[uploadImage]": (prev)=>({
                            ...prev,
                            uploading: false,
                            uploadProgress: 100
                        })
                }["SearchProvider.useCallback[uploadImage]"]);
                // 自動刷新對應清單
                if (params.type === 'reference') {
                    await refreshReferences();
                } else if (params.type === 'artwork') {
                    await refreshArtworks();
                }
                return result.id;
            } catch (error) {
                setState({
                    "SearchProvider.useCallback[uploadImage]": (prev)=>({
                            ...prev,
                            uploadError: error instanceof Error ? error.message : 'Upload failed',
                            uploading: false
                        })
                }["SearchProvider.useCallback[uploadImage]"]);
                return null;
            }
        }
    }["SearchProvider.useCallback[uploadImage]"], [
        refreshReferences,
        refreshArtworks
    ]);
    const importFromUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[importFromUrl]": async (url, params)=>{
            setState({
                "SearchProvider.useCallback[importFromUrl]": (prev)=>({
                        ...prev,
                        uploading: true,
                        uploadError: null
                    })
            }["SearchProvider.useCallback[importFromUrl]"]);
            try {
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchApi"].importFromUrl({
                    url,
                    ...params
                });
                setState({
                    "SearchProvider.useCallback[importFromUrl]": (prev)=>({
                            ...prev,
                            uploading: false
                        })
                }["SearchProvider.useCallback[importFromUrl]"]);
                await refreshReferences();
                return result.id;
            } catch (error) {
                setState({
                    "SearchProvider.useCallback[importFromUrl]": (prev)=>({
                            ...prev,
                            uploadError: error instanceof Error ? error.message : 'Import failed',
                            uploading: false
                        })
                }["SearchProvider.useCallback[importFromUrl]"]);
                return null;
            }
        }
    }["SearchProvider.useCallback[importFromUrl]"], [
        refreshReferences
    ]);
    // ============================================================
    // 工具方法
    // ============================================================
    const clearError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[clearError]": (field)=>{
            setState({
                "SearchProvider.useCallback[clearError]": (prev)=>({
                        ...prev,
                        [`${field}Error`]: null
                    })
            }["SearchProvider.useCallback[clearError]"]);
        }
    }["SearchProvider.useCallback[clearError]"], []);
    const reset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SearchProvider.useCallback[reset]": ()=>{
            setState(initialState);
        }
    }["SearchProvider.useCallback[reset]"], []);
    const value = {
        state,
        actions: {
            loadProjects,
            setCurrentProject,
            loadReferences,
            refreshReferences,
            loadArtworks,
            refreshArtworks,
            uploadImage,
            importFromUrl,
            clearError,
            reset
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SearchContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/app/lib/context/SearchContext.tsx",
        lineNumber: 344,
        columnNumber: 10
    }, this);
}
_s(SearchProvider, "D9c05NjtkOLB4DmWhZs7wg6OR4w=");
_c = SearchProvider;
function useSearch() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within SearchProvider');
    }
    return context;
}
_s1(useSearch, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "SearchProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/lib/context/ProjectContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProjectProvider",
    ()=>ProjectProvider,
    "useProject",
    ()=>useProject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
const ProjectContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    projectId: "proj_001",
    setProjectId: ()=>{}
});
function ProjectProvider({ children }) {
    _s();
    const [projectId, setProjectId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("proj_001");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProjectContext.Provider, {
        value: {
            projectId,
            setProjectId
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/lib/context/ProjectContext.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_s(ProjectProvider, "3jAX75vQZNtvKuyHbO2syjcNCcU=");
_c = ProjectProvider;
function useProject() {
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(ProjectContext);
}
_s1(useProject, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "ProjectProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=app_lib_949e407f._.js.map