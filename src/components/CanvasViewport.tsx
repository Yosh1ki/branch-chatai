"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, Ref } from "react";
import { clampScale, normalizeScaleRange } from "@/lib/canvas-state";
import { getPointerDragBehavior, getWheelBehavior } from "@/lib/canvas-input";

type CanvasState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type NavigationMode = "free" | "vertical";

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
  navigationMode?: NavigationMode;
  children: React.ReactNode;
};

type PointerPosition = {
  x: number;
  y: number;
};

type PinchState = {
  distance: number;
  centerX: number;
  centerY: number;
};

const WHEEL_ZOOM_SENSITIVITY = 0.01;
const WHEEL_LINE_HEIGHT_PX = 16;
const DRAG_PAN_SENSITIVITY = 1.4;
const FREE_WHEEL_PAN_SENSITIVITY = 1.4;
const VERTICAL_WHEEL_PAN_SENSITIVITY = 1.4;

const getPinchMetrics = (points: PointerPosition[]) => {
  const dx = points[0].x - points[1].x;
  const dy = points[0].y - points[1].y;
  return {
    distance: Math.hypot(dx, dy),
    centerX: (points[0].x + points[1].x) / 2,
    centerY: (points[0].y + points[1].y) / 2,
  };
};

const getZoomOrigin = (
  rect: DOMRect,
  clientX: number,
  clientY: number
) => ({
  originX: clientX - rect.left - rect.width / 2,
  originY: clientY - rect.top - rect.height / 2,
});

const getScaledOffsets = (
  offsetX: number,
  offsetY: number,
  originX: number,
  originY: number,
  ratio: number
) => ({
  offsetX: (offsetX - originX) * ratio + originX,
  offsetY: (offsetY - originY) * ratio + originY,
});

const normalizeWheelDelta = (
  deltaY: number,
  deltaMode: number,
  viewportHeight: number
) => {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return deltaY * WHEEL_LINE_HEIGHT_PX;
  }
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return deltaY * viewportHeight;
  }
  return deltaY;
};

const getScrollableAncestor = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  return target.closest("[data-scrollable-region='true']") as HTMLElement | null;
};

const canScrollElement = (element: HTMLElement, deltaY: number) => {
  if (element.scrollHeight <= element.clientHeight) {
    return false;
  }

  if (deltaY < 0) {
    return element.scrollTop > 0;
  }

  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight;
  }

  return false;
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
  navigationMode = "free",
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

  const applyState = useCallback(
    (next: CanvasState) => {
      onStateChange(next);
    },
    [onStateChange]
  );

  const updateOffsets = useCallback(
    (offsetX: number, offsetY: number, scale: number) => {
      applyState({ scale, offsetX, offsetY });
    },
    [applyState]
  );

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.closest("[data-allow-selection='true']")) return true;
    if (target.isContentEditable) return true;
    return Boolean(
      target.closest(
        "button,input,textarea,select,a,label,summary,[role='button'],[data-prevent-canvas-drag='true']"
      )
    );
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const behavior = getPointerDragBehavior({
      isMetaPressed: event.metaKey,
      isInteractiveTarget: isInteractiveTarget(event.target),
      pointerType: event.pointerType,
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
      pinchState.current = navigationMode === "free" ? getPinchMetrics(points) : null;
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerMap.current.has(event.pointerId)) return;

    const prev = pointerMap.current.get(event.pointerId);
    const nextPoint = { x: event.clientX, y: event.clientY };
    pointerMap.current.set(event.pointerId, nextPoint);

    if (pointerMap.current.size === 1 && prev) {
      const dx = (nextPoint.x - prev.x) * DRAG_PAN_SENSITIVITY;
      const dy = (nextPoint.y - prev.y) * DRAG_PAN_SENSITIVITY;
      const current = stateRef.current;
      const nextOffsetX =
        navigationMode === "vertical" ? current.offsetX : current.offsetX + dx;
      updateOffsets(nextOffsetX, current.offsetY + dy, current.scale);
      return;
    }

    if (navigationMode === "free" && pointerMap.current.size === 2 && pinchState.current) {
      const node = containerRef.current;
      if (!node) {
        return;
      }

      const points = Array.from(pointerMap.current.values());
      const metrics = getPinchMetrics(points);
      const { minScale: minValue, maxScale: maxValue } = normalizeScaleRange(minScale, maxScale);
      const distanceRatio = metrics.distance / pinchState.current.distance || 1;
      const current = stateRef.current;
      const nextScale = clampScale(
        current.scale * distanceRatio,
        minValue,
        maxValue
      );
      const rect = node.getBoundingClientRect();
      const { originX, originY } = getZoomOrigin(rect, metrics.centerX, metrics.centerY);
      const translatedOffsetX = current.offsetX + (metrics.centerX - pinchState.current.centerX);
      const translatedOffsetY = current.offsetY + (metrics.centerY - pinchState.current.centerY);
      const ratio = nextScale / current.scale;
      const { offsetX: nextOffsetX, offsetY: nextOffsetY } = getScaledOffsets(
        translatedOffsetX,
        translatedOffsetY,
        originX,
        originY,
        ratio
      );

      pinchState.current = metrics;
      updateOffsets(nextOffsetX, nextOffsetY, nextScale);
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

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      const scrollableAncestor = getScrollableAncestor(event.target);
      if (
        !event.ctrlKey &&
        scrollableAncestor &&
        canScrollElement(scrollableAncestor, event.deltaY)
      ) {
        return;
      }

      event.preventDefault();
      const current = stateRef.current;
      if (navigationMode === "vertical") {
        updateOffsets(
          current.offsetX,
          current.offsetY - event.deltaY * VERTICAL_WHEEL_PAN_SENSITIVITY,
          current.scale
        );
        return;
      }

      const behavior = getWheelBehavior({ isCtrlPressed: event.ctrlKey });

      if (behavior.mode === "zoom") {
        const { minScale: minValue, maxScale: maxValue } = normalizeScaleRange(minScale, maxScale);
        const normalizedDeltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, node.clientHeight);
        const zoomFactor = Math.exp(-normalizedDeltaY * WHEEL_ZOOM_SENSITIVITY);
        const nextScale = clampScale(current.scale * zoomFactor, minValue, maxValue);
        if (nextScale === current.scale) {
          return;
        }

        const rect = node.getBoundingClientRect();
        const { originX, originY } = getZoomOrigin(rect, event.clientX, event.clientY);
        const ratio = nextScale / current.scale;
        const { offsetX: nextOffsetX, offsetY: nextOffsetY } = getScaledOffsets(
          current.offsetX,
          current.offsetY,
          originX,
          originY,
          ratio
        );

        updateOffsets(nextOffsetX, nextOffsetY, nextScale);
        return;
      }

      updateOffsets(
        current.offsetX - event.deltaX * FREE_WHEEL_PAN_SENSITIVITY,
        current.offsetY - event.deltaY * FREE_WHEEL_PAN_SENSITIVITY,
        current.scale
      );
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", handleWheel);
    };
  }, [maxScale, minScale, navigationMode, updateOffsets]);

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
