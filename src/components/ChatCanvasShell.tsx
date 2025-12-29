"use client";

import { useState } from "react";
import { AssistantCard } from "@/components/AssistantCard";
import { CanvasControls } from "@/components/CanvasControls";
import { CanvasViewport } from "@/components/CanvasViewport";
import { ChatHeader } from "@/components/ChatHeader";
import { UserBubble } from "@/components/UserBubble";
import { createCanvasState, resetCanvasState } from "@/lib/canvas-state";

type ChatCanvasShellProps = {
  chatId: string;
};

export function ChatCanvasShell({ chatId }: ChatCanvasShellProps) {
  const [state, setState] = useState(createCanvasState());

  const handleReset = () => {
    setState(resetCanvasState());
  };

  return (
    <div className="min-h-screen bg-[#f7f3ef] text-main">
      <CanvasControls scale={state.scale} onReset={handleReset} />
      <CanvasViewport
        state={state}
        onStateChange={setState}
        minScale={0.6}
        maxScale={1.6}
        basePanRatio={0.3}
      >
        <div className="min-h-screen">
          <ChatHeader />
          <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-10">
            <UserBubble chatId={chatId} />
            <div className="h-10 w-px bg-[#e2d8cf]" />
            <AssistantCard chatId={chatId} />
          </main>
        </div>
      </CanvasViewport>
    </div>
  );
}
