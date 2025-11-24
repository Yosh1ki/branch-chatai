"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"
import { useState, KeyboardEvent } from "react"

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState("")

  const handleSend = () => {
    if (content.trim()) {
      onSend(content)
      setContent("")
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex gap-2 max-w-3xl mx-auto">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[60px] resize-none"
          disabled={disabled}
        />
        <Button onClick={handleSend} disabled={!content.trim() || disabled} size="icon" className="h-[60px] w-[60px]">
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
