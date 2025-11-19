import { ethers, run } from "hardhat";

/**
 * Helper script to verify contracts on block explorers
 * Usage:
 *   CONTRACT_ADDRESS=0x... CONTRACT_TYPE=strategy npm run verify:contract
 */

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractType = process.env.CONTRACT_TYPE || "strategy";
    const assetAddress = process.env.ASSET_ADDRESS;
    const childVaultAddress = process.env.CHILD_VAULT;

    if (!contractAddress) {
        throw new Error("❌ CONTRACT_ADDRESS environment variable not set");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🔍 CONTRACT VERIFICATION");
    console.log("=".repeat(60));
    console.log("\nContract Address:", contractAddress);
    console.log("Contract Type:", contractType);
    console.log("Network:", (await ethers.provider.getNetwork()).name);

    let constructorArguments: any[] = [];
    let contractPath: string | undefined;

    // Determine constructor arguments based on contract type
    switch (contractType.toLowerCase()) {
        case "strategy":
        case "erc4626strategy":
        case "erc4626childstrategy":
            if (!assetAddress || !childVaultAddress) {
                throw new Error("❌ ASSET_ADDRESS and CHILD_VAULT required for ERC4626ChildStrategy");
            }
            constructorArguments = [assetAddress, childVaultAddress];
            contractPath = "src/vaults/mocks/MockStrategy.sol:ERC4626ChildStrategy";
            console.log("Verifying ERC4626ChildStrategy...");
            break;

        case "simple":
        case "mockstrategycorrect":
            if (!assetAddress) {
                throw new Error("❌ ASSET_ADDRESS required for MockStrategyCorrect");
            }
            constructorArguments = [assetAddress];
            contractPath = "src/vaults/mocks/MockStrategyCorrect.sol:MockStrategyCorrect";
            console.log("Verifying MockStrategyCorrect...");
            break;

        case "childvault":
        case "extendedchilderc4626vault":
            if (!assetAddress) {
                throw new Error("❌ ASSET_ADDRESS required for ExtendedChildERC4626Vault");
            }
            const vaultName = process.env.VAULT_NAME || "Child Vault USDC";
            const vaultSymbol = process.env.VAULT_SYMBOL || "cvUSDC";
            constructorArguments = [assetAddress, vaultName, vaultSymbol];
            contractPath = "src/vaults/mocks/MockERC4626ChildVault.sol:ExtendedChildERC4626Vault";
            console.log("Verifying ExtendedChildERC4626Vault...");
            break;

        case "vault":
        case "raylsvault":
            // RaylsVault is usually deployed as a proxy, verify the implementation
            constructorArguments = [];
            contractPath = "src/vaults/RaylsVault.sol:RaylsVault";
            console.log("Verifying RaylsVault (implementation)...");
            break;

        case "registry":
        case "simpleraylsvaultregistry":
            const vaultImpl = process.env.VAULT_IMPLEMENTATION;
            const treasury = process.env.TREASURY;
            const owner = process.env.OWNER;
            if (!vaultImpl || !treasury || !owner) {
                throw new Error("❌ VAULT_IMPLEMENTATION, TREASURY, and OWNER required");
            }
            constructorArguments = [vaultImpl, treasury, owner];
            contractPath = "src/vaults/SimpleRaylsVaultRegistry.sol:SimpleRaylsVaultRegistry";
            console.log("Verifying SimpleRaylsVaultRegistry...");
            break;

        case "strategymanager":
            constructorArguments = [];
            contractPath = "src/StrategyManager.sol:StrategyManager";
            console.log("Verifying StrategyManager...");
            break;

        case "custom":
            // Allow manual specification via env vars
            const argsString = process.env.CONSTRUCTOR_ARGS;
            if (argsString) {
                constructorArguments = JSON.parse(argsString);
            }
            contractPath = process.env.CONTRACT_PATH;
            console.log("Verifying custom contract...");
            break;

        default:
            throw new Error(`❌ Unknown contract type: ${contractType}`);
    }

    console.log("\n📋 Verification Details:");
    console.log("━".repeat(60));
    if (contractPath) {
        console.log("Contract Path:", contractPath);
    }
    console.log("Constructor Args:", JSON.stringify(constructorArguments, null, 2));
    console.log("━".repeat(60));

    // Wait a bit to ensure contract is indexed
    console.log("\n⏳ Waiting for contract to be indexed...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Attempt verification
    console.log("\n🔄 Submitting verification...");
    try {
        const verifyParams: any = {
            address: contractAddress,
            constructorArguments: constructorArguments,
        };

        if (contractPath) {
            verifyParams.contract = contractPath;
        }

        await run("verify:verify", verifyParams);

        console.log("\n" + "=".repeat(60));
        console.log("✅ VERIFICATION SUCCESSFUL!");
        console.log("=".repeat(60));
        console.log("\nView your verified contract on the explorer:");
        
        const network = await ethers.provider.getNetwork();
        if (network.chainId === 123123n) {
            console.log(`https://devnet-explorer.rayls.com/address/${contractAddress}`);
        } else if (network.chainId === 1n) {
            console.log(`https://etherscan.io/address/${contractAddress}`);
        } else if (network.chainId === 11155111n) {
            console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
        }

    } catch (error: any) {
        if (error.message.includes("Already Verified") || 
            error.message.includes("already verified")) {
            console.log("\n" + "=".repeat(60));
            console.log("✅ CONTRACT ALREADY VERIFIED!");
            console.log("=".repeat(60));
        } else {
            console.error("\n" + "=".repeat(60));
            console.error("❌ VERIFICATION FAILED");
            console.error("=".repeat(60));
            console.error("\nError:", error.message);
            console.error("\n💡 Troubleshooting:");
            console.error("1. Ensure constructor arguments are correct");
            console.error("2. Check that the contract is deployed on this network");
            console.error("3. Wait a few more blocks and try again");
            console.error("4. Verify compilation settings match deployment");
            throw error;
        }
    }

    console.log("\n📝 Verification Info Saved:");
    const fs = require('fs');
    const verificationInfo = {
        contractAddress,
        contractType,
        constructorArguments,
        contractPath,
        timestamp: new Date().toISOString(),
        network: (await ethers.provider.getNetwork()).name,
        chainId: Number((await ethers.provider.getNetwork()).chainId)
    };

    fs.mkdirSync('deployments/verifications', { recursive: true });
    fs.writeFileSync(
        `deployments/verifications/${contractType}-${Date.now()}.json`,
        JSON.stringify(verificationInfo, null, 2)
    );
    console.log("Saved to: deployments/verifications/");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

