import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre;

  const { log, deploy } = deployments;

  log("deployment for the eavolution smart contract....");

  const { deployer } = await getNamedAccounts();
};

export default deploy;
