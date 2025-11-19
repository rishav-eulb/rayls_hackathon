import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Script to update strategy weights to 40%, 40%, 20%
 * 
 * Usage:
 *   npm run update-weights:rayls
 * 
 * Or specify custom weights:
 *   WEIGHT_1=40 WEIGHT_2=40 WEIGHT_3=20 npm run update-weights:rayls
 */

async function main() {
    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║           🎯 UPDATE STRATEGY WEIGHTS                          ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝\n");

    // Get configuration from environment
    const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
    
    if (!VAULT_ADDRESS) {
        throw new Error("❌ VAULT_ADDRESS not set in .env file");
    }

    // Get weights from environment or use defaults (40%, 40%, 20%)
    const weight1 = parseInt(process.env.WEIGHT_1 || "40");
    const weight2 = parseInt(process.env.WEIGHT_2 || "40");
    const weight3 = parseInt(process.env.WEIGHT_3 || "20");

    // Validate weights add up to 100
    const totalWeight = weight1 + weight2 + weight3;
    if (totalWeight !== 100) {
        throw new Error(`❌ Weights must add up to 100%. Current total: ${totalWeight}%`);
    }

    console.log("📋 Configuration:");
    console.log(`   Vault Address: ${VAULT_ADDRESS}`);
    console.log(`   New Weights: ${weight1}% / ${weight2}% / ${weight3}%`);
    console.log("");

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);

    // Connect to vault
    const vaultAbi = [
        "function getStrategies() external view returns (tuple(address strategy, uint256 targetWeight, uint256 currentBalance)[] memory)",
        "function updateStrategyWeight(address strategy, uint256 newWeight) external",
        "function getRegistry() external view returns (address)",
    ];

    const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, signer);

    // Check if signer is registry owner
    console.log("\n🔍 Checking permissions...");
    const registryAddress = await vault.getRegistry();
    
    // Get registry to check ownership
    const registryAbi = ["function owner() external view returns (address)"];
    const registry = new ethers.Contract(registryAddress, registryAbi, signer);
    const registryOwner = await registry.owner();

    console.log(`   Registry Address: ${registryAddress}`);
    console.log(`   Registry Owner: ${registryOwner}`);
    console.log(`   Your Address: ${signer.address}`);

    if (signer.address.toLowerCase() !== registryOwner.toLowerCase()) {
        throw new Error("❌ You must be the registry owner to update weights!");
    }
    console.log("   ✅ Permission check passed\n");

    // Get current strategies
    console.log("📊 Current Strategy Configuration:");
    const strategiesData = await vault.getStrategies();
    
    if (strategiesData.length !== 3) {
        throw new Error(`❌ Expected 3 strategies, found ${strategiesData.length}`);
    }

    console.log(`   Found ${strategiesData.length} strategies:\n`);

    // Display current weights
    const strategies: string[] = [];
    for (let i = 0; i < strategiesData.length; i++) {
        const strategyData = strategiesData[i];
        const strategyAddress = strategyData.strategy || strategyData[0];
        const currentWeightBps = strategyData.targetWeight || strategyData[1];
        const currentBalance = strategyData.currentBalance || strategyData[2];
        
        strategies.push(strategyAddress);
        
        const currentWeightPercent = (Number(currentWeightBps) / 100).toFixed(2);
        
        console.log(`   Strategy ${i + 1}: ${strategyAddress}`);
        console.log(`      Current Weight: ${currentWeightPercent}% (${currentWeightBps} bps)`);
        console.log(`      Current Balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
    }

    // Prepare new weights in basis points (1% = 100 bps)
    const newWeights = [
        weight1 * 100, // 40% = 4000 bps
        weight2 * 100, // 40% = 4000 bps
        weight3 * 100, // 20% = 2000 bps
    ];

    console.log("\n\n🎯 Proposed Changes:");
    for (let i = 0; i < strategies.length; i++) {
        const strategyData = strategiesData[i];
        const currentWeightBps = strategyData.targetWeight || strategyData[1];
        const currentWeightPercent = (Number(currentWeightBps) / 100).toFixed(2);
        const newWeightPercent = (newWeights[i] / 100).toFixed(2);
        
        console.log(`\n   Strategy ${i + 1}:`);
        console.log(`      ${currentWeightPercent}% → ${newWeightPercent}%`);
        console.log(`      (${currentWeightBps} bps → ${newWeights[i]} bps)`);
    }

    // Confirm before executing
    console.log("\n\n⚠️  Ready to update weights...");
    console.log("   This will change the target allocation for future rebalancing.");
    console.log("   Run 'npm run rebalance:rayls' after this to rebalance funds.\n");

    // Wait a bit to let user read
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update each strategy weight
    console.log("🔄 Updating weights...\n");
    
    for (let i = 0; i < strategies.length; i++) {
        const strategyAddress = strategies[i];
        const newWeightBps = newWeights[i];
        const newWeightPercent = (newWeightBps / 100).toFixed(2);

        console.log(`   Updating Strategy ${i + 1} to ${newWeightPercent}%...`);
        
        try {
            const tx = await vault.updateStrategyWeight(strategyAddress, newWeightBps);
            console.log(`      Tx Hash: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`      ✅ Confirmed in block ${receipt.blockNumber}`);
        } catch (error: any) {
            console.error(`      ❌ Failed: ${error.message}`);
            throw error;
        }
    }

    // Verify updates
    console.log("\n\n✅ Weights Updated Successfully!\n");
    console.log("📊 New Configuration:");
    
    // Fetch updated strategy data
    const updatedStrategiesData = await vault.getStrategies();
    
    for (let i = 0; i < strategies.length; i++) {
        const strategyAddress = strategies[i];
        const strategyData = updatedStrategiesData[i];
        const weightBps = strategyData.targetWeight || strategyData[1];
        const currentBalance = strategyData.currentBalance || strategyData[2];
        const weightPercent = (Number(weightBps) / 100).toFixed(2);
        
        console.log(`\n   Strategy ${i + 1}: ${strategyAddress}`);
        console.log(`      Weight: ${weightPercent}% (${weightBps} bps)`);
        console.log(`      Balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
    }

    console.log("\n\n💡 Next Steps:");
    console.log("   1. Check current allocation:");
    console.log("      npm run check:strategies:rayls");
    console.log("");
    console.log("   2. Rebalance to match new weights:");
    console.log("      npm run rebalance:rayls");
    console.log("");
    console.log("   3. Verify after rebalancing:");
    console.log("      npm run check:strategies:rayls");
    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                    ✨ COMPLETE ✨                             ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error updating weights:");
        console.error(error);
        process.exit(1);
    });

