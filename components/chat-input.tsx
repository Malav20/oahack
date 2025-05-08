"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Send, Paperclip, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FormatType } from "@/components/chat-provider"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ChatInputProps {
  onSendMessage: (content: string, file?: File, format?: FormatType) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<FormatType>("text")
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() && !file) return

    onSendMessage(message, file || undefined, format)
    setMessage("")
    setFile(null)
    setFormat("text")
    setFileError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    validateAndSetFile(selectedFile)
  }

  const validateAndSetFile = (selectedFile?: File | null) => {
    if (!selectedFile) return

    setFileError(null)

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds the 5MB limit (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)`)
      return
    }

    setFile(selectedFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    validateAndSetFile(droppedFile)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-background/80 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
          <p className="text-primary font-medium">Drop your file here</p>
        </div>
      )}

      {file && (
        <Card className="p-3 mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)} • {file.type || "Unknown type"}
            </p>
            <Progress value={(file.size / MAX_FILE_SIZE) * 100} className="h-1 mt-1" />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setFile(null)} type="button">
            <X className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {fileError && <div className="text-destructive text-sm mb-2">{fileError}</div>}

      <div className="flex gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[80px] resize-none"
          />

          {file && (
            <div className="flex items-center gap-2">
              <Select value={format} onValueChange={(value) => setFormat(value as FormatType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Select output format</p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full"
          >
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">Attach file</span>
          </Button>

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

          <Button type="submit" size="icon" className="rounded-full">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </form>
  )
}
