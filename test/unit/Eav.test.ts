/**
 * Testing
 * unit testing
 */
import { Eavolution } from "../../typechain-types/contracts/Eavolution";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developerChains } from "../../utils/helper";
import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

!developerChains.includes(network.name)
  ? describe.skip("Eavolution Smart Contract Unit Testing", () => {
      console.log("Not on development network, skipping...");
    })
  : describe("Eavolution Smart Contract Unit Testing", () => {
      console.log("Unit testing....");

      // global variables

      let eavolution: Eavolution;
      let deployer: string;
      let buyer: string;
      let signerBuyer: SignerWithAddress;

      beforeEach(async () => {
        // deployment

        await deployments.fixture(["all"]);

        deployer = (await getNamedAccounts()).deployer;
        buyer = (await getNamedAccounts()).buyerOne;
        signerBuyer = await ethers.getSigner(buyer);

        eavolution = await ethers.getContract("Eavolution", deployer);
      });

      describe("Constructor", () => {
        it("since the constructor works fine then aggregator should work for the price function.", async () => {
          const priceUSD = await eavolution.getLatestPrice();
          assert.isAbove(+priceUSD.toString(), 0);
        });
      });

      describe("UploadTicket", async () => {
        const ticketPrice = ethers.utils.parseEther("10");
        const ipfs = "hahaha";
        const ticketCount = 100;
        it("the eventId should be saved in the _allEvents array upon calling.", async () => {
          const eventId = await eavolution.uploadTicket(
            ticketPrice,
            ipfs,
            ticketCount
          );

          const getEventId = await eavolution.returnEventId(0);

          expect(eventId.value.toString()).equals(getEventId.toString());
        });

        it("The event should be saved in the _events mapping", async () => {
          await eavolution.uploadTicket(ticketPrice, ipfs, ticketCount);

          const getEventId = await eavolution.returnEventId(0);

          const eventDetails = await eavolution.getEventDetails(getEventId);

          expect(eventDetails.organizer).equals(deployer);
          expect(eventDetails.currentCount.toString()).eq("0");
          expect(eventDetails.totalTickets).eq(ticketCount);
          console.log(ticketPrice.toString());
          expect(eventDetails.ticketPrice.toString()).eq(
            ticketPrice.toString()
          );
        });

        it("number of events should be one.", async () => {
          await eavolution.uploadTicket(ticketPrice, ipfs, ticketCount);

          const events = await eavolution.getNumberOfEvents();

          expect(events.toNumber()).eq(1);
        });

        it("number of tickets available in an event should match with the difference of total tickets and current tickets count.", async () => {
          await eavolution.uploadTicket(ticketPrice, ipfs, ticketCount);

          const getEventId = await eavolution.returnEventId(0);

          const ticketsSold = await eavolution.getTotalTicketsSold(getEventId);

          const availTickets = await eavolution.getAvailableTickets(getEventId);

          const totalTickets = await eavolution.getTotalTickets(getEventId);

          expect(availTickets.toNumber()).eq(
            totalTickets.toNumber() - ticketsSold.toNumber()
          );
        });

        it("Event organizer must be deployer.", async () => {
          await eavolution.uploadTicket(ticketPrice, ipfs, ticketCount);

          const getEventId = await eavolution.returnEventId(0);

          const org = await eavolution.getEventOrganizer(getEventId);

          expect(org).eq(deployer);
        });

        it("must emit the event 'NewEventOnSale'", async () => {
          await expect(
            eavolution.uploadTicket(ticketPrice, ipfs, ticketCount)
          ).to.emit(eavolution, "NewEventOnSale");
        });
      });

      describe("BuyTicket", () => {
        let ticketBuyer: Eavolution;

        const ticketPrice = ethers.utils.parseEther("10");
        const ipfs = "hahaha";
        const ticketCount = 0;
        let getEventId: BigNumber;

        beforeEach(async () => {
          await eavolution.uploadTicket(ticketPrice, ipfs, ticketCount);

          getEventId = await eavolution.returnEventId(0);
          ticketBuyer = await eavolution.connect(signerBuyer);
        });

        it("event ticket must be on sale.", async () => {
          await eavolution.changeEvenSellingStatus(getEventId);
          await expect(
            ticketBuyer.buyTicket(getEventId, "random_uri", {
              value: ticketPrice,
            })
          ).to.be.revertedWithCustomError(eavolution, "NotOnSale");
        });

        it("Must pay enough money to buy ticket.", async () => {
          await expect(
            ticketBuyer.buyTicket(getEventId, "random_uri", {
              value: ethers.utils.parseEther("9"),
            })
          ).to.be.revertedWithCustomError(eavolution, "InsufficientMoney");
        });

        it("Event must not be houseful", async () => {
          await expect(
            ticketBuyer.buyTicket(getEventId, "random_uri", {
              value: ticketPrice,
            })
          ).to.be.revertedWithCustomError(eavolution, "ShowFull");
        });
      });
    });
