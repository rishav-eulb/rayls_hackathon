/**
 * LLM Service - OpenAI Integration
 * 
 * Handles communication with OpenAI API for chat functionality
 */

import { SYSTEM_PROMPT } from '../ai/systemPrompt';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Main LLM Service class
 */
export class LLMService {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4-turbo-preview';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 800;
  }

  /**
   * Sends a message and streams the response
   */
  async sendMessage(
    userMessage: string,
    chatHistory: ChatMessage[],
    contextPrompt: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      // Build messages array
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: SYSTEM_PROMPT + contextPrompt,
        },
        ...chatHistory,
        {
          role: 'user',
          content: userMessage,
        },
      ];

      // Make API call
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          callbacks.onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const token = data.choices[0]?.delta?.content;
              
              if (token) {
                callbacks.onToken(token);
              }
            } catch (e) {
              // Skip malformed JSON
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      callbacks.onError(error as Error);
    }
  }

  /**
   * Sends a message and returns complete response (non-streaming)
   */
  async sendMessageSync(
    userMessage: string,
    chatHistory: ChatMessage[],
    contextPrompt: string
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + contextPrompt,
      },
      ...chatHistory,
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Validates API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Estimates token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

/**
 * Rate limiter to prevent abuse
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number = 5, timeWindowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMinutes * 60 * 1000;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getRemainingTime(): number {
    if (this.canMakeRequest()) return 0;
    
    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    return Math.ceil((this.timeWindow - (now - oldestRequest)) / 1000);
  }
}

/**
 * Create LLM service instance
 */
export function createLLMService(apiKey: string, model?: string): LLMService {
  return new LLMService({ apiKey, model });
}

/**
 * Suggested prompts for users
 */
export const SUGGESTED_PROMPTS = [
  "How do I deposit tokens?",
  "What's my current APY?",
  "Explain how vault shares work",
  "What are the risks?",
  "How do I withdraw my funds?",
  "What is rebalancing?",
  "How much gas will this cost?",
  "What strategies are my funds in?",
];

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_API_KEY: 'Please provide an OpenAI API key in settings',
  RATE_LIMIT: 'Rate limit exceeded. Please wait before sending more messages',
  API_ERROR: 'Failed to get response from AI. Please try again',
  NETWORK_ERROR: 'Network error. Please check your connection',
  INVALID_KEY: 'Invalid API key. Please check your settings',
};

