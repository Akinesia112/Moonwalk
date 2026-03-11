module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/app/lib/api/config.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// web-interface-design/app/lib/api/config.ts
__turbopack_context__.s([
    "API_BASE_URL",
    ()=>API_BASE_URL,
    "API_TIMEOUT",
    ()=>API_TIMEOUT
]);
const API_BASE_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:5000") || 'http://140.112.29.139:5333';
const API_TIMEOUT = 30000;
}),
"[project]/app/lib/api/searchApi.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// web-interface-design/app/lib/api/searchApi.ts
__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "searchApi",
    ()=>searchApi
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/api/config.ts [app-ssr] (ecmascript)");
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
const client = new ApiClient(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["API_BASE_URL"]);
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
}),
"[project]/app/lib/context/SearchContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// web-interface-design/app/lib/context/SearchContext.tsx
__turbopack_context__.s([
    "SearchProvider",
    ()=>SearchProvider,
    "useSearch",
    ()=>useSearch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/api/searchApi.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
// ============================================================
// CONTEXT CREATION
// ============================================================
const SearchContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
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
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(initialState);
    // ============================================================
    // 項目操作
    // ============================================================
    const loadProjects = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setState((prev)=>({
                ...prev,
                projectsLoading: true,
                projectsError: null
            }));
        try {
            const projects = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["searchApi"].getProjects();
            setState((prev)=>({
                    ...prev,
                    projects,
                    projectsLoading: false
                }));
        } catch (error) {
            setState((prev)=>({
                    ...prev,
                    projectsError: error instanceof Error ? error.message : 'Failed to load projects',
                    projectsLoading: false
                }));
        }
    }, []);
    const setCurrentProject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((project)=>{
        setState((prev)=>({
                ...prev,
                currentProject: project,
                references: [],
                artworks: []
            }));
    }, []);
    // ============================================================
    // 參考資料操作
    // ============================================================
    const loadReferences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (projectId, params)=>{
        setState((prev)=>({
                ...prev,
                referencesLoading: true,
                referencesError: null
            }));
        try {
            const references = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["searchApi"].getReferences({
                project_id: projectId,
                ...params
            });
            setState((prev)=>({
                    ...prev,
                    references,
                    referencesLoading: false
                }));
        } catch (error) {
            setState((prev)=>({
                    ...prev,
                    referencesError: error instanceof Error ? error.message : 'Failed to load references',
                    referencesLoading: false
                }));
        }
    }, []);
    const refreshReferences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (state.currentProject) {
            await loadReferences(state.currentProject.id);
        }
    }, [
        state.currentProject,
        loadReferences
    ]);
    // ============================================================
    // 作品操作
    // ============================================================
    const loadArtworks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (projectId, params)=>{
        setState((prev)=>({
                ...prev,
                artworksLoading: true,
                artworksError: null
            }));
        try {
            const artworks = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["searchApi"].getArtworks({
                project_id: projectId,
                ...params
            });
            setState((prev)=>({
                    ...prev,
                    artworks,
                    artworksLoading: false
                }));
        } catch (error) {
            setState((prev)=>({
                    ...prev,
                    artworksError: error instanceof Error ? error.message : 'Failed to load artworks',
                    artworksLoading: false
                }));
        }
    }, []);
    const refreshArtworks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (state.currentProject) {
            await loadArtworks(state.currentProject.id);
        }
    }, [
        state.currentProject,
        loadArtworks
    ]);
    // ============================================================
    // 上傳操作
    // ============================================================
    const uploadImage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (file, params)=>{
        setState((prev)=>({
                ...prev,
                uploading: true,
                uploadError: null,
                uploadProgress: 0
            }));
        try {
            const result = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["searchApi"].uploadImage({
                file,
                type: params.type,
                instruction: params.instruction,
                project_id: params.project_id,
                shot_id: params.shot_id,
                priority: params.priority,
                category: params.category
            });
            setState((prev)=>({
                    ...prev,
                    uploading: false,
                    uploadProgress: 100
                }));
            // 自動刷新對應清單
            if (params.type === 'reference') {
                await refreshReferences();
            } else if (params.type === 'artwork') {
                await refreshArtworks();
            }
            return result.id;
        } catch (error) {
            setState((prev)=>({
                    ...prev,
                    uploadError: error instanceof Error ? error.message : 'Upload failed',
                    uploading: false
                }));
            return null;
        }
    }, [
        refreshReferences,
        refreshArtworks
    ]);
    const importFromUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (url, params)=>{
        setState((prev)=>({
                ...prev,
                uploading: true,
                uploadError: null
            }));
        try {
            const result = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$api$2f$searchApi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["searchApi"].importFromUrl({
                url,
                ...params
            });
            setState((prev)=>({
                    ...prev,
                    uploading: false
                }));
            await refreshReferences();
            return result.id;
        } catch (error) {
            setState((prev)=>({
                    ...prev,
                    uploadError: error instanceof Error ? error.message : 'Import failed',
                    uploading: false
                }));
            return null;
        }
    }, [
        refreshReferences
    ]);
    // ============================================================
    // 工具方法
    // ============================================================
    const clearError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((field)=>{
        setState((prev)=>({
                ...prev,
                [`${field}Error`]: null
            }));
    }, []);
    const reset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setState(initialState);
    }, []);
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SearchContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/app/lib/context/SearchContext.tsx",
        lineNumber: 344,
        columnNumber: 10
    }, this);
}
function useSearch() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within SearchProvider');
    }
    return context;
}
}),
"[project]/app/lib/context/ProjectContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProjectProvider",
    ()=>ProjectProvider,
    "useProject",
    ()=>useProject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const ProjectContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])({
    projectId: "proj_001",
    setProjectId: ()=>{}
});
function ProjectProvider({ children }) {
    const [projectId, setProjectId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("proj_001");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ProjectContext.Provider, {
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
function useProject() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ProjectContext);
}
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        if ("TURBOPACK compile-time truthy", 1) {
            if ("TURBOPACK compile-time truthy", 1) {
                module.exports = __turbopack_context__.r("[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)");
            } else //TURBOPACK unreachable
            ;
        } else //TURBOPACK unreachable
        ;
    }
} //# sourceMappingURL=module.compiled.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].React; //# sourceMappingURL=react.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7e271888._.js.map