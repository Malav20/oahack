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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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
    setDownloadUrl(null); // Clear previous download
    const userMsg = { role: 'user', content: text || file!.name };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setPrompt('');

    const formData = new FormData();
    formData.append('prompt', text);
    if (file) formData.append('file', file);

    // Decide endpoint based on prompt
    const isRedact = /redact/i.test(text.toLowerCase());
    const endpoint = isRedact ? '/api/redact' : '/api/ocr-chat';

    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(res.statusText);
      if (isRedact) {
        // Handle PDF download
        const blob = await res.blob();
        if (blob.type === 'application/pdf') {
          const url = window.URL.createObjectURL(blob);
          setDownloadUrl(url);
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Redaction complete. Click below to download the redacted PDF.' }]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Redaction failed or did not return a PDF.' }]);
        }
      } else {
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
      }
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-4">
      <div className="w-full max-w-3xl flex-grow flex flex-col justify-center">
        {loading && (
          <div className="text-center my-auto pb-10 text-gray-700 text-lg font-medium">
            Document is processing please wait...
          </div>
        )}
        {!messages.length && !loading && (
          <h3 className="text-2xl font-medium text-center my-auto pb-10 text-gray-800">
            Hi Pete! Glyph here, please send me a document to Process
          </h3>
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
                    ? 'bg-gray-100 text-gray-900 rounded-br-sm'
                    : 'bg-blue-500 text-white rounded-bl-sm'
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
                  className="text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium py-1.5 px-3"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {downloadUrl && (
          <div className="mb-3 px-1 flex justify-center">
            <a
              href={downloadUrl}
              download="redacted_document.pdf"
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded shadow"
            >
              Download Redacted PDF
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-3 pb-2">
          {file && (
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
              <FileText size={22} className="text-pink-500" />
              <div className="ml-3 mr-2 flex-1">
                <div className="text-gray-900 font-medium truncate">{file.name}</div>
                <div className="text-gray-500 text-xs">
                  {file.type.split('/')[1]?.toUpperCase() || 'FILE'} - {(
                    file.size / 1024
                  ).toFixed(2)} KB
                </div>
              </div>
              <button type="button" onClick={removeFile} className="p-1.5 hover:bg-gray-200 rounded-full">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
          )}
          <div className="flex items-center rounded-full p-2.5 space-x-2 shadow-lg border border-gray-300 bg-white">
            <button
              type="button"
              onClick={openFileBrowser}
              className="p-2 hover:bg-gray-200 rounded-full"
            >
              <Plus size={20} className="text-gray-400" />
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
              className="flex-grow bg-transparent outline-none text-gray-900 placeholder-gray-400 px-2 text-sm"
            />
            
            <button
              type="submit"
              disabled={loading || (!prompt.trim() && !file)}
              className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full disabled:bg-gray-300 cursor-pointer"
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
