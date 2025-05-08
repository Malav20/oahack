"use client"

import type React from "react"

import { PlusCircle, MessageSquare, Trash2 } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useChat } from "@/components/chat-provider"
import { formatDistanceToNow } from "date-fns"

interface ChatSidebarProps {
  activeChatId: string | null
  onChatSelect: (id: string) => void
}

export function ChatSidebar({ activeChatId, onChatSelect }: ChatSidebarProps) {
  const { chats, createChat, deleteChat } = useChat()

  const handleNewChat = () => {
    const newChatId = createChat()
    onChatSelect(newChatId)
  }

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteChat(id)
    if (activeChatId === id) {
      onChatSelect(chats[0]?.id || "")
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2" variant="outline">
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No chats yet. Start a new conversation!
                </div>
              ) : (
                chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      onClick={() => onChatSelect(chat.id)}
                      isActive={activeChatId === chat.id}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="truncate">{chat.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                      </span>
                    </SidebarMenuButton>
                    <SidebarMenuAction onClick={(e) => handleDeleteChat(chat.id, e)} className="hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">Powered by Mistral AI</div>
      </SidebarFooter>
    </Sidebar>
  )
}
