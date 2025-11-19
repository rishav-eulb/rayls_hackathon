/**
 * ChatWidget Component
 * 
 * Main chat interface with floating button and chat window
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SUGGESTED_PROMPTS } from '../api/llmService';
import { ethers } from 'ethers';

export interface ChatWidgetProps {
  apiKey: string;
  vaultAddress: string;
  walletAddress: string | null;
  provider: ethers.Provider;
  onApiKeyRequest?: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  apiKey,
  vaultAddress,
  walletAddress,
  provider,
  onApiKeyRequest,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    canSendMessage,
  } = useChat({
    apiKey,
    vaultAddress,
    walletAddress,
    provider,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hide suggestions after first message
  useEffect(() => {
    if (messages.length > 0) {
      setShowSuggestions(false);
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSendMessage(prompt);
    setShowSuggestions(false);
  };

  return (
    <div className="chat-widget">
      {/* Floating Button */}
      {!isOpen && (
        <button
          className="chat-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat assistant"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="chat-badge">AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="chat-title">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                </svg>
                <span>Nexus Vault Assistant</span>
              </div>
              <div className="chat-status">
                {walletAddress ? (
                  <span className="status-connected">
                    Connected: {formatAddress(walletAddress)}
                  </span>
                ) : (
                  <span className="status-disconnected">Not connected</span>
                )}
              </div>
            </div>
            <div className="chat-actions">
              {messages.length > 0 && (
                <button
                  className="chat-action-btn"
                  onClick={clearHistory}
                  title="Clear history"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                  </svg>
                </button>
              )}
              <button
                className="chat-action-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <div className="welcome-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3>Welcome to Nexus Vault Assistant!</h3>
                <p>
                  I'm here to help you understand how the vault works, answer questions about DeFi,
                  and guide you through deposits and withdrawals.
                </p>
                {!apiKey && (
                  <button className="setup-api-btn" onClick={onApiKeyRequest}>
                    Set up API Key to start chatting
                  </button>
                )}
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="chat-loading">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {showSuggestions && messages.length === 0 && apiKey && (
            <div className="chat-suggestions">
              <p className="suggestions-title">Try asking:</p>
              <div className="suggestions-grid">
                {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, index) => (
                  <button
                    key={index}
                    className="suggestion-btn"
                    onClick={() => handleSuggestionClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <ChatInput
            onSend={handleSendMessage}
            disabled={!canSendMessage || !apiKey}
            placeholder={
              !apiKey
                ? 'Set up API key to start chatting...'
                : !canSendMessage
                ? 'Please wait...'
                : 'Ask me anything about the vault...'
            }
          />
        </div>
      )}

      <style jsx>{`
        .chat-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .chat-fab {
          width: 60px;
          height: 60px;
          border-radius: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .chat-fab:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
        }

        .chat-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 10px;
        }

        .chat-window {
          width: 400px;
          height: 600px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .chat-header-content {
          flex: 1;
        }

        .chat-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .chat-status {
          font-size: 12px;
          opacity: 0.9;
        }

        .status-connected {
          color: #86efac;
        }

        .status-disconnected {
          color: #fca5a5;
        }

        .chat-actions {
          display: flex;
          gap: 8px;
        }

        .chat-action-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: background 0.2s;
        }

        .chat-action-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f9fafb;
        }

        .chat-welcome {
          text-align: center;
          padding: 32px 16px;
          color: #6b7280;
        }

        .welcome-icon {
          color: #667eea;
          margin-bottom: 16px;
        }

        .chat-welcome h3 {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }

        .chat-welcome p {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .setup-api-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .setup-api-btn:hover {
          background: #5a67d8;
        }

        .chat-loading {
          display: flex;
          justify-content: center;
          padding: 16px;
        }

        .loading-dots {
          display: flex;
          gap: 4px;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .loading-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .chat-error {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px;
          border-radius: 8px;
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 14px;
          margin: 8px 0;
        }

        .chat-suggestions {
          padding: 16px;
          background: white;
          border-top: 1px solid #e5e7eb;
        }

        .suggestions-title {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .suggestions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .suggestion-btn {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          color: #374151;
        }

        .suggestion-btn:hover {
          background: #e5e7eb;
          border-color: #667eea;
          color: #667eea;
        }

        @media (max-width: 480px) {
          .chat-window {
            width: calc(100vw - 32px);
            height: calc(100vh - 32px);
          }
        }
      `}</style>
    </div>
  );
};

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

