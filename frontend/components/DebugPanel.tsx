/**
 * Debug Panel - Remove this after fixing issues
 * 
 * Shows environment configuration and tests contract connection
 */

'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface DebugPanelProps {
  vaultAddress: string;
  provider: ethers.Provider | null;
}

export function DebugPanel({ vaultAddress, provider }: DebugPanelProps) {
  const [testResults, setTestResults] = useState<any>({});
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (provider && vaultAddress) {
      runTests();
    }
  }, [provider, vaultAddress]);

  const runTests = async () => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || '';
    const results: any = {
      envVars: {
        vaultAddress: vaultAddress || '❌ MISSING',
        rpcUrl: rpcUrl || '❌ MISSING',
        chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '❌ MISSING',
        hasOpenAI: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      },
      tests: {},
    };

    if (!vaultAddress || !rpcUrl) {
      setTestResults(results);
      return;
    }

    // Create a fresh provider for each test to avoid stale connections
    // This prevents NETWORK_ERROR when MetaMask switches networks
    const testProvider = new ethers.JsonRpcProvider(rpcUrl);

    // Test 1: Basic contract code
    try {
      const code = await testProvider.getCode(vaultAddress);
      results.tests.contractExists = code !== '0x' ? '✅ Contract exists' : '❌ No contract at address';
    } catch (error: any) {
      results.tests.contractExists = `❌ Error: ${error.shortMessage || error.message}`;
    }

    // Test 2: totalAssets()
    try {
      const vaultABI = ['function totalAssets() view returns (uint256)'];
      const vault = new ethers.Contract(vaultAddress, vaultABI, testProvider);
      const total = await vault.totalAssets();
      results.tests.totalAssets = `✅ ${ethers.formatEther(total)} (works!)`;
    } catch (error: any) {
      results.tests.totalAssets = `❌ ${error.code || error.shortMessage || error.message}`;
    }

    // Test 3: asset()
    try {
      const vaultABI = ['function asset() view returns (address)'];
      const vault = new ethers.Contract(vaultAddress, vaultABI, testProvider);
      const asset = await vault.asset();
      results.tests.asset = `✅ ${asset}`;
    } catch (error: any) {
      results.tests.asset = `❌ ${error.code || error.shortMessage || error.message}`;
    }

    // Test 4: getStrategies()
    try {
      const vaultABI = [
        'function getStrategies() view returns (tuple(address strategy, uint256 targetWeight, uint256 currentBalance)[])',
      ];
      const vault = new ethers.Contract(vaultAddress, vaultABI, testProvider);
      const strategies = await vault.getStrategies();
      results.tests.getStrategies = `✅ ${strategies.length} strategies`;
    } catch (error: any) {
      results.tests.getStrategies = `❌ ${error.code || error.shortMessage || error.message}`;
    }

    setTestResults(results);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          padding: '8px 16px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 999,
          fontSize: '12px',
        }}
      >
        Show Debug Panel
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        width: '400px',
        maxHeight: '80vh',
        overflow: 'auto',
        background: 'white',
        border: '2px solid #ef4444',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 999,
        fontSize: '13px',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <strong style={{ color: '#ef4444' }}>🔧 DEBUG PANEL</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <strong>Environment Variables:</strong>
        <div style={{ marginTop: '8px', background: '#f3f4f6', padding: '8px', borderRadius: '4px' }}>
          <div>Vault: {testResults.envVars?.vaultAddress}</div>
          <div>RPC: {testResults.envVars?.rpcUrl}</div>
          <div>OpenAI: {testResults.envVars?.hasOpenAI ? '✅' : '❌'}</div>
        </div>
      </div>

      <div>
        <strong>Contract Tests:</strong>
        <div style={{ marginTop: '8px', background: '#f3f4f6', padding: '8px', borderRadius: '4px' }}>
          {Object.entries(testResults.tests || {}).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '4px' }}>
              <strong>{key}:</strong> {value as string}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={runTests}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '8px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Re-run Tests
      </button>

      <div
        style={{
          marginTop: '12px',
          padding: '8px',
          background: '#fef3c7',
          borderRadius: '4px',
          fontSize: '11px',
        }}
      >
        <strong>Fix Issues:</strong>
        <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
          <li>Create frontend/.env.local</li>
          <li>Add NEXT_PUBLIC_VAULT_ADDRESS</li>
          <li>Add NEXT_PUBLIC_RPC_URL</li>
          <li>Add NEXT_PUBLIC_CHAIN_ID=0x1e0f3</li>
          <li>Restart dev server</li>
        </ol>
      </div>
    </div>
  );
}

