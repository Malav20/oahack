import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Mic,
  Loader2,
  FileText,
  X,
} from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !file) return;

    const userMsgContent = prompt || (file ? file.name : 'Attached file');
    const userMsg = { role: 'user', content: userMsgContent };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);


    const formData = new FormData();
    formData.append('prompt', prompt);
    if (file) formData.append('file', file);

    // Replace with your actual API endpoint
    const response = await fetch('/api/ocr-chat', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        setMessages((prev) => [...prev, {role: 'assistant', content: 'Error processing your request.'}]);
        setLoading(false);
        setPrompt('');
        // setFile(null);
        return;
    }
    if (!response.body) {
        setLoading(false);
        return;
    }


    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = '';
    const assistantMsg = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMsg]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantContent += decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: assistantContent,
        };
        return msgs;
      });
    }
    // Add this to ensure the final segment of stream is processed
    assistantContent += decoder.decode();
    setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: assistantContent,
        };
        return msgs;
      });


    setLoading(false);
    setPrompt('');
    // setFile(null); // Decide if you want to clear the file after each submission
  };

  const openFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
  };

  return (
    <div className="min-h-screen no-scrollbar bg-[#202123] flex flex-col items-center justify-between p-4 selection:bg-sky-500 selection:text-white">
      <div className="w-full max-w-3xl flex-grow flex flex-col justify-center"> {/* Helper div for centering content */}
        {messages.length === 0 && (
             <h1 className="text-neutral-100 text-4xl font-medium text-center my-auto pb-10"> {/* Changed pb for spacing from input */}
                I am Glyph!!, a document processing chatbot
            </h1>
        )}
      </div>


      <div className="w-full max-w-3xl sticky bottom-0 pb-4"> {/* Sticky container for form */}
        {/* Chat messages area */}
        <div className={`max-h-[calc(100vh-200px)] no-scrollbar overflow-y-auto space-y-4 mb-6 w-full ${messages.length > 0 ? 'pt-10' : ''}`}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`px-4 py-2.5 rounded-xl max-w-[85%] whitespace-pre-wrap break-words shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-neutral-700 text-neutral-100 rounded-br-sm'
                    : 'bg-sky-600 text-white rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full space-y-3"
        >
          {/* File preview */}
          {file && (
            <div className="flex items-center bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 shadow">
              <FileText className="text-pink-500 flex-shrink-0" size={22} />
              <div className="ml-3 mr-2 min-w-0 flex-1">
                <div className="text-neutral-100 font-medium truncate">
                  {file.name}
                </div>
                <div className="text-neutral-400 text-xs">
                  {file.type.split('/')[1]?.toUpperCase() || 'FILE'} - {(file.size / 1024).toFixed(2)} KB
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1.5 hover:bg-neutral-600 rounded-full flex-shrink-0"
              >
                <X className="text-neutral-400" size={18} />
              </button>
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-center rounded-full bg-neutral-800 p-2.5 space-x-2 shadow-lg border border-neutral-700/50">
            <button
              type="button"
              onClick={openFileBrowser}
              className="p-2 hover:bg-neutral-700 rounded-full flex-shrink-0 transition-colors"
              aria-label="Attach file"
            >
              <Plus className="text-neutral-400" size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.md,.csv,.json,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything..."
              className="flex-grow bg-transparent outline-none text-neutral-100 placeholder-neutral-500 px-2 min-w-0 text-sm"
            />

            <button
              type="submit"
              disabled={loading || (!prompt.trim() && !file)}
              className="p-2 bg-sky-500 hover:bg-sky-600 rounded-full flex-shrink-0 disabled:bg-neutral-600 disabled:cursor-not-allowed transition-colors"
              aria-label="Submit prompt"
            >
              {loading ? (
                <Loader2 className="text-white animate-spin" size={20} />
              ) : (
                <Mic className="text-white" size={20} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}