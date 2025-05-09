import axios from 'axios';

// Interface for AI Service configuration
export interface AIServiceConfig {
  apiKey: string;
  baseUrl: string;
  ocrModel: string;
  chatModel: string;
}

// Default configuration
const DEFAULT_CONFIG: AIServiceConfig = {
  apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY || '8iSikY5fMyrDg0RyX9VVIgTYGrghZHZi',
  baseUrl: 'https://api.mistral.ai/v1',
  ocrModel: 'mistral-ocr-latest',
  chatModel: 'mistral-large-latest',
};

class AIService {
  private config: AIServiceConfig;

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<AIServiceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
  
  // Helper method to convert File to base64 data URL
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Process document with OCR
  async processDocument(file: File): Promise<string> {
    try {
      // Convert file to base64
      const base64File = await this.fileToBase64(file);
      
      // Create request body according to Mistral OCR API format
      const requestBody = {
        model: this.config.ocrModel,
        document: {
          type: 'document_url',
          document_url: base64File
        },
        include_image_base64: false
      };

      const response = await axios.post(
        `${this.config.baseUrl}/ocr`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.pages[0].markdown;
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error('Failed to process document with OCR');
    }
  }

  // Chat with the model about the document
  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      console.log('Chat request to Mistral API:', {
        endpoint: `${this.config.baseUrl}/chat/completions`,
        model: this.config.chatModel,
        messageCount: messages.length
      });
      
      // Create request payload
      const requestPayload = {
        model: this.config.chatModel,
        messages,
      };
      
      console.log('Request payload prepared, sending request...');
      
      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('Chat response received from Mistral API:', {
        status: response.status,
        hasChoices: response.data?.choices?.length > 0
      });
      
      // Verify response structure
      if (!response.data || !response.data.choices || !response.data.choices.length || !response.data.choices[0].message) {
        console.error('Invalid response structure from Mistral API:', response.data);
        throw new Error('Invalid response from chat API');
      }
      
      return response.data.choices[0].message.content;
    } catch (error: unknown) {
      console.error('Error chatting with model:', error);
      if (axios.isAxiosError(error) && error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error instanceof Error) {
        console.error('API error:', error.message);
        throw new Error(`API error: ${error.message}`);
      } else {
        console.error('Unknown error:', error);
        throw new Error('Unknown error');
      }
    }
  }
}

// Create a singleton instance
const aiService = new AIService();

export { aiService };
