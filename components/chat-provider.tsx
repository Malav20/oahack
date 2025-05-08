"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { v4 as uuidv4 } from "uuid"

export type FormatType = "json" | "xml" | "markdown" | "text"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  fileUrl?: string
  fileName?: string
  fileType?: string
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface ChatContextType {
  chats: Chat[]
  createChat: () => string
  getChat: (id: string) => Chat | undefined
  addMessage: (chatId: string, message: Omit<Message, "id" | "timestamp">) => void
  deleteChat: (id: string) => void
  updateChatTitle: (id: string, title: string) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([])

  const createChat = () => {
    const id = uuidv4()
    const newChat: Chat = {
      id,
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setChats((prev) => [...prev, newChat])
    return id
  }

  const getChat = (id: string) => {
    return chats.find((chat) => chat.id === id)
  }

  const addMessage = (chatId: string, message: Omit<Message, "id" | "timestamp">) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          const newMessage: Message = {
            ...message,
            id: uuidv4(),
            timestamp: new Date(),
          }

          // Update chat title if it's the first user message
          let title = chat.title
          if (chat.messages.length === 0 && message.role === "user") {
            title = message.content.slice(0, 30) + (message.content.length > 30 ? "..." : "")
          }

          return {
            ...chat,
            title,
            messages: [...chat.messages, newMessage],
            updatedAt: new Date(),
          }
        }
        return chat
      }),
    )
  }

  const deleteChat = (id: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== id))
  }

  const updateChatTitle = (id: string, title: string) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === id) {
          return { ...chat, title }
        }
        return chat
      }),
    )
  }

  return (
    <ChatContext.Provider
      value={{
        chats,
        createChat,
        getChat,
        addMessage,
        deleteChat,
        updateChatTitle,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
