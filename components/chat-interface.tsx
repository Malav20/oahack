"use client"

import { useState, useRef, useEffect } from "react"
import { useChat, type Message, type FormatType } from "@/components/chat-provider"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { EmptyState } from "@/components/empty-state"

interface ChatInterfaceProps {
  activeChatId: string | null
}

export function ChatInterface({ activeChatId }: ChatInterfaceProps) {
  const { getChat, addMessage, createChat } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)

  const activeChat = activeChatId ? getChat(activeChatId) : null
  const messages = activeChat?.messages || []

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (content: string, file?: File, format?: FormatType) => {
    if (!activeChatId) {
      const newChatId = createChat()
      handleSendMessage(content, file, format)
      return
    }

    // Add user message
    const userMessage: Omit<Message, "id" | "timestamp"> = {
      role: "user",
      content,
    }

    // If file is provided, add file info to the message
    if (file) {
      const fileUrl = URL.createObjectURL(file)
      userMessage.fileUrl = fileUrl
      userMessage.fileName = file.name
      userMessage.fileType = file.type
    }

    addMessage(activeChatId, userMessage)

    // Simulate AI processing
    setLoading(true)

    try {
      // In a real app, you would send the file to Mistral OCR and then to Mistral Chat
      // For now, we'll simulate a response
      setTimeout(() => {
        let responseContent = "I've analyzed your document."

        if (file) {
          responseContent += ` The document appears to be a ${file.type.split("/")[1]} file.`

          if (format) {
            switch (format) {
              case "json":
                responseContent +=
                  '\n\n```json\n{\n  "type": "document",\n  "classification": "invoice",\n  "confidence": 0.92,\n  "content": "Sample extracted content from the document"\n}\n```'
                break
              case "xml":
                responseContent +=
                  "\n\n```xml\n<document>\n  <type>document</type>\n  <classification>invoice</classification>\n  <confidence>0.92</confidence>\n  <content>Sample extracted content from the document</content>\n</document>\n```"
                break
              case "markdown":
                responseContent +=
                  "\n\n# Document Analysis\n\n- **Type**: Document\n- **Classification**: Invoice\n- **Confidence**: 92%\n- **Content**: Sample extracted content from the document"
                break
              default:
                responseContent +=
                  " I've extracted the text content and classified it as an invoice with 92% confidence."
            }
          }
        }

        addMessage(activeChatId, {
          role: "assistant",
          content: responseContent,
        })

        setLoading(false)
      }, 1500)
    } catch (error) {
      console.error("Error processing message:", error)
      setLoading(false)

      addMessage(activeChatId, {
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request.",
      })
    }
  }

  if (!activeChatId) {
    return <EmptyState onNewChat={() => createChat()} />
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium">Start a new conversation</h3>
              <p className="text-muted-foreground mt-1">Upload a document or ask a question to get started</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {loading && (
              <ChatMessage
                message={{
                  id: "loading",
                  role: "assistant",
                  content: "Thinking...",
                  timestamp: new Date(),
                }}
                isLoading
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="border-t p-4">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  )
}
