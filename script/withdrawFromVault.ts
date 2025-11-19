import { ethers } from "hardhat";

/**
 * Withdraw assets from the vault
 * 
 * Usage:
 * WITHDRAW_AMOUNT=50 npm run withdraw:rayls          # Withdraw 50 USDC
 * REDEEM_SHARES=50 npm run withdraw:rayls            # Redeem 50 shares
 * WITHDRAW_ALL=true npm run withdraw:rayls           # Withdraw everything
 */

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("💸 WITHDRAW FROM VAULT");
    console.log("=".repeat(60));

    // Configuration
    const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
    const ASSET_ADDRESS = process.env.ASSET_ADDRESS;

    // Parse command options
    const WITHDRAW_AMOUNT = process.env.WITHDRAW_AMOUNT; // Amount of USDC to withdraw
    const REDEEM_SHARES = process.env.REDEEM_SHARES;     // Amount of shares to redeem
    const WITHDRAW_ALL = process.env.WITHDRAW_ALL === "true"; // Withdraw all

    const [user] = await ethers.getSigners();
    
    console.log("\n📋 Configuration:");
    console.log("━".repeat(60));
    console.log("User:             ", user.address);
    console.log("Vault:            ", VAULT_ADDRESS);
    console.log("Asset:            ", ASSET_ADDRESS);
    console.log("━".repeat(60));

    // Connect to contracts
    const asset = await ethers.getContractAt("IERC20", ASSET_ADDRESS);
    const vault = await ethers.getContractAt("RaylsVault", VAULT_ADDRESS);

    // ============================================
    // Step 1: Check Current Position
    // ============================================
    
    console.log("\n📊 Your Current Position:");
    console.log("━".repeat(60));
    
    const shareBalance = await vault.balanceOf(user.address);
    const totalSupply = await vault.totalSupply();
    const totalAssets = await vault.totalAssets();
    const usdcBalance = await asset.balanceOf(user.address);
    
    if (shareBalance === 0n) {
        console.log("❌ You have no shares in this vault!");
        return;
    }
    
    // Calculate share value
    const shareValue = totalSupply > 0n
        ? (totalAssets * shareBalance) / totalSupply
        : 0n;
    
    const percentOwnership = totalSupply > 0n
        ? Number((shareBalance * 10000n) / totalSupply) / 100
        : 0;
    
    console.log("Your Shares:      ", ethers.formatEther(shareBalance));
    console.log("Share Value:      ", ethers.formatUnits(shareValue, 6), "USDC");
    console.log("% Ownership:      ", `${percentOwnership.toFixed(4)}%`);
    console.log("USDC Balance:     ", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("━".repeat(60));

    // ============================================
    // Step 2: Determine Withdrawal Method
    // ============================================
    
    let withdrawAssets: bigint;
    let redeemShares: bigint;
    let mode: string;

    if (WITHDRAW_ALL) {
        mode = "WITHDRAW ALL";
        redeemShares = shareBalance;
        withdrawAssets = shareValue;
        console.log("\n🎯 Mode: Withdraw All");
        console.log("Will redeem:      ", ethers.formatEther(redeemShares), "shares");
        console.log("Expected USDC:    ", ethers.formatUnits(withdrawAssets, 6), "USDC");
    } else if (REDEEM_SHARES) {
        mode = "REDEEM SHARES";
        redeemShares = ethers.parseEther(REDEEM_SHARES);
        
        if (redeemShares > shareBalance) {
            console.log("\n❌ Insufficient shares!");
            console.log("Requested:        ", ethers.formatEther(redeemShares), "shares");
            console.log("Available:        ", ethers.formatEther(shareBalance), "shares");
            return;
        }
        
        // Preview how much USDC we'll get
        const previewRedeem = await vault.previewRedeem(redeemShares);
        withdrawAssets = previewRedeem;
        
        console.log("\n🎯 Mode: Redeem Shares");
        console.log("Redeeming:        ", ethers.formatEther(redeemShares), "shares");
        console.log("Expected USDC:    ", ethers.formatUnits(withdrawAssets, 6), "USDC");
    } else if (WITHDRAW_AMOUNT) {
        mode = "WITHDRAW ASSETS";
        withdrawAssets = ethers.parseUnits(WITHDRAW_AMOUNT, 6);
        
        // Preview how many shares will be burned
        const previewWithdraw = await vault.previewWithdraw(withdrawAssets);
        redeemShares = previewWithdraw;
        
        if (redeemShares > shareBalance) {
            console.log("\n❌ Insufficient shares for this withdrawal!");
            console.log("Required shares:  ", ethers.formatEther(redeemShares));
            console.log("Your shares:      ", ethers.formatEther(shareBalance));
            return;
        }
        
        console.log("\n🎯 Mode: Withdraw Specific Amount");
        console.log("Withdrawing:      ", ethers.formatUnits(withdrawAssets, 6), "USDC");
        console.log("Shares to burn:   ", ethers.formatEther(redeemShares));
    } else {
        console.log("\n❌ Please specify withdrawal amount:");
        console.log("Examples:");
        console.log("  WITHDRAW_AMOUNT=50 npm run withdraw:rayls");
        console.log("  REDEEM_SHARES=50 npm run withdraw:rayls");
        console.log("  WITHDRAW_ALL=true npm run withdraw:rayls");
        return;
    }

    // ============================================
    // Step 3: Show Strategy Impact
    // ============================================
    
    console.log("\n📈 Strategy State Before Withdrawal:");
    console.log("━".repeat(60));
    
    const strategies = await vault.getStrategies();
    const vaultAssetBalance = await asset.balanceOf(VAULT_ADDRESS);
    
    console.log("Vault idle balance:", ethers.formatUnits(vaultAssetBalance, 6), "USDC");
    console.log("Total in strategies:", strategies.length);
    
    for (let i = 0; i < strategies.length; i++) {
        const strat = strategies[i];
        const strategy = await ethers.getContractAt("IVaultStrategy", strat.strategy);
        const balance = await strategy.getTotalAssets();
        console.log(`  Strategy ${i + 1}:      ${ethers.formatUnits(balance, 6)} USDC`);
    }
    console.log("━".repeat(60));

    // ============================================
    // Step 4: Execute Withdrawal
    // ============================================
    
    console.log("\n📝 Executing Withdrawal...");
    
    let tx;
    try {
        if (mode === "REDEEM SHARES" || mode === "WITHDRAW ALL") {
            console.log("Calling redeem()...");
            tx = await vault.redeem(redeemShares, user.address, user.address);
        } else {
            console.log("Calling withdraw()...");
            tx = await vault.withdraw(withdrawAssets, user.address, user.address);
        }
        
        console.log("⏳ Waiting for transaction...");
        const receipt = await tx.wait();
        console.log("✅ Withdrawal successful!");
        console.log("Transaction:", receipt.hash);
        console.log("Gas used:", receipt.gasUsed.toString());
    } catch (error: any) {
        console.error("\n❌ Withdrawal failed:", error.message);
        
        // Try to provide helpful error info
        if (error.message.includes("InsufficientBalance")) {
            console.error("\n💡 The vault doesn't have enough liquidity.");
            console.error("   This could mean strategies don't have enough funds to withdraw.");
        } else if (error.message.includes("ERC20: insufficient allowance")) {
            console.error("\n💡 The vault cannot burn your shares.");
        }
        
        if (error.error) {
            console.error("Error data:", error.error);
        }
        return;
    }

    // ============================================
    // Step 5: Check Final State
    // ============================================
    
    console.log("\n📊 Final State:");
    console.log("━".repeat(60));
    
    const newShareBalance = await vault.balanceOf(user.address);
    const newUsdcBalance = await asset.balanceOf(user.address);
    const newTotalAssets = await vault.totalAssets();
    const newTotalSupply = await vault.totalSupply();
    
    console.log("Your Shares:      ", ethers.formatEther(newShareBalance));
    console.log("Your USDC:        ", ethers.formatUnits(newUsdcBalance, 6), "USDC");
    console.log("Vault Total Assets:", ethers.formatUnits(newTotalAssets, 6), "USDC");
    console.log("Vault Total Supply:", ethers.formatEther(newTotalSupply));
    console.log("━".repeat(60));

    // ============================================
    // Step 6: Show Changes
    // ============================================
    
    console.log("\n📈 Changes:");
    console.log("━".repeat(60));
    console.log("Shares Burned:    ", ethers.formatEther(shareBalance - newShareBalance));
    console.log("USDC Received:    ", ethers.formatUnits(newUsdcBalance - usdcBalance, 6), "USDC");
    console.log("Vault Assets ↓:   ", ethers.formatUnits(totalAssets - newTotalAssets, 6), "USDC");
    console.log("━".repeat(60));

    // ============================================
    // Step 7: Show Strategy Impact
    // ============================================
    
    console.log("\n📈 Strategy State After Withdrawal:");
    console.log("━".repeat(60));
    
    const newVaultAssetBalance = await asset.balanceOf(VAULT_ADDRESS);
    console.log("Vault idle balance:", ethers.formatUnits(newVaultAssetBalance, 6), "USDC");
    
    for (let i = 0; i < strategies.length; i++) {
        const strat = strategies[i];
        const strategy = await ethers.getContractAt("IVaultStrategy", strat.strategy);
        const newBalance = await strategy.getTotalAssets();
        console.log(`  Strategy ${i + 1}:      ${ethers.formatUnits(newBalance, 6)} USDC`);
    }
    console.log("━".repeat(60));

    // ============================================
    // Summary
    // ============================================
    
    if (newShareBalance === 0n) {
        console.log("\n✅ Complete withdrawal! You have no remaining shares.");
    } else {
        const remainingValue = newTotalSupply > 0n
            ? (newTotalAssets * newShareBalance) / newTotalSupply
            : 0n;
        console.log("\n💰 Remaining Position:");
        console.log("Your Shares:      ", ethers.formatEther(newShareBalance));
        console.log("Share Value:      ", ethers.formatUnits(remainingValue, 6), "USDC");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

