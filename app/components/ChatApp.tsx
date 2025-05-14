import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Loader2,
  FileText,
  X,
  SendHorizontal,
} from 'lucide-react';
import CodeBlock from './CodeBlock';

// Define the system message content.
const defaultSystemMessageContent = "You are an AI assistant helping users extract and process the documents and provide them all the necesasry information about their documents";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSuggestedQuestions = async (
    currentChatMessages: { role: string; content: string }[],
  ) => {
    if (currentChatMessages.length === 0) {
      setSuggestedQuestions([]);
      return;
    }

    const systemMessage = { role: 'system', content: defaultSystemMessageContent };
    const messagesForAPI = [systemMessage, ...currentChatMessages];

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForAPI }),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const parsed = JSON.parse(data);
      const list = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : Array.isArray(parsed)
        ? parsed
        : [];
      setSuggestedQuestions(list.slice(0, 3));
    } catch {
      setSuggestedQuestions([]);
    }
  };

  useEffect(() => {
    if (!messages.length || loading) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant' && last.content) {
      fetchSuggestedQuestions(messages);
    }
  }, [messages, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = prompt.trim();
    if (!text && !file) return;

    setSuggestedQuestions([]);
    const userMsg = { role: 'user', content: text || file!.name };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setPrompt('');

    const formData = new FormData();
    formData.append('prompt', text);
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/api/ocr-chat', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(res.statusText);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: 'assistant', content: assistantContent };
          return msgs;
        });
      }
      assistantContent += decoder.decode();
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'assistant', content: assistantContent };
        return msgs;
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, error: ${(err as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openFileBrowser = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files?.[0] ?? null;
    setFile(sel);
    setSuggestedQuestions([]);
    if (sel) promptInputRef.current?.focus();
  };
  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSuggestedQuestions([]);
  };
  const handleSuggestionClick = (q: string) => {
    setPrompt(q);
    setSuggestedQuestions([]);
    promptInputRef.current?.focus();
  };
  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
    if (e.target.value.trim() && suggestedQuestions.length) {
      setSuggestedQuestions([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#202123] flex flex-col items-center justify-between p-4">
      <div className="w-full max-w-3xl flex-grow flex flex-col justify-center">
        {!messages.length && !loading && (
          <h1 className="text-neutral-100 text-4xl font-medium text-center my-auto pb-10">
            I am Glyph!!, a document processing AI 
          </h1>
        )}
      </div>

      <div className="w-full max-w-3xl sticky bottom-0 flex flex-col">
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-4 mb-2 w-full no-scrollbar pt-10">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`px-4 py-2.5 rounded-xl max-w-[85%] whitespace-pre-wrap break-words shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-neutral-700 text-neutral-100 rounded-br-sm'
                    : 'bg-sky-600 text-white rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <CodeBlock content={msg.content} />
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {suggestedQuestions.length > 0 && !loading && (
          <div className="mb-3 px-1">
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(q)}
                  className="bg-neutral-700/80 text-neutral-200 hover:bg-neutral-600 rounded-full text-xs font-medium py-1.5 px-3"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-3 pb-2">
          {file && (
            <div className="flex items-center bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2">
              <FileText size={22} className="text-pink-500" />
              <div className="ml-3 mr-2 flex-1">
                <div className="text-neutral-100 font-medium truncate">{file.name}</div>
                <div className="text-neutral-400 text-xs">
                  {file.type.split('/')[1]?.toUpperCase() || 'FILE'} - {(
                    file.size / 1024
                  ).toFixed(2)} KB
                </div>
              </div>
              <button type="button" onClick={removeFile} className="p-1.5 hover:bg-neutral-600 rounded-full">
                <X size={18} className="text-neutral-400" />
              </button>
            </div>
          )}
          <div className="flex items-center rounded-full bg-neutral-800 p-2.5 space-x-2 shadow-lg border border-neutral-700/50">
            <button
              type="button"
              onClick={openFileBrowser}
              className="p-2 hover:bg-neutral-700 rounded-full"
            >
              <Plus size={20} className="text-neutral-400" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.md,.csv,.json,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={promptInputRef}
              type="text"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Ask anything..."
              className="flex-grow bg-transparent outline-none text-neutral-100 placeholder-neutral-500 px-2 text-sm"
            />
            
            <button
              type="submit"
              disabled={loading || (!prompt.trim() && !file)}
              className="p-2 bg-sky-500 hover:bg-sky-600 rounded-full disabled:bg-neutral-600"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin text-white" />
              ) : (
                <SendHorizontal size={20} className="text-white" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
