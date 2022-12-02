// contracts/Eavolution.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

contract Eavolution is ERC721URIStorage {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableMap for EnumerableMap.UintToAddressMap;

    // custom error
    error NotOnSale();
    error InsufficientMoney(uint256 sent, uint256 required);
    error ShowFull(uint256 sold, uint256 seats);
    error NotOnResale();
    error YouAreNotAnOwner(address yourAddress, address owner);

    // events

    event TicketSold(address indexed buyer, string message);
    event CheckedIn(address indexed buyer, string message);
    event NewEventOnSale(
        address indexed organizer,
        uint256 indexed eventId,
        string message
    );

    // status variable

    enum Status {
        NOT_CHECKED_IN,
        CHECKED_IN
    }

    // Event Struct

    struct Event {
        uint256 eventId;
        address organizer;
        Counters.Counter currentCount;
        uint256 totalTickets;
        // details
        string ipfsUri;
        uint256 ticketPrice;
        bool onSale;
    }

    // Ticket Details

    struct TicketDetails {
        uint256 eventId;
        address owner;
        Status ticketStatus;
        bool putOnResale;
    }

    // counters for TokenIds (ticketId), and unique eventIds

    Counters.Counter private _tokenIds;
    Counters.Counter private _eventId;

    // mapping of eventIds to events

    mapping(uint256 => Event) private _events;

    // all events tokenIds holder for listing purpose;

    EnumerableSet.UintSet private _allEvents;

    // all the ticketHolders;
    /**
     * this variable to hold tokenIds (ticketId here) for
     * one address.
     */

    mapping(address => uint256[]) private _ticketHolders;

    // ticket details mapping

    mapping(uint256 => TicketDetails) private _ticketDetails;

    // all the registered buyers for an event.

    mapping(uint256 => address[]) private _registeredForEvent;

    AggregatorV3Interface internal _priceFeed;

    constructor(
        address aggregatorV3InterfaceAddress
    ) ERC721("Eavolution Tickets", "EAV") {
        _priceFeed = AggregatorV3Interface(aggregatorV3InterfaceAddress);
    }

    // methods

    /**
     * @dev Main methods for the eavolution platform.
     */

    function uploadTicket(
        uint256 ticketPrice,
        string memory ipfs,
        uint256 ticketCount
    ) public returns (uint256) {
        uint256 getCurrentEventCount = _eventId.current();
        Event storage temp = _events[getCurrentEventCount];
        _eventId.increment();
        // setting values

        temp.eventId = getCurrentEventCount;
        temp.ipfsUri = ipfs;
        temp.organizer = msg.sender;
        temp.totalTickets = ticketCount;
        temp.ticketPrice = ticketPrice;
        temp.onSale = true;
        _allEvents.add(getCurrentEventCount);

        emit NewEventOnSale(
            msg.sender,
            getCurrentEventCount,
            "A new event is added on the platform."
        );
        return getCurrentEventCount;
    }

    // function to sell ticket, buyer will call this.

    function buyTicket(uint256 eventId, string memory setURI) public payable {
        if (_events[eventId].onSale != true) {
            revert NotOnSale();
        }

        if (msg.value < _events[eventId].ticketPrice) {
            revert InsufficientMoney({
                sent: msg.value,
                required: _events[eventId].ticketPrice
            });
        }

        if (
            _events[eventId].currentCount.current() ==
            _events[eventId].totalTickets
        ) {
            revert ShowFull({
                sold: _events[eventId].currentCount.current(),
                seats: _events[eventId].totalTickets
            });
        }

        // sending money to our organizer.

        (bool success, ) = _events[eventId].organizer.call{value: msg.value}(
            ""
        );

        require(
            success,
            "Address: unable to send value, recipient may have reverted"
        );

        uint256 currentTokenCount = _tokenIds.current();

        // minting nft (ticket here)
        // setting tokenURI For ticket details.
        _safeMint(msg.sender, currentTokenCount);
        _setTokenURI(currentTokenCount, setURI);

        _ticketDetails[currentTokenCount] = TicketDetails({
            eventId: eventId,
            owner: msg.sender,
            ticketStatus: Status.NOT_CHECKED_IN,
            putOnResale: false
        });

        // incrementing tokenId and the currentCount for total ticket sold in the event.
        _tokenIds.increment();
        _events[eventId].currentCount.increment();

        // saving this new token in the list of all the tokens that this buyer has.
        _ticketHolders[msg.sender].push(currentTokenCount);

        // saving this buyer as a potential visitor of event
        // (in case they don't checkin or resale)

        _registeredForEvent[eventId].push(msg.sender);

        // ticket details

        // Ticket selling event

        emit TicketSold(msg.sender, "Congratulations, ticket has been bought.");
    }

    function putOnResale(uint256 ticketId) public {
        address owner = _ownerOf(ticketId);

        if (owner != msg.sender) {
            revert("you are not an owner!");
        }

        _ticketDetails[ticketId].putOnResale = true;
    }

    function resaleTicket(uint256 tokenId) public payable {
        TicketDetails memory ticketDetails = _ticketDetails[tokenId];
        uint256 ticketPrice = _events[ticketDetails.eventId].ticketPrice;

        if (ticketDetails.putOnResale != true) {
            revert NotOnResale();
        }

        if (ticketPrice != msg.value) {
            revert InsufficientMoney({sent: msg.value, required: ticketPrice});
        }

        (bool success, ) = ticketDetails.owner.call{value: msg.value}("");

        require(
            success,
            "Address: unable to send value, recipient may have reverted"
        );

        _ticketDetails[tokenId].owner = msg.sender;

        address oldOwner = _ownerOf(tokenId);

        _safeTransfer(oldOwner, msg.sender, tokenId, "");

        _ticketHolders[msg.sender].push(tokenId);

        // managing arrays for the addresses and tokens.abi

        uint256 indexUint = findIndexForUint(
            _ticketHolders[oldOwner],
            tokenId
        ) - 1;

        uint256 indexAddress = findIndexForAdd(
            _registeredForEvent[ticketDetails.eventId],
            oldOwner
        ) - 1;

        // now removing the tokenId in the array of tokenIds for the address (buyer).

        _ticketHolders[oldOwner][indexUint] = _ticketHolders[oldOwner][
            _ticketHolders[oldOwner].length - 1
        ];

        _ticketHolders[oldOwner].pop();

        // similarly for _registeredForEvent mapping, we will remove the address that is selling the ticket.

        _registeredForEvent[ticketDetails.eventId][
            indexAddress
        ] = _registeredForEvent[ticketDetails.eventId][
            _registeredForEvent[ticketDetails.eventId].length - 1
        ];

        _registeredForEvent[ticketDetails.eventId].pop();

        // adding new address to the _registeredForEvent mapping.

        _registeredForEvent[ticketDetails.eventId].push(msg.sender);
    }

    function changeEventSellingStatus(uint256 eventId) public {
        if (_events[eventId].organizer != msg.sender) {
            revert();
        }

        _events[eventId].onSale = false;
    }

    function checkIn(uint256 tokenId) public {
        if (_ownerOf(tokenId) != msg.sender) {
            revert YouAreNotAnOwner(msg.sender, _ownerOf(tokenId));
        }

        TicketDetails storage ticketDetails = _ticketDetails[tokenId];

        ticketDetails.ticketStatus = Status.CHECKED_IN;

        emit CheckedIn(msg.sender, "you have checked in for the event.");
    }

    /**
     * HELPER FUNCTIONS
     */

    // helper function to delete element off an array -> uint.

    function findIndexForUint(
        uint256[] memory values,
        uint value
    ) public pure returns (uint) {
        uint len = values.length;
        uint i = 0;

        // traverse in the array
        while (i < len) {
            // if the i-th element is t
            // then return the index
            if (values[i] == value) {
                return i + 1;
            } else {
                i = i + 1;
            }
        }
        return 0;
    }

    // helper function for array of addresses.

    function findIndexForAdd(
        address[] memory values,
        address value
    ) public pure returns (uint) {
        uint len = values.length;
        uint i = 0;

        // traverse in the array
        while (i < len) {
            // if the i-th element is t
            // then return the index
            if (values[i] == value) {
                return i + 1;
            } else {
                i = i + 1;
            }
        }
        return 0;
    }

    // Getter view functions

    function getTicketStatus(uint256 ticketId) public view returns (uint256) {
        return
            _ticketDetails[ticketId].ticketStatus == Status.CHECKED_IN ? 1 : 0;
    }

    function getNumberOfEvents() public view returns (uint256) {
        return _allEvents.length();
    }

    function getEventDetails(
        uint256 eventId
    ) public view returns (Event memory) {
        return _events[eventId];
    }

    function getAvailableTickets(
        uint256 eventId
    ) public view returns (uint256) {
        return
            _events[eventId].totalTickets -
            _events[eventId].currentCount.current();
    }

    function areEvenTicketsOnSale(uint256 eventId) public view returns (bool) {
        return _events[eventId].onSale;
    }

    function returnEventId(uint256 arrayIndex) public view returns (uint256) {
        require(arrayIndex < _allEvents.length(), "array out of bound.");

        return _allEvents.at(arrayIndex);
    }

    function getTotalTicketsSold(
        uint256 eventId
    ) public view returns (uint256) {
        return _events[eventId].currentCount.current();
    }

    function getTotalTickets(uint256 eventId) public view returns (uint256) {
        return _events[eventId].totalTickets;
    }

    function getTicketPrice(uint256 eventId) public view returns (uint256) {
        return _events[eventId].ticketPrice;
    }

    function getEventOrganizer(uint256 eventId) public view returns (address) {
        return _events[eventId].organizer;
    }

    function getBuyerTicketsIds(
        address buyer
    ) public view returns (uint256[] memory) {
        return _ticketHolders[buyer];
    }

    function getTicketDetails(
        uint256 tokenId
    ) public view returns (TicketDetails memory) {
        return _ticketDetails[tokenId];
    }

    function getRegisteredNames(
        uint256 eventId
    ) public view returns (address[] memory) {
        return _registeredForEvent[eventId];
    }

    // Price Feed from the Chainlink on-chain
    /**
     * we will use chainlink vrf for conversion of Ether price
     * in the dollar values.
     */

    /**
     * important variables
     */

    function getLatestPrice() public view returns (int) {
        (
            ,
            /*uint80 roundID*/
            int price /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
            ,
            ,

        ) = _priceFeed.latestRoundData();
        return price;
    }

    // transeferring ticket to your partner.

    // function transferTicket(uint256 tokenId, address to) public {
    //     require(_ownerOf(tokenId) == msg.sender, "not the owner of the ticket");

    //     TicketDetails memory ticketDetails = _ticketDetails[tokenId];

    //     _approve(to, tokenId);

    //     ticketDetails.owner = to;

    //     _ticketHolders[to].push(tokenId);
    // }

    // overriding

    function approve(address to, uint256 tokenId) public virtual override {
        revert("access forbidden");
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        revert("access forbidden");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        revert("access forbidden.");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        revert("access forbidden.");
    }

    function setApprovalForAll(
        address operator,
        bool approved
    ) public virtual override {
        revert("access forbidden");
    }
}
