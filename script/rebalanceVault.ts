import { ethers } from "hardhat";

/**
 * Rebalance vault - distribute funds to strategies according to target weights
 * 
 * This script:
 * 1. Checks current vault balance
 * 2. Checks current strategy balances
 * 3. Calculates how much to deposit/withdraw from each strategy
 * 4. Executes rebalance
 */

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("⚖️  REBALANCE VAULT");
    console.log("=".repeat(60));

    // Configuration
    const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
    const ASSET_ADDRESS = process.env.ASSET_ADDRESS;

    if (!VAULT_ADDRESS || !ASSET_ADDRESS) {
        console.error("❌ Missing required environment variables:");
        console.error("   VAULT_ADDRESS:", VAULT_ADDRESS);
        console.error("   ASSET_ADDRESS:", ASSET_ADDRESS);
        process.exit(1);
    }

    const [bot] = await ethers.getSigners();
    
    console.log("\n📋 Configuration:");
    console.log("━".repeat(60));
    console.log("Bot:              ", bot.address);
    console.log("Vault:            ", VAULT_ADDRESS);
    console.log("━".repeat(60));

    // Connect to contracts
    const vault = await ethers.getContractAt("RaylsVault", VAULT_ADDRESS);
    const asset = await ethers.getContractAt("IERC20", ASSET_ADDRESS);

    // ============================================
    // Step 1: Get Current State
    // ============================================
    
    console.log("\n📊 Current State:");
    console.log("━".repeat(60));
    
    const vaultBalance = await asset.balanceOf(VAULT_ADDRESS);
    const totalAssets = await vault.totalAssets();
    const strategies = await vault.getStrategies();
    
    console.log("Vault Balance:    ", ethers.formatUnits(vaultBalance, 6), "USDC (idle)");
    console.log("Total Assets:     ", ethers.formatUnits(totalAssets, 6), "USDC");
    console.log("Number Strategies:", strategies.length);
    console.log("━".repeat(60));

    if (strategies.length === 0) {
        console.log("\n❌ No strategies configured!");
        return;
    }

    // Show current strategy balances
    console.log("\n📈 Strategy Balances:");
    console.log("━".repeat(60));
    for (let i = 0; i < strategies.length; i++) {
        const strat = strategies[i];
        const strategy = await ethers.getContractAt("MockStrategy", strat.strategy);
        const balance = await strategy.getTotalAssets();
        
        console.log(`Strategy ${i + 1}:`);
        console.log(`  Address:        ${strat.strategy}`);
        console.log(`  Target Weight:  ${strat.targetWeight} (${(Number(strat.targetWeight)/100).toFixed(2)}%)`);
        console.log(`  Current Balance:${ethers.formatUnits(balance, 6)} USDC`);
        console.log(`  Tracked Balance:${ethers.formatUnits(strat.currentBalance, 6)} USDC`);
    }
    console.log("━".repeat(60));

    // ============================================
    // Step 2: Calculate Target Allocation
    // ============================================
    
    console.log("\n🎯 Calculating Target Allocation...");
    console.log("━".repeat(60));
    
    const totalWeight = strategies.reduce((sum, s) => sum + Number(s.targetWeight), 0);
    const depositAmounts: bigint[] = [];
    const withdrawAmounts: bigint[] = [];
    
    for (let i = 0; i < strategies.length; i++) {
        const strat = strategies[i];
        const strategy = await ethers.getContractAt("MockStrategy", strat.strategy);
        const currentBalance = await strategy.getTotalAssets();
        
        const targetAmount = (totalAssets * BigInt(strat.targetWeight)) / BigInt(totalWeight);
        
        console.log(`Strategy ${i + 1}:`);
        console.log(`  Current:        ${ethers.formatUnits(currentBalance, 6)} USDC`);
        console.log(`  Target:         ${ethers.formatUnits(targetAmount, 6)} USDC`);
        
        if (targetAmount > currentBalance) {
            const toDeposit = targetAmount - currentBalance;
            depositAmounts.push(toDeposit);
            withdrawAmounts.push(0n);
            console.log(`  Action:         Deposit ${ethers.formatUnits(toDeposit, 6)} USDC`);
        } else if (targetAmount < currentBalance) {
            const toWithdraw = currentBalance - targetAmount;
            depositAmounts.push(0n);
            withdrawAmounts.push(toWithdraw);
            console.log(`  Action:         Withdraw ${ethers.formatUnits(toWithdraw, 6)} USDC`);
        } else {
            depositAmounts.push(0n);
            withdrawAmounts.push(0n);
            console.log(`  Action:         No change needed`);
        }
    }
    console.log("━".repeat(60));

    const totalDeposits = depositAmounts.reduce((sum, amt) => sum + amt, 0n);
    const totalWithdrawals = withdrawAmounts.reduce((sum, amt) => sum + amt, 0n);
    
    if (totalDeposits === 0n && totalWithdrawals === 0n) {
        console.log("\n✅ Already balanced! No action needed.");
        return;
    }

    // ============================================
    // Step 3: Execute Rebalance
    // ============================================
    
    console.log("\n📝 Executing Rebalance...");
    console.log("Total to deposit:  ", ethers.formatUnits(totalDeposits, 6), "USDC");
    console.log("Total to withdraw: ", ethers.formatUnits(totalWithdrawals, 6), "USDC");
    
    try {
        const rebalanceTx = await vault.rebalance(depositAmounts, withdrawAmounts);
        console.log("⏳ Waiting for transaction...");
        const receipt = await rebalanceTx.wait();
        console.log("✅ Rebalance successful!");
        console.log("Transaction:", receipt?.hash || rebalanceTx.hash);
    } catch (error: any) {
        console.error("❌ Rebalance failed:", error.message);
        
        if (error.error) {
            console.error("Error data:", error.error);
        }
        return;
    }

    // ============================================
    // Step 4: Check Final State
    // ============================================
    
    console.log("\n📊 Final State:");
    console.log("━".repeat(60));
    
    const finalVaultBalance = await asset.balanceOf(VAULT_ADDRESS);
    const finalTotalAssets = await vault.totalAssets();
    
    console.log("Vault Balance:    ", ethers.formatUnits(finalVaultBalance, 6), "USDC (idle)");
    console.log("Total Assets:     ", ethers.formatUnits(finalTotalAssets, 6), "USDC");
    console.log("━".repeat(60));

    console.log("\n📈 Final Strategy Balances:");
    console.log("━".repeat(60));
    for (let i = 0; i < strategies.length; i++) {
        const strat = strategies[i];
        const strategy = await ethers.getContractAt("MockStrategy", strat.strategy);
        const balance = await strategy.getTotalAssets();
        
        console.log(`Strategy ${i + 1}:       ${ethers.formatUnits(balance, 6)} USDC (${(Number(strat.targetWeight)/100).toFixed(2)}%)`);
    }
    console.log("━".repeat(60));

    console.log("\n✅ Rebalancing complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

