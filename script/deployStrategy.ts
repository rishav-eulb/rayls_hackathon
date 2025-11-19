import { ethers } from "hardhat";

async function main() {
    const assetAddress = process.env.ASSET_ADDRESS;
    const strategyType = process.env.STRATEGY_TYPE || "erc4626"; // "erc4626" or "simple"
    
    if (!assetAddress) {
        throw new Error("❌ ASSET_ADDRESS environment variable not set");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🚀 STRATEGY DEPLOYMENT");
    console.log("=".repeat(60));
    console.log("\nAsset token:", assetAddress);
    console.log("Strategy type:", strategyType);
    console.log("Network:", (await ethers.provider.getNetwork()).name);

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

    let strategyAddress: string;
    let childVaultAddress: string | null = null;

    if (strategyType === "simple") {
        // ============================================
        // Simple Strategy: Just MockStrategyCorrect
        // ============================================
        console.log("\n📝 Deploying MockStrategyCorrect (Simple)...");
        
        const SimpleStrategy = await ethers.getContractFactory("MockStrategyCorrect");
        const simpleStrategy = await SimpleStrategy.deploy(assetAddress);
        await simpleStrategy.waitForDeployment();
        
        strategyAddress = await simpleStrategy.getAddress();
        console.log("✅ MockStrategyCorrect deployed:", strategyAddress);

        // Verify interface
        console.log("\n🔍 Verifying interface...");
        const wantToken = await simpleStrategy.want();
        console.log("✅ want() returns:", wantToken);
        
        const totalAssets = await simpleStrategy.getTotalAssets();
        console.log("✅ getTotalAssets():", ethers.formatEther(totalAssets));

    } else {
        // ============================================
        // ERC4626 Strategy: Deploy Child Vault + Strategy
        // ============================================
        
        console.log("\n📝 Step 1/3: Deploying ERC4626ChildStrategy...");
        
        // We need to deploy child vault first (required by constructor)
        // But we'll present it as if strategy is primary
        
        console.log("   ↳ First, deploying dependency: ExtendedChildERC4626Vault...");
        
        const ChildVault = await ethers.getContractFactory("ExtendedChildERC4626Vault");
        const childVault = await ChildVault.deploy(
            assetAddress,
            "Child Vault USDC",
            "cvUSDC"
        );
        await childVault.waitForDeployment();
        
        childVaultAddress = await childVault.getAddress();
        console.log("   ✅ Child Vault deployed:", childVaultAddress);

        console.log("\n📝 Step 2/3: Deploying ERC4626ChildStrategy...");
        
        const Strategy = await ethers.getContractFactory("ERC4626ChildStrategy");
        const strategy = await Strategy.deploy(assetAddress, childVaultAddress);
        await strategy.waitForDeployment();
        
        strategyAddress = await strategy.getAddress();
        console.log("✅ Strategy deployed:", strategyAddress);

        console.log("\n📝 Step 3/3: Verifying interfaces...");
        
        try {
            // Verify strategy
            const wantToken = await strategy.WANT();
            console.log("✅ Strategy.WANT():", wantToken);
            
            const childVaultFromStrategy = await strategy.CHILD_VAULT();
            console.log("✅ Strategy.CHILD_VAULT():", childVaultFromStrategy);
            
            const totalAssets = await strategy.getTotalAssets();
            console.log("✅ Strategy.getTotalAssets():", ethers.formatEther(totalAssets));
            
            // Verify child vault
            const underlyingAsset = await childVault.asset();
            console.log("✅ ChildVault.asset():", underlyingAsset);
            
            const childVaultOwner = await childVault.owner();
            console.log("✅ ChildVault.owner():", childVaultOwner);
            
            console.log("\n✅ All interface checks passed!");
        } catch (error) {
            console.error("\n❌ Interface verification failed:", error);
        }

        // ============================================
        // Optional: Deploy additional standalone child vault
        // ============================================
        if (process.env.DEPLOY_EXTRA_VAULT === "true") {
            console.log("\n📝 Bonus: Deploying additional standalone child vault...");
            
            const ExtraVault = await ethers.getContractFactory("ExtendedChildERC4626Vault");
            const extraVault = await ExtraVault.deploy(
                assetAddress,
                "Extra Child Vault USDC",
                "ecvUSDC"
            );
            await extraVault.waitForDeployment();
            
            const extraVaultAddress = await extraVault.getAddress();
            console.log("✅ Extra Child Vault deployed:", extraVaultAddress);
            console.log("   (Can be used for future strategies)");
        }
    }

    // ============================================
    // Summary
    // ============================================

    console.log("\n" + "=".repeat(60));
    console.log("✨ DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));

    console.log("\n📋 Deployed Contracts:");
    console.log("━".repeat(60));
    console.log("Strategy:             ", strategyAddress);
    if (childVaultAddress) {
        console.log("Child Vault:          ", childVaultAddress);
    }
    console.log("Asset Token:          ", assetAddress);
    console.log("Strategy Type:        ", strategyType);
    console.log("━".repeat(60));

    console.log("\n📝 Add to your .env file:");
    console.log("━".repeat(60));
    console.log(`INITIAL_STRATEGY=${strategyAddress}`);
    console.log(`STRATEGIES=${strategyAddress}`);
    if (childVaultAddress) {
        console.log(`CHILD_VAULT=${childVaultAddress}`);
    }
    console.log("━".repeat(60));

    // Save deployment info
    const fs = require('fs');
    const network = await ethers.provider.getNetwork();
    const deploymentInfo: any = {
        network: network.name,
        chainId: Number(network.chainId),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            strategy: strategyAddress,
            assetToken: assetAddress
        },
        config: {
            strategyType: strategyType
        }
    };

    if (childVaultAddress) {
        deploymentInfo.contracts.childVault = childVaultAddress;
        deploymentInfo.config.childVaultName = "Child Vault USDC";
        deploymentInfo.config.childVaultSymbol = "cvUSDC";
    }

    const filename = `deployments/${strategyType}-strategy-${Date.now()}.json`;
    fs.mkdirSync('deployments', { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${filename}`);

    console.log("\n📋 Next Steps:");
    console.log("━".repeat(60));
    console.log("1. Update your .env file with the addresses above");
    console.log("2. Deploy your vault system:");
    console.log("   npm run deploy:system:rayls");
    console.log("");
    console.log("3. After vault is deployed, link strategy to vault:");
    console.log(`   cast send ${strategyAddress} "setVault(address)" VAULT_ADDRESS --rpc-url $RAYLS_RPC_URL --private-key $PRIVATE_KEY`);
    
    if (strategyType === "erc4626" && childVaultAddress) {
        console.log("");
        console.log("4. (Optional) Configure child vault settings:");
        console.log(`   # Set deposit cap (e.g., 1M USDC with 6 decimals)`);
        console.log(`   cast send ${childVaultAddress} "setDepositCap(uint256)" 1000000000000 --rpc-url $RAYLS_RPC_URL --private-key $PRIVATE_KEY`);
        console.log("");
        console.log(`   # Enable whitelist`);
        console.log(`   cast send ${childVaultAddress} "setRestrictedDeposits(bool)" true --rpc-url $RAYLS_RPC_URL --private-key $PRIVATE_KEY`);
        console.log("");
        console.log(`   # Add strategy to whitelist`);
        console.log(`   cast send ${childVaultAddress} "setWhitelistedDepositor(address,bool)" ${strategyAddress} true --rpc-url $RAYLS_RPC_URL --private-key $PRIVATE_KEY`);
    }
    
    console.log("━".repeat(60));

    console.log("\n💡 Tip: To deploy a different strategy type, set STRATEGY_TYPE=simple or STRATEGY_TYPE=erc4626");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
