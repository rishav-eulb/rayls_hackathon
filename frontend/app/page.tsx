/**
 * Main Vault Page
 * 
 * Homepage with vault interface and AI chat integration
 */

'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ChatWidget } from '../components/ChatWidget';
import { VaultStats } from '../components/VaultStats';
import { DepositModal } from '../components/DepositModal';
import { WithdrawModal } from '../components/WithdrawModal';
import { StrategyList } from '../components/StrategyList';
import { UserPosition } from '../components/UserPosition';
import { DebugPanel } from '../components/DebugPanel';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '';
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://eth.llamarpc.com';
  const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
  const EXPECTED_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '0x'; // Add this to your .env.local

  // Initialize read-only provider on mount
  useEffect(() => {
    const readProvider = new ethers.JsonRpcProvider(RPC_URL);
    setProvider(readProvider);
  }, [RPC_URL]);

  // Connect wallet with network validation
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      
      // Get current chain ID
      const network = await browserProvider.getNetwork();
      const currentChainId = '0x' + network.chainId.toString(16);
      
      console.log('Current chain ID:', currentChainId);
      console.log('Expected chain ID:', EXPECTED_CHAIN_ID);

      // Check if we're on the right network
      if (EXPECTED_CHAIN_ID && currentChainId !== EXPECTED_CHAIN_ID) {
        try {
          // Try to switch to the correct network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: EXPECTED_CHAIN_ID }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            alert(
              `Please add the Rayls Devnet to MetaMask:\n\n` +
              `Network Name: Rayls Devnet\n` +
              `RPC URL: ${RPC_URL}\n` +
              `Chain ID: ${EXPECTED_CHAIN_ID}\n` +
              `Currency Symbol: ETH`
            );
            setIsConnecting(false);
            return;
          }
          throw switchError;
        }
      }

      await browserProvider.send('eth_requestAccounts', []);
      const web3Signer = await browserProvider.getSigner();
      const address = await web3Signer.getAddress();

      setSigner(web3Signer);
      setWalletAddress(address);
      setProvider(browserProvider);
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      if (error.code === 4001) {
        alert('Connection rejected. Please approve in your wallet.');
      } else {
        alert('Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletAddress(null);
    setSigner(null);
    // Reset to read-only provider
    setProvider(new ethers.JsonRpcProvider(RPC_URL));
  };

  if (!provider) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
            <h1>Nexus Vault</h1>
          </div>

          <div className="header-actions">
            {!walletAddress ? (
              <button
                className="connect-btn"
                onClick={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="wallet-info">
                <div className="wallet-address">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
                <button className="disconnect-btn" onClick={disconnectWallet}>
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero">
            <h2>Multi-Strategy Yield Vault</h2>
            <p>
              Earn optimized yields across multiple DeFi strategies with automated rebalancing
              and risk management.
            </p>
          </section>

          {/* Vault Stats */}
          <VaultStats vaultAddress={VAULT_ADDRESS} provider={provider} />

          {/* User Position (only if wallet connected) */}
          {walletAddress && (
            <UserPosition
              vaultAddress={VAULT_ADDRESS}
              walletAddress={walletAddress}
              provider={provider}
            />
          )}

          {/* Action Buttons */}
          <section className="actions">
            <button
              className="action-btn deposit-btn"
              onClick={() => setShowDepositModal(true)}
              disabled={!walletAddress}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14m-7-7h14" />
              </svg>
              Deposit
            </button>
            <button
              className="action-btn withdraw-btn"
              onClick={() => setShowWithdrawModal(true)}
              disabled={!walletAddress}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5m-7 7h14" />
              </svg>
              Withdraw
            </button>
          </section>

          {!walletAddress && (
            <div className="connect-prompt">
              <p>Connect your wallet to deposit, withdraw, and view your position</p>
            </div>
          )}

          {/* Strategies */}
          <StrategyList vaultAddress={VAULT_ADDRESS} provider={provider} />
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          Powered by Nexus Network | 
          <a href="#" target="_blank" rel="noopener noreferrer"> Docs</a> | 
          <a href="#" target="_blank" rel="noopener noreferrer"> GitHub</a>
        </p>
      </footer>

      {/* Modals */}
      {showDepositModal && signer && (
        <DepositModal
          vaultAddress={VAULT_ADDRESS}
          signer={signer}
          walletAddress={walletAddress!}
          onClose={() => setShowDepositModal(false)}
        />
      )}

      {showWithdrawModal && signer && (
        <WithdrawModal
          vaultAddress={VAULT_ADDRESS}
          signer={signer}
          walletAddress={walletAddress!}
          onClose={() => setShowWithdrawModal(false)}
        />
      )}

      {/* Debug Panel - Remove after fixing */}
      <DebugPanel vaultAddress={VAULT_ADDRESS} provider={provider} />

      {/* AI Chat Widget */}
      {OPENAI_API_KEY && (
        <ChatWidget
          apiKey={OPENAI_API_KEY}
          vaultAddress={VAULT_ADDRESS}
          walletAddress={walletAddress}
          provider={provider}
          onApiKeyRequest={() => {
            alert('Please set NEXT_PUBLIC_OPENAI_API_KEY in your .env.local file');
          }}
        />
      )}

      <style jsx>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
        }

        .loading-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #667eea;
        }

        .logo h1 {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .connect-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .connect-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .connect-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wallet-address {
          background: #f3f4f6;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 14px;
          color: #374151;
        }

        .disconnect-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .disconnect-btn:hover {
          background: #dc2626;
        }

        .main {
          flex: 1;
          padding: 48px 24px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero {
          text-align: center;
          margin-bottom: 48px;
        }

        .hero h2 {
          font-size: 36px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .hero p {
          font-size: 18px;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto;
        }

        .actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin: 48px 0;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .deposit-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .deposit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
        }

        .withdraw-btn {
          background: white;
          color: #374151;
          border: 2px solid #e5e7eb;
        }

        .withdraw-btn:hover:not(:disabled) {
          border-color: #667eea;
          color: #667eea;
        }

        .connect-prompt {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          margin: 24px 0;
        }

        .connect-prompt p {
          margin: 0;
          color: #92400e;
          font-weight: 500;
        }

        .footer {
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 24px;
          text-align: center;
        }

        .footer p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .footer a {
          color: #667eea;
          text-decoration: none;
          margin: 0 8px;
        }

        .footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 16px;
          }

          .hero h2 {
            font-size: 28px;
          }

          .hero p {
            font-size: 16px;
          }

          .actions {
            flex-direction: column;
          }

          .action-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

