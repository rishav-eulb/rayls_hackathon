import { ethers } from "hardhat";


async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 COMPLETE SYSTEM DEPLOYMENT)");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("\n📋 Configuration:");
    console.log("━".repeat(60));
    console.log("Network:          ", network.name);
    console.log("Chain ID:         ", Number(network.chainId));
    console.log("Deployer:         ", deployer.address);
    console.log("Balance:          ", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    console.log("━".repeat(60));

    const ASSET_ADDRESS = process.env.ASSET_ADDRESS || "0xDe21f028B087BB1fd148f998821307Ea71655CEE";
    const TREASURY = deployer.address; 
    
    const STRATEGIES = process.env.STRATEGIES || "";
    if (!STRATEGIES) {
        throw new Error("STRATEGIES environment variable is not set");
    }
    const STRATEGIES_ARRAY = STRATEGIES.split(",");
    if (STRATEGIES_ARRAY.length === 0) {
        throw new Error("STRATEGIES environment variable is not set");
    }

    // ============================================
    // Step 1: Deploy RaylsVault Implementation
    // ============================================
    
    console.log("\n📝 Step 1: Deploying RaylsVault Implementation...");
    
    const RaylsVault = await ethers.getContractFactory("RaylsVault");
    const vaultImpl = await RaylsVault.deploy();
    await vaultImpl.waitForDeployment();
    
    const vaultImplAddress = await vaultImpl.getAddress();
    console.log("✅ RaylsVault Implementation:", vaultImplAddress);

    // ============================================
    // Step 2: Deploy RaylsVaultRegistry
    // ============================================
    
    console.log("\n📝 Step 2: Deploying RaylsVaultRegistry...");
    
    const SimpleRegistry = await ethers.getContractFactory("RaylsVaultRegistry");
    const registry = await SimpleRegistry.deploy(
        vaultImplAddress,
        TREASURY,
        deployer.address // owner
    );
    await registry.waitForDeployment();
    
    const registryAddress = await registry.getAddress();
    console.log("✅ RaylsVaultRegistry:", registryAddress);

    // ============================================
    // Step 3: Deploy StrategyManager
    // ============================================
    
    console.log("\n📝 Step 3: Deploying StrategyManager...");
    
    const StrategyManager = await ethers.getContractFactory("src/StrategyManager.sol:StrategyManager");
    const strategyManager = await StrategyManager.deploy();
    await strategyManager.waitForDeployment();
    
    const strategyManagerAddress = await strategyManager.getAddress();
    console.log("✅ StrategyManager:", strategyManagerAddress);
    
    console.log("⏳ Initializing StrategyManager...");
    let tx = await strategyManager.initialize();
    await tx.wait();
    console.log("✅ StrategyManager initialized");

    // ============================================
    // Step 4: Deploy Vault
    // ============================================
    
    console.log("\n📝 Step 4: Deploying Vault...");
    
    const deployTx = await registry.deployVault(
        ASSET_ADDRESS,
        "NativeYield USDC",
        "nyUSDC",
        STRATEGIES_ARRAY[0]
    );
    
    console.log("⏳ Waiting for transaction...");
    const receipt = await deployTx.wait();
    
    const event = receipt.logs.find((log: any) => {
        try {
            const parsed = registry.interface.parseLog(log);
            return parsed?.name === "VaultDeployed";
        } catch {
            return false;
        }
    });
    
    let vaultAddress;
    if (event) {
        const parsed = registry.interface.parseLog(event);
        vaultAddress = parsed?.args?.vault;
    }
    
    if (!vaultAddress) {
        throw new Error("Could not get vault address");
    }
    
    console.log("✅ Vault deployed:", vaultAddress);

    // ============================================
    // Step 5: Configure Multi-Strategy
    // ============================================
    
    console.log("\n📝 Step 5: Configuring Multi-Strategy...");
    
    const vault = await ethers.getContractAt("RaylsVault", vaultAddress);
    
    console.log("⏳ Setting StrategyManager...");
    tx = await vault.setStrategyManager(strategyManagerAddress);
    await tx.wait();
    console.log("✅ StrategyManager set");
    
    console.log("⏳ Setting bot...");
    tx = await vault.setAllocationBot(deployer.address);
    await tx.wait();
    console.log("✅ Bot set");
    
    console.log("⏳ Enabling multi-strategy...");
    tx = await vault.setMultiStrategyEnabled(true);
    await tx.wait();
    console.log("✅ Multi-strategy enabled");

    // ============================================
    // Step 6: Add Strategies
    // ============================================
    
    console.log("\n📝 Step 6: Adding Strategies...");
    
    const weight = Math.floor(10000 / STRATEGIES_ARRAY.length);
    
    for (let i = 0; i < STRATEGIES_ARRAY.length; i++) {
        console.log(`⏳ Adding strategy ${i + 1}...`);
        try {
            tx = await vault.addStrategy(STRATEGIES_ARRAY[i], weight);
            await tx.wait();
            console.log(`✅ Strategy ${i + 1} added (${(weight/100).toFixed(2)}%)`);
        } catch (error: any) {
            console.log(`⚠️  Strategy ${i + 1}:`, error.message);
        }
    }

    // ============================================
    // Step 7: Link Strategies to Vault
    // ============================================
    
    console.log("\n📝 Step 7: Linking Strategies...");
    
    for (let i = 0; i < STRATEGIES_ARRAY.length; i++) {
        console.log(`⏳ Linking strategy ${i + 1}...`);
        try {
            const strategy = await ethers.getContractAt("MockStrategy", STRATEGIES_ARRAY[i]);
            tx = await strategy.setVault(vaultAddress);
            await tx.wait();
            console.log(`✅ Strategy ${i + 1} linked`);
        } catch (error: any) {
            console.log(`⚠️  Strategy ${i + 1}:`, error.message);
        }
    }

    // ============================================
    // Step 8: Authorize Vault in StrategyManager
    // ============================================
    
    console.log("\n📝 Step 8: Authorizing Vault...");
    
    try {
        tx = await strategyManager.setAuthorizedCaller(vaultAddress, true);
        await tx.wait();
        console.log("✅ Vault authorized");
    } catch (error: any) {
        console.log("⚠️  Authorization:", error.message);
    }

    // ============================================
    // Summary
    // ============================================
    
    console.log("\n" + "=".repeat(60));
    console.log("✨ DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));

    console.log("\n📋 Deployed Contracts:");
    console.log("━".repeat(60));
    console.log("Vault Implementation: ", vaultImplAddress);
    console.log("Registry:             ", registryAddress);
    console.log("StrategyManager:      ", strategyManagerAddress);
    console.log("Vault:                ", vaultAddress);
    console.log("Bot:                  ", deployer.address);
    console.log("━".repeat(60));

    console.log("\n📝 Strategies:");
    console.log("━".repeat(60));
    STRATEGIES_ARRAY.forEach((s, i) => {
        console.log(`Strategy ${i + 1}:           ${s} (${(weight/100).toFixed(2)}%)`);
    });
    console.log("━".repeat(60));

    console.log("\n🎯 Test Commands:");
    console.log("━".repeat(60));
    console.log("# Check vault status:");
    console.log(`cast call ${vaultAddress} "totalAssets()(uint256)" --rpc-url $RAYLS_RPC_URL`);
    console.log("");
    console.log("# Check strategies:");
    console.log(`cast call ${vaultAddress} "getStrategies()(tuple[])" --rpc-url $RAYLS_RPC_URL`);
    console.log("━".repeat(60));

    const fs = require("fs");
    fs.mkdirSync('deployments', { recursive: true });
    
    const deploymentInfo = {
        network: network.name,
        chainId: Number(network.chainId),
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            vaultImplementation: vaultImplAddress,
            registry: registryAddress,
            strategyManager: strategyManagerAddress,
            vault: vaultAddress,
            asset: ASSET_ADDRESS,
            treasury: TREASURY,
            bot: deployer.address,
            strategies: STRATEGIES_ARRAY.map((s, i) => ({
                address: s,
                weight: weight,
                percentage: `${(weight/100).toFixed(2)}%`
            }))
        },
        config: {
            multiStrategyEnabled: true,
            registryType: "RaylsVaultRegistry"
        }
    };

    fs.writeFileSync(
        `deployments/complete_system_${Date.now()}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n💾 Deployment info saved!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

