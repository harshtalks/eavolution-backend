import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "hardhat-tracer";
import "@nomiclabs/hardhat-solhint";
import "hardhat-address-exporter";
import "hardhat-network-metadata";

// Hardhat Config Object

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  // abiExporter: {
  //   path: "../",
  //   runOnCompile: false,
  //   format: "json",
  // },
  addressExporter: {
    runPrettier: true,
  },
};

export default config;
