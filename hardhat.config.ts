import { HardhatUserConfig } from "hardhat/config";
import { NetworkMetadata } from "./custom-types/UserConfig";
import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "hardhat-tracer";
import "@nomiclabs/hardhat-solhint";
import "hardhat-address-exporter";
import "hardhat-network-metadata";

// dotenv config
dotenv.config({ path: __dirname + "/.env" });

const accs = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

// Hardhat Config Object

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: "0.8.17" }],
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    buyerOne: {
      default: 1,
    },
    buyerTwo: {
      default: 2,
    },
  },
  networks: {
    hardhat: {
      metadata: {
        priceFeedAddress: "0xd4a33860578de61dbabdc8bfdb98fd742fa7028e",
        blockConfirmations: 1,
        initialPrice: 207810000000,
        decimals: 18,
      } as NetworkMetadata,
    },
    goerli: {
      chainId: 5,
      url: process.env.GOERLI_RPC,
      accounts: accs,
      metadata: {
        priceFeedAddress: "0xd4a33860578de61dbabdc8bfdb98fd742fa7028e",
        blockConfirmations: 3,
      } as NetworkMetadata,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      metadata: {
        priceFeedAddress: "0xd4a33860578de61dbabdc8bfdb98fd742fa7028e",
        blockConfirmations: 1,
        initialPrice: 207810000000,
        decimals: 18,
      } as NetworkMetadata,
    },
  },
  mocha: {
    timeout: 500000,
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    currency: "USD",
  },
  abiExporter: {
    path: "../frontend/abi",
    clear: true,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API,
  },
};

export default config;
