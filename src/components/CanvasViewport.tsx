"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, Ref } from "react";
import { clampScale, normalizeScaleRange } from "@/lib/canvas-state";
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
  containerRef?: Ref<HTMLDivElement>;
  contentRef?: Ref<HTMLDivElement>;
  overlay?: React.ReactNode;
  onPanStateChange?: (isPanning: boolean) => void;
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

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  (ref as MutableRefObject<T | null>).current = value;
};

export function CanvasViewport({
  state,
  onStateChange,
  minScale = 0.6,
  maxScale = 1.6,
  containerRef: externalRef,
  contentRef: externalContentRef,
  overlay,
  onPanStateChange,
  className,
  children,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const pointerMap = useRef(new Map<number, PointerPosition>());
  const pinchState = useRef<PinchState | null>(null);
  const stateRef = useRef(state);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyState = (next: CanvasState) => {
    onStateChange(next);
  };

  const updateOffsets = (offsetX: number, offsetY: number, scale: number) => {
    applyState({ scale, offsetX, offsetY });
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

    if (!behavior.allowDrag) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerMap.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setIsDragging(true);
    onPanStateChange?.(true);

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
      onPanStateChange?.(false);
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

  const setContainerRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    assignRef(externalRef, node);
  };

  const setContentRef = (node: HTMLDivElement | null) => {
    contentRef.current = node;
    assignRef(externalContentRef, node);
  };

  return (
    <div
      ref={setContainerRef}
      data-tree-viewport="true"
      className={`TreeViewport relative min-h-screen w-full overflow-hidden ${className ?? ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: isDragging ? "none" : "text",
      }}
    >
      <div
        ref={setContentRef}
        data-tree-content="true"
        className="TreeContent relative min-h-screen w-full"
        style={{
          transform: `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`,
          transformOrigin: "center",
        }}
      >
        {overlay}
        {children}
      </div>
    </div>
  );
}
