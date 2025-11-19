import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Vault ABI
const VAULT_ABI = [
    "function asset() view returns (address)",
    "function getStrategy() view returns (address)",
    "function getRegistry() view returns (address)",
    "function paused() view returns (bool)",
    "function totalAssets() view returns (uint256)",
    "function totalSupply() view returns (uint256)"
];

// Strategy ABI - basic interface
const STRATEGY_ABI = [
    "function TOKEN_ADDRESS() view returns (address)",
    "function getTotalAssets() view returns (uint256)",
    "function harvest() external",
    "function vault() view returns (address)"
];

// Registry ABI
const REGISTRY_ABI = [
    "function owner() view returns (address)"
];

async function main() {
    const vaultAddress = "0xAC2C70253F195692B7Ca8Ab76a2A76739e857027";

    // Get RPC URL
    const rpcUrl = process.env.RAYLS_TESTNET_URL;
    if (!rpcUrl) {
        throw new Error("RAYLS_TESTNET_URL not found in environment variables");
    }

    console.log("Connecting to RPC:", rpcUrl);
    console.log("Diagnosing vault:", vaultAddress);
    
    // Setup provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get private key for testing
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found");
    }
    if (!privateKey.startsWith("0x")) {
        privateKey = "0x" + privateKey;
    }
    const wallet = new ethers.Wallet(privateKey, provider);

    // Connect to vault
    const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);

    console.log("\n=== Vault Configuration ===");
    
    try {
        const asset = await vault.asset();
        console.log("✅ Asset:", asset);
    } catch (e) {
        console.log("❌ Could not read asset");
    }

    try {
        const strategy = await vault.getStrategy();
        console.log("✅ Strategy:", strategy);
        
        // Check strategy details
        console.log("\n=== Strategy Check ===");
        const strategyContract = new ethers.Contract(strategy, STRATEGY_ABI, provider);
        
        try {
            const tokenAddress = await strategyContract.TOKEN_ADDRESS();
            console.log("✅ Strategy TOKEN_ADDRESS:", tokenAddress);
        } catch (e: any) {
            console.log("❌ Could not read TOKEN_ADDRESS:", e.message);
        }

        try {
            const totalAssets = await strategyContract.getTotalAssets();
            console.log("✅ Strategy getTotalAssets:", totalAssets.toString());
        } catch (e: any) {
            console.log("❌ Could not read getTotalAssets:", e.message);
        }

        // Check if strategy has code
        const strategyCode = await provider.getCode(strategy);
        if (strategyCode === "0x" || strategyCode === "0x0") {
            console.log("❌ Strategy has NO CODE - this is the problem!");
        } else {
            console.log("✅ Strategy has code (" + ((strategyCode.length - 2) / 2) + " bytes)");
        }

        // Try to call harvest (this might fail)
        console.log("\n=== Testing Strategy Harvest ===");
        try {
            const strategyWithSigner = strategyContract.connect(wallet) as any;
            await strategyWithSigner.harvest.staticCall();
            console.log("✅ Harvest simulation succeeded");
        } catch (e: any) {
            console.log("❌ Harvest simulation failed:", e.message);
            if (e.data) {
                console.log("   Error data:", e.data);
            }
        }

    } catch (e: any) {
        console.log("❌ Could not read strategy:", e.message);
    }

    try {
        const registry = await vault.getRegistry();
        console.log("✅ Registry:", registry);
        
        // Check registry owner
        const registryContract = new ethers.Contract(registry, REGISTRY_ABI, provider);
        const owner = await registryContract.owner();
        console.log("✅ Registry Owner:", owner);
    } catch (e: any) {
        console.log("❌ Could not read registry:", e.message);
    }

    try {
        const paused = await vault.paused();
        console.log(paused ? "⚠️  Vault is PAUSED" : "✅ Vault is NOT paused");
    } catch (e: any) {
        console.log("❌ Could not check paused status:", e.message);
    }

    try {
        const totalAssets = await vault.totalAssets();
        console.log("✅ Vault totalAssets:", totalAssets.toString());
    } catch (e: any) {
        console.log("❌ Could not read totalAssets:", e.message);
    }

    console.log("\n=== Diagnosis Complete ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });

