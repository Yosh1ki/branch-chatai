"use client"

import { useEffect, useRef, useState } from "react"
import { LogOut, Menu } from "lucide-react"

type AccountMenuProps = {
  user: {
    name?: string | null
    email?: string | null
  }
  onLogout: () => void | Promise<void>
}

export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = user.name || user.email || "Guest"
  const initials = displayName.slice(0, 1).toUpperCase()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeydown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeydown)
    }
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-[#f1d0c7] bg-white text-main shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b5a2]"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-[#f1d0c7] bg-white shadow-lg">
          <div className="flex items-center gap-3 border-b border-[#f1d0c7] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6ece7] text-base font-semibold text-main">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-main">{displayName}</p>
              {user.email && <p className="truncate text-xs text-main-muted">{user.email}</p>}
            </div>
          </div>

          <form action={onLogout} className="p-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b5a2]"
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
