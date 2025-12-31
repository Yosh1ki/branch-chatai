import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Components, ExtraProps } from "react-markdown";
import { parseMessageContent } from "@/lib/rich-text";
import { RichTextRenderer } from "@/components/RichTextRenderer";

interface Message {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
    modelName?: string | null;
}

type CodeProps = ComponentPropsWithoutRef<"code"> &
    ExtraProps & {
        inline?: boolean;
    };

const markdownComponents = {
    a: ({ ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noreferrer"
            className="underline"
        />
    ),
    pre: ({ ...props }) => (
        <pre
            {...props}
            className={cn(
                "overflow-x-auto rounded-md bg-background/60 p-3 text-xs text-foreground",
                props.className
            )}
        />
    ),
    code: ({ inline, className, children, ...rest }: CodeProps) => {
        if (inline) {
            return (
                <code
                    {...rest}
                    className={cn(
                        "rounded bg-background/80 px-1 py-0.5 text-xs font-semibold",
                        className
                    )}
                >
                    {children}
                </code>
            );
        }
        return (
            <code {...rest} className={cn("text-xs", className)}>
                {children}
            </code>
        );
    },
} satisfies Components;

export function ChatMessage({ message }: { message: Message }) {
    const isUser = message.role === "user";
    const parsedContent = isUser ? null : parseMessageContent(message.content);

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
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-p:mt-2 prose-p:mb-2">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                            >
                                {parsedContent?.text ?? message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
