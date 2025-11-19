# Rayls Vault System

A multi-strategy ERC4626-compliant vault system for yield optimization on the Rayls network.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Contract Verification](#contract-verification)
- [Frontend Setup](#frontend-setup)
- [Usage](#usage)
- [Scripts Reference](#scripts-reference)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Rayls Vault System is a sophisticated DeFi protocol that enables:
- **Multi-strategy yield optimization** across multiple protocols
- **Dynamic rebalancing** based on configurable weights
- **ERC4626-compliant vaults** with upgradeable architecture
- **Strategy management** with performance tracking
- **User-friendly frontend** for deposits, withdrawals, and monitoring

## ✨ Features

- 🏦 **Multi-Strategy Vaults**: Distribute assets across multiple yield strategies
- 📊 **Dynamic Rebalancing**: Automated or manual rebalancing based on target weights
- 🔄 **Strategy Types**:
  - Simple Mock Strategy (testing)
  - ERC4626 Child Vault Strategy (production)
- 📈 **Performance Tracking**: Monitor strategy performance and rewards
- 🔐 **Access Control**: Role-based permissions for vault management
- ⚡ **Gas Optimized**: Efficient contract design for minimal gas costs
- 🎨 **Modern UI**: Next.js-based frontend with real-time updates

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** v18.0.0 or higher (v20+ recommended)
- **npm** v9.0.0 or higher
- **Git**
- **Metamask** or another Web3 wallet
- **Rayls testnet ETH** for gas fees
- **Test tokens** (USDC or other assets you want to use)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/rishav-eulb/rayls_hackathon.git
cd rayls_hackathon
```

### 2. Install Dependencies

```bash
# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Compile Contracts

```bash
npm run compile
```

You should see:
```
✅ Compiled 52 Solidity files successfully
```

## 🔧 Environment Setup

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
cp .env.example .env  # If example exists, or create new
```

### 2. Configure Environment Variables

Edit `.env` with your values:

```bash
# ============================================
# NETWORK CONFIGURATION
# ============================================
RAYLS_RPC_URL=https://devnet-rpc.rayls.com
CHAIN_ID=123123

# ============================================
# WALLET CONFIGURATION
# ============================================
# Your deployer private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# ============================================
# TOKEN ADDRESSES
# ============================================
# Asset token address (e.g., USDC)
ASSET_ADDRESS=0xDe21f028B087BB1fd148f998821307Ea71655CEE

# ============================================
# DEPLOYMENT CONFIGURATION
# ============================================
# Strategy type: "simple" or "erc4626"
STRATEGY_TYPE=erc4626

# Treasury address (receives fees)
TREASURY=0xYourTreasuryAddress

# ============================================
# DEPLOYED CONTRACT ADDRESSES
# (Fill these after deployment)
# ============================================
INITIAL_STRATEGY=
STRATEGIES=
CHILD_VAULT=
VAULT_ADDRESS=
REGISTRY_ADDRESS=
STRATEGY_MANAGER_ADDRESS=

```

### 3. Frontend Environment Variables

Create `frontend/.env.local`:

```bash
# ============================================
# NETWORK CONFIGURATION
# ============================================
NEXT_PUBLIC_RPC_URL=https://devnet-rpc.rayls.com
NEXT_PUBLIC_CHAIN_ID=123123

# ============================================
# CONTRACT ADDRESSES
# (Copy from root .env after deployment)
# ============================================
NEXT_PUBLIC_VAULT_ADDRESS=
NEXT_PUBLIC_ASSET_ADDRESS=0xDe21f028B087BB1fd148f998821307Ea71655CEE

# ============================================
# OPTIONAL: AI CHAT FEATURES
# ============================================
OPENAI_API_KEY=sk-...
```

⚠️ **Security Note**: 
- NEVER commit `.env` or `.env.local` files
- Add them to `.gitignore`
- Use environment-specific API keys

## 📝 Smart Contract Deployment

### Option 1: Full System Deployment (Recommended)

Deploy everything in one go:

```bash
# 1. Deploy Strategy
npm run deploy:strategy:erc4626:rayls

# Output:
# ✅ Child Vault: 0x...
# ✅ Strategy: 0x...

# 2. Update .env with strategy addresses
INITIAL_STRATEGY=0xYourStrategyAddress
STRATEGIES=0xYourStrategyAddress
CHILD_VAULT=0xYourChildVaultAddress

# 3. Deploy Complete Vault System
npm run deploy:system:rayls

# Output:
# ✅ Registry: 0x...
# ✅ Vault: 0x...
# ✅ StrategyManager: 0x...
```

### Option 2: Step-by-Step Deployment

#### Step 1: Deploy Strategy

```bash
# For ERC4626 Strategy (Production)
ASSET_ADDRESS=0xYourAssetAddress \
STRATEGY_TYPE=erc4626 \
npm run deploy:strategy:rayls

# For Simple Strategy (Testing)
ASSET_ADDRESS=0xYourAssetAddress \
STRATEGY_TYPE=simple \
npm run deploy:strategy:rayls
```

**Save the output addresses!**

#### Step 2: Update Environment

```bash
# Add to .env
INITIAL_STRATEGY=0xDeployedStrategyAddress1
STRATEGIES=0xDeployedStrategyAddress1,0xDeployedStrategyAddress2,0xDeployedStrategyAddress3
```

#### Step 3: Deploy Vault System

```bash
npm run deploy:system:rayls
```

#### Step 4: Link Strategy to Vault

```bash
# After vault deployment, link the strategy
cast send $INITIAL_STRATEGY \
  "setVault(address)" \
  $VAULT_ADDRESS \
  --rpc-url $RAYLS_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Multi-Strategy Setup

To add multiple strategies:

```bash
# Deploy multiple strategies
npm run deploy:strategy:erc4626:rayls  # Strategy 1
npm run deploy:strategy:erc4626:rayls  # Strategy 2
npm run deploy:strategy:erc4626:rayls  # Strategy 3

# Update .env with comma-separated addresses
STRATEGIES=0xStrategy1,0xStrategy2,0xStrategy3

# Deploy vault system
npm run deploy:system:rayls
```

### Deployment Verification

After deployment, verify everything is set up:

```bash
# Check vault status
npm run check:vault

# Check strategy balances
npm run check:strategies:rayls
```

## ✅ Contract Verification

Verify your contracts on the Rayls block explorer:

```bash
# Verify Strategy
CONTRACT_ADDRESS=0xYourStrategyAddress \
CONTRACT_TYPE=strategy \
ASSET_ADDRESS=0xYourAssetAddress \
CHILD_VAULT=0xYourChildVaultAddress \
npm run verify:contract:rayls

# Verify Child Vault
CONTRACT_ADDRESS=0xYourChildVaultAddress \
CONTRACT_TYPE=childvault \
ASSET_ADDRESS=0xYourAssetAddress \
npm run verify:contract:rayls

# Verify Strategy Manager
CONTRACT_ADDRESS=0xYourStrategyManagerAddress \
CONTRACT_TYPE=strategymanager \
npm run verify:contract:rayls
```

View verified contracts at:
```
https://devnet-explorer.rayls.com/address/YOUR_CONTRACT_ADDRESS
```

See [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) for more details.

## 🎨 Frontend Setup

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Frontend Environment

Update `frontend/.env.local` with your deployed contract addresses:

```bash
NEXT_PUBLIC_RPC_URL=https://devnet-rpc.rayls.com
NEXT_PUBLIC_CHAIN_ID=123123
NEXT_PUBLIC_VAULT_ADDRESS=0xYourVaultAddress
NEXT_PUBLIC_ASSET_ADDRESS=0xYourAssetAddress
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📚 Scripts Reference

### Deployment Scripts

```bash
npm run deploy:strategy:rayls          # Deploy strategy (default: erc4626)
npm run deploy:strategy:erc4626:rayls  # Deploy ERC4626 strategy
npm run deploy:system:rayls            # Deploy complete vault system
```

### Management Scripts

```bash
npm run deposit:rayls          # Deposit to vault
npm run withdraw:rayls         # Withdraw from vault
npm run rebalance:rayls        # Rebalance vault
npm run update-weights:rayls   # Update strategy weights
npm run bot:start              # Start rebalancing bot
```

### Monitoring Scripts

```bash
npm run check:vault            # Check vault status
npm run check:strategies:rayls # Check strategy balances
npm run check:status           # Check registry status
```

### Verification Scripts

```bash
npm run verify:contract:rayls  # Verify contract on explorer
```

### Development Scripts

```bash
npm run compile                # Compile contracts
npm run clean                  # Clean artifacts
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           Users (Depositors)            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         RaylsVault (ERC4626)            │
│  - Multi-strategy support               │
│  - Dynamic rebalancing                  │
│  - Access control                       │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┬───────────────┐
       ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│ ERC4626Child │ │ ERC4626Child│ │   Simple    │
│  Strategy 1  │ │  Strategy 2 │ │  Strategy   │
└──────┬───────┘ └──────┬──────┘ └──────┬──────┘
       │                │                │
       ▼                ▼                ▼
┌──────────────┐ ┌─────────────┐   [Holds assets
│ Child Vault  │ │ Child Vault │    directly]
│  (ERC4626)   │ │  (ERC4626)  │
└──────────────┘ └─────────────┘
```

### Core Components

- **RaylsVault**: Main vault contract (ERC4626)
- **SimpleRaylsVaultRegistry**: Factory for deploying vaults
- **StrategyManager**: Tracks strategy performance
- **ERC4626ChildStrategy**: Strategy that deposits into child vaults
- **ExtendedChildERC4626Vault**: Feature-rich child vault

### Strategy Types

1. **Simple Strategy** (`MockStrategyCorrect`)
   - Directly holds assets
   - Good for testing
   - Minimal complexity

2. **ERC4626 Strategy** (`ERC4626ChildStrategy`)
   - Deposits into child ERC4626 vaults
   - Production-ready
   - Supports deposit caps, whitelists, pausability

**Built with ❤️ for the Rayls Hackathon**
