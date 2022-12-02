import { run } from "hardhat";

export const verify = async (
  contractAddress: string,
  contractArgs: [string]
) => {
  console.log("verification of the contract on the etherscan.io");
  console.log("......");

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: contractArgs,
    });
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.log(e);
    }
  }
};
