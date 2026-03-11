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
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
]);

//# sourceMappingURL=_7aea0e9e._.js.map