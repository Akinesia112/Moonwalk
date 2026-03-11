// web-interface-design/app/components/ReferenceUpload.tsx
'use client';

import React, { useRef, useState } from 'react';
import { useSearch } from '../hooks/useSearch';

interface ReferenceUploadProps {
  projectId: string;
  onUploadSuccess?: () => void;
}

export function ReferenceUpload({
  projectId,
  onUploadSuccess,
}: ReferenceUploadProps) {
  const { uploadImage, loading, error } = useSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [instruction, setInstruction] = useState('');
  const [priority, setPriority] = useState<'main' | 'secondary' | 'supplementary'>('main');
  const [category, setCategory] = useState('Lighting');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadImage(file, {
        type: 'reference',
        instruction,
        project_id: projectId,
        priority,
        category,
      });

      // 重置表單
      setInstruction('');
      setPriority('main');
      setCategory('Lighting');
      if (fileInputRef.current) fileInputRef.current.value = '';

      onUploadSuccess?.();
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  return (
    <div className="upload-container">
      <h3>上傳參考資料</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>優先級</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
        >
          <option value="main">主要</option>
          <option value="secondary">次要</option>
          <option value="supplementary">補充</option>
        </select>
      </div>

      <div className="form-group">
        <label>類別</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
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

      <div className="form-group">
        <label>備註</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="附加說明..."
        />
      </div>

      <div className="form-group">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          disabled={loading}
        />
      </div>

      <button disabled={loading}>
        {loading ? '上傳中...' : '上傳'}
      </button>
    </div>
  );
}