import { ethers } from "hardhat";

/**
 * Script to setup a multi-strategy vault system
 * 
 * This script:
 * 1. Deploys a vault (or uses existing)
 * 2. Configures it for multi-strategy mode
 * 3. Adds multiple strategies with weights
 * 4. Sets up the allocation bot
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up multi-strategy vault with account:", deployer.address);

  // ============================================
  // CONFIGURATION - Update these values
  // ============================================
  
  const VAULT_ADDRESS = process.env.VAULT_ADDRESS || "";
  const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS || "";
  const STRATEGY_MANAGER_ADDRESS = process.env.STRATEGY_MANAGER_ADDRESS || "";
  const BOT_ADDRESS = process.env.BOT_ADDRESS || deployer.address;
  
  // Asset and vault details (if deploying new vault)
  const ASSET_ADDRESS = process.env.ASSET_ADDRESS || ""; // e.g., USDC
  const VAULT_NAME = "NativeYield USDC Vault";
  const VAULT_SYMBOL = "nyUSDC";

  // Strategies with their target weights (basis points, 10000 = 100%)
  const STRATEGIES = [
    {
      address: process.env.STRATEGY_1 || "",
      weight: 4000, // 40%
      name: "Aave"
    },
    {
      address: process.env.STRATEGY_2 || "",
      weight: 3000, // 30%
      name: "Compound"
    },
    {
      address: process.env.STRATEGY_3 || "",
      weight: 3000, // 30%
      name: "Curve"
    }
  ];

  // Validate total weights = 100%
  const totalWeight = STRATEGIES.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight !== 10000) {
    console.warn(`⚠️  Warning: Total weight is ${totalWeight / 100}%, not 100%`);
  }

  // ============================================
  // 1. Get or Deploy Vault
  // ============================================
  
  let vault;
  let vaultAddress;

  if (VAULT_ADDRESS) {
    console.log("\n📍 Using existing vault:", VAULT_ADDRESS);
    vault = await ethers.getContractAt("RaylsVault", VAULT_ADDRESS);
    vaultAddress = VAULT_ADDRESS;
  } else if (REGISTRY_ADDRESS && ASSET_ADDRESS) {
    console.log("\n🏗️  Deploying new vault via registry...");
    const registry = await ethers.getContractAt("IRaylsVaultRegistry", REGISTRY_ADDRESS);
    
    // Deploy vault with first strategy as initial strategy
    const tx = await registry.deployVault(
      ASSET_ADDRESS,
      VAULT_NAME,
      VAULT_SYMBOL,
      STRATEGIES[0].address
    );
    const receipt = await tx.wait();
    
    // Get vault address from event
    const event = receipt.events?.find((e: any) => e.event === "VaultDeployed");
    vaultAddress = event?.args?.vault;
    
    console.log("✅ Vault deployed at:", vaultAddress);
    vault = await ethers.getContractAt("RaylsVault", vaultAddress);
  } else {
    throw new Error("Must provide VAULT_ADDRESS or (REGISTRY_ADDRESS + ASSET_ADDRESS)");
  }

  // ============================================
  // 2. Configure Vault for Multi-Strategy
  // ============================================
  
  console.log("\n⚙️  Configuring vault for multi-strategy mode...");

  // Set strategy manager (optional)
  if (STRATEGY_MANAGER_ADDRESS) {
    console.log("Setting strategy manager:", STRATEGY_MANAGER_ADDRESS);
    const tx1 = await vault.setStrategyManager(STRATEGY_MANAGER_ADDRESS);
    await tx1.wait();
    console.log("✅ Strategy manager set");

    // Authorize vault in strategy manager
    const strategyManager = await ethers.getContractAt("StrategyManager", STRATEGY_MANAGER_ADDRESS);
    const tx2 = await strategyManager.setAuthorizedCaller(vaultAddress, true);
    await tx2.wait();
    console.log("✅ Vault authorized in strategy manager");
  }

  // Set allocation bot
  console.log("Setting allocation bot:", BOT_ADDRESS);
  const tx3 = await vault.setAllocationBot(BOT_ADDRESS);
  await tx3.wait();
  console.log("✅ Allocation bot set");

  // Enable multi-strategy mode
  console.log("Enabling multi-strategy mode...");
  const tx4 = await vault.setMultiStrategyEnabled(true);
  await tx4.wait();
  console.log("✅ Multi-strategy mode enabled");

  // ============================================
  // 3. Add Strategies
  // ============================================
  
  console.log("\n📊 Adding strategies...");

  for (const strategy of STRATEGIES) {
    if (!strategy.address) {
      console.warn(`⚠️  Skipping ${strategy.name}: no address provided`);
      continue;
    }

    try {
      // Check if strategy already added
      const strategies = await vault.getStrategies();
      const exists = strategies.some((s: any) => s.strategy.toLowerCase() === strategy.address.toLowerCase());
      
      if (exists) {
        console.log(`ℹ️  ${strategy.name} already added, updating weight...`);
        const tx = await vault.updateStrategyWeight(strategy.address, strategy.weight);
        await tx.wait();
      } else {
        console.log(`Adding ${strategy.name} with ${strategy.weight / 100}% weight...`);
        const tx = await vault.addStrategy(strategy.address, strategy.weight);
        await tx.wait();
      }

      // Set vault reference on strategy
      try {
        const strategyContract = await ethers.getContractAt("IStrategy", strategy.address);
        const currentVault = await strategyContract.getVault();
        
        if (currentVault.toLowerCase() !== vaultAddress.toLowerCase()) {
          console.log(`  Setting vault reference on ${strategy.name}...`);
          const tx = await strategyContract.setVault(vaultAddress);
          await tx.wait();
        }
      } catch (e) {
        console.log(`  ℹ️  Could not set vault reference (may not be owner)`);
      }

      console.log(`✅ ${strategy.name} configured`);
    } catch (error: any) {
      console.error(`❌ Error adding ${strategy.name}:`, error.message);
    }
  }

  // ============================================
  // 4. Verify Setup
  // ============================================
  
  console.log("\n🔍 Verifying setup...");

  const isMultiStrategy = await vault.isMultiStrategyEnabled();
  console.log("Multi-strategy enabled:", isMultiStrategy);

  const bot = await vault.getAllocationBot();
  console.log("Allocation bot:", bot);

  const strategies = await vault.getStrategies();
  console.log("\nConfigured strategies:");
  for (const s of strategies) {
    console.log(`  - ${s.strategy}`);
    console.log(`    Weight: ${s.targetWeight / 100}%`);
    console.log(`    Current Balance: ${ethers.utils.formatUnits(s.currentBalance, 6)} tokens`);
  }

  // ============================================
  // 5. Summary
  // ============================================
  
  console.log("\n" + "=".repeat(60));
  console.log("✨ Multi-Strategy Vault Setup Complete!");
  console.log("=".repeat(60));
  console.log("\nVault Address:", vaultAddress);
  console.log("Bot Address:", bot);
  console.log("Number of Strategies:", strategies.length);
  console.log("\nNext Steps:");
  console.log("1. Start the rebalancing bot");
  console.log("2. Test with small deposits");
  console.log("3. Monitor strategy performance");
  console.log("4. Adjust weights as needed");
  console.log("\nBot Command:");
  console.log(`  BOT_PRIVATE_KEY=<key> VAULT_ADDRESS=${vaultAddress} ts-node script/rebalanceBot.ts`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

