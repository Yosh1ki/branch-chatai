"use client"

import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { LogOut, Menu, Settings, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useI18n } from "@/components/i18n/i18n-provider"

const subscribeToHydration = () => () => {}
const getClientHydrationSnapshot = () => true
const getServerHydrationSnapshot = () => false

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  )
  const [open, setOpen] = useState(false)
  const [isSettingsManuallyOpen, setIsSettingsManuallyOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isSettingsRequestedFromQuery = searchParams.get("settings") === "open"
  const isSettingsOpen = isSettingsManuallyOpen || isSettingsRequestedFromQuery

  const displayName = user.name || user.email || t("account.guest")
  const initials = displayName.slice(0, 1).toUpperCase()

  const clearSettingsQuery = useCallback(() => {
    if (!isSettingsRequestedFromQuery) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete("settings")
    const nextSearch = nextSearchParams.toString()
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false })
  }, [isSettingsRequestedFromQuery, pathname, router, searchParams])

  const openSettingsModal = useCallback(() => {
    setIsSettingsManuallyOpen(true)
    setOpen(false)
  }, [])

  const closeSettingsModal = useCallback(() => {
    setIsSettingsManuallyOpen(false)
    clearSettingsQuery()
  }, [clearSettingsQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        closeSettingsModal()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeydown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeydown)
    }
  }, [closeSettingsModal])

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
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-(--color-border-soft) bg-(--color-surface) text-main shadow-sm transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
        >
          <Menu className="h-5 w-5" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-(--color-border-soft) bg-(--color-surface) shadow-lg">
            <div className="flex items-center gap-3 border-b border-(--color-border-soft) px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-surface-soft) text-base font-semibold text-main">
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
                onClick={openSettingsModal}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-main transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
              >
                <Settings className="h-4 w-4" />
                {t("account.settings")}
              </button>

              <form action={onLogout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-main transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                >
                  <LogOut className="h-4 w-4" />
                  {t("account.logout")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {isMounted && isSettingsOpen
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-modal-title"
              className="fixed inset-0 z-100 flex items-center justify-center p-4"
            >
              <button
                type="button"
                aria-label={t("settings.close")}
                onClick={closeSettingsModal}
                className="absolute inset-0 bg-black/35"
              />
              <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-(--color-border-soft) bg-(--color-app-bg) shadow-2xl">
                <div className="flex items-center justify-between border-b border-(--color-border-soft) bg-(--color-surface) px-6 py-4">
                  <h2 id="settings-modal-title" className="text-2xl font-semibold tracking-tight text-main">
                    {t("settings.title")}
                  </h2>
                  <button
                    type="button"
                    onClick={closeSettingsModal}
                    aria-label={t("settings.close")}
                    className="rounded-full border border-(--color-border-soft) bg-(--color-surface) p-2 text-main transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[calc(90vh-84px)] overflow-y-auto px-4 py-6">{settingsContent}</div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
