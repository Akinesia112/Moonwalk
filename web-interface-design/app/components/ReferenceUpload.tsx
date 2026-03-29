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

      // Reset form
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
      <h3>Upload References</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
        >
          <option value="main">Main</option>
          <option value="secondary">Secondary</option>
          <option value="supplementary">Supplementary</option>
        </select>
      </div>

      <div className="form-group">
        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="Lighting">Lighting</option>
          <option value="Color">Color</option>
          <option value="Composition">Composition</option>
          <option value="Style">Style</option>
          <option value="Texture">Texture</option>
          <option value="Motion">Motion</option>
          <option value="Mood">Mood</option>
          <option value="VFX">VFX</option>
        </select>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Additional notes..."
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
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}