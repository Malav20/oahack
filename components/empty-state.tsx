"use client"

import { MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onNewChat: () => void
}

export function EmptyState({ onNewChat }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <MessageSquarePlus className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Welcome to Mistral Chat</h2>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        Upload documents up to 5MB and get AI-powered analysis and classification using Mistral OCR and Chat.
      </p>
      <Button onClick={onNewChat} size="lg" className="gap-2">
        <MessageSquarePlus className="h-5 w-5" />
        Start a new chat
      </Button>

      <div className="mt-12 grid gap-4 max-w-2xl text-left">
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-medium mb-1">Upload Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload any document up to 5MB to extract and analyze its content.
          </p>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-medium mb-1">Choose Output Format</h3>
          <p className="text-sm text-muted-foreground">
            Get results in JSON, XML, or Markdown format based on your needs.
          </p>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-medium mb-1">Document Classification</h3>
          <p className="text-sm text-muted-foreground">
            Mistral AI will automatically classify your documents and extract relevant information.
          </p>
        </div>
      </div>
    </div>
  )
}
