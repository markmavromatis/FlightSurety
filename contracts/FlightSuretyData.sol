pragma solidity ^0.5.16;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct VotingStatus {
        mapping(address => uint8) votes;
        uint votesNeeded; // Number of votes needed for approval (50% all registered airlines)
        uint voteCount; // Number of actual votes
    }


    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private registeredAirlines;             // Approved airlines who can call these methods
    mapping(address => VotingStatus) private pendingAirlines;           // Airlines waiting for votes
    mapping(address => uint256) private balances;
    mapping(address => bool) private fundedAirlines;
    uint private airlineCount;
    uint FUNDING_REQUIREMENT = 10 ether;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireCaller()
    {
        require(registeredAirlines[msg.sender] == 1, "Caller is not an authorized");
        _;
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the caller account to be funded
    */
    modifier requireFunded()
    {
        require(isFunded(msg.sender), "Caller is not a funded airline");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    /**
     * Authorize an airline. This method is restricted to the contract owner.
     */
    function authorizeCaller(address callerAddress) external
            requireContractOwner {
        require(registeredAirlines[callerAddress] == 0, "Caller address is not registered!");
        registeredAirlines[callerAddress] = 1;
        airlineCount = airlineCount.add(1);
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


    // function getContractOwner() public view returns (address) {
    //     return contractOwner;
    // }

    /**
     * Returns true if the airline is authorized to sell insurance products.
     */
    function isAirline(address airline) public view returns (bool) {
        return registeredAirlines[airline] == 1;
    }

    function isFunded(address airline) public view returns (bool) {
        return fundedAirlines[airline] == true;
    }

    function getAirlineCount() public view returns (uint) {
        return airlineCount;
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(address newAirline) external requireFunded {
        airlineCount = airlineCount.add(1);

        registeredAirlines[newAirline] = 1;

        // if (airlineCount <= 4) {
        //     airlineCount = uint8(airlineCount.add(20));
        //     // airlineCount = uint8(airlineCount.add(1));
        //     // airlineCount = uint8(airlineCount.add(1));
        //     registeredAirlines[newAirline] = 1;
        // } else {
        //     airlineCount = uint8(airlineCount.add(50));
        //     address caller = msg.sender;
        //     if (pendingAirlines[newAirline].votes[caller] == 0) {
        //         pendingAirlines[newAirline].votesNeeded = airlineCount / 2;
        //         pendingAirlines[newAirline].votes[caller] = 1;
        //     } else {
        //         pendingAirlines[newAirline].voteCount = pendingAirlines[newAirline].voteCount + 1;
        //     }
        //     if (pendingAirlines[newAirline].voteCount == 4) {
        //         registeredAirlines[newAirline] = 1;
        //     }
        // }

    }

    function getPendingAirlineVotes(address newAirline) external view returns (uint) {
        return pendingAirlines[newAirline].voteCount;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund() public payable
    {
        require(balances[msg.sender] == 0, "Funding already registered for this airline");
        require(msg.value >= FUNDING_REQUIREMENT, "Required funding amount is 10 ether");

        uint change = FUNDING_REQUIREMENT - msg.value;

        balances[msg.sender] = FUNDING_REQUIREMENT;
        if (change != 0) {
            msg.sender.transfer(change);
        }
        fundedAirlines[msg.sender] = true;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

