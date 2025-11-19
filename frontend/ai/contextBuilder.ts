/**
 * Context Builder for AI Chat Agent
 * 
 * Builds dynamic user and vault context to inject into AI prompts
 */

import { ethers } from 'ethers';

export interface UserContext {
  walletAddress: string;
  walletBalance: string;
  sharesOwned: string;
  shareValue: string;
  estimatedAPY: string;
  totalDeposited?: string;
  totalEarned?: string;
  recentTransactions?: Array<{
    type: 'deposit' | 'withdraw';
    amount: string;
    timestamp: number;
    txHash: string;
  }>;
}

export interface VaultContext {
  vaultAddress: string;
  totalAssets: string;
  totalShares: string;
  sharePrice: string;
  strategyCount: number;
  strategies: Array<{
    address: string;
    name: string;
    allocation: string;
    targetWeight: string;
    currentAPY: string;
  }>;
  combinedAPY: string;
  slippageTolerance: string;
}

export interface BuiltContext {
  userContext: UserContext | null;
  vaultContext: VaultContext | null;
  formattedPrompt: string;
}

/**
 * Fetches user-specific vault data from blockchain
 */
export async function getUserContext(
  walletAddress: string,
  vaultAddress: string,
  provider: ethers.Provider
): Promise<UserContext | null> {
  try {
    // RaylsVault ABI (minimal - just what we need)
    const vaultABI = [
      'function balanceOf(address) view returns (uint256)',
      'function convertToAssets(uint256 shares) view returns (uint256)',
      'function asset() view returns (address)',
    ];

    const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
    
    // Get user's share balance
    const sharesOwned = await vault.balanceOf(walletAddress);
    
    // Convert shares to underlying asset value
    const shareValue = await vault.convertToAssets(sharesOwned);
    
    // Get underlying asset address
    const assetAddress = await vault.asset();
    
    // Get user's wallet balance of underlying asset
    const assetABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function symbol() view returns (string)'];
    const assetContract = new ethers.Contract(assetAddress, assetABI, provider);
    const walletBalance = await assetContract.balanceOf(walletAddress);
    const decimals = await assetContract.decimals();
    const symbol = await assetContract.symbol();

    return {
      walletAddress: formatAddress(walletAddress),
      walletBalance: `${ethers.formatUnits(walletBalance, decimals)} ${symbol}`,
      sharesOwned: ethers.formatUnits(sharesOwned, decimals),
      shareValue: `${ethers.formatUnits(shareValue, decimals)} ${symbol}`,
      estimatedAPY: 'Loading...', // Would need more complex calculation
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

/**
 * Fetches vault state data from blockchain
 */
export async function getVaultContext(
  vaultAddress: string,
  provider: ethers.Provider
): Promise<VaultContext | null> {
  try {
    const vaultABI = [
      'function totalAssets() view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function getStrategies() view returns (tuple(address strategy, uint256 targetWeight, uint256 currentBalance)[])',
      'function asset() view returns (address)',
      'function isMultiStrategyEnabled() view returns (bool)',
    ];

    const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
    
    const totalAssets = await vault.totalAssets();
    const totalShares = await vault.totalSupply();
    const multiStrategyEnabled = await vault.isMultiStrategyEnabled();
    
    // Get asset info
    const assetAddress = await vault.asset();
    const assetABI = ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'];
    const assetContract = new ethers.Contract(assetAddress, assetABI, provider);
    const decimals = await assetContract.decimals();
    const symbol = await assetContract.symbol();

    let strategies: VaultContext['strategies'] = [];
    let strategyCount = 0;

    if (multiStrategyEnabled) {
      try {
        const strategiesData = await vault.getStrategies();
        strategyCount = strategiesData.length;
        
        strategies = strategiesData.map((s: any, index: number) => ({
          address: formatAddress(s.strategy),
          name: `Strategy ${index + 1}`,
          allocation: ethers.formatUnits(s.currentBalance, decimals),
          targetWeight: `${(Number(s.targetWeight) / 100).toFixed(1)}%`,
          currentAPY: 'N/A', // Would need external data source
        }));
      } catch (e) {
        console.error('Error fetching strategies:', e);
      }
    }

    // Calculate share price
    const sharePrice = totalShares > 0n 
      ? (Number(totalAssets) / Number(totalShares)).toFixed(6)
      : '1.000000';

    return {
      vaultAddress: formatAddress(vaultAddress),
      totalAssets: `${ethers.formatUnits(totalAssets, decimals)} ${symbol}`,
      totalShares: ethers.formatUnits(totalShares, decimals),
      sharePrice: sharePrice,
      strategyCount,
      strategies,
      combinedAPY: 'N/A', // Would need historical data
      slippageTolerance: '0.5%', // Default value
    };
  } catch (error) {
    console.error('Error fetching vault context:', error);
    return null;
  }
}

/**
 * Builds formatted context prompt for AI
 */
export function buildContextPrompt(
  userCtx: UserContext | null,
  vaultCtx: VaultContext | null
): string {
  let prompt = '\n\n=== CURRENT USER & VAULT CONTEXT ===\n\n';

  if (userCtx) {
    prompt += '📊 YOUR WALLET:\n';
    prompt += `- Wallet Address: ${userCtx.walletAddress}\n`;
    prompt += `- Available Balance: ${userCtx.walletBalance}\n`;
    prompt += `- Vault Shares Owned: ${userCtx.sharesOwned}\n`;
    prompt += `- Current Share Value: ${userCtx.shareValue}\n`;
    
    if (userCtx.totalDeposited) {
      prompt += `- Total Deposited: ${userCtx.totalDeposited}\n`;
    }
    if (userCtx.totalEarned) {
      prompt += `- Total Earned: ${userCtx.totalEarned}\n`;
    }
    prompt += '\n';
  } else {
    prompt += '⚠️ Wallet not connected. General information only.\n\n';
  }

  if (vaultCtx) {
    prompt += '🏦 VAULT STATUS:\n';
    prompt += `- Vault Address: ${vaultCtx.vaultAddress}\n`;
    prompt += `- Total Value Locked (TVL): ${vaultCtx.totalAssets}\n`;
    prompt += `- Total Shares: ${vaultCtx.totalShares}\n`;
    prompt += `- Share Price: ${vaultCtx.sharePrice} tokens per share\n`;
    prompt += `- Active Strategies: ${vaultCtx.strategyCount}\n`;
    
    if (vaultCtx.strategies.length > 0) {
      prompt += '\n💼 STRATEGY ALLOCATIONS:\n';
      vaultCtx.strategies.forEach((s, i) => {
        prompt += `${i + 1}. ${s.name} (${s.address})\n`;
        prompt += `   - Current: ${s.allocation} tokens (${s.targetWeight} target)\n`;
        if (s.currentAPY !== 'N/A') {
          prompt += `   - APY: ${s.currentAPY}\n`;
        }
      });
    }
    prompt += '\n';
  }

  prompt += '=== END CONTEXT ===\n\n';
  prompt += 'Use this context to provide personalized responses. If wallet is not connected, provide general information and encourage connection for personalized help.\n';

  return prompt;
}

/**
 * Main function to build complete context
 */
export async function buildCompleteContext(
  walletAddress: string | null,
  vaultAddress: string,
  provider: ethers.Provider
): Promise<BuiltContext> {
  let userContext: UserContext | null = null;
  let vaultContext: VaultContext | null = null;

  // Fetch vault context (always available)
  vaultContext = await getVaultContext(vaultAddress, provider);

  // Fetch user context only if wallet is connected
  if (walletAddress) {
    userContext = await getUserContext(walletAddress, vaultAddress, provider);
  }

  const formattedPrompt = buildContextPrompt(userContext, vaultContext);

  return {
    userContext,
    vaultContext,
    formattedPrompt,
  };
}

/**
 * Helper function to format Ethereum addresses
 */
function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Helper to format large numbers with commas
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(num);
}

