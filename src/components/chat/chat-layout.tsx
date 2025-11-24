"use client"

import { useState, useEffect } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatArea } from "./chat-area"
import { MessageInput } from "./message-input"

interface Message {
  id: string
  role: string
  content: string
}

export function ChatLayout() {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMessages = async (chatId: string) => {
    const res = await fetch(`/api/chat?chatId=${chatId}`)
    const data = await res.json()
    setMessages(data.messages || [])
  }

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId)
    fetchMessages(chatId)
  }

  const handleNewChat = () => {
    setCurrentChatId(undefined)
    setMessages([])
  }

  const handleSend = async (content: string) => {
    setLoading(true)
    
    // Optimistic update
    const tempId = Date.now().toString()
    const tempMessage = { id: tempId, role: "user", content }
    setMessages((prev) => [...prev, tempMessage])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, chatId: currentChatId }),
      })
      
      if (!res.ok) throw new Error("Failed to send message")

      const data = await res.json()
      
      // Update chat ID if it was a new chat
      if (!currentChatId && data.chat?.id) {
        setCurrentChatId(data.chat.id)
      }

      // Replace optimistic message and add assistant response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        data.userMessage,
        data.assistantMessage,
      ])
    } catch (error) {
      console.error(error)
      // TODO: Handle error (remove optimistic message, show toast)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col">
        <ChatArea messages={messages} />
        <MessageInput onSend={handleSend} disabled={loading} />
      </div>
    </div>
  )
}
