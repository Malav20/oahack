// components/CodeBlock.tsx
'use client'

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeBlockProps {
  code: string;
  language?: 'json' | 'xml' | 'markdown';
  title?: string;
}

export default function CodeBlock({
  code,
  language = 'markdown',
  title = language
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-600 text-sm text-white font-mono">
        <span>{title}</span>
        <div className="space-x-2">
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded hover:bg-gray-600"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            className="text-xs px-2 py-1 rounded hover:bg-gray-600"
            disabled
          >
            Edit
          </button>
        </div>
      </div>
      <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem' }}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
