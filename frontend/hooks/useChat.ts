/**
 * useChat Hook
 * 
 * Manages chat state, message history, and LLM interactions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, LLMService, RateLimiter, ERROR_MESSAGES } from '../api/llmService';
import { buildCompleteContext } from '../ai/contextBuilder';
import { ethers } from 'ethers';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface UseChatProps {
  apiKey: string;
  vaultAddress: string;
  walletAddress: string | null;
  provider: ethers.Provider;
}

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  canSendMessage: boolean;
  rateLimitRemaining: number;
}

const MAX_MESSAGES = 50;
const STORAGE_KEY = 'nexus_chat_history';

/**
 * Main chat hook
 */
export function useChat({
  apiKey,
  vaultAddress,
  walletAddress,
  provider,
}: UseChatProps): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(0);
  
  const llmServiceRef = useRef<LLMService | null>(null);
  const rateLimiterRef = useRef<RateLimiter>(new RateLimiter(5, 1));
  const contextCacheRef = useRef<{ context: string; timestamp: number } | null>(null);

  // Initialize LLM service
  useEffect(() => {
    if (apiKey) {
      llmServiceRef.current = new LLMService({ apiKey });
    }
  }, [apiKey]);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed.slice(-MAX_MESSAGES));
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
      } catch (e) {
        console.error('Failed to save chat history:', e);
      }
    }
  }, [messages]);

  /**
   * Get or build context with caching
   */
  const getContext = useCallback(async (): Promise<string> => {
    const now = Date.now();
    const CACHE_TTL = 30 * 1000; // 30 seconds

    // Use cached context if still fresh
    if (contextCacheRef.current && now - contextCacheRef.current.timestamp < CACHE_TTL) {
      return contextCacheRef.current.context;
    }

    // Build fresh context
    const { formattedPrompt } = await buildCompleteContext(
      walletAddress,
      vaultAddress,
      provider
    );

    contextCacheRef.current = {
      context: formattedPrompt,
      timestamp: now,
    };

    return formattedPrompt;
  }, [walletAddress, vaultAddress, provider]);

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!apiKey) {
      setError(ERROR_MESSAGES.NO_API_KEY);
      return;
    }

    if (!llmServiceRef.current) {
      setError('LLM service not initialized');
      return;
    }

    if (!rateLimiterRef.current.canMakeRequest()) {
      const remaining = rateLimiterRef.current.getRemainingTime();
      setError(`${ERROR_MESSAGES.RATE_LIMIT}. Wait ${remaining} seconds.`);
      setRateLimitRemaining(remaining);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Record rate limit
    rateLimiterRef.current.recordRequest();

    // Create assistant message placeholder
    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Get context
      const contextPrompt = await getContext();

      // Build chat history for API
      const chatHistory: ChatMessage[] = messages
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Stream response
      await llmServiceRef.current.sendMessage(
        content,
        chatHistory,
        contextPrompt,
        {
          onToken: (token: string) => {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + token }
                  : msg
              )
            );
          },
          onComplete: () => {
            setIsLoading(false);
          },
          onError: (err: Error) => {
            setError(err.message || ERROR_MESSAGES.API_ERROR);
            setIsLoading(false);
            // Remove failed assistant message
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
          },
        }
      );
    } catch (err) {
      setError((err as Error).message || ERROR_MESSAGES.API_ERROR);
      setIsLoading(false);
      // Remove failed assistant message
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    }
  }, [apiKey, messages, getContext]);

  /**
   * Clear chat history
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    contextCacheRef.current = null;
  }, []);

  /**
   * Check if can send message
   */
  const canSendMessage = !isLoading && !!apiKey && rateLimiterRef.current.canMakeRequest();

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    canSendMessage,
    rateLimitRemaining,
  };
}

/**
 * Generate unique ID for messages
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

