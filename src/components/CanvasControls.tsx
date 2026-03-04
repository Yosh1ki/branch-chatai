"use client";

import { ArrowUpDown } from "lucide-react";

type CanvasControlsProps = {
  scale: number;
  isVerticalMode: boolean;
  onToggleVerticalMode: () => void;
};

function FreeNavigationIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8H13.5" />
      <path d="M4.75 6.25L2.5 8L4.75 9.75" />
      <path d="M11.25 6.25L13.5 8L11.25 9.75" />
      <path d="M8 2.5V13.5" />
      <path d="M6 4.25L8 2.5L10 4.25" />
      <path d="M6 11.75L8 13.5L10 11.75" />
    </svg>
  );
}

export function CanvasControls({
  scale,
  isVerticalMode,
  onToggleVerticalMode,
}: CanvasControlsProps) {
  const percentage = Math.round(scale * 100);

  return (
    <button
      type="button"
      onClick={onToggleVerticalMode}
      aria-label={isVerticalMode ? "Switch to free navigation mode" : "Switch to vertical mode"}
      aria-pressed={isVerticalMode}
      className="fixed left-6 top-24 z-50 inline-flex items-center gap-3 rounded-full border border-[#e6ddd3] bg-white/90 px-4 py-2 text-xs text-main shadow-sm backdrop-blur transition hover:bg-white"
    >
      <span className={`${isVerticalMode ? "text-main-muted" : "text-main"} hidden sm:inline`}>
        {percentage}%
      </span>
      {isVerticalMode ? (
        <ArrowUpDown className="h-3.5 w-3.5 text-main" />
      ) : (
        <FreeNavigationIcon className="h-3.5 w-3.5 text-main" />
      )}
    </button>
  );
}
