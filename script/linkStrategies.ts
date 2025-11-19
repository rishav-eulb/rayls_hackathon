import { ethers } from "hardhat";

/**
 * Link strategies to vault by calling setVault() on each strategy
 */

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("🔗 LINK STRATEGIES TO VAULT");
    console.log("=".repeat(60));

    const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
    const STRATEGIES_STR = process.env.STRATEGIES || "";
    
    if (!VAULT_ADDRESS) {
        console.error("❌ VAULT_ADDRESS not set");
        process.exit(1);
    }
    
    if (!STRATEGIES_STR) {
        console.error("❌ STRATEGIES not set");
        process.exit(1);
    }

    const STRATEGIES = STRATEGIES_STR.split(",").map(s => s.trim());
    
    const [signer] = await ethers.getSigners();
    
    console.log("\n📋 Configuration:");
    console.log("━".repeat(60));
    console.log("Signer:           ", signer.address);
    console.log("Vault:            ", VAULT_ADDRESS);
    console.log("Number of Strategies:", STRATEGIES.length);
    console.log("━".repeat(60));

    console.log("\n📝 Linking Strategies...");
    console.log("━".repeat(60));

    for (let i = 0; i < STRATEGIES.length; i++) {
        const strategyAddress = STRATEGIES[i];
        console.log(`\n⏳ Strategy ${i + 1}: ${strategyAddress}`);
        
        try {
            const strategy = await ethers.getContractAt("IVaultStrategy", strategyAddress);
            
            // Check current vault
            const currentVault = await strategy.getVault();
            console.log(`   Current vault: ${currentVault}`);
            
            if (currentVault !== ethers.ZeroAddress && currentVault !== "0x0000000000000000000000000000000000000000") {
                console.log(`   ✅ Already linked to: ${currentVault}`);
                continue;
            }
            
            // Set vault
            console.log(`   🔗 Linking to vault...`);
            const tx = await strategy.setVault(VAULT_ADDRESS);
            await tx.wait();
            
            // Verify
            const newVault = await strategy.getVault();
            if (newVault === VAULT_ADDRESS) {
                console.log(`   ✅ Successfully linked!`);
            } else {
                console.log(`   ⚠️  Unexpected vault address: ${newVault}`);
            }
            
        } catch (error: any) {
            console.error(`   ❌ Failed:`, error.message);
        }
    }

    console.log("\n━".repeat(60));
    console.log("✅ Strategy linking complete!");
    console.log("━".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

