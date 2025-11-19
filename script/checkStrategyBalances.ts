import { ethers } from "hardhat";

dotenv.config();

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("📊 STRATEGY BALANCES CHECK");
    console.log("=".repeat(70));

    const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
    const ASSET_ADDRESS = process.env.ASSET_ADDRESS;

    const [signer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("\n📋 Configuration:");
    console.log("━".repeat(70));
    console.log("Network:          ", network.name);
    console.log("Viewer:           ", signer.address);
    console.log("Vault:            ", VAULT_ADDRESS);
    console.log("Asset (USDC):     ", ASSET_ADDRESS);
    console.log("━".repeat(70));

    // Connect to contracts
    const vault = await ethers.getContractAt("RaylsVault", VAULT_ADDRESS);
    const asset = await ethers.getContractAt("IERC20", ASSET_ADDRESS);

    // ============================================
    // Vault Overview
    // ============================================
    
    console.log("\n🏦 Vault Overview:");
    console.log("━".repeat(70));
    
    const vaultBalance = await asset.balanceOf(VAULT_ADDRESS);
    const totalAssets = await vault.totalAssets();
    const totalSupply = await vault.totalSupply();
    const multiStrategyEnabled = await vault.isMultiStrategyEnabled();
    const strategyManagerAddress = await vault.getStrategyManager();
    const botAddress = await vault.getAllocationBot();
    
    console.log("Multi-Strategy:   ", multiStrategyEnabled ? "✅ Enabled" : "❌ Disabled");
    console.log("Total Assets:     ", ethers.formatUnits(totalAssets, 6), "USDC");
    console.log("Idle in Vault:    ", ethers.formatUnits(vaultBalance, 6), "USDC");
    console.log("Deployed:         ", ethers.formatUnits(totalAssets - vaultBalance, 6), "USDC");
    console.log("Total Shares:     ", ethers.formatEther(totalSupply));
    console.log("StrategyManager:  ", strategyManagerAddress);
    console.log("Bot:              ", botAddress);
    console.log("━".repeat(70));

    // ============================================
    // Strategy Details
    // ============================================
    
    console.log("\n📈 Strategy Balances:");
    console.log("━".repeat(70));
    
    const strategies = await vault.getStrategies();
    
    if (strategies.length === 0) {
        console.log("❌ No strategies configured");
        return;
    }

    let totalDeployed = 0n;
    let totalWeight = 0;

    for (let i = 0; i < strategies.length; i++) {
        const strat = strategies[i];
        
        try {
            const strategy = await ethers.getContractAt("MockStrategy", strat.strategy);
            const actualBalance = await strategy.getTotalAssets();
            const trackedBalance = strat.currentBalance;
            const targetWeight = Number(strat.targetWeight);
            
            totalDeployed += actualBalance;
            totalWeight += targetWeight;

            
            const percentOfTotal = totalAssets > 0n 
                ? Number((actualBalance * 10000n) / totalAssets) / 100 
                : 0;

            const hasRewards = actualBalance > trackedBalance;
            const rewardAmount = actualBalance - trackedBalance;

            console.log(`\nStrategy ${i + 1}:`);
            console.log("  Address:        ", strat.strategy);
            console.log("  Target Weight:  ", `${targetWeight} (${(targetWeight/100).toFixed(2)}%)`);
            console.log("  Actual Balance: ", ethers.formatUnits(actualBalance, 6), "USDC");
            console.log("  Tracked Balance:", ethers.formatUnits(trackedBalance, 6), "USDC");
            console.log("  % of Total:     ", `${percentOfTotal.toFixed(2)}%`);
            
            if (hasRewards && rewardAmount > 0n) {
                console.log("  🎁 Rewards:     ", ethers.formatUnits(rewardAmount, 6), "USDC (not yet synced)");
            }

            const vaultInStrategy = await strategy.getVault();
            if (vaultInStrategy.toLowerCase() !== VAULT_ADDRESS.toLowerCase()) {
                console.log("  ⚠️  WARNING:     Vault not set correctly in strategy!");
                console.log("      Expected:   ", VAULT_ADDRESS);
                console.log("      Got:        ", vaultInStrategy);
            }
            
        } catch (error: any) {
            console.log(`\nStrategy ${i + 1}:`);
            console.log("  Address:        ", strat.strategy);
            console.log("  ❌ Error:       ", error.message);
        }
    }

    console.log("\n━".repeat(70));

    // ============================================
    // Summary Statistics
    // ============================================
    
    console.log("\n📊 Summary:");
    console.log("━".repeat(70));
    console.log("Total Strategies: ", strategies.length);
    console.log("Total Weight:     ", totalWeight, `(${(totalWeight/100).toFixed(2)}%)`);
    console.log("Total Deployed:   ", ethers.formatUnits(totalDeployed, 6), "USDC");
    console.log("Idle in Vault:    ", ethers.formatUnits(vaultBalance, 6), "USDC");
    console.log("Grand Total:      ", ethers.formatUnits(totalAssets, 6), "USDC");
    
    const utilizationRate = totalAssets > 0n 
        ? Number((totalDeployed * 10000n) / totalAssets) / 100 
        : 0;
    console.log("Utilization Rate: ", `${utilizationRate.toFixed(2)}%`);
    console.log("━".repeat(70));

    // ============================================
    // Allocation vs Target
    // ============================================
    
    console.log("\n🎯 Allocation vs Target:");
    console.log("━".repeat(70));
    
    for (let i = 0; i < strategies.length; i++) {
        const strat = strategies[i];
        
        try {
            const strategy = await ethers.getContractAt("MockStrategy", strat.strategy);
            const actualBalance = await strategy.getTotalAssets();
            const targetWeight = Number(strat.targetWeight);
            
            const targetAmount = totalDeployed > 0n && totalWeight > 0
                ? (totalDeployed * BigInt(targetWeight)) / BigInt(totalWeight)
                : 0n;
            
            const actualPercent = totalDeployed > 0n
                ? Number((actualBalance * 10000n) / totalDeployed) / 100
                : 0;
            
            const targetPercent = targetWeight / 100;
            const difference = actualBalance - targetAmount;
            const isBalanced = difference === 0n;
            
            console.log(`Strategy ${i + 1}:`);
            console.log(`  Target:         ${targetPercent.toFixed(2)}% (${ethers.formatUnits(targetAmount, 6)} USDC)`);
            console.log(`  Actual:         ${actualPercent.toFixed(2)}% (${ethers.formatUnits(actualBalance, 6)} USDC)`);
            
            if (isBalanced) {
                console.log(`  Status:         ✅ Balanced`);
            } else if (difference > 0n) {
                console.log(`  Status:         ⚠️  Over by ${ethers.formatUnits(difference, 6)} USDC`);
            } else {
                console.log(`  Status:         ⚠️  Under by ${ethers.formatUnits(-difference, 6)} USDC`);
            }
            
        } catch (error: any) {
            console.log(`Strategy ${i + 1}: Error - ${error.message}`);
        }
    }
    
    console.log("━".repeat(70));

    // ============================================
    // User Balances (if any)
    // ============================================
    
    const userShares = await vault.balanceOf(signer.address);
    if (userShares > 0n) {
        console.log("\n👤 Your Position:");
        console.log("━".repeat(70));
        console.log("Your Shares:      ", ethers.formatEther(userShares));
        
        const shareValue = totalSupply > 0n
            ? (totalAssets * userShares) / totalSupply
            : 0n;
        
        const percentOwnership = totalSupply > 0n
            ? Number((userShares * 10000n) / totalSupply) / 100
            : 0;
        
        console.log("Share Value:      ", ethers.formatUnits(shareValue, 6), "USDC");
        console.log("% Ownership:      ", `${percentOwnership.toFixed(4)}%`);
        console.log("━".repeat(70));
    }

    // ============================================
    // Recommendations
    // ============================================
    
    console.log("\n💡 Recommendations:");
    console.log("━".repeat(70));
    
    if (vaultBalance > totalAssets / 10n) { // More than 10% idle
        console.log("⚠️  High idle balance detected!");
        console.log("   Consider running: npm run rebalance:rayls");
    } else if (vaultBalance === 0n && totalDeployed > 0n) {
        console.log("✅ All funds deployed to strategies");
    } else {
        console.log("✅ System looks healthy");
    }
    
    let needsRebalance = false;
    for (let i = 0; i < strategies.length; i++) {
        const strat = strategies[i];
        const strategy = await ethers.getContractAt("MockStrategy", strat.strategy);
        const actualBalance = await strategy.getTotalAssets();
        const targetWeight = Number(strat.targetWeight);
        
        if (totalWeight > 0 && totalDeployed > 0n) {
            const targetAmount = (totalDeployed * BigInt(targetWeight)) / BigInt(totalWeight);
            const difference = actualBalance > targetAmount 
                ? actualBalance - targetAmount 
                : targetAmount - actualBalance;
            
            if (difference > targetAmount / 100n) {
                needsRebalance = true;
                break;
            }
        }
    }
    
    if (needsRebalance) {
        console.log("⚠️  Strategies are imbalanced");
        console.log("   Consider running: npm run rebalance:rayls");
    }
    
    console.log("━".repeat(70));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

