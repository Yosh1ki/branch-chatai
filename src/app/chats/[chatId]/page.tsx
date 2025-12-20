"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/chat-message";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  modelName?: string | null;
  parentMessageId?: string | null;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const [chat, setChat] = useState<Chat | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat data
  useEffect(() => {
    const fetchChat = async () => {
      try {
        const res = await fetch(`/api/chats/${chatId}`);
        if (res.ok) {
          const data = await res.json();
          const messages = data.messages.map((m: Message & { createdAt: string }) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }));
          setChat({ ...data, messages });
        }
      } catch (error) {
        console.error("Failed to fetch chat", error);
      }
    };
    fetchChat();
  }, [chatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat?.messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageContent = input;
    const parentMessageId =
      chat && chat.messages.length > 0
        ? chat.messages[chat.messages.length - 1].id
        : null;
    setInput("");
    setIsLoading(true);

    try {
      // Optimistic update
      const tempUserMessage: Message = {
        id: "temp-" + Date.now(),
        role: "user",
        content: userMessageContent,
        createdAt: new Date(),
        parentMessageId,
      };

      setChat((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, tempUserMessage],
            }
          : null
      );

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          content: userMessageContent,
          parentMessageId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await res.json();

      // Update with real messages
      setChat((prev) => {
        if (!prev) return null;
        const filtered = prev.messages.filter((m) => m.id !== tempUserMessage.id);
        return {
          ...prev,
          messages: [...filtered, data.userMessage, data.assistantMessage].map((m) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          })),
        };
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!chat) return <div className="p-8 text-center">Loading...</div>;

  const sortedMessages = [...chat.messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        <header className="border-b px-6 py-4">
          <div>
            <h1 className="font-semibold text-lg">{chat.title}</h1>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto w-full py-6 space-y-4 px-4">
            {sortedMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t px-6 py-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
