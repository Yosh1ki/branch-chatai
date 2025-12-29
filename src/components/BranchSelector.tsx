"use client";

import { useState } from "react";
import { selectBranch } from "@/lib/chat-screen-state";

type BranchSelection = "left" | "main" | "right";

interface BranchOptionProps {
  label: string;
  value: BranchSelection;
  selected: boolean;
  onSelect: (value: BranchSelection) => void;
}

function BranchOption({ label, value, selected, onSelect }: BranchOptionProps) {
  const showDot = value !== "main";

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      className="relative z-10 flex items-center gap-2 rounded-full px-2 py-1 text-xs transition hover:text-main"
    >
      {showDot ? (
        <span
          className={`h-3 w-3 rounded-full border ${
            selected ? "border-[#5a3326] bg-[#5a3326]" : "border-[#e6ddd3] bg-[#ede3da]"
          }`}
        />
      ) : null}
      <span
        className={`rounded-full px-3 py-1 text-xs ${
          selected ? "bg-[#f1e8e0] text-main" : "bg-[#f6f0ea] text-main-muted"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export function BranchSelector() {
  const [selectedBranch, setSelectedBranch] = useState<BranchSelection>("main");

  const handleSelect = (value: BranchSelection) => {
    setSelectedBranch((current) => selectBranch(current, value));
  };

  return (
    <div className="mt-12 flex flex-col items-center">
      <span className="h-3 w-3 rounded-full bg-[#5a3326]" />
      <div className="relative mt-1 flex w-full max-w-3xl flex-col items-center">
        <svg
          className="absolute left-0 top-0 h-10 w-full"
          viewBox="0 0 600 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1="300"
            y1="0"
            x2="300"
            y2="18"
            stroke="#d9cfc5"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <line
            x1="110"
            y1="18"
            x2="490"
            y2="18"
            stroke="#e2d8cf"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        </svg>
        <div className="mt-6 flex w-full items-center justify-center gap-8">
          <BranchOption
            label="新しいブランチ"
            value="left"
            selected={selectedBranch === "left"}
            onSelect={handleSelect}
          />
          <BranchOption
            label="メインブランチ"
            value="main"
            selected={selectedBranch === "main"}
            onSelect={handleSelect}
          />
          <BranchOption
            label="新しいブランチ"
            value="right"
            selected={selectedBranch === "right"}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </div>
  );
}
