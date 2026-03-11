// web-interface-design/app/components/ImageUploadPanel.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useSearch } from '@/app/lib/context/SearchContext';

type UploadMode = 'file' | 'url';

export function ImageUploadPanel() {
  const { state, actions } = useSearch();
  const { currentProject } = state;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [uploadType, setUploadType] = useState<'reference' | 'artwork' | 'seed'>('reference');
  const [priority, setPriority] = useState<'main' | 'secondary' | 'supplementary'>('main');
  const [category, setCategory] = useState<string>('Lighting');
  const [instruction, setInstruction] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!currentProject) {
    return (
      <div className="upload-panel">
        <p className="warning">請先選擇項目</p>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const uploadId = await actions.uploadImage(selectedFile, {
      type: uploadType,
      instruction: instruction || undefined,
      project_id: currentProject.id,
      priority: priority || undefined,
      category: category || undefined,
    });

    if (uploadId) {
      // 成功
      setSelectedFile(null);
      setInstruction('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlImport = async () => {
    if (!url) return;

    const uploadId = await actions.importFromUrl(url, {
      instruction: instruction || undefined,
      project_id: currentProject.id,
      category: category || undefined,
    });

    if (uploadId) {
      setUrl('');
      setInstruction('');
    }
  };

  return (
    <div className="upload-panel">
      <h3>上傳內容</h3>

      {state.uploadError && (
        <div className="error-message">
          {state.uploadError}
          <button onClick={() => actions.clearError('upload')}>關閉</button>
        </div>
      )}

      <div className="form-group">
        <label>上傳類型</label>
        <select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value as any)}
          disabled={state.uploading}
        >
          <option value="reference">參考資料</option>
          <option value="artwork">創作作品</option>
          <option value="seed">種子圖像</option>
        </select>
      </div>

      {uploadType === 'reference' && (
        <>
          <div className="form-group">
            <label>優先級</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              disabled={state.uploading}
            >
              <option value="main">主要</option>
              <option value="secondary">次要</option>
              <option value="supplementary">補充</option>
            </select>
          </div>

          <div className="form-group">
            <label>類別</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={state.uploading}
            >
              <option value="Lighting">光影</option>
              <option value="Color">色彩</option>
              <option value="Composition">構圖</option>
              <option value="Style">風格</option>
              <option value="Texture">質感</option>
              <option value="Motion">動態</option>
              <option value="Mood">氛圍</option>
              <option value="VFX">視覺效果</option>
            </select>
          </div>
        </>
      )}

      <div className="form-group">
        <label>備註說明</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="添加任何相關說明..."
          disabled={state.uploading}
          rows={3}
        />
      </div>

      <div className="mode-toggle">
        <button
          className={uploadMode === 'file' ? 'active' : ''}
          onClick={() => setUploadMode('file')}
          disabled={state.uploading}
        >
          上傳檔案
        </button>
        <button
          className={uploadMode === 'url' ? 'active' : ''}
          onClick={() => setUploadMode('url')}
          disabled={state.uploading}
        >
          匯入 URL
        </button>
      </div>

      {uploadMode === 'file' ? (
        <div className="file-upload">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,video/*"
            disabled={state.uploading}
          />
          {selectedFile && <p>已選擇: {selectedFile.name}</p>}
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || state.uploading}
          >
            {state.uploading ? '上傳中...' : '上傳'}
          </button>
        </div>
      ) : (
        <div className="url-import">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="輸入圖片 URL..."
            disabled={state.uploading}
          />
          <button
            onClick={handleUrlImport}
            disabled={!url || state.uploading}
          >
            {state.uploading ? '匯入中...' : '匯入'}
          </button>
        </div>
      )}
    </div>
  );
}