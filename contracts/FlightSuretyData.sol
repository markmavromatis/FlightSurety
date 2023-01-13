pragma solidity ^0.5.16;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct AirlineInfo {
        address airlineAddress;
        string airlineName;
    }

    struct VotingStatus {
        mapping(address => uint8) votes;
        uint votesNeeded; // Number of votes needed for approval (50% all registered airlines)
        uint voteCount; // Number of actual votes
    }

    struct InsuranceContract {
        address account;
        address airline;
        string flight;
        uint timestamp;
        uint price;
        uint payout;
        bool expired;
        bool paid;
    }


    address private contractOwner;                                      // Account used to deploy contract
    address private appContract;                                        // App Contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => AirlineInfo) private airlineDetails;             // Approved airlines who can call these methods
    mapping(address => bool) private registeredAirlines;             // Approved airlines who can call these methods
    mapping(address => VotingStatus) private pendingAirlines;           // Airlines waiting for votes
    mapping(address => uint256) private airlineFunds;
    mapping(address => uint) private insuredBalances;
    mapping(address => bool) private fundedAirlines;
    mapping(string => address) private airlineNameAddressLookup;


    InsuranceContract[] private insuranceContracts;
    mapping(bytes32 => mapping(address => uint)) private insuranceContractsLookupByFlightAccount;
    mapping(address => uint[]) private insuranceContractsLookupByAccount;
    mapping(bytes32 => uint[]) private insuranceContractsLookupByFlight;

    uint private airlineCount;

    uint FUNDING_REQUIREMENT = 10 ether;
    uint8 AIRLINES_NOT_REQUIRING_VOTES = 4;
    uint MAX_PRICE = 1 ether;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor() public {
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
        require(isFunded(tx.origin), "Caller is not a funded airline");
        _;
    }

    modifier originatedFromApp() {
        require (msg.sender == appContract, "Caller is not app");
        _;
    }


    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function addAirlineToRegisteredList(address newAirline) private {
        registeredAirlines[newAirline] = true;
        airlineCount = airlineCount.add(1);
    }

    // For calls to some functions, we want to behave differenet for contract owner (app).
    function isCallerContractOwner() private view returns (bool) {
        return msg.sender == contractOwner;
    }

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
    function authorizeCaller(address callerAddress, string calldata airlineName) external
            requireContractOwner {
        require(registeredAirlines[callerAddress] == false, "Caller address is already registered!");
        airlineDetails[callerAddress].airlineAddress = callerAddress;
        airlineDetails[callerAddress].airlineName = airlineName;
        addAirlineToRegisteredList(callerAddress);
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

    function setAppContractAddress(address accountContract) external
            requireContractOwner {
        appContract = accountContract;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * Returns true if the airline is authorized to sell insurance products.
     */
    function isAirline(address airline) public view returns (bool) {
        return registeredAirlines[airline] == true;
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
    function registerAirline(address newAirline, string calldata airlineName) external requireFunded originatedFromApp {

        require(registeredAirlines[newAirline] == false, "Caller is already registered!");

        if (airlineDetails[newAirline].airlineAddress != address(0)) {
            airlineDetails[newAirline].airlineAddress = newAirline;
            airlineDetails[newAirline].airlineName = airlineName;
        }

        if (airlineCount < AIRLINES_NOT_REQUIRING_VOTES) {
            addAirlineToRegisteredList(newAirline);
        } else {
            address caller = tx.origin;
            if (pendingAirlines[newAirline].votesNeeded == 0) {
                // Initialize votesNeeded
                uint votesNeeded = airlineCount / 2;
                if (airlineCount % 2 == 1) {
                    votesNeeded = votesNeeded + 1;
                }
                pendingAirlines[newAirline].votesNeeded = votesNeeded;
            }
            if (pendingAirlines[newAirline].votes[caller] == 0) {
                // First time voting!
                pendingAirlines[newAirline].votes[caller] = 1;
                pendingAirlines[newAirline].voteCount = pendingAirlines[newAirline].voteCount + 1;
            }
            if (pendingAirlines[newAirline].voteCount >= pendingAirlines[newAirline].votesNeeded) {
                // Past threshold, add airline to registered list
                addAirlineToRegisteredList(newAirline);
            }
        }

    }

    function getPendingAirlineVotes(address newAirline) external view returns (uint) {
        return pendingAirlines[newAirline].voteCount;
    }

    // Retrieves price, payout amount for existing flight insurance policy
    function getExistingInsuranceContract(address airline,
            string calldata flightNumber, uint timestamp) external view
            returns (uint, uint, bool){
        bytes32 flightKey = getFlightKey(airline, flightNumber, timestamp);
        InsuranceContract memory policy = insuranceContracts[insuranceContractsLookupByFlightAccount[flightKey][tx.origin]];
        require(policy.price > 0, "No policy found for account / flight");
        return (policy.price, policy.payout, policy.paid);
   }

    // Retrieves price, payout amount for existing flight insurance policy
    function getPolicyDetails(address accountAddress, uint index) external view
            returns (address, address, string memory, uint, uint, uint, bool, bool){

        InsuranceContract memory policy = insuranceContracts[insuranceContractsLookupByAccount[accountAddress][index]];
        require (policy.account != address(0), "No policy found for this index!");
        return (policy.account, policy.airline, policy.flight, policy.timestamp, policy.price, policy.payout, policy.expired, policy.paid);
   }

    // Retrieves # policies for account
    function getPolicyCount(address accountAddress) external view
            returns (uint){
        return insuranceContractsLookupByAccount[accountAddress].length;
   }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(address airline, string calldata flightNumber, uint timestamp, uint payout) external payable{
        require(msg.value < MAX_PRICE, "Maximum price is 1 ether");
        require(msg.value > 0, "Customer must provide a non-zero amount");
        uint price = msg.value;
        address customer = tx.origin;
        bytes32 flightKey = getFlightKey(airline, flightNumber, timestamp);
        // Check that there is no existing insurance policy
        // Criteria: Non-0 indexed policy or 0-indexed policy matches flight/customer
        require(insuranceContractsLookupByFlightAccount[flightKey][customer] == 0, "Customer already purchased a contract for this flight!");
        // If there is only one policy in our DB, check that it does not match this account/flight
        if (insuranceContracts.length == 1) {
            InsuranceContract memory firstContract = insuranceContracts[0];
            bytes32 compareFlightKey = getFlightKey(firstContract.airline, firstContract.flight, firstContract.timestamp);
            require(compareFlightKey != flightKey, "Customer already purchased a contract for this flight!");
        }

        InsuranceContract memory newContract = InsuranceContract(customer, airline, flightNumber, timestamp, price, payout, false, false);
        insuranceContracts.push(newContract);
        uint newIndex = insuranceContracts.length - 1;
        insuranceContractsLookupByFlightAccount[flightKey][customer] = newIndex;
        insuranceContractsLookupByAccount[customer].push(newIndex);
        insuranceContractsLookupByFlight[flightKey].push(newIndex);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(address airline, string calldata flightNumber, uint timestamp) external originatedFromApp {
        bytes32 flightKey = getFlightKey(airline, flightNumber, timestamp);
        uint[] memory indexes = insuranceContractsLookupByFlight[flightKey];
        for (uint i=0; i < indexes.length; i++) {
            // Update paid status
            InsuranceContract memory policy = insuranceContracts[indexes[i]];
            if (!policy.paid) {
                uint payout = policy.payout;
                address customer = policy.account;
                policy.paid = true;
                insuranceContracts[indexes[i]] = policy;
                insuredBalances[customer] = insuredBalances[customer] + payout;
            }
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay() external originatedFromApp {
        address payable account = tx.origin;
        uint amountToTransfer = insuredBalances[account];
        insuredBalances[account] = 0;
        account.transfer(amountToTransfer);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund() public payable originatedFromApp {
        address payable originAddress = tx.origin;
        require(fundedAirlines[originAddress] == false, "Funding already registered for this airline");
        require(msg.value >= FUNDING_REQUIREMENT, "Minimum funding amount is 10 ether");

        airlineFunds[originAddress] = msg.value;
        fundedAirlines[originAddress] = true;
    }

    function getInsuredBalance(address account) view external originatedFromApp returns (uint) {
        return insuredBalances[account];
    }

    function getFlightKey(address airline, string memory flight,
            uint256 timestamp) public pure returns(bytes32) {
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

