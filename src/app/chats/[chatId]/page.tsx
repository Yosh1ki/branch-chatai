import { AssistantCard } from "@/components/AssistantCard";
import { ChatHeader } from "@/components/ChatHeader";
import { UserBubble } from "@/components/UserBubble";

type ChatPageProps = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;
  return (
    <div className="min-h-screen bg-[#f7f3ef] text-main">
      <ChatHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-10">
        <UserBubble chatId={chatId} />
        <div className="h-10 w-px bg-[#e2d8cf]" />
        <AssistantCard chatId={chatId} />
      </main>
    </div>
  );
}
