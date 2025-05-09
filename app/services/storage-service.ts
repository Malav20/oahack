// Storage interface for potential future Supabase integration
export interface StorageProvider {
  saveFile(file: File): Promise<string>;
  getFile(id: string): Promise<File | null>;
  saveChat(chatId: string, messages: Array<{ role: string; content: string }>): Promise<void>;
  getChat(chatId: string): Promise<Array<{ role: string; content: string }> | null>;
}

// LocalStorage implementation
export class LocalStorageProvider implements StorageProvider {
  async saveFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const id = `file-${Date.now()}`;
          const fileData = {
            id,
            name: file.name,
            type: file.type,
            size: file.size,
            data: event.target?.result,
            createdAt: new Date().toISOString(),
          };
          
          localStorage.setItem(id, JSON.stringify(fileData));
          resolve(id);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async getFile(id: string): Promise<File | null> {
    const fileData = localStorage.getItem(id);
    
    if (!fileData) return null;
    
    try {
      const { name, type, data } = JSON.parse(fileData);
      
      // Convert base64 data to Blob
      const dataStr = data as string;
      const byteString = atob(dataStr.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type });
      return new File([blob], name, { type });
    } catch (error) {
      console.error('Error retrieving file from localStorage:', error);
      return null;
    }
  }

  async saveChat(chatId: string, messages: Array<{ role: string; content: string }>): Promise<void> {
    try {
      localStorage.setItem(`chat-${chatId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat to localStorage:', error);
      throw error;
    }
  }

  async getChat(chatId: string): Promise<Array<{ role: string; content: string }> | null> {
    try {
      const chat = localStorage.getItem(`chat-${chatId}`);
      return chat ? JSON.parse(chat) : null;
    } catch (error) {
      console.error('Error retrieving chat from localStorage:', error);
      return null;
    }
  }
}

// Factory function to get the appropriate storage provider
export function getStorageProvider(): StorageProvider {
  // In the future, this could check for configuration to determine which 
  // provider to return (e.g., Supabase vs LocalStorage)
  return new LocalStorageProvider();
}

// Create a singleton instance
const storageService = getStorageProvider();

export { storageService };
