import { expect } from "chai";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developerChains } from "../../utils/helper";

developerChains.includes(network.name)
  ? describe.skip("Eavolution Staging", () => {
      console.log("Staging...");
      console.log("No need for staging on local develepment Environment");
    })
  : describe("Eavolution Staging", () => {
      console.log("heko");
    });
