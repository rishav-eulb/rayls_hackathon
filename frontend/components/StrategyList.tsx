/**
 * StrategyList Component
 * 
 * Displays list of active strategies with their allocations
 */

'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface StrategyListProps {
  vaultAddress: string;
  provider: ethers.Provider;
}

interface Strategy {
  address: string;
  targetWeight: number;
  currentBalance: string;
  percentage: number;
}

export function StrategyList({ vaultAddress, provider }: StrategyListProps) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('TOKEN');

  useEffect(() => {
    fetchStrategies();
    const interval = setInterval(fetchStrategies, 30000);
    return () => clearInterval(interval);
  }, [vaultAddress, provider]);

  const fetchStrategies = async () => {
    try {
      const vaultABI = [
        'function getStrategies() view returns (tuple(address strategy, uint256 targetWeight, uint256 currentBalance)[])',
        'function asset() view returns (address)',
        'function totalAssets() view returns (uint256)',
      ];

      const vault = new ethers.Contract(vaultAddress, vaultABI, provider);
      
      let strategiesData, assetAddress, totalAssets;
      
      try {
        // Try to fetch strategies first
        strategiesData = await vault.getStrategies();
        
        // If we got strategies, fetch other data
        [assetAddress, totalAssets] = await Promise.all([
          vault.asset(),
          vault.totalAssets(),
        ]);
      } catch (error: any) {
        console.log('Multi-strategy not enabled or error:', error.message);
        setStrategies([]);
        setLoading(false);
        return;
      }

      if (!strategiesData || strategiesData.length === 0) {
        setStrategies([]);
        setLoading(false);
        return;
      }

      // Get asset symbol
      const assetABI = ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'];
      const assetContract = new ethers.Contract(assetAddress, assetABI, provider);
      const [assetSymbol, decimals] = await Promise.all([
        assetContract.symbol(),
        assetContract.decimals(),
      ]);

      const total = Number(totalAssets);
      const formattedStrategies: Strategy[] = strategiesData.map((s: any) => ({
        address: s.strategy,
        targetWeight: Number(s.targetWeight) / 100,
        currentBalance: ethers.formatUnits(s.currentBalance, decimals),
        percentage: total > 0 ? (Number(s.currentBalance) / total) * 100 : 0,
      }));

      setStrategies(formattedStrategies);
      setSymbol(assetSymbol);
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="strategies-section">
        <h3>Active Strategies</h3>
        <div className="skeleton" />
      </section>
    );
  }

  if (strategies.length === 0) {
    return (
      <section className="strategies-section">
        <h3>Active Strategies</h3>
        <div className="empty-strategies">
          <p>Multi-strategy mode not enabled or no strategies configured</p>
        </div>
      </section>
    );
  }

  return (
    <section className="strategies-section">
      <h3>Active Strategies</h3>
      <div className="strategies-list">
        {strategies.map((strategy, index) => (
          <div key={strategy.address} className="strategy-card">
            <div className="strategy-header">
              <div className="strategy-name">
                <span className="strategy-number">#{index + 1}</span>
                Strategy {index + 1}
              </div>
              <div className="strategy-address">
                {strategy.address.slice(0, 6)}...{strategy.address.slice(-4)}
              </div>
            </div>

            <div className="strategy-stats">
              <div className="stat">
                <div className="stat-label">Current Balance</div>
                <div className="stat-value">
                  {formatNumber(strategy.currentBalance)} {symbol}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">Target Weight</div>
                <div className="stat-value">{strategy.targetWeight.toFixed(1)}%</div>
              </div>

              <div className="stat">
                <div className="stat-label">Current Allocation</div>
                <div className="stat-value">{strategy.percentage.toFixed(2)}%</div>
              </div>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(strategy.percentage, 100)}%` }}
              />
            </div>

            <div className="deviation">
              {Math.abs(strategy.percentage - strategy.targetWeight) > 1 && (
                <span className="deviation-badge">
                  {strategy.percentage > strategy.targetWeight ? '↑' : '↓'}{' '}
                  {Math.abs(strategy.percentage - strategy.targetWeight).toFixed(1)}% from target
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .strategies-section {
          margin: 48px 0;
        }

        .strategies-section h3 {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 24px 0;
        }

        .strategies-list {
          display: grid;
          gap: 20px;
        }

        .strategy-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .strategy-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }

        .strategy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .strategy-name {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .strategy-number {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 14px;
        }

        .strategy-address {
          font-family: monospace;
          font-size: 14px;
          color: #6b7280;
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .strategy-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          transition: width 0.3s ease;
        }

        .deviation {
          min-height: 24px;
        }

        .deviation-badge {
          display: inline-block;
          background: #fef3c7;
          color: #92400e;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .empty-strategies {
          background: white;
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          color: #6b7280;
        }

        .skeleton {
          height: 300px;
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
          .strategy-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .strategy-stats {
            grid-template-columns: 1fr;
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
    maximumFractionDigits: 2,
  }).format(num);
}

