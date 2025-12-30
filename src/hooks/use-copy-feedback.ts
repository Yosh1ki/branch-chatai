import { useCallback, useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/chat-screen-state";

export function useCopyFeedback(text: string, resetDelay = 1400) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutIdRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    await copyToClipboard(text);
    setIsCopied(true);
    clearTimer();
    timeoutIdRef.current = window.setTimeout(() => {
      setIsCopied(false);
      timeoutIdRef.current = null;
    }, resetDelay);
  }, [clearTimer, resetDelay, text]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { isCopied, handleCopy };
}
