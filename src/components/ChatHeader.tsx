"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { textStyle } from "@/styles/typography";
import { AccountMenu } from "@/components/chats/account-menu";

type ChatHeaderProps = {
  settingsContent: ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
  };
  onLogout: () => void | Promise<void>;
};

export function ChatHeader({ settingsContent, user, onLogout }: ChatHeaderProps) {
  return (
    <header className="w-full bg-transparent">
      <div className="flex w-full items-center justify-between px-2 py-6">
        <Link
          href="/chats"
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </Link>
        <AccountMenu user={user} onLogout={onLogout} settingsContent={settingsContent} />
      </div>
    </header>
  );
}
