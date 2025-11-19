import { ethers } from "hardhat";
import { RaylsVault } from "../typechain-types";



interface StrategyAllocation {
  strategy: string;
  targetWeight: ethers.BigNumber;
  currentBalance: ethers.BigNumber;
}

interface RebalanceAction {
  depositAmounts: ethers.BigNumber[];
  withdrawAmounts: ethers.BigNumber[];
  needsRebalance: boolean;
}

class RebalancingBot {
  private vault: RaylsVault;
  private wallet: ethers.Signer;
  private vaultAddress: string;
  private minRebalanceThreshold: number; 

  constructor(
    vault: RaylsVault,
    wallet: ethers.Signer,
    vaultAddress: string,
    minRebalanceThreshold: number = 100 // 
  ) {
    this.vault = vault;
    this.wallet = wallet;
    this.vaultAddress = vaultAddress;
    this.minRebalanceThreshold = minRebalanceThreshold;
  }

  async getStrategies(): Promise<StrategyAllocation[]> {
    return await this.vault.getStrategies();
  }

  async getTotalAssets(): Promise<ethers.BigNumber> {
    return await this.vault.totalAssets();
  }

  async calculateRebalance(): Promise<RebalanceAction> {
    const strategies = await this.getStrategies();
    const totalAssets = await this.getTotalAssets();

    console.log(`\n📊 Current State:`);
    console.log(`Total Assets: ${ethers.utils.formatUnits(totalAssets, 6)} tokens`);
    console.log(`Strategies: ${strategies.length}`);

    const depositAmounts: ethers.BigNumber[] = [];
    const withdrawAmounts: ethers.BigNumber[] = [];
    let needsRebalance = false;

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const targetWeight = strategy.targetWeight;
      const currentBalance = strategy.currentBalance;

      
      const targetAmount = totalAssets.mul(targetWeight).div(10000);
      const difference = targetAmount.sub(currentBalance);
      const percentDiff = currentBalance.gt(0) 
        ? difference.mul(10000).div(currentBalance).abs()
        : ethers.BigNumber.from(10000);

      console.log(`\n  Strategy ${i + 1}: ${strategy.strategy}`);
      console.log(`    Target Weight: ${targetWeight.toNumber() / 100}%`);
      console.log(`    Current: ${ethers.utils.formatUnits(currentBalance, 6)} tokens`);
      console.log(`    Target:  ${ethers.utils.formatUnits(targetAmount, 6)} tokens`);
      console.log(`    Diff:    ${ethers.utils.formatUnits(difference, 6)} tokens (${percentDiff.toNumber() / 100}%)`);


      if (percentDiff.gt(this.minRebalanceThreshold)) {
        needsRebalance = true;

        if (difference.gt(0)) {
          depositAmounts.push(difference);
          withdrawAmounts.push(ethers.BigNumber.from(0));
          console.log(`    Action: DEPOSIT ${ethers.utils.formatUnits(difference, 6)}`);
        } else {
          depositAmounts.push(ethers.BigNumber.from(0));
          withdrawAmounts.push(difference.abs());
          console.log(`    Action: WITHDRAW ${ethers.utils.formatUnits(difference.abs(), 6)}`);
        }
      } else {
        depositAmounts.push(ethers.BigNumber.from(0));
        withdrawAmounts.push(ethers.BigNumber.from(0));
        console.log(`    Action: SKIP (within threshold)`);
      }
    }

    return { depositAmounts, withdrawAmounts, needsRebalance };
  }

  async executeRebalance(action: RebalanceAction): Promise<string | null> {
    if (!action.needsRebalance) {
      console.log('\n✅ No rebalancing needed - all strategies within threshold');
      return null;
    }

    console.log('\n🔄 Executing rebalance transaction...');

    try {
      const gasEstimate = await this.vault.estimateGas.rebalance(
        action.depositAmounts,
        action.withdrawAmounts
      );
      console.log(`Gas estimate: ${gasEstimate.toString()}`);

      const tx = await this.vault.rebalance(
        action.depositAmounts,
        action.withdrawAmounts,
        {
          gasLimit: gasEstimate.mul(120).div(100), 
        }
      );

      console.log(`Transaction sent: ${tx.hash}`);
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log(`✅ Rebalance complete! Block: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);

      return tx.hash;
    } catch (error: any) {
      console.error('❌ Rebalance transaction failed:', error.message);
      if (error.reason) {
        console.error('Reason:', error.reason);
      }
      throw error;
    }
  }

  async rebalance(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log(`🤖 Rebalancing Bot - ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    console.log(`Vault: ${this.vaultAddress}`);
    console.log(`Threshold: ${this.minRebalanceThreshold / 100}%`);

    try {
      const action = await this.calculateRebalance();

      const txHash = await this.executeRebalance(action);

      if (txHash) {
        this.logRebalance(txHash, action);
      }
    } catch (error: any) {
      console.error('\n❌ Error during rebalancing:', error.message);
      await this.sendAlert('Rebalance failed', error.message);
    }
  }

  private logRebalance(txHash: string, action: RebalanceAction): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      txHash,
      depositAmounts: action.depositAmounts.map(a => a.toString()),
      withdrawAmounts: action.withdrawAmounts.map(a => a.toString()),
    };
    console.log('\n📝 Log entry:', JSON.stringify(logEntry, null, 2));
  }

  private async sendAlert(subject: string, message: string): Promise<void> {
    console.error(`\n🚨 ALERT: ${subject}`);
    console.error(`Message: ${message}`);
  }

  async start(intervalMinutes: number = 60): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Starting Rebalancing Bot');
    console.log('='.repeat(60));
    console.log(`Vault: ${this.vaultAddress}`);
    console.log(`Interval: ${intervalMinutes} minutes`);
    console.log(`Threshold: ${this.minRebalanceThreshold / 100}%`);
    console.log('='.repeat(60));

    await this.rebalance().catch(err => {
      console.error('Initial rebalance error:', err);
    });

    setInterval(async () => {
      try {
        await this.rebalance();
      } catch (error) {
        console.error('Periodic rebalance error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log('\n✅ Bot is running... Press Ctrl+C to stop');
  }
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
  const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY;
  const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES || "1");
  const REBALANCE_THRESHOLD_BPS = parseInt(process.env.REBALANCE_THRESHOLD_BPS || "100");
  const RPC_URL = process.env.RPC_URL;

  if (!VAULT_ADDRESS) {
    throw new Error("VAULT_ADDRESS environment variable is required");
  }

  let wallet: ethers.Signer;
  
  if (BOT_PRIVATE_KEY) {
    const provider = RPC_URL 
      ? new ethers.providers.JsonRpcProvider(RPC_URL)
      : ethers.provider;
    wallet = new ethers.Wallet(BOT_PRIVATE_KEY, provider);
    console.log("Using bot wallet:", await wallet.getAddress());
  } else {
    [wallet] = await ethers.getSigners();
    console.log("Using default signer:", await wallet.getAddress());
  }

  const vault = await ethers.getContractAt(
    "RaylsVault",
    VAULT_ADDRESS,
    wallet
  ) as RaylsVault;

  const botAddress = await wallet.getAddress();
  const authorizedBot = await vault.getAllocationBot();
  
  if (botAddress.toLowerCase() !== authorizedBot.toLowerCase()) {
    const registry = await vault.getRegistry();
    const registryContract = await ethers.getContractAt(
      "IRaylsVaultRegistry",
      registry
    );
    const owner = await registryContract.owner();
    
    if (botAddress.toLowerCase() !== owner.toLowerCase()) {
      throw new Error(
        `Bot address ${botAddress} is not authorized. ` +
        `Authorized bot: ${authorizedBot}, Owner: ${owner}`
      );
    }
    console.log("⚠️  Running as owner (not as designated bot)");
  }

  const bot = new RebalancingBot(
    vault,
    wallet,
    VAULT_ADDRESS,
    REBALANCE_THRESHOLD_BPS
  );

  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down bot...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down bot...');
    process.exit(0);
  });

  await bot.start(INTERVAL_MINUTES);
}

if (require.main === module) {
  main()
    .then(() => {   
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { RebalancingBot };

