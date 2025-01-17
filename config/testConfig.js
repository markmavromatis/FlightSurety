
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
        "0xF014343BDFFbED8660A9d8721deC985126f189F3",
        "0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9",
        "0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4",
        "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
        "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
        "0xcbd22ff1ded1423fbc24a7af2148745878800024",
        "0xc257274276a4e539741ca11b590b9447b26a8051",
        "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7"
    ];

    let airlineNames = [
        "United Airlines",
        "Delta Airlines",
        "American Airlines",
        "JetBlue Airlines",
        "Southwest Airlines",
        "All Nippon Airlines",
        "Japan Airlines",
        "Cathay Pacific Airlines",
        "British Airways",
        "Air France"
    ];

    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new();
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);
    try {
        // Set the Flight Surety App address that prevents outside calls
        await flightSuretyData.setAppContractAddress(flightSuretyApp.address, {from: owner});
        // Setup contract owner as first airline
        await flightSuretyData.authorizeCaller(firstAirline, "United Airlines", {from: owner});
        // Provide 10 ether of funding
        await flightSuretyApp.fund({from: firstAirline, value: web3.utils.toWei("10")});

    } catch (e) {
        console.error("**** ERROR during test setup! " + e);
    }
    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp,
        airlineNames: airlineNames,
    }
}

module.exports = {
    Config: Config
};