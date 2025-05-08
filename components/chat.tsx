"use client"

import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { ChatProvider } from "@/components/chat-provider"

export function Chat() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  return (
    <ChatProvider>
      <SidebarProvider>
        <ChatSidebar activeChatId={activeChatId} onChatSelect={setActiveChatId} />
        <ChatInterface activeChatId={activeChatId} />
      </SidebarProvider>
    </ChatProvider>
  )
}
