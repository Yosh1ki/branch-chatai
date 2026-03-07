import { ChatCanvasShell } from "@/components/ChatCanvasShell";
import { SettingsSections } from "@/components/settings/settings-sections";
import { auth, signOut } from "@/auth";
import { resolveRequestLocale } from "@/lib/i18n/locale";
import { getSettingsViewData } from "@/lib/settings-view";
import { redirect } from "next/navigation";

type ChatPageProps = {
  params: Promise<{ chatId: string }>;
  searchParams?: Promise<{
    prompt?: string;
    requestId?: string;
    modelProvider?: string;
    modelName?: string;
    modelReasoningEffort?: string;
  }>;
};

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const session = await auth();
  const locale = await resolveRequestLocale();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const settings = await getSettingsViewData(session.user.id);
  const { chatId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <ChatCanvasShell
      chatId={chatId}
      initialPrompt={resolvedSearchParams?.prompt}
      initialRequestId={resolvedSearchParams?.requestId}
      initialModelProvider={resolvedSearchParams?.modelProvider}
      initialModelName={resolvedSearchParams?.modelName}
      initialModelReasoningEffort={resolvedSearchParams?.modelReasoningEffort}
      user={session.user}
      onLogout={logoutAction}
      settingsContent={<SettingsSections locale={locale} settings={settings} />}
    />
  );
}
