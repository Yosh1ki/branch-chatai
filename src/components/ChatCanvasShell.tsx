"use client";

import { useState } from "react";
import { AssistantCard } from "@/components/AssistantCard";
import { CanvasControls } from "@/components/CanvasControls";
import { CanvasViewport } from "@/components/CanvasViewport";
import { ChatHeader } from "@/components/ChatHeader";
import { DisableCanvasNavigation } from "@/components/DisableCanvasNavigation";
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
      <DisableCanvasNavigation />
      <CanvasControls scale={state.scale} onReset={handleReset} />
      <div className="fixed left-0 right-0 top-0 z-40 bg-[#f7f3ef]/80 backdrop-blur">
        <div className="mx-auto w-full px-0">
          <ChatHeader />
        </div>
      </div>
      <CanvasViewport
        state={state}
        onStateChange={setState}
        minScale={0.3}
        maxScale={2}
        basePanRatio={0.6}
      >
        <div className="min-h-screen">
          <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-28">
            <UserBubble chatId={chatId} />
            <div className="h-10 w-px bg-[#e2d8cf]" />
            <AssistantCard chatId={chatId} />
          </main>
        </div>
      </CanvasViewport>
    </div>
  );
}
