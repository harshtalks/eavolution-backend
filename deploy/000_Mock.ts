import { HardhatRuntimeEnvironment } from "hardhat/types";
import { NetworkMetadata } from "../custom-types/UserConfig";

export const deploy = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre;

  const { log, deploy } = deployments;

  log("*********************");
  log("deploying mock for testing...");

  const { deployer } = await getNamedAccounts();

  const { chainId } = network.config;

  if (chainId !== 31337) {
    log("no need to deploy mock contract on the goerli network.");
    log("moving to the Eavolution smart contract deployment...");
    log("****************************");
    log("");
    return;
  }

  const { initialPrice, decimals, blockConfirmations } = network.config
    .metadata as NetworkMetadata;

  log("network: hardhat/localhost");

  log(`address deploying the contract is: ${deployer}\n`);

  const transaction = await deploy("MockV3Aggregator", {
    from: deployer,
    log: true,
    args: [decimals, initialPrice],
    waitConfirmations: blockConfirmations,
  });

  log(
    `\ntransaction processing for the contract deployed at address: ${transaction.address}`
  );
};

deploy.tags = ["mock", "all"];

export default deploy;
