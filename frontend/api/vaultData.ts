/**
 * Vault Data API
 * 
 * Functions to query blockchain data for vault and user information
 */

import { ethers } from 'ethers';

export interface VaultStats {
  totalAssets: bigint;
  totalShares: bigint;
  sharePrice: string;
  assetSymbol: string;
  assetDecimals: number;
}

export interface UserVaultData {
  sharesBalance: bigint;
  assetBalance: bigint;
  shareValue: bigint;
}

/**
 * Gets basic vault statistics
 */
export async function getVaultStats(
  vaultAddress: string,
  provider: ethers.Provider
): Promise<VaultStats> {
  const vaultABI = [
    'function totalAssets() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function asset() view returns (address)',
  ];

  const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
  
  const [totalAssets, totalShares, assetAddress] = await Promise.all([
    vault.totalAssets(),
    vault.totalSupply(),
    vault.asset(),
  ]);

  // Get asset details
  const assetABI = [
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
  ];
  const assetContract = new ethers.Contract(assetAddress, assetABI, provider);
  const [assetDecimals, assetSymbol] = await Promise.all([
    assetContract.decimals(),
    assetContract.symbol(),
  ]);

  // Calculate share price
  const sharePrice = totalShares > 0n
    ? ethers.formatUnits(totalAssets * BigInt(1e18) / totalShares, 18)
    : '1.0';

  return {
    totalAssets,
    totalShares,
    sharePrice,
    assetSymbol,
    assetDecimals,
  };
}

/**
 * Gets user's vault-specific data
 */
export async function getUserVaultData(
  userAddress: string,
  vaultAddress: string,
  provider: ethers.Provider
): Promise<UserVaultData> {
  const vaultABI = [
    'function balanceOf(address) view returns (uint256)',
    'function convertToAssets(uint256) view returns (uint256)',
    'function asset() view returns (address)',
  ];

  const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
  
  const [sharesBalance, assetAddress] = await Promise.all([
    vault.balanceOf(userAddress),
    vault.asset(),
  ]);

  const shareValue = await vault.convertToAssets(sharesBalance);

  // Get user's asset balance
  const assetABI = ['function balanceOf(address) view returns (uint256)'];
  const assetContract = new ethers.Contract(assetAddress, assetABI, provider);
  const assetBalance = await assetContract.balanceOf(userAddress);

  return {
    sharesBalance,
    assetBalance,
    shareValue,
  };
}

/**
 * Calculates estimated shares for a given deposit amount
 */
export async function calculateDepositShares(
  depositAmount: bigint,
  vaultAddress: string,
  provider: ethers.Provider
): Promise<bigint> {
  const vaultABI = ['function convertToShares(uint256) view returns (uint256)'];
  const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
  
  return await vault.convertToShares(depositAmount);
}

/**
 * Calculates estimated assets for a given withdraw amount (in shares)
 */
export async function calculateWithdrawAssets(
  sharesAmount: bigint,
  vaultAddress: string,
  provider: ethers.Provider
): Promise<bigint> {
  const vaultABI = ['function convertToAssets(uint256) view returns (uint256)'];
  const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
  
  return await vault.convertToAssets(sharesAmount);
}

/**
 * Creates a provider from RPC URL
 */
export function createProvider(rpcUrl: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Cache for reducing RPC calls
 */
class DataCache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttlSeconds: number = 30) {
    this.ttl = ttlSeconds * 1000;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const vaultStatsCache = new DataCache<VaultStats>(30);
export const userDataCache = new DataCache<UserVaultData>(15);

