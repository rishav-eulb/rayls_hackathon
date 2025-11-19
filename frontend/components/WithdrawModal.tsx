/**
 * WithdrawModal Component
 * 
 * Modal for withdrawing tokens from the vault
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ethers } from 'ethers';

interface WithdrawModalProps {
  vaultAddress: string;
  signer: ethers.Signer;
  walletAddress: string;
  onClose: () => void;
}

export function WithdrawModal({ vaultAddress, signer, walletAddress, onClose }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [shares, setShares] = useState('0');
  const [estimatedAssets, setEstimatedAssets] = useState('0');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [symbol, setSymbol] = useState('TOKEN');
  const [decimals, setDecimals] = useState(18);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSharesInfo();
    
    // Lock body scroll when modal opens
    document.body.style.overflow = 'hidden';
    
    // Cleanup: restore scroll on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      estimateAssets();
    } else {
      setEstimatedAssets('0');
    }
  }, [amount]);

  const fetchSharesInfo = async () => {
    try {
      const vaultABI = [
        'function balanceOf(address) view returns (uint256)',
        'function asset() view returns (address)',
      ];
      const vault = new ethers.Contract(vaultAddress, vaultABI, signer);
      const [sharesBalance, assetAddress] = await Promise.all([
        vault.balanceOf(walletAddress),
        vault.asset(),
      ]);

      const assetABI = [
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
      ];
      const assetContract = new ethers.Contract(assetAddress, assetABI, signer);
      const [dec, sym] = await Promise.all([
        assetContract.decimals(),
        assetContract.symbol(),
      ]);

      setShares(ethers.formatUnits(sharesBalance, dec));
      setDecimals(dec);
      setSymbol(sym);
    } catch (err) {
      console.error('Failed to fetch shares info:', err);
      setError('Failed to load share information');
    }
  };

  const estimateAssets = async () => {
    try {
      const vaultABI = ['function convertToAssets(uint256) view returns (uint256)'];
      const vault = new ethers.Contract(vaultAddress, vaultABI, signer);
      const sharesWei = ethers.parseUnits(amount, decimals);
      const assets = await vault.convertToAssets(sharesWei);
      setEstimatedAssets(ethers.formatUnits(assets, decimals));
    } catch (err) {
      setEstimatedAssets('0');
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    setError('');
    try {
      const vaultABI = ['function withdraw(uint256,address,address) returns (uint256)'];
      const vault = new ethers.Contract(vaultAddress, vaultABI, signer);
      const assetsWei = ethers.parseUnits(amount, decimals);
      const tx = await vault.withdraw(assetsWei, walletAddress, walletAddress);
      await tx.wait();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(shares);
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
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Withdraw Tokens</h2>
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
            <span>Your Vault Shares:</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{parseFloat(shares).toFixed(4)} shares</span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
              Amount to Withdraw (in shares)
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
              <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>shares</span>
            </div>
          </div>

          {parseFloat(estimatedAssets) > 0 && (
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
              You will receive approximately <strong>{parseFloat(estimatedAssets).toFixed(4)} {symbol}</strong>
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

          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: '13px',
            color: '#92400e',
            marginBottom: '16px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: '#fbbf24' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Withdrawals are pulled from strategies with the lowest balance first</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(shares)}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                opacity: (isWithdrawing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(shares)) ? 0.5 : 1,
              }}
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
            </button>
            <button onClick={onClose} disabled={isWithdrawing} style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'white',
              color: '#374151',
              border: '2px solid #e5e7eb',
              opacity: isWithdrawing ? 0.5 : 1,
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
