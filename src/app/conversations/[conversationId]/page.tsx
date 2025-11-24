"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "@/components/chat/chat-message"
import { Send } from "lucide-react"

interface Message {
  id: string
  role: string
  content: string
  createdAt: Date
  modelName?: string | null
  parentMessageId?: string | null
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export default function ConversationPage() {
  const params = useParams()
  const conversationId = params.conversationId as string
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch conversation data
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`)
        if (res.ok) {
          const data = await res.json()
          // Convert date strings to Date objects
          data.messages = data.messages.map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt)
          }))
          setConversation(data)
        }
      } catch (error) {
        console.error("Failed to fetch conversation", error)
      }
    }
    fetchConversation()
  }, [conversationId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [conversation?.messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessageContent = input
    setInput("")
    setIsLoading(true)

    try {
      // Optimistic update
      const tempUserMessage: Message = {
        id: "temp-" + Date.now(),
        role: "user",
        content: userMessageContent,
        createdAt: new Date(),
        parentMessageId: conversation?.messages[conversation.messages.length - 1]?.id
      }
      
      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, tempUserMessage]
      } : null)

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: userMessageContent,
          parentMessageId: tempUserMessage.parentMessageId
        })
      })

      if (!res.ok) throw new Error("Failed to send message")

      const data = await res.json()
      
      // Update with real messages
      setConversation(prev => {
        if (!prev) return null
        const filtered = prev.messages.filter(m => m.id !== tempUserMessage.id)
        return {
          ...prev,
          messages: [...filtered, data.userMessage, data.assistantMessage].map(m => ({
             ...m,
             createdAt: new Date(m.createdAt)
          }))
        }
      })
    } catch (error) {
      console.error("Error sending message:", error)
      // Revert optimistic update or show error
    } finally {
      setIsLoading(false)
    }
  }

  const handleBranch = async (messageId: string) => {
    // TODO: Implement branching UI (modal or inline input)
    // For MVP, maybe just focus input and set a "branching from" state
    console.log("Branching from:", messageId)
    alert("Branching feature coming soon! (Backend is ready)")
  }

  if (!conversation) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <h1 className="font-semibold text-lg truncate">{conversation.title}</h1>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-4">
          {conversation.messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isBranchable={message.role === "assistant"}
              onBranch={handleBranch}
            />
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-card">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
