import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/cjs/styles/prism'; // use light theme

/**
 * CodeBlock component parses a string that may contain fenced code blocks
 * (e.g. ```json\n{...}\n```), and renders syntax-highlighted code blocks
 * interleaved with plain text.
 *
 * @param {{ content: string }} props
 */
export default function CodeBlock({ content }: { content: string }) {
  // Regex matches ```lang\ncode\n``` blocks
  const fenceRegex = /```(\w+)\n([\s\S]*?)```/gm;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = fenceRegex.exec(content)) !== null) {
    const [fullMatch, lang, code] = match;
    const index = match.index;

    // Push preceding text if any
    if (index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, index) });
    }

    // Push code block
    parts.push({ type: 'code', lang, content: code });
    lastIndex = index + fullMatch.length;
  }

  // Push remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return (
    <div className="prose">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          return (
            <SyntaxHighlighter
              key={i}
              language={part.lang}
              style={prism}
              showLineNumbers
            >
              {part.content}
            </SyntaxHighlighter>
          );
        }
        // Plain text (including markdown-like content)
        return (
          <p key={i} className="whitespace-pre-wrap">
            {part.content}
          </p>
        );
      })}
    </div>
  );
}
