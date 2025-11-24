import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { GitBranch } from "lucide-react"

interface Message {
  id: string
  role: string
  content: string
  createdAt: Date
  modelName?: string | null
}

interface ChatMessageProps {
  message: Message
  isBranchable?: boolean
  onBranch?: (messageId: string) => void
  isRoot?: boolean
}

export function ChatMessage({ message, isBranchable, onBranch, isRoot }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full gap-4 p-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-8 w-8 border">
        <AvatarImage src={isUser ? "/placeholder-user.jpg" : "/placeholder-bot.jpg"} />
        <AvatarFallback>{isUser ? "U" : "AI"}</AvatarFallback>
      </Avatar>
      
      <div className={cn("flex max-w-[80%] flex-col gap-2", isUser ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? "You" : message.modelName || "Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        </div>
        
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          {message.content}
        </div>

        {!isUser && isBranchable && onBranch && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onBranch(message.id)}
          >
            <GitBranch className="mr-1 h-3 w-3" />
            Branch
          </Button>
        )}
      </div>
    </div>
  )
}
