import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Globe,
  Zap,
  Activity,
  MoreHorizontal,
  Mic,
  Loader2,
  FileText,
  X,
} from 'lucide-react';

// Define the system message content.
// If your main chat /api/ocr-chat also uses a system message, this should ideally align
// with the overall context/persona of your AI assistant.
const defaultSystemMessageContent = "You are an AI assistant helping users write risk descriptions.";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  // Optional: Separate loading state for suggestions if you want a different UI feedback
  // const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSuggestedQuestions = async (
    currentChatMessages: { role: string; content: string }[], // These are user/assistant messages
  ) => {
    if (currentChatMessages.length === 0) {
      setSuggestedQuestions([]);
      return;
    }

    // console.log('Fetching suggestions from /api/suggestions...');
    // setLoadingSuggestions(true); // Optional

    const systemMessage = { role: "system", content: defaultSystemMessageContent };
    const messagesForAPI = [systemMessage, ...currentChatMessages];

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messagesForAPI }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error fetching suggestions:', response.status, errorData);
        setSuggestedQuestions([]); // Clear suggestions on error
        // setLoadingSuggestions(false); // Optional
        return;
      }

      const data = await response.json();
      const parsedData = JSON.parse(data);
      console.log('Suggestion data:', JSON.parse(data));

      // Assuming the API returns { suggestions: ["...", "...", ...] }
      // Or if it returns just an array: const suggestions = data;
      if (parsedData && Array.isArray(parsedData.suggestions)) {
        setSuggestedQuestions(parsedData.suggestions.slice(0, 3)); // Show up to 3 suggestions
      } else if (Array.isArray(parsedData)) { // If the API directly returns an array of strings
        setSuggestedQuestions(parsedData.slice(0,3));
      }
      else {
        console.warn('Suggestions API did not return expected format:', parsedData);
        setSuggestedQuestions([]);
      }
    } catch (error) {
      console.error('Network error fetching suggestions:', error);
      setSuggestedQuestions([]);
    } finally {
      // setLoadingSuggestions(false); // Optional
    }
  };

  useEffect(() => {
    if (messages.length === 0) {
        setSuggestedQuestions([]);
        return;
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content && !loading) {
      // Only fetch suggestions if the last message is from the assistant and fully loaded
      // And there are no suggestions currently shown for this context (or a mechanism to prevent refetch for same context)
      fetchSuggestedQuestions(messages);
    }
  }, [messages, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentPromptValue = prompt.trim(); // Use trimmed prompt for check
    const currentFile = file;

    if (!currentPromptValue && !currentFile) return;

    setSuggestedQuestions([]);

    const userMsgContent = currentPromptValue || (currentFile ? currentFile.name : 'Processing file...');
    const userMsg = { role: 'user', content: userMsgContent };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setPrompt('');

    const formData = new FormData();
    formData.append('prompt', currentPromptValue);
    if (currentFile) formData.append('file', currentFile);

    try {
        const response = await fetch('/api/ocr-chat', { // Your main chat API
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        if (!response.body) throw new Error("No response body from API.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        const assistantMsgPlaceholder = { role: 'assistant', content: '' };
        setMessages((prev) => [...prev, assistantMsgPlaceholder]);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantContent += decoder.decode(value, { stream: true });
            setMessages((prev) => {
                const msgs = [...prev];
                if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
                    msgs[msgs.length - 1] = { role: 'assistant', content: assistantContent };
                }
                return msgs;
            });
        }
        assistantContent += decoder.decode(); // Final decode
        setMessages((prev) => {
            const msgs = [...prev];
            if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
                msgs[msgs.length - 1] = { role: 'assistant', content: assistantContent };
            }
            return msgs;
        });

    } catch (error) {
        console.error("Chat submission error:", error);
        setMessages((prev) => [...prev, {role: 'assistant', content: `Sorry, I encountered an error: ${(error as Error).message}`}]);
    } finally {
        setLoading(false);
         // useEffect will trigger fetchSuggestedQuestions
    }
  };

  const openFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setSuggestedQuestions([]);
    if (selected && promptInputRef.current) {
        promptInputRef.current.focus();
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSuggestedQuestions([]);
  };

  const handleSuggestionClick = (question: string) => {
    setPrompt(question);
    setSuggestedQuestions([]);
    if (promptInputRef.current) promptInputRef.current.focus();
    // To auto-submit, you could call a refactored handleSubmit logic here:
    // handleSubmitInternal(question, file); 
    // For now, user clicks submit manually after prompt is populated.
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
    if (e.target.value.trim() !== '' && suggestedQuestions.length > 0) {
        setSuggestedQuestions([]);
    }
  }

  return (
    <div className="min-h-screen bg-[#202123] flex flex-col items-center justify-between p-4 selection:bg-sky-500 selection:text-white">
      <div className="w-full max-w-3xl flex-grow flex flex-col justify-center">
        {messages.length === 0 && !loading && (
          <h1 className="text-neutral-100 text-4xl font-medium text-center my-auto pb-10">
            What can I help with?
          </h1>
        )}
      </div>

      <div className="w-full max-w-3xl sticky bottom-0 flex flex-col">
        <div
          className={`max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto space-y-4 mb-2 w-full no-scrollbar ${
            messages.length > 0 ? 'pt-10' : ''
          }`}
        >
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

        {suggestedQuestions.length > 0 && !loading && (
          <div className="w-full max-w-3xl mb-3 px-1">
            <div className="flex flex-wrap gap-2 justify-start">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(q)}
                  className="bg-neutral-700/80 text-neutral-200 hover:bg-neutral-600/90 backdrop-blur-sm text-xs font-medium py-1.5 px-3 rounded-full transition-colors shadow"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full space-y-3 pb-2"
        >
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
              <button type="button" onClick={removeFile} className="p-1.5 hover:bg-neutral-600 rounded-full flex-shrink-0">
                <X className="text-neutral-400" size={18} />
              </button>
            </div>
          )}
          <div className="flex items-center rounded-full bg-neutral-800 p-2.5 space-x-2 shadow-lg border border-neutral-700/50">
            <button type="button" onClick={openFileBrowser} className="p-2 hover:bg-neutral-700 rounded-full flex-shrink-0 transition-colors" aria-label="Attach file">
              <Plus className="text-neutral-400" size={20} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.md,.csv,.json,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} className="hidden"/>
            <input
              ref={promptInputRef}
              type="text"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Ask anything..."
              className="flex-grow bg-transparent outline-none text-neutral-100 placeholder-neutral-500 px-2 min-w-0 text-sm"
            />
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button type="button" className="flex items-center py-1.5 px-3 hover:bg-neutral-700/70 rounded-full bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"><Globe size={15} className="mr-1.5 text-neutral-400" /> Search</button>
              <button type="button" className="hidden sm:flex items-center py-1.5 px-3 hover:bg-neutral-700/70 rounded-full bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"><Zap size={15} className="mr-1.5 text-neutral-400" /> Reason</button>
              <button type="button" className="hidden lg:flex items-center py-1.5 px-3 hover:bg-neutral-700/70 rounded-full bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"><Activity size={15} className="mr-1.5 text-neutral-400" /> Deep research</button>
              <button type="button" className="p-2 hover:bg-neutral-700/70 rounded-full bg-neutral-700 transition-colors" aria-label="More options"><MoreHorizontal size={16} className="text-neutral-400" /></button>
            </div>
            <button type="submit" disabled={loading || (!prompt.trim() && !file)} className="p-2 bg-sky-500 hover:bg-sky-600 rounded-full flex-shrink-0 disabled:bg-neutral-600 disabled:cursor-not-allowed transition-colors" aria-label="Submit prompt">
              {loading ? <Loader2 className="text-white animate-spin" size={20} /> : <Mic className="text-white" size={20} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}