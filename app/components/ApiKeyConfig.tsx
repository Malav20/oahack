import React, { useState } from 'react';
import { aiService, AIServiceConfig } from '../services/ai-service';

interface ApiKeyConfigProps {
  onConfigSaved: () => void;
}

const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<Partial<AIServiceConfig>>({
    apiKey: '8iSikY5fMyrDg0RyX9VVIgTYGrghZHZi',
    baseUrl: 'https://api.mistral.ai/v1',
    ocrModel: 'mistral-ocr-latest',
    chatModel: 'mistral-large-latest',
  });
  const [showConfig, setShowConfig] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    aiService.updateConfig(config);
    localStorage.setItem('ai-config', JSON.stringify(config));
    onConfigSaved();
    setShowConfig(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowConfig(!showConfig)}
        className="text-gray-300 hover:text-white text-sm flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>

      {showConfig && (
        <div className="absolute right-0 top-12 mt-2 z-10 w-96 bg-[#212123] border border-[#565869] rounded-xl shadow-lg overflow-hidden p-0">
          <div className="p-4 border-b border-[#565869]">
            <h3 className="text-lg font-medium">API Configuration</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">
                  Mistral API Key <span className="text-red-400">*</span>
                </label>
                <input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  value={config.apiKey}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-[#565869] bg-[#40414f] text-white rounded-md focus:outline-none focus:border-[#9b62ff]"
                  placeholder="Enter your Mistral API key"
                />
              </div>
              
              <div>
                <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-300 mb-1">
                  API Base URL
                </label>
                <input
                  id="baseUrl"
                  name="baseUrl"
                  type="text"
                  value={config.baseUrl}
                  onChange={handleChange}
                  className="w-full p-2 border border-[#565869] bg-[#40414f] text-white rounded-md focus:outline-none focus:border-[#9b62ff]"
                  placeholder="https://api.mistral.ai/v1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ocrModel" className="block text-sm font-medium text-gray-300 mb-1">
                    OCR Model
                  </label>
                  <input
                    id="ocrModel"
                    name="ocrModel"
                    type="text"
                    value={config.ocrModel}
                    onChange={handleChange}
                    className="w-full p-2 border border-[#565869] bg-[#40414f] text-white rounded-md focus:outline-none focus:border-[#9b62ff]"
                    placeholder="mistral-ocr-latest"
                  />
                </div>
                
                <div>
                  <label htmlFor="chatModel" className="block text-sm font-medium text-gray-300 mb-1">
                    Chat Model
                  </label>
                  <input
                    id="chatModel"
                    name="chatModel"
                    type="text"
                    value={config.chatModel}
                    onChange={handleChange}
                    className="w-full p-2 border border-[#565869] bg-[#40414f] text-white rounded-md focus:outline-none focus:border-[#9b62ff]"
                    placeholder="mistral-large-latest"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="mr-2 px-4 py-2 bg-[#40414f] text-gray-300 hover:bg-[#565869] rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#9b62ff] text-white rounded-md hover:bg-[#7e4dd1]"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ApiKeyConfig;
