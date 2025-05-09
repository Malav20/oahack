'use client';

import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import ApiKeyConfig from './components/ApiKeyConfig';
import { aiService } from './services/ai-service';
import { storageService } from './services/storage-service';

export default function Home() {
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiConfigured, setApiConfigured] = useState(false);

  // Check if API key is configured on load
  useEffect(() => {
    const savedConfig = localStorage.getItem('ai-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.apiKey) {
          aiService.updateConfig(config);
          setApiConfigured(true);
        }
      } catch (err) {
        console.error('Error loading saved config:', err);
      }
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!apiConfigured) {
      setError('Please configure your API key first');
      return;
    }

    try {
      // Save file to storage and get ID
      const id = await storageService.saveFile(file);
      
      // Set active file and chat ID
      setActiveFile(file);
      setChatId(id);
      setError(null);
    } catch (err: Error | unknown) {
      console.error('Error saving file:', err);
      setError(err instanceof Error ? err.message : 'Error saving file');
    }
  };

  const handleApiConfigSaved = () => {
    setApiConfigured(true);
    setError(null);
  };
  
  const handleNewChat = () => {
    setActiveFile(null);
    setChatId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#343541] text-gray-100">
      <header className="bg-[#212123] p-3 border-b border-gray-700">
        <div className="container mx-auto flex items-center justify-between">
          <button 
            onClick={handleNewChat}
            className="flex items-center space-x-2 bg-[#343541] hover:bg-[#40414f] py-2 px-3 rounded-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>New Chat</span>
          </button>
          <h1 className="text-lg font-medium">File Chat</h1>
          <ApiKeyConfig onConfigSaved={handleApiConfigSaved} />
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4">
        <ChatInterface 
          activeFile={activeFile} 
          onFileUpload={handleFileUpload}
          chatId={chatId || ''} 
          error={error}
        />
      </main>
    </div>
  );
}
