/**
 * VaultStats Component
 * 
 * Displays vault statistics (TVL, APY, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface VaultStatsProps {
  vaultAddress: string;
  provider: ethers.Provider;
}

export function VaultStats({ vaultAddress, provider }: VaultStatsProps) {
  const [stats, setStats] = useState({
    tvl: '0',
    sharePrice: '1.0',
    totalShares: '0',
    strategyCount: 0,
    symbol: 'TOKEN',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [vaultAddress, provider]);

  const fetchStats = async () => {
    try {
      const vaultABI = [
        'function totalAssets() view returns (uint256)',
        'function totalSupply() view returns (uint256)',
        'function asset() view returns (address)',
        'function getStrategies() view returns (tuple(address strategy, uint256 targetWeight, uint256 currentBalance)[])',
      ];

      const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
      
      let totalAssets, totalSupply, assetAddress, strategyCount;
      
      try {
        [totalAssets, totalSupply, assetAddress] = await Promise.all([
          vault.totalAssets(),
          vault.totalSupply(),
          vault.asset(),
        ]);
      } catch (error) {
        console.error('Failed to fetch basic vault data:', error);
        throw error;
      }
      
      // Try to get strategy count
      try {
        const strategies = await vault.getStrategies();
        strategyCount = strategies.length;
      } catch (error) {
        // Multi-strategy might not be enabled
        strategyCount = 0;
      }

      // Get asset details
      const assetABI = [
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
      ];
      const assetContract = new ethers.Contract(assetAddress, assetABI, provider);
      const [decimals, symbol] = await Promise.all([
        assetContract.decimals(),
        assetContract.symbol(),
      ]);

      // Calculate share price
      const sharePrice = totalSupply > 0n
        ? (Number(totalAssets) / Number(totalSupply)).toFixed(6)
        : '1.000000';

      setStats({
        tvl: ethers.formatUnits(totalAssets, decimals),
        sharePrice,
        totalShares: ethers.formatUnits(totalSupply, decimals),
        strategyCount: Number(strategyCount),
        symbol,
      });
    } catch (error) {
      console.error('Failed to fetch vault stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="stats-section">
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card loading">
              <div className="skeleton" />
            </div>
          ))}
        </div>
        <style jsx>{`
          .skeleton {
            height: 80px;
            background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 8px;
          }

          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="stats-section">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon tvl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Value Locked</div>
            <div className="stat-value">{formatNumber(stats.tvl)} {stats.symbol}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon shares">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Share Price</div>
            <div className="stat-value">{stats.sharePrice} {stats.symbol}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon supply">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Shares</div>
            <div className="stat-value">{formatNumber(stats.totalShares)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon strategies">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Active Strategies</div>
            <div className="stat-value">{stats.strategyCount}</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .stats-section {
          margin: 32px 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon.tvl {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .stat-icon.shares {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .stat-icon.supply {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .stat-icon.strategies {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-label {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function formatNumber(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

