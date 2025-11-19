/**
 * UserPosition Component
 * 
 * Displays user's vault position (shares, value, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface UserPositionProps {
  vaultAddress: string;
  walletAddress: string;
  provider: ethers.Provider;
}

export function UserPosition({ vaultAddress, walletAddress, provider }: UserPositionProps) {
  const [position, setPosition] = useState({
    shares: '0',
    value: '0',
    walletBalance: '0',
    symbol: 'TOKEN',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosition();
    const interval = setInterval(fetchPosition, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [vaultAddress, walletAddress, provider]);

  const fetchPosition = async () => {
    try {
      const vaultABI = [
        'function balanceOf(address) view returns (uint256)',
        'function convertToAssets(uint256) view returns (uint256)',
        'function asset() view returns (address)',
      ];

      const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
      
      const [shares, assetAddress] = await Promise.all([
        vault.balanceOf(walletAddress),
        vault.asset(),
      ]);

      const value = await vault.convertToAssets(shares);

      // Get asset details
      const assetABI = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
      ];
      const assetContract = new ethers.Contract(assetAddress, assetABI, provider);
      const [walletBalance, decimals, symbol] = await Promise.all([
        assetContract.balanceOf(walletAddress),
        assetContract.decimals(),
        assetContract.symbol(),
      ]);

      setPosition({
        shares: ethers.formatUnits(shares, decimals),
        value: ethers.formatUnits(value, decimals),
        walletBalance: ethers.formatUnits(walletBalance, decimals),
        symbol,
      });
    } catch (error) {
      console.error('Failed to fetch user position:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="position-section">
        <div className="skeleton" />
      </section>
    );
  }

  const hasPosition = parseFloat(position.shares) > 0;

  return (
    <section className="position-section">
      <h3>Your Position</h3>
      <div className="position-card">
        <div className="position-grid">
          <div className="position-item">
            <div className="position-label">Vault Shares</div>
            <div className="position-value">
              {formatNumber(position.shares)}
              <span className="position-unit">shares</span>
            </div>
          </div>

          <div className="position-item">
            <div className="position-label">Current Value</div>
            <div className="position-value">
              {formatNumber(position.value)}
              <span className="position-unit">{position.symbol}</span>
            </div>
          </div>

          <div className="position-item">
            <div className="position-label">Wallet Balance</div>
            <div className="position-value">
              {formatNumber(position.walletBalance)}
              <span className="position-unit">{position.symbol}</span>
            </div>
          </div>
        </div>

        {!hasPosition && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
            <p>You don't have any vault shares yet</p>
            <p className="hint">Deposit tokens to start earning yield!</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .position-section {
          margin: 48px 0;
        }

        .position-section h3 {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .position-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .position-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 32px;
        }

        .position-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .position-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .position-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .position-unit {
          font-size: 14px;
          font-weight: 500;
          color: #9ca3af;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #6b7280;
        }

        .empty-state svg {
          color: #d1d5db;
          margin-bottom: 16px;
        }

        .empty-state p {
          margin: 8px 0;
        }

        .empty-state .hint {
          font-size: 14px;
          color: #9ca3af;
        }

        .skeleton {
          height: 200px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 16px;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 768px) {
          .position-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
      `}</style>
    </section>
  );
}

function formatNumber(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(num);
}

