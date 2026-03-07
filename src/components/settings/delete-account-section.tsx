"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useState, useTransition } from "react"

import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"

const getDeleteAccountErrorMessage = (
  status: number,
  t: ReturnType<typeof useI18n>["t"]
) => {
  if (status === 401 || status === 404) {
    return t("settings.deleteAccountSessionExpired")
  }

  if (status === 409) {
    return t("settings.deleteAccountDisabled")
  }

  return t("settings.deleteAccountFailed")
}

export function DeleteAccountSection() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleDeleteAccount = () => {
    if (isPending) {
      return
    }

    setError("")
    startTransition(async () => {
      try {
        const response = await fetch("/api/account", {
          method: "DELETE",
        })

        if (!response.ok) {
          setError(getDeleteAccountErrorMessage(response.status, t))
          return
        }

        const payload = await response.json().catch(() => ({ redirectTo: "/login" }))
        const redirectTo = typeof payload?.redirectTo === "string" ? payload.redirectTo : "/login"
        setOpen(false)
        window.location.assign(redirectTo)
      } catch (fetchError) {
        console.error("Failed to delete account:", fetchError)
        setError(t("settings.deleteAccountFailed"))
      }
    })
  }

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50/80 p-6 shadow-(--color-shadow-card) dark:border-red-900/60 dark:bg-red-950/20">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-main">{t("settings.deleteAccountTitle")}</h2>
        <p className="mt-2 text-sm text-main-muted">{t("settings.deleteAccountDescription")}</p>
        <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">
          {t("settings.deleteAccountWarning")}
        </p>

        <div className="mt-5">
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                className="dark:bg-red-500 dark:hover:bg-red-400"
                style={{ color: "#fff" }}
              >
                {isPending ? t("settings.deleteAccountDeleting") : t("settings.deleteAccountAction")}
              </Button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-100 bg-black/45" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-101 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-(--color-border-soft) bg-(--color-surface) p-6 shadow-2xl focus:outline-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-main">
                      {t("settings.deleteAccountConfirmTitle")}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-main-muted">
                      {t("settings.deleteAccountConfirmDescription")}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label={t("settings.close")}
                      className="rounded-full border border-(--color-border-soft) bg-(--color-surface) p-2 text-main transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p> : null}

                <div className="mt-6 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline" disabled={isPending}>
                      {t("settings.deleteAccountCancel")}
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isPending}
                    className="dark:bg-red-500 dark:hover:bg-red-400"
                    style={{ color: "#fff" }}
                  >
                    {isPending
                      ? t("settings.deleteAccountDeleting")
                      : t("settings.deleteAccountConfirmAction")}
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {error && !open ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      </div>
    </section>
  )
}
