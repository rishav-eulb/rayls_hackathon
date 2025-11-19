import { HardhatUserConfig } from "hardhat/config";
import { task } from "hardhat/config";

import "@nomicfoundation/hardhat-toolbox";
// import "@nomicfoundation/hardhat-foundry"; // Disabled - Foundry not installed
import "@typechain/hardhat";
import 'hardhat-preprocessor';
import "hardhat-gas-reporter";
import "@openzeppelin/hardhat-upgrades";
require("hardhat-contract-sizer");
import * as dotenv from "dotenv";
dotenv.config();
import "solidity-coverage";


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  paths: {
    sources: "./src",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
      { version: "0.8.20" },
    ],
  },
  preprocess: {
    eachLine: () => ({
      transform: (line: string, sourceInfo: {absolutePath: string}): string => {
        if (line.trim().startsWith("pragma solidity")) {
          return "pragma solidity ^0.8.24;";
        }
        return line;
      },
    }),
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },
  networks: {
  
    rayls: {
      url: process.env.RAYLS_RPC_URL || "https://devnet-rpc.rayls.com",
      accounts: [process.env.PRIVATE_KEY??""],
      chainId: 123123,
      gasPrice: "auto"
    }
  },
  etherscan:{
    apiKey: {
      'mainnet': process.env.ETHERSCAN_API ?? "",
      'bloctopus': 'empty',
      'local_testnet': 'empty',
      'rayls': 'empty'
    },
    customChains:[
      {
        network: "holesky",
        chainId: 17000,
        urls: {
            apiURL: "https://api-holesky.etherscan.io/api",
            browserURL: "https://holesky.etherscan.io"
        }
      },
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
            apiURL: "https://api-sepolia.etherscan.io/api",
            browserURL: "https://sepolia.etherscan.io"
        }
      },
      {
        network: "berachain_bartio",
        chainId: 80084,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/80084/etherscan",
          browserURL: "https://bartio.beratrail.io"
        }
      },
      {
        network: "BNB Smart Chain Testnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com"
        }
      },
      {
        network: "local_testnet",
        chainId: 31337,
        urls: {
          apiURL: "http://localhost/api",
          browserURL: "http://localhost"
        }
      },
      {
        network: "bloctopus",
        chainId: 5234879,
        urls: {
          apiURL: "https://7d37250983e04175a8cefbded3b974a3-blockscout-backend.network.bloctopus.io/api",
          browserURL: "https://7d37250983e04175a8cefbded3b974a3-blockscout.network.bloctopus.io"
        }
      },
      {
        network: "rayls",
        chainId: 123123,
        urls: {
          apiURL: "https://devnet-explorer.rayls.com/api",
          browserURL: "https://devnet-explorer.rayls.com"
        }
      }
    ]
  }
};

export default config;
