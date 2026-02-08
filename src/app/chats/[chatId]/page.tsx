import { ChatCanvasShell } from "@/components/ChatCanvasShell";

type ChatPageProps = {
  params: Promise<{ chatId: string }>;
  searchParams?: Promise<{
    prompt?: string;
    modelProvider?: string;
    modelName?: string;
    modelReasoningEffort?: string;
  }>;
};

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { chatId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return (
    <ChatCanvasShell
      chatId={chatId}
      initialPrompt={resolvedSearchParams?.prompt}
      initialModelProvider={resolvedSearchParams?.modelProvider}
      initialModelName={resolvedSearchParams?.modelName}
      initialModelReasoningEffort={resolvedSearchParams?.modelReasoningEffort}
    />
  );
}
