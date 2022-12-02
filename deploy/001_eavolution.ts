import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { NetworkMetadata } from "../custom-types/UserConfig";
import { developerChains } from "../utils/helper";
import { verify } from "../utils/verify";

const deploy = async (hardhatRuntimeEnvironment: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hardhatRuntimeEnvironment;

  const { log, deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  log("\n**************************************");
  log("deploying Eavolution Smart Contract...");

  const { chainId } = network.config;

  let addressForMockV3: string;

  if (chainId === 31337) {
    log("we are in the local hardhat network as of now");
    const mockV3Aggregator = await ethers.getContract(
      "MockV3Aggregator",
      deployer
    );

    addressForMockV3 = mockV3Aggregator.address;
  } else {
    const { priceFeedAddress } = network.config.metadata as NetworkMetadata;
    addressForMockV3 = priceFeedAddress;
  }

  const { blockConfirmations } = network.config.metadata as NetworkMetadata;

  log(`address for AggregatorV3 is: ${addressForMockV3}`);

  log("deploying the contract.....");

  const transaction = await deploy("Eavolution", {
    from: deployer,
    args: [addressForMockV3],
    log: true,
    waitConfirmations: blockConfirmations,
  });

  log("deployed at the address: ");
  log(transaction.address);

  if (!developerChains.includes(network.name) && process.env.ETHERSCAN_API) {
    await verify(transaction.address, [addressForMockV3]);
  }
};

deploy.tags = ["all", "eav"];

export default deploy;
