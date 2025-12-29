"use client";

import { RotateCcw } from "lucide-react";

type CanvasControlsProps = {
  scale: number;
  onReset: () => void;
};

export function CanvasControls({ scale, onReset }: CanvasControlsProps) {
  const percentage = Math.round(scale * 100);

  return (
    <div className="pointer-events-none fixed left-6 top-24 z-50 flex items-center gap-3 rounded-full border border-[#e6ddd3] bg-white/90 px-4 py-2 text-xs text-main shadow-sm backdrop-blur">
      <span className="pointer-events-none">{percentage}%</span>
      <button
        type="button"
        onClick={onReset}
        className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[#e6ddd3] bg-white px-3 py-1 text-xs text-main-muted transition hover:text-main"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>
    </div>
  );
}
