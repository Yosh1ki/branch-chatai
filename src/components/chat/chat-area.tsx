"use client"

import { memo, useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: string
  content: string
}

interface ChatAreaProps {
  messages: Message[]
}

export function ChatArea({ messages }: ChatAreaProps) {
  const renderedMessages = useMemo(
    () =>
      messages.map((message) => (
        <ChatMessageRow key={message.id} message={message} />
      )),
    [messages]
  )

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {renderedMessages}
      </div>
    </ScrollArea>
  )
}

const ChatMessageRow = memo(function ChatMessageRow({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
      style={{ contentVisibility: "auto", containIntrinsicSize: "72px" }}
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback>{isUser ? "U" : "AI"}</AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "rounded-lg p-3 max-w-[80%]",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {message.content}
      </div>
    </div>
  )
})
