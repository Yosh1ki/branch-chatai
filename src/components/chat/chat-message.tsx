import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { parseMessageContent } from "@/lib/rich-text";
import { RichTextRenderer } from "@/components/RichTextRenderer";

interface Message {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
    modelName?: string | null;
}

const ChatMessageComponent = ({ message }: { message: Message }) => {
    const isUser = message.role === "user";
    const parsedContent = useMemo(
        () => (isUser ? null : parseMessageContent(message.content)),
        [isUser, message.content]
    );

    return (
        <div
            className={cn(
                "flex w-full gap-4 p-4",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <Avatar className="h-8 w-8 border">
                <AvatarImage
                    src={
                        isUser
                            ? "/placeholder-user.jpg"
                            : "/placeholder-bot.jpg"
                    }
                />
                <AvatarFallback>{isUser ? "U" : "AI"}</AvatarFallback>
            </Avatar>

            <div
                className={cn(
                    "flex max-w-[80%] flex-col gap-2",
                    isUser ? "items-end" : "items-start"
                )}
            >
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
                    {isUser ? (
                        message.content
                    ) : parsedContent?.format === "richjson" && parsedContent.doc ? (
                        <RichTextRenderer value={parsedContent.doc} />
                    ) : (
                        <div className="whitespace-pre-wrap">
                            {parsedContent?.text ?? message.content}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ChatMessage = memo(ChatMessageComponent);
