"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { textStyle } from "@/styles/typography";
import { AccountMenu } from "@/components/chats/account-menu";

type ChatHeaderProps = {
  settingsContent: ReactNode;
  indicatorContent?: ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
  };
  onLogout: () => void | Promise<void>;
};

export function ChatHeader({ settingsContent, indicatorContent, user, onLogout }: ChatHeaderProps) {
  return (
    <header className="w-full bg-transparent">
      <div className="relative flex w-full items-center justify-between px-2 py-6">
        <Link
          href="/chats"
          className="relative z-10 text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </Link>
        {indicatorContent ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto w-full max-w-[560px] px-24 sm:px-20">
              {indicatorContent}
            </div>
          </div>
        ) : null}
        <div className="relative z-10">
          <AccountMenu user={user} onLogout={onLogout} settingsContent={settingsContent} />
        </div>
      </div>
    </header>
  );
}
