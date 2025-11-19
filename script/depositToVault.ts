import { ethers } from "hardhat";

/**
 * Deposit assets to the vault
 * 
 * Usage:
 * DEPOSIT_AMOUNT=100 npx hardhat run script/depositToVault.ts --network rayls
 */

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("💰 DEPOSIT TO VAULT");
    console.log("=".repeat(60));

    // Configuration
    const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
    const ASSET_ADDRESS = process.env.ASSET_ADDRESS;
    const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "100"; // Default 100 USDC

    const [depositor] = await ethers.getSigners();
    
    console.log("\n📋 Configuration:");
    console.log("━".repeat(60));
    console.log("Depositor:        ", depositor.address);
    console.log("Vault:            ", VAULT_ADDRESS);
    console.log("Asset:            ", ASSET_ADDRESS);
    console.log("Amount:           ", DEPOSIT_AMOUNT, "USDC");
    console.log("━".repeat(60));

    // Connect to contracts
    const asset = await ethers.getContractAt("IERC20", ASSET_ADDRESS);
    const vault = await ethers.getContractAt("RaylsVault", VAULT_ADDRESS);

    // Check balance
    const balance = await asset.balanceOf(depositor.address);
    console.log("\n📊 Current Balance:", ethers.formatUnits(balance, 18), "USDC");

    // Parse amount (USDC has 6 decimals)
    const amount = ethers.parseUnits(DEPOSIT_AMOUNT, 18);
    
    if (balance < amount) {
        console.log("\n❌ Insufficient balance!");
        console.log("Need:", ethers.formatUnits(amount, 18), "USDC");
        console.log("Have:", ethers.formatUnits(balance, 18), "USDC");
        return;
    }

    // ============================================
    // Step 1: Approve
    // ============================================
    
    console.log("\n📝 Step 1: Approving vault to spend USDC...");
    
    const currentAllowance = await asset.allowance(depositor.address, VAULT_ADDRESS);
    console.log("Current allowance:", ethers.formatUnits(currentAllowance, 18), "USDC");
    
    if (currentAllowance < amount) {
        console.log("⏳ Approving...");
        const approveTx = await asset.approve(VAULT_ADDRESS, amount);
        await approveTx.wait();
        console.log("✅ Approved");
    } else {
        console.log("✅ Already approved");
    }

    // ============================================
    // Step 2: Check Vault State Before
    // ============================================
    
    console.log("\n📊 Vault State Before:");
    console.log("━".repeat(60));
    
    const totalAssetsBefore = await vault.totalAssets();
    const sharesBefore = await vault.balanceOf(depositor.address);
    const totalSupplyBefore = await vault.totalSupply();
    
    console.log("Total Assets:     ", ethers.formatUnits(totalAssetsBefore, 18), "USDC");
    console.log("Your Shares:      ", ethers.formatEther(sharesBefore));
    console.log("Total Supply:     ", ethers.formatEther(totalSupplyBefore));
    console.log("━".repeat(60));

    // ============================================
    // Step 3: Deposit
    // ============================================
    
    console.log("\n📝 Step 2: Depositing to vault...");
    console.log("Amount:", ethers.formatUnits(amount, 18), "USDC");
    
    try {
        const depositTx = await vault.deposit(amount, depositor.address);
        console.log("⏳ Waiting for transaction...");
        const receipt = await depositTx.wait();
        console.log("✅ Deposit successful!");
        console.log("Transaction:", receipt.hash);
    } catch (error: any) {
        console.error("❌ Deposit failed:", error.message);
        
        // Try to get more details
        if (error.error) {
            console.error("Error data:", error.error);
        }
        return;
    }

    // ============================================
    // Step 4: Check Vault State After
    // ============================================
    
    console.log("\n📊 Vault State After:");
    console.log("━".repeat(60));
    
    const totalAssetsAfter = await vault.totalAssets();
    const sharesAfter = await vault.balanceOf(depositor.address);
    const totalSupplyAfter = await vault.totalSupply();
    const balanceAfter = await asset.balanceOf(depositor.address);
    
    console.log("Total Assets:     ", ethers.formatUnits(totalAssetsAfter, 6), "USDC");
    console.log("Your Shares:      ", ethers.formatEther(sharesAfter));
    console.log("Total Supply:     ", ethers.formatEther(totalSupplyAfter));
    console.log("Your USDC:        ", ethers.formatUnits(balanceAfter, 6), "USDC");
    console.log("━".repeat(60));

    // ============================================
    // Changes
    // ============================================
    
    console.log("\n📈 Changes:");
    console.log("━".repeat(60));
    console.log("Assets Added:     ", ethers.formatUnits(totalAssetsAfter - totalAssetsBefore, 6), "USDC");
    console.log("Shares Received:  ", ethers.formatEther(sharesAfter - sharesBefore));
    console.log("USDC Spent:       ", ethers.formatUnits(balance - balanceAfter, 6), "USDC");
    console.log("━".repeat(60));

    // ============================================
    // Next Steps
    // ============================================
    
    console.log("\n📖 Next Steps:");
    console.log("━".repeat(60));
    console.log("1. Funds are currently in the vault (not yet in strategies)");
    console.log("");
    console.log("2. Bot can rebalance to deploy funds to strategies:");
    console.log("   Run: ts-node script/rebalanceVault.ts");
    console.log("");
    console.log("3. Check strategy balances after rebalancing");
    console.log("━".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
