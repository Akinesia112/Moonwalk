// web-interface-design/app/components/CanvasAnnotator.tsx
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CanvasAnnotation, AnnotationType } from '@/app/lib/api/modificationApi';
import { useModification } from '@/app/lib/hooks/useModification';

interface CanvasAnnotatorProps {
  artworkUrl: string;
  artworkId: string;
  onAnnotationsChange?: (annotations: CanvasAnnotation[]) => void;
}

export function CanvasAnnotator({
  artworkUrl,
  artworkId,
  onAnnotationsChange,
}: CanvasAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { canvasAnnotations, loadCanvasAnnotations, saveCanvasAnnotations } = useModification();

  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTool, setSelectedTool] = useState<AnnotationType>('circle');
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [selectedOpacity, setSelectedOpacity] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  // 載入已存在的註釋
  useEffect(() => {
    loadCanvasAnnotations(artworkId);
  }, [artworkId, loadCanvasAnnotations]);

  // 初始化 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const img = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      redrawCanvas();
      setIsLoaded(true);
    };

    img.src = artworkUrl;
  }, [artworkUrl]);

  // 重新繪製 Canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageRef.current) return;

    // 清除並重新繪製背景
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0);

    // 繪製所有註釋
    canvasAnnotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation);
    });
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: CanvasAnnotation) => {
    ctx.fillStyle = annotation.color;
    ctx.strokeStyle = annotation.color;
    ctx.globalAlpha = annotation.opacity;
    ctx.lineWidth = 3;

    const { x, y, width = 0, height = 0, points = [] } = annotation.coordinates;

    switch (annotation.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, Math.max(width, height) / 2, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'rectangle':
        ctx.strokeRect(x, y, width, height);
        break;

      case 'arrow':
        drawArrow(ctx, x, y, width, height);
        break;

      case 'freehand':
        ctx.beginPath();
        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
        break;

      case 'text':
        ctx.font = 'bold 16px Arial';
        ctx.fillText(annotation.label || '', x, y);
        break;
    }

    ctx.globalAlpha = 1;
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    endX: number,
    endY: number
  ) => {
    const headlen = 15;
    const angle = Math.atan2(endY, endX);

    // 主線
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + endX, y + endY);
    ctx.stroke();

    // 箭頭頭部
    ctx.beginPath();
    ctx.moveTo(x + endX, y + endY);
    ctx.lineTo(
      x + endX - headlen * Math.cos(angle - Math.PI / 6),
      y + endY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x + endX, y + endY);
    ctx.lineTo(
      x + endX - headlen * Math.cos(angle + Math.PI / 6),
      y + endY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isLoaded) return;
    setIsDrawing(true);
  };

  const handleMouseUp = async () => {
    setIsDrawing(false);
    await saveCanvasAnnotations(artworkId, canvasAnnotations);
    onAnnotationsChange?.(canvasAnnotations);
  };

  const handleClearAll = async () => {
    if (confirm('確認清除所有註釋?')) {
      await saveCanvasAnnotations(artworkId, []);
      redrawCanvas();
      onAnnotationsChange?.([]);
    }
  };

  return (
    <div className="canvas-annotator">
      <div className="annotator-toolbar">
        <div className="tool-group">
          <label>工具</label>
          <div className="tools">
            {(['circle', 'rectangle', 'arrow', 'freehand', 'text'] as AnnotationType[]).map(
              (tool) => (
                <button
                  key={tool}
                  className={`tool-btn ${selectedTool === tool ? 'active' : ''}`}
                  onClick={() => setSelectedTool(tool)}
                  title={tool}
                >
                  {getToolIcon(tool)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="tool-group">
          <label htmlFor="color-picker">顏色</label>
          <input
            id="color-picker"
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="color-picker"
          />
        </div>

        <div className="tool-group">
          <label htmlFor="opacity-slider">不透明度</label>
          <input
            id="opacity-slider"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={selectedOpacity}
            onChange={(e) => setSelectedOpacity(parseFloat(e.target.value))}
            className="slider"
          />
          <span className="value">{Math.round(selectedOpacity * 100)}%</span>
        </div>

        <button className="clear-btn" onClick={handleClearAll}>
          清除全部
        </button>
      </div>

      <div className="canvas-wrapper">
        <img ref={imageRef} style={{ display: 'none' }} alt="artwork" />
        <canvas
          ref={canvasRef}
          className="annotation-canvas"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="annotator-info">
        <p>已添加 {canvasAnnotations.length} 個註釋</p>
      </div>
    </div>
  );
}

function getToolIcon(tool: AnnotationType): string {
  const icons: Record<AnnotationType, string> = {
    circle: '◯',
    rectangle: '▢',
    arrow: '→',
    freehand: '✏',
    text: 'A',
  };
  return icons[tool];
}