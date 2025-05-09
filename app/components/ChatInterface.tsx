import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/ai-service';
import { storageService } from '../services/storage-service';
import FileUploader from './FileUploader';
import CodeBlock from './CodeBlock';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  activeFile: File | null;
  onFileUpload: (file: File) => void;
  chatId: string;
  error: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  activeFile, 
  onFileUpload,
  chatId,
  error: externalError
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileOcrProcessed, setFileOcrProcessed] = useState(false);
  const [processingOcr, setProcessingOcr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to validate message roles
  const isValidRole = (role: string): role is 'user' | 'assistant' | 'system' => {
    return role === 'user' || role === 'assistant' || role === 'system';
  };

  // Load previous chat messages if any
  useEffect(() => {
    const loadMessages = async () => {
      if (chatId) {
        const savedMessages = await storageService.getChat(chatId);
        if (savedMessages && savedMessages.length > 0) {
          // Create full Message objects from stored chat data which only have role and content
          setMessages(savedMessages.map((msg) => ({
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            role: isValidRole(msg.role) ? msg.role : 'assistant',
            content: msg.content,
            timestamp: Date.now(), // Adding timestamp as it doesn't exist in saved messages
          })));
        }
      }
    };
    
    loadMessages();
  }, [chatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to storage when they change
  useEffect(() => {
    if (chatId && messages.length > 0) {
      storageService.saveChat(chatId, messages);
    }
  }, [chatId, messages]);

  // Handle input changes and auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Auto-resize
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  };

  // Process document with OCR
  const processDocumentWithOcr = async (file: File): Promise<string> => {
    setProcessingOcr(true);
    setError(null);
    
    try {
      const text = await aiService.processDocument(file);
      setFileOcrProcessed(true);
      setFileText(text);
      console.log('OCR processing completed, extracted text:', text ? text.substring(0, 100) + '...' : 'No text extracted');
      return text;
    } catch (err: Error | unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error processing document with OCR';
      console.error('OCR processing error:', errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setProcessingOcr(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isProcessing) {
      return;
    }

    // Check if we have a file uploaded
    if (!activeFile) {
      const errorMessage: Message = {
        id: `system-error-${Date.now()}`,
        role: 'assistant',
        content: 'Please upload a document first before asking questions.',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);
    setError(null);
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      let extractedText = fileText;
      
      // Process file with OCR if it hasn't been processed yet
      if (!fileOcrProcessed) {
        try {
          console.log('Starting OCR processing for file:', activeFile.name);
          extractedText = await processDocumentWithOcr(activeFile);
          console.log('OCR processing successful, text length:', extractedText?.length || 0);
        } catch (error) {
          // If OCR fails, add error message and stop processing
          console.error('OCR processing failed:', error);
          const errorMessage: Message = {
            id: `system-error-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, I encountered an error processing your document. Please try again with a different file.',
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, errorMessage]);
          setIsProcessing(false);
          return;
        }
      }

      // Verify we have extracted text
      if (!extractedText) {
        console.error('No extracted text available after OCR processing');
        const errorMessage: Message = {
          id: `system-error-${Date.now()}`,
          role: 'assistant',
          content: 'Could not extract any text from the document. Please try a different file format.',
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsProcessing(false);
        return;
      }

      // Prepare messages for API
      console.log('Preparing messages for chat API...');
      const apiMessages = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Add the current user message
      apiMessages.push({
        role: 'user',
        content: inputMessage,
      });
      console.log('Total messages to send:', apiMessages.length);

      // Add context about the file
      const systemMessage = {
        role: 'system',
        content: `This is a conversation about a document that has been processed with OCR. The document name is "${activeFile.name}". The extracted text is as follows:\n\n${extractedText}\n\nPlease answer questions about this document. If you cannot find the answer in the document, clearly state that.`
      };

      // Send to AI service
      console.log('Calling chat API...');
      try {
        const response = await aiService.chat([
          systemMessage,
          ...apiMessages,
        ]);
        console.log('Chat API response received');

        // Add AI response
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } catch (chatError) {
        console.error('Error calling chat API:', chatError);
        
        // Add error message about chat API failure
        const errorMessage: Message = {
          id: `system-error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error generating a response. Please try again.',
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      // Add error message
      const errorMessage: Message = {
        id: `system-error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      console.error('Error processing message:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render individual message
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const match = message.content.match(/```json([\s\S]*?)```/);
    
    // Process JSON content if found
    let displayContent = message.content;
    let jsonComponent = null;
    
    if (match) {
      // Extract content without the JSON block
      displayContent = message.content.replace(/```json([\s\S]*?)```/, '').trim();
      
      try {
        const jsonText = match[1].trim();
        const json = JSON.parse(jsonText);
        jsonComponent = <CodeBlock code={jsonText} language="json" title="JSON" />;
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }
    
    return (
      <div 
        key={message.id} 
        className={`py-5 ${isUser ? 'bg-transparent' : 'bg-[#444654]'}`}
      >
        <div className="max-w-4xl mx-auto flex px-4">
          <div className={`w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center ${isUser ? 'bg-[#19c37d]' : 'bg-[#9b62ff]'}`}>
            {isUser ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M16.5 7.5h-9v9h9v-9z" />
                <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-2.25V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A.75.75 0 016.75 6h10.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="min-w-0 ml-4 whitespace-pre-wrap">
            {displayContent && <div>{displayContent}</div>}
            {jsonComponent}
          </div>
        </div>
      </div>
    );
  };

  // Render welcome message when no messages exist
  const renderWelcomeMessage = () => (
    <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-16 h-16 mb-5 bg-[#9b62ff]/20 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#9b62ff]">
          <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6.905 9.97a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72V18a.75.75 0 001.5 0v-4.19l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
          <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
        </svg>
      </div>
      <h2 className="text-xl font-medium mb-2">What would you like to know about your document?</h2>
      <p className="text-gray-400 mb-8 max-w-md">Upload a document using the + button below and then ask questions about it.</p>
      
      {processingOcr && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-500 border-t-[#9b62ff]"></div>
          <p className="text-gray-400">Processing document...</p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-900/30 text-red-200 rounded-lg max-w-md">
          {error}
        </div>
      )}
      
      {externalError && (
        <div className="mt-4 p-4 bg-red-900/30 text-red-200 rounded-lg max-w-md">
          {externalError}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.length > 0 ? (
          <>
            {messages.filter(m => m.role !== 'system').map(renderMessage)}
            
            {isProcessing && (
              <div className="py-5 bg-[#444654]">
                <div className="max-w-4xl mx-auto flex px-4">
                  <div className="w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center bg-[#9b62ff]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                      <path d="M16.5 7.5h-9v9h9v-9z" />
                      <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-2.25V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A.75.75 0 016.75 6h10.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0 ml-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-75"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          renderWelcomeMessage()
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-[#343541] border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
          <div className="flex items-center">
            <FileUploader 
              onFileUpload={onFileUpload} 
              activeFile={activeFile} 
            />
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={handleInputChange}
                placeholder="Ask about your document..."
                disabled={isProcessing}
                rows={1}
                className="w-full p-3 pr-12 bg-[#40414f] border border-[#565869] rounded-xl text-white focus:outline-none focus:border-[#9b62ff] resize-none overflow-hidden"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isProcessing}
                className="absolute right-3 bottom-3 text-gray-300 hover:text-white disabled:opacity-50 disabled:hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
        <div className="text-xs text-center mt-2 text-gray-400">
          {processingOcr ? (
            <span className="flex items-center justify-center gap-2">
              <div className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-gray-500 border-t-[#9b62ff]"></div>
              Processing document...
            </span>
          ) : (
            <span>Press Enter to send, Shift+Enter for a new line</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
