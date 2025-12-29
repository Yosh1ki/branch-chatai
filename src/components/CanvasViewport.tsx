"use client";

import { useEffect, useRef, useState } from "react";
import { clampOffsets, clampScale, getPanLimits, normalizeScaleRange } from "@/lib/canvas-state";
import { getPointerDragBehavior, getWheelBehavior } from "@/lib/canvas-input";

type CanvasState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type CanvasViewportProps = {
  state: CanvasState;
  onStateChange: (next: CanvasState) => void;
  minScale?: number;
  maxScale?: number;
  basePanRatio?: number;
  className?: string;
  children: React.ReactNode;
};

type PointerPosition = {
  x: number;
  y: number;
};

type PinchState = {
  distance: number;
  scale: number;
};

export function CanvasViewport({
  state,
  onStateChange,
  minScale = 0.6,
  maxScale = 1.6,
  basePanRatio = 0.25,
  className,
  children,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerMap = useRef(new Map<number, PointerPosition>());
  const pinchState = useRef<PinchState | null>(null);
  const stateRef = useRef(state);
  const [isDragging, setIsDragging] = useState(false);
  const [allowSelection, setAllowSelection] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyState = (next: CanvasState) => {
    onStateChange(next);
  };

  const getLimits = (scale: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;
    return getPanLimits({ width, height }, scale, basePanRatio);
  };

  const updateOffsets = (offsetX: number, offsetY: number, scale: number) => {
    const limits = getLimits(scale);
    const clamped = clampOffsets({ offsetX, offsetY }, limits);
    applyState({ scale, offsetX: clamped.offsetX, offsetY: clamped.offsetY });
  };

  const isSelectableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.closest("[data-allow-selection='true']")) return true;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA";
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const behavior = getPointerDragBehavior({
      isMetaPressed: event.metaKey,
      isSelectableTarget: isSelectableTarget(event.target),
    });

    setAllowSelection(behavior.allowSelection);
    if (!behavior.allowDrag) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerMap.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setIsDragging(true);

    if (pointerMap.current.size === 2) {
      const points = Array.from(pointerMap.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      pinchState.current = { distance, scale: stateRef.current.scale };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerMap.current.has(event.pointerId)) return;

    const prev = pointerMap.current.get(event.pointerId);
    const nextPoint = { x: event.clientX, y: event.clientY };
    pointerMap.current.set(event.pointerId, nextPoint);

    if (pointerMap.current.size === 1 && prev) {
      const dx = nextPoint.x - prev.x;
      const dy = nextPoint.y - prev.y;
      const current = stateRef.current;
      updateOffsets(current.offsetX + dx, current.offsetY + dy, current.scale);
      return;
    }

    if (pointerMap.current.size === 2 && pinchState.current) {
      const points = Array.from(pointerMap.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      const { minScale: minValue, maxScale: maxValue } = normalizeScaleRange(minScale, maxScale);
      const nextScale = clampScale(
        pinchState.current.scale * (distance / pinchState.current.distance || 1),
        minValue,
        maxValue
      );
      updateOffsets(stateRef.current.offsetX, stateRef.current.offsetY, nextScale);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerMap.current.delete(event.pointerId);
    if (pointerMap.current.size < 2) {
      pinchState.current = null;
    }
    if (pointerMap.current.size === 0) {
      setIsDragging(false);
      setAllowSelection(false);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const behavior = getWheelBehavior({ isCtrlPressed: event.ctrlKey });
    const current = stateRef.current;

    if (behavior.mode === "zoom") {
      const { minScale: minValue, maxScale: maxValue } = normalizeScaleRange(minScale, maxScale);
      const zoomFactor = event.deltaY < 0 ? 1.06 : 0.94;
      const nextScale = clampScale(current.scale * zoomFactor, minValue, maxValue);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const originX = event.clientX - rect.left - rect.width / 2;
      const originY = event.clientY - rect.top - rect.height / 2;
      const ratio = nextScale / current.scale;
      const nextOffsetX = (current.offsetX - originX) * ratio + originX;
      const nextOffsetY = (current.offsetY - originY) * ratio + originY;

      updateOffsets(nextOffsetX, nextOffsetY, nextScale);
      return;
    }

    updateOffsets(
      current.offsetX - event.deltaX,
      current.offsetY - event.deltaY,
      current.scale
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative min-h-screen w-full overflow-hidden ${className ?? ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: allowSelection ? "text" : "none",
      }}
    >
      <div
        className="min-h-screen w-full"
        style={{
          transform: `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`,
          transformOrigin: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
