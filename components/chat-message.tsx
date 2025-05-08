import type { Message } from "@/components/chat-provider"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { FileIcon, User } from "lucide-react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
}

export function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex items-center gap-3 group", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
          <span className="text-xs">AI</span>
        </Avatar>
      )}

      <div className={cn("flex flex-col gap-1 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isUser ? "You" : "Assistant"}</span>
          <span>•</span>
          <span>{format(new Date(message.timestamp), "h:mm a")}</span>
        </div>

        {message.fileUrl && (
          <Card className="p-3 flex items-center gap-2 text-sm w-full max-w-md">
            <FileIcon className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 truncate">
              <p className="font-medium truncate">{message.fileName}</p>
              <p className="text-xs text-muted-foreground">{message.fileType}</p>
            </div>
          </Card>
        )}

        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted",
            isLoading && "animate-pulse",
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 justify-center items-center bg-muted">
          <User className="h-4 w-4" />
        </Avatar>
      )}
    </div>
  )
}
