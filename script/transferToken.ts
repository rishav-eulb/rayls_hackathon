import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// ERC20 ABI (minimal interface for transfer)
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

async function main() {
    // Configuration
    const tokenAddress = "0xDe21f028B087BB1fd148f998821307Ea71655CEE";
    const recipientAddress = "0x4fa53CF50E1f40016bC100DC1903aafF13388496";
    const transferAmount = "1000"; // Amount in token units (will be converted based on decimals)

    // Get private key from environment (handles with or without 0x prefix)
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in environment variables");
    }
    
    // Add 0x prefix if missing
    if (!privateKey.startsWith("0x")) {
        privateKey = "0x" + privateKey;
    }

    // Get RPC URL from environment
    const rpcUrl = process.env.RAYLS_TESTNET_URL;
    if (!rpcUrl) {
        throw new Error("RPC_URL not found in environment variables");
    }

    console.log("Connecting to RPC:", rpcUrl);
    
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log("Wallet address:", wallet.address);

    // Connect to token contract
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Get token info
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    console.log(`Token: ${symbol}, Decimals: ${decimals}`);

    // Check sender balance
    const balance = await tokenContract.balanceOf(wallet.address);
    console.log(`Sender balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);

    // Convert amount to token decimals
    const amountToSend = ethers.parseUnits(transferAmount, decimals);
    console.log(`Transfer amount: ${transferAmount} ${symbol}`);

    // Check if sender has sufficient balance
    if (balance < amountToSend) {
        throw new Error(`Insufficient balance. Have: ${ethers.formatUnits(balance, decimals)}, Need: ${transferAmount}`);
    }

    // Perform transfer
    console.log("\nInitiating transfer...");
    const tx = await tokenContract.transfer(recipientAddress, amountToSend);
    console.log("Transaction hash:", tx.hash);
    
    // Wait for confirmation
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Check new balance
    const newBalance = await tokenContract.balanceOf(wallet.address);
    console.log(`\nTransfer successful!`);
    console.log(`New balance: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
    console.log(`Transferred ${transferAmount} ${symbol} to ${recipientAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error.message);
        process.exit(1);
    });

