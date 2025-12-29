"use client";

import { useEffect } from "react";

const isZoomKey = (event: KeyboardEvent) => {
  if (!event.ctrlKey && !event.metaKey) return false;
  if (event.altKey) return false;
  const key = event.key;
  return key === "+" || key === "-" || key === "0" || key === "=";
};

export function DisableCanvasNavigation() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverscrollX = html.style.overscrollBehaviorX;
    const previousBodyOverscrollX = body.style.overscrollBehaviorX;
    html.style.overscrollBehaviorX = "none";
    body.style.overscrollBehaviorX = "none";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isZoomKey(event)) return;
      event.preventDefault();
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
        return;
      }
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault();
      }
    };

    const handleGesture = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("gesturestart", handleGesture);
    window.addEventListener("gesturechange", handleGesture);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("gesturestart", handleGesture);
      window.removeEventListener("gesturechange", handleGesture);
      html.style.overscrollBehaviorX = previousHtmlOverscrollX;
      body.style.overscrollBehaviorX = previousBodyOverscrollX;
    };
  }, []);

  return null;
}
