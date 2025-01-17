pragma solidity ^0.5.16;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "./FlightSuretyData.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    FlightSuretyData dataContract;

    address private contractOwner;          // Account used to deploy contract

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 createdTimestamp;
        uint256 updatedTimestamp;        
        address airline;
        string flightNumber;
        uint256 timestamp;
    }
    mapping(bytes32 => Flight) private flights;
 
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
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");  
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

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor(address payable dataContractAddress) public {
        contractOwner = msg.sender;
        dataContract = FlightSuretyData(dataContractAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns(bool) {
        return dataContract.isOperational();
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function getInsuredBalance(address account) public view returns (uint) {
        return dataContract.getInsuredBalance(account);
    }

    function getInsuredBalanceEther(address account) public view returns (uint) {
        return account.balance;
    }

    function fund() public payable {
        return dataContract.fund.value(msg.value)();
    }

   /**
    * @dev Add an airline to the registration queue
    *
    */
    function registerAirline(address airline, string calldata airlineName) external returns(
            bool success, uint256 votes) {
        dataContract.registerAirline(airline, airlineName);
        uint256 voteCount = 0;
        bool isAirline = dataContract.isAirline(airline);
        if (isAirline) {
            voteCount = dataContract.getPendingAirlineVotes(airline);
        }
        return (isAirline, voteCount);
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */
    function registerFlight(address airline, string calldata flightNumber, uint timestamp) external {

        bytes32 flightKey = dataContract.getFlightKey(airline, flightNumber, timestamp);
        uint currentTime = now;

        require(flights[flightKey].airline == address(0), "Duplicate flight!");
        flights[flightKey].airline = airline;
        flights[flightKey].createdTimestamp = currentTime;
        flights[flightKey].updatedTimestamp = currentTime;
        flights[flightKey].flightNumber = flightNumber;
        flights[flightKey].timestamp = timestamp;
        flights[flightKey].statusCode = STATUS_CODE_UNKNOWN;
    }

    function getFlightStatus(address airline, string memory flight, uint256 timestamp) view public returns (uint8) {
        bytes32 flightKey = dataContract.getFlightKey(airline, flight, timestamp);
        require(flights[flightKey].airline != address(0), "Flight not registered!");
        return flights[flightKey].statusCode;
    }

   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus(address airline, string memory flight,
            uint256 timestamp, uint8 statusCode) internal {
        bytes32 flightKey = dataContract.getFlightKey(airline, flight, timestamp);
        flights[flightKey].updatedTimestamp = timestamp;
        flights[flightKey].statusCode = statusCode;
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            // Pay out customer claims
            dataContract.creditInsurees(airline, flight, timestamp);
        }

    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatusFromOracles
                        (
                            address airline,
                            string calldata flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 

    // When a customer buys a policy, calculate the payout immediately.
    // (If we decide in the future to change the payout calculation, existing policies will be fine)
    function buy(address airline, string calldata flightNumber, uint256 timestamp) external payable{
        require(msg.value > 0, "Buying a contract requires ether!");
        bytes32 flightKey = dataContract.getFlightKey(airline, flightNumber, timestamp);
        require(flights[flightKey].airline == airline, "Flight not yet registered!");
        uint price = msg.value;
        uint payout = price.mul(15).div(10);
        if (price.mod(2) > 0) {
            payout = payout + 1;
        }

        dataContract.buy.value(msg.value)(airline, flightNumber, timestamp, payout);
    }

    function pay(address payable insuree) external {
        dataContract.pay(insuree);
    }

   function getExistingInsuranceContract(address airline,
            string calldata flightNumber, uint256 timestamp) external view
            returns (uint, uint, bool){
        return dataContract.getExistingInsuranceContract(airline, flightNumber,
                timestamp);
   }

    function getPolicyDetails(address accountAddress, uint i) external view
            returns (address, address, string memory, uint, uint, uint, bool, bool) {
        return dataContract.getPolicyDetails(accountAddress, i);
    }

    function getPolicyCount(address accountAddress) external view returns (uint){
        return dataContract.getPolicyCount(accountAddress);
   }

// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 wei; // TODO: Increase this during Ganache testing

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getOracleIndexes() view external returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string calldata flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].isRegistered == true), "Oracle is not registered!");
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length == MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            // Note: If the oracles already reported the flight late due to airline, do not change it!
            // (In testing, I found cases where oracles had more than minimum responses for conflicting codes and flight was processed TWICE)
            if (flights[key].statusCode != STATUS_CODE_LATE_AIRLINE) {
                processFlightStatus(airline, flight, timestamp, statusCode);
            }
        }
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   
