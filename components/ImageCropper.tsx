import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => {
      imgRef.current = img;
      drawImage();
    };
  }, [image]);

  useEffect(() => {
    drawImage();
  }, [zoom, position]);

  const drawImage = () => {
    if (!canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    const canvasSize = 400;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Calculate scaled dimensions
    const scale = Math.max(canvasSize / img.width, canvasSize / img.height) * zoom;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Calculate position to center the image
    const x = (canvasSize - scaledWidth) / 2 + position.x;
    const y = (canvasSize - scaledHeight) / 2 + position.y;

    // Draw image
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw circular crop overlay
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCrop = () => {
    if (!canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const outputCanvas = document.createElement('canvas');
    const size = 400;
    outputCanvas.width = size;
    outputCanvas.height = size;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    const scale = Math.max(size / img.width, size / img.height) * zoom;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (size - scaledWidth) / 2 + position.x;
    const y = (size - scaledHeight) / 2 + position.y;

    // Draw on output canvas
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Crop to circle
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    outputCanvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-glass rounded-2xl border border-border-color p-8 max-w-lg w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Crop Avatar</h2>

        <div className="space-y-6">
          {/* Canvas container */}
          <div
            ref={containerRef}
            className="relative mx-auto"
            style={{ width: '400px', height: '400px' }}
          >
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              onMouseDown={handleMouseDown}
              className="cursor-move rounded-full border-4 border-primary shadow-lg"
              style={{ display: 'block' }}
            />
            <div className="absolute inset-0 pointer-events-none rounded-full border-4 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]" />
          </div>

          {/* Instructions */}
          <p className="text-text-secondary text-center text-sm">
            Drag to reposition • Use slider to zoom
          </p>

          {/* Zoom slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary flex items-center justify-between">
              <span>Zoom</span>
              <span className="text-text-primary">{Math.round(zoom * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-glass hover:border-border-color focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPosition({ x: 0, y: 0 });
              }}
              className="flex-1 px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-glass hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Reset
            </button>
            <button
              onClick={handleCrop}
              className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary shadow-lg"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
