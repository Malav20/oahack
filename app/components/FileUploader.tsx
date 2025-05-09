import React, { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  activeFile?: File | null;
  accept?: Record<string, string[]>;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFileUpload,
  activeFile = null,
  accept = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
  }
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop,
    accept,
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  });

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Get file icon by type
  const getFileIcon = (file: File) => {
    const fileType = file.type.split('/')[0];
    
    if (file.type.includes('pdf')) {
      return (
        <div className="h-6 w-6 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold">
          PDF
        </div>
      );
    } else if (fileType === 'image') {
      return (
        <div className="h-6 w-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
          IMG
        </div>
      );
    } else if (file.type.includes('word') || file.type.includes('doc')) {
      return (
        <div className="h-6 w-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
          DOC
        </div>
      );
    } else {
      return (
        <div className="h-6 w-6 bg-gray-500 rounded flex items-center justify-center text-white text-xs font-bold">
          TXT
        </div>
      );
    }
  };

  return (
    <div className="relative">
      {/* Hidden traditional file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            onFileUpload(files[0]);
            e.target.value = '';
          }
        }}
        accept={Object.entries(accept)
          .map(([mimeType, exts]) => `${mimeType},${exts.join(',')}`)
          .join(',')}
        className="hidden"
      />
      
      {/* Dropzone area and handlers */}
      <div {...getRootProps()} className="w-full outline-none">
        <input {...getInputProps()} />
        
        {/* Show active file if one is selected */}
        {activeFile ? (
          <div className="flex items-center bg-[#2a2b32] rounded-md px-3 py-1.5 gap-2 my-2 max-w-[95%] overflow-hidden">
            {getFileIcon(activeFile)}
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{activeFile.name}</div>
              <div className="text-xs text-gray-400">{formatFileSize(activeFile.size)}</div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFileUpload(activeFile); // Re-upload the same file
              }} 
              className="text-gray-300 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-300 hover:text-white rounded-md p-1 hover:bg-[#2a2b32] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            </button>
          </div>
        )}

        {isDragActive && (
          <div className="absolute inset-0 bg-[#2a2b32] rounded-xl border-2 border-[#9b62ff] flex items-center justify-center z-10">
            <p className="text-[#9b62ff] font-medium">Drop your file here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
