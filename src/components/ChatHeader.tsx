import { ChevronDown } from "lucide-react";
import { textStyle } from "@/styles/typography";

export function ChatHeader() {
  return (
    <header className="w-full bg-transparent">
      <div className="flex w-full items-center justify-between px-2 py-6">
        <p
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </p>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-[#e6ddd3] bg-white/80 px-4 py-2 text-sm text-main-muted transition hover:text-main"
        >
          ブランチ一覧
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
