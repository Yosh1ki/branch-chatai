import { ChatCanvasShell } from "@/components/ChatCanvasShell";

type ChatPageProps = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;
  return <ChatCanvasShell chatId={chatId} />;
}
