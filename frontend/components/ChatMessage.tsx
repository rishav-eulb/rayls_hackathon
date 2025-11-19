/**
 * ChatMessage Component
 * 
 * Individual message bubble with markdown support
 */

import React, { useState } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formattedContent = formatMessageContent(message.content);

  return (
    <div className={`message message-${message.role}`}>
      <div className="message-avatar">
        {message.role === 'user' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
          </svg>
        )}
      </div>
      <div className="message-content">
        <div className="message-text" dangerouslySetInnerHTML={{ __html: formattedContent }} />
        <div className="message-footer">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {message.role === 'assistant' && (
            <button
              className="copy-btn"
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy message'}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .message {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .message-user .message-avatar {
          background: #667eea;
          color: white;
        }

        .message-assistant .message-avatar {
          background: #10b981;
          color: white;
        }

        .message-content {
          flex: 1;
          min-width: 0;
        }

        .message-text {
          background: white;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .message-user .message-text {
          background: #667eea;
          color: white;
        }

        .message-text :global(p) {
          margin: 0 0 8px 0;
        }

        .message-text :global(p:last-child) {
          margin-bottom: 0;
        }

        .message-text :global(strong) {
          font-weight: 600;
        }

        .message-text :global(code) {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
        }

        .message-user .message-text :global(code) {
          background: rgba(255, 255, 255, 0.2);
        }

        .message-text :global(ul),
        .message-text :global(ol) {
          margin: 8px 0;
          padding-left: 20px;
        }

        .message-text :global(li) {
          margin: 4px 0;
        }

        .message-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          padding: 0 4px;
        }

        .message-time {
          font-size: 11px;
          color: #9ca3af;
        }

        .copy-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          background: #f3f4f6;
          color: #667eea;
        }
      `}</style>
    </div>
  );
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Simple markdown-like formatting
 */
function formatMessageContent(content: string): string {
  let html = content;

  // Escape HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Code inline
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Bullet points (lines starting with - or •)
  html = html.replace(/^[\-•]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Paragraphs
  const paragraphs = html.split('<br><br>');
  html = paragraphs.map(p => `<p>${p}</p>`).join('');

  return html;
}

