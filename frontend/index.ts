/**
 * Nexus Vault AI Chat Agent
 * 
 * Main export file for all chat-related components and utilities
 */

// Components
export { ChatWidget } from './components/ChatWidget';
export { ChatMessage } from './components/ChatMessage';
export { ChatInput } from './components/ChatInput';
export type { ChatWidgetProps } from './components/ChatWidget';
export type { ChatMessageProps, Message } from './components/ChatMessage';
export type { ChatInputProps } from './components/ChatInput';

// Hooks
export { useChat } from './hooks/useChat';
export type { UseChatProps, UseChatReturn } from './hooks/useChat';

// API Services
export { 
  LLMService, 
  RateLimiter, 
  createLLMService,
  SUGGESTED_PROMPTS,
  ERROR_MESSAGES
} from './api/llmService';
export type { ChatMessage as APIChatMessage, LLMConfig, StreamCallbacks } from './api/llmService';

export {
  getVaultStats,
  getUserVaultData,
  calculateDepositShares,
  calculateWithdrawAssets,
  createProvider,
  vaultStatsCache,
  userDataCache
} from './api/vaultData';
export type { VaultStats, UserVaultData } from './api/vaultData';

// AI System
export { default as SYSTEM_PROMPT } from './ai/systemPrompt';
export { default as VAULT_KNOWLEDGE } from './ai/knowledgeBase';
export {
  getUserContext,
  getVaultContext,
  buildContextPrompt,
  buildCompleteContext,
  formatNumber
} from './ai/contextBuilder';
export type { UserContext, VaultContext, BuiltContext } from './ai/contextBuilder';

