"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus } from "lucide-react"
import { useEffect, useState } from "react"

interface Chat {
  id: string
  title: string
}

interface ChatSidebarProps {
  currentChatId?: string
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
}

export function ChatSidebar({ currentChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([])

  useEffect(() => {
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setChats(data)
        }
      })
  }, [])

  return (
    <div className="w-64 border-r h-full flex flex-col bg-muted/20">
      <div className="p-4">
        <Button onClick={onNewChat} className="w-full justify-start" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {chats.map((chat) => (
            <Button
              key={chat.id}
              variant={currentChatId === chat.id ? "secondary" : "ghost"}
              className="w-full justify-start truncate"
              onClick={() => onSelectChat(chat.id)}
            >
              {chat.title}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
