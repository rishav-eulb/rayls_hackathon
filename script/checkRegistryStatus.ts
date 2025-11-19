import { ethers } from "ethers";
import * as dotenv from "dotenv";


dotenv.config();

const REGISTRY_ABI = [
    "function owner() view returns (address)",
    "function getTreasury() view returns (address)",
    "function getBeacon() view returns (address)",
    "function getTimelock() view returns (address)",
    "function allVaultsLength() view returns (uint256)",
    "function getFees() view returns (tuple(uint16 deposit, uint16 withdraw, uint16 management, uint16 performance))"
];

async function main() {
    const registryAddress = process.env.REGISTRY_ADDRESS;
    if (!registryAddress) {
        throw new Error("REGISTRY_ADDRESS not found in environment variables");
    }

    const rpcUrl = process.env.RAYLS_TESTNET_URL;
    if (!rpcUrl) {
        throw new Error("RAYLS_TESTNET_URL not found in environment variables");
    }

    console.log("Connecting to RPC:", rpcUrl);
    console.log("Registry address:", registryAddress);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);

    console.log("\n=== Checking Registry Status ===\n");

    try {
        const owner = await registry.owner();
        console.log("✅ Registry IS INITIALIZED\n");
        console.log("Owner:", owner);

        try {
            const treasury = await registry.getTreasury();
            console.log("Treasury:", treasury);
        } catch (e) {
            console.log("Treasury: Could not read");
        }

        try {
            const beacon = await registry.getBeacon();
            console.log("Beacon:", beacon);
        } catch (e) {
            console.log("Beacon: Could not read");
        }

        try {
            const timelock = await registry.getTimelock();
            console.log("Timelock:", timelock);
        } catch (e) {
            console.log("Timelock: Could not read");
        }

        try {
            const vaultCount = await registry.allVaultsLength();
            console.log("Total Vaults:", vaultCount.toString());
        } catch (e) {
            console.log("Total Vaults: Could not read");
        }

        try {
            const fees = await registry.getFees();
            console.log("\nFees:");
            console.log("  Deposit:", fees.deposit.toString(), "bps");
            console.log("  Withdraw:", fees.withdraw.toString(), "bps");
            console.log("  Management:", fees.management.toString(), "bps");
            console.log("  Performance:", fees.performance.toString(), "bps");
        } catch (e) {
            console.log("Fees: Could not read");
        }

        console.log("\n⚠️  Registry is already initialized!");
        console.log("You can proceed to deploy vaults using script/2_deployVaultFromRegistry.ts");

    } catch (error: any) {
        console.log("❓ Registry does not appear to be initialized");
        console.log("Error:", error.message);
        
        console.log("\n=== Checking Storage Directly ===");
        const initSlot = await provider.getStorage(registryAddress, 0);
        console.log("Initializable slot (0):", initSlot);
        
        const initializedValue = BigInt(initSlot);
        if (initializedValue > 0n) {
            console.log("✅ Storage shows initialized (version:", initializedValue.toString() + ")");
            console.log("\n🔍 The contract is initialized but may have a different interface");
            console.log("   or the deployment may have failed partway through.");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });

