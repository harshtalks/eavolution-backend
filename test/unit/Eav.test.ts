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
      let transferAcc: string;
      let signerTransferAcc: SignerWithAddress;

      beforeEach(async () => {
        // deployment

        await deployments.fixture(["all"]);

        deployer = (await getNamedAccounts()).deployer;
        buyer = (await getNamedAccounts()).buyerOne;
        signerBuyer = await ethers.getSigner(buyer);

        transferAcc = (await getNamedAccounts()).buyerTwo;
        signerTransferAcc = await ethers.getSigner(transferAcc);

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

          const priceInDollars = await eavolution.getLatestPrice();

          console.log(ethers.utils.formatEther(priceInDollars));

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
        const ticketCount = 100;
        let getEventId: BigNumber;

        beforeEach(async () => {
          await eavolution.uploadTicket(ticketPrice, ipfs, ticketCount);

          getEventId = await eavolution.returnEventId(0);
          ticketBuyer = await eavolution.connect(signerBuyer);
        });

        it("event ticket must be on sale.", async () => {
          await eavolution.changeEventSellingStatus(getEventId);
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

        // it("Event must not be houseful", async () => {
        //   await expect(
        //     ticketBuyer.buyTicket(getEventId, "random_uri", {
        //       value: ticketPrice,
        //     })
        //   ).to.be.revertedWithCustomError(eavolution, "ShowFull");
        // });

        it("the organizer should be paid off", async () => {
          const initialBalance = await ethers.provider.getBalance(deployer);
          await ticketBuyer.buyTicket(getEventId, "random_uri", {
            value: ticketPrice,
          });
          const afterBalance = await ethers.provider.getBalance(deployer);

          expect(afterBalance).equal(initialBalance.add(ticketPrice));
        });

        it("The contract should not hold any money", async () => {
          const initialBalance = await ethers.provider.getBalance(
            eavolution.address
          );
          await ticketBuyer.buyTicket(getEventId, "random_uri", {
            value: ticketPrice,
          });
          const afterBalance = await ethers.provider.getBalance(
            eavolution.address
          );

          expect(afterBalance).equal(initialBalance);
        });

        it("must emit an event 'Transfer'", async () => {
          await expect(
            ticketBuyer.buyTicket(getEventId, "random_uri", {
              value: ticketPrice,
            })
          ).to.emit(eavolution, "Transfer");
        });

        it("the ticket buyer must have this ticket registered on his name.", async () => {
          await ticketBuyer.buyTicket(getEventId, "random_uri", {
            value: ticketPrice,
          });

          const ticketId = await eavolution.getBuyerTicketsIds(buyer);

          expect(ticketId[0].toString()).eq("0");

          const uri = await eavolution.tokenURI(ticketId[0]);

          expect(uri).eq("random_uri");
        });

        it("The TicketDetails Object", async () => {
          await ticketBuyer.buyTicket(getEventId, "random_uri", {
            value: ticketPrice,
          });

          const ticketId = await eavolution.getBuyerTicketsIds(buyer);

          const getObject = await eavolution.getTicketDetails(ticketId[0]);

          expect(getObject.eventId).to.equal(getEventId);
          expect(getObject.ticketStatus).to.eq(0);
          expect(getObject.owner).to.eq(
            await eavolution.ownerOf(ticketId[0].toNumber())
          );
        });

        it("emits the event, new ticket bought", async () => {
          await expect(
            ticketBuyer.buyTicket(getEventId, "random_uri", {
              value: ticketPrice,
            })
          ).to.emit(eavolution, "TicketSold");
        });
      });

      describe("Resale Ticket", () => {
        let ticketBuyer: Eavolution;

        const ticketPrice = ethers.utils.parseEther("10");
        const ipfs = "hahaha";
        const ticketCount = 100;
        let getEventId: BigNumber;

        let toTransferConnect: Eavolution;
        let ticketId: BigNumber;

        beforeEach(async () => {
          await eavolution.uploadTicket(ticketPrice, ipfs, ticketCount);

          getEventId = await eavolution.returnEventId(0);
          ticketBuyer = eavolution.connect(signerBuyer);
          toTransferConnect = eavolution.connect(signerTransferAcc);

          await ticketBuyer.buyTicket(getEventId, "random_uri", {
            value: ticketPrice,
          });

          const ticketIds = await eavolution.getBuyerTicketsIds(buyer);
          ticketId = ticketIds[0];
        });

        it("ticket should be on the resale.", async () => {
          await expect(
            toTransferConnect.resaleTicket(ticketId.toNumber(), {
              value: ticketPrice,
            })
          ).to.be.revertedWithCustomError(eavolution, "NotOnResale");
        });

        it("you should match the price of the ticket", async () => {
          await ticketBuyer.putOnResale(ticketId.toNumber());

          await expect(
            toTransferConnect.resaleTicket(ticketId.toNumber(), {
              value: ethers.utils.parseEther("5"),
            })
          ).to.be.reverted;
        });

        it("money should be transferred to the resaler asap", async () => {
          await ticketBuyer.putOnResale(ticketId.toNumber());

          const initialBalance = await ethers.provider.getBalance(buyer);

          console.log(await eavolution.ownerOf(ticketId.toNumber()));

          await toTransferConnect.resaleTicket(ticketId.toNumber(), {
            value: ticketPrice,
          });

          const afterBalance = await ethers.provider.getBalance(buyer);

          expect(initialBalance).to.eq(afterBalance.sub(ticketPrice));

          const buyerTicketIds = await toTransferConnect.getBuyerTicketsIds(
            transferAcc
          );

          expect(buyerTicketIds[0].toNumber()).eq(ticketId.toNumber());
        });

        it("Old owner should be removed from the ticketholders and registeredParticipant list.", async () => {
          await ticketBuyer.putOnResale(ticketId.toNumber());

          await toTransferConnect.resaleTicket(ticketId.toNumber(), {
            value: ticketPrice,
          });

          const newOwner = await toTransferConnect.ownerOf(ticketId.toNumber());
          const ticketDetails = await toTransferConnect.getTicketDetails(
            ticketId.toNumber()
          );

          expect(newOwner).eq(transferAcc).eq(ticketDetails.owner);

          const getBuyerTicketsIds = await toTransferConnect.getBuyerTicketsIds(
            buyer
          );

          expect(getBuyerTicketsIds.length).eq(0);

          const getRegisteredParticipantsDetails =
            await toTransferConnect.getRegisteredNames(getEventId.toNumber());

          expect(getRegisteredParticipantsDetails[0]).eq(transferAcc);
        });
      });

      describe("Check In method", () => {
        let ticketBuyer: Eavolution;

        const ticketPrice = ethers.utils.parseEther("10");
        const ipfs = "hahaha";
        const ticketCount = 100;
        let getEventId: BigNumber;

        let toTransferConnect: Eavolution;
        let ticketId: BigNumber;

        beforeEach(async () => {
          await eavolution.uploadTicket(ticketPrice, ipfs, ticketCount);

          getEventId = await eavolution.returnEventId(0);
          ticketBuyer = eavolution.connect(signerBuyer);
          toTransferConnect = eavolution.connect(signerTransferAcc);

          await ticketBuyer.buyTicket(getEventId, "random_uri", {
            value: ticketPrice,
          });

          const ticketIds = await eavolution.getBuyerTicketsIds(buyer);
          ticketId = ticketIds[0];
        });

        it("should be the owner who runs it.", async () => {
          await expect(
            toTransferConnect.checkIn(ticketId.toNumber())
          ).to.be.revertedWithCustomError(eavolution, "YouAreNotAnOwner");
        });

        it("should successfully check in", async () => {
          await ticketBuyer.checkIn(ticketId.toNumber());

          const status = await eavolution.getTicketStatus(ticketId.toNumber());

          expect(status.toNumber()).to.eq(1);
        });

        it("event should be fired named CheckedIn", async () => {
          await expect(ticketBuyer.checkIn(ticketId.toNumber())).to.emit(
            eavolution,
            "CheckedIn"
          );
        });
      });

      describe("Forbidden functions", () => {
        it("setApprovalForAll", async () => {
          await expect(eavolution.setApprovalForAll(buyer, true)).to.be
            .reverted;
        });

        it("approve", async () => {
          await expect(eavolution.approve(buyer, 1)).to.be.reverted;
        });

        it("Safe Transfer", async () => {
          await expect(
            eavolution["safeTransferFrom(address,address,uint256,bytes)"](
              deployer,
              buyer,
              1,
              "0x"
            )
          ).to.be.reverted;

          await expect(
            eavolution["safeTransferFrom(address,address,uint256)"](
              deployer,
              buyer,
              1
            )
          ).to.be.reverted;
        });
      });

      describe("priceFeed", () => {
        it("Fun", async () => {
          const ticketPrice = ethers.utils.parseEther("10");
          const getPrice = ethers.utils.formatEther(ticketPrice);
        });
      });
    });
