"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { LogOut, Menu, Settings, X } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"

type AccountMenuProps = {
  settingsContent: ReactNode
  user: {
    name?: string | null
    email?: string | null
  }
  onLogout: () => void | Promise<void>
}

export function AccountMenu({ settingsContent, user, onLogout }: AccountMenuProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = user.name || user.email || t("account.guest")
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
        setIsSettingsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeydown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeydown)
    }
  }, [])

  useEffect(() => {
    if (!isSettingsOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSettingsOpen])

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-label="Open account menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface)] text-main shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          <Menu className="h-5 w-5" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-lg">
            <div className="flex items-center gap-3 border-b border-[var(--color-border-soft)] px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-base font-semibold text-main">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-main">{displayName}</p>
                {user.email && <p className="truncate text-xs text-main-muted">{user.email}</p>}
              </div>
            </div>

            <div className="space-y-1 p-2">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(true)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                <Settings className="h-4 w-4" />
                {t("account.settings")}
              </button>

              <form action={onLogout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                >
                  <LogOut className="h-4 w-4" />
                  {t("account.logout")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {isSettingsOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-modal-title"
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
              <button
                type="button"
                aria-label={t("settings.close")}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-black/35"
              />
              <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-app-bg)] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-surface)] px-6 py-4">
                  <h2 id="settings-modal-title" className="text-2xl font-semibold tracking-tight text-main">
                    {t("settings.title")}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    aria-label={t("settings.close")}
                    className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-2 text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[calc(90vh-84px)] overflow-y-auto px-6 py-6">{settingsContent}</div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
