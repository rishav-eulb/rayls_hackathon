/**
 * DepositModal Component
 * 
 * Modal for depositing tokens into the vault
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ethers } from 'ethers';

interface DepositModalProps {
  vaultAddress: string;
  signer: ethers.Signer;
  walletAddress: string;
  onClose: () => void;
}

export function DepositModal({ vaultAddress, signer, walletAddress, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [estimatedShares, setEstimatedShares] = useState('0');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState('');
  const [assetAddress, setAssetAddress] = useState('');
  const [symbol, setSymbol] = useState('TOKEN');
  const [decimals, setDecimals] = useState(18);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAssetInfo();
    
    // Lock body scroll when modal opens
    document.body.style.overflow = 'hidden';
    
    // Cleanup: restore scroll on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      estimateShares();
      checkApproval();
    } else {
      setEstimatedShares('0');
    }
  }, [amount]);

  const fetchAssetInfo = async () => {
    try {
      const vaultABI = ['function asset() view returns (address)'];
      const vault = new ethers.Contract(vaultAddress, vaultABI, signer);
      const asset = await vault.asset();

      const assetABI = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
      ];
      const assetContract = new ethers.Contract(asset, assetABI, signer);
      const [bal, dec, sym] = await Promise.all([
        assetContract.balanceOf(walletAddress),
        assetContract.decimals(),
        assetContract.symbol(),
      ]);

      setAssetAddress(asset);
      setBalance(ethers.formatUnits(bal, dec));
      setDecimals(dec);
      setSymbol(sym);
    } catch (err) {
      console.error('Failed to fetch asset info:', err);
      setError('Failed to load asset information');
    }
  };

  const estimateShares = async () => {
    try {
      const vaultABI = ['function convertToShares(uint256) view returns (uint256)'];
      const vault = new ethers.Contract(vaultAddress, vaultABI, signer);
      const amountWei = ethers.parseUnits(amount, decimals);
      const shares = await vault.convertToShares(amountWei);
      setEstimatedShares(ethers.formatUnits(shares, decimals));
    } catch (err) {
      setEstimatedShares('0');
    }
  };

  const checkApproval = async () => {
    try {
      const assetABI = ['function allowance(address,address) view returns (uint256)'];
      const assetContract = new ethers.Contract(assetAddress, assetABI, signer);
      const allowance = await assetContract.allowance(walletAddress, vaultAddress);
      const amountWei = ethers.parseUnits(amount, decimals);
      setNeedsApproval(allowance < amountWei);
    } catch (err) {
      setNeedsApproval(true);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    setError('');
    try {
      const assetABI = ['function approve(address,uint256) returns (bool)'];
      const assetContract = new ethers.Contract(assetAddress, assetABI, signer);
      const amountWei = ethers.parseUnits(amount, decimals);
      const tx = await assetContract.approve(vaultAddress, amountWei);
      await tx.wait();
      setNeedsApproval(false);
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    setIsDepositing(true);
    setError('');
    try {
      const vaultABI = ['function deposit(uint256,address) returns (uint256)'];
      const vault = new ethers.Contract(vaultAddress, vaultABI, signer);
      const amountWei = ethers.parseUnits(amount, decimals);
      const tx = await vault.deposit(amountWei, walletAddress);
      await tx.wait();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(balance);
  };

  if (!mounted) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
    backdropFilter: 'blur(2px)',
  };

  const modalStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
  };

  const modalContent = (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Deposit Tokens</h2>
          <button style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#6b7280',
          }} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#6b7280',
          }}>
            <span>Available Balance:</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{parseFloat(balance).toFixed(4)} {symbol}</span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
              Amount to Deposit
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="any"
                min="0"
                style={{
                  width: '100%',
                  padding: '16px 80px 16px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              />
              <button style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }} onClick={setMaxAmount}>
                MAX
              </button>
            </div>
            <div style={{ marginTop: '8px', paddingLeft: '4px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>{symbol}</span>
            </div>
          </div>

          {parseFloat(estimatedShares) > 0 && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              fontSize: '14px',
              color: '#1e40af',
              marginBottom: '16px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: '#3b82f6' }}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              You will receive approximately <strong>{parseFloat(estimatedShares).toFixed(4)} shares</strong>
            </div>
          )}

          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              fontSize: '14px',
              color: '#991b1b',
              marginBottom: '16px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: '#ef4444' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isApproving || !amount || parseFloat(amount) <= 0}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  opacity: (isApproving || !amount || parseFloat(amount) <= 0) ? 0.5 : 1,
                }}
              >
                {isApproving ? 'Approving...' : `Approve ${symbol}`}
              </button>
            ) : (
              <button
                onClick={handleDeposit}
                disabled={isDepositing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(balance)}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  opacity: (isDepositing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(balance)) ? 0.5 : 1,
                }}
              >
                {isDepositing ? 'Depositing...' : 'Deposit'}
              </button>
            )}
            <button onClick={onClose} disabled={isApproving || isDepositing} style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'white',
              color: '#374151',
              border: '2px solid #e5e7eb',
              opacity: (isApproving || isDepositing) ? 0.5 : 1,
            }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

