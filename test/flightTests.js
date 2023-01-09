var Test = require('../config/testConfig.js');
// var BigNumber = require('bignumber.js');
const { default: Web3 } = require('web3');

contract('Flight Surety Flight Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);

  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

    it(`(flight) We can register a flight`, async function () {
        const flightTime = Math.round((new Date("Jan 1, 2023 12:00")).getTime() / 1000);
        const flightNumber = "UA123";
        await config.flightSuretyApp.registerFlight.sendTransaction(config.owner, "UA123", flightTime, {from: config.owner});
    })

    it(`(flight) We cannot register the same flight twice`, async function () {
        const flightTime = Math.round((new Date("Jan 1, 2023 12:00")).getTime() / 1000);
        const flightNumber = "UA123";
        let success = true;
        try {
            await config.flightSuretyApp.registerFlight.sendTransaction(config.owner, flightNumber, flightTime, {from: config.owner});
        } catch(e) {
            success = false;
        }
        assert.equal(success, false, "We should not be able to register duplicate flights!");
    })

    it(`(flight) We can buy an insurance contract`, async function () {
        const flightTime = Math.round((new Date("Jan 1, 2023 12:00")).getTime() / 1000);
        const flightNumber = "UA123";
        const airline = config.owner;
        let existing = config.flightSuretyApp.getExistingInsuranceContract(airline, flightNumber, flightTime, {from: config.owner});
        console.log("Existing? " + existing);
        await config.flightSuretyApp.buy.sendTransaction(airline, flightNumber, flightTime, {from: config.owner, value: 1})
    })

    it(`(flight) We cannot buy duplicate insurance contracts`, async function () {
        const flightTime = Math.round((new Date("Jan 1, 2023 12:00")).getTime() / 1000);
        const flightNumber = "UA123";
        const airline = config.owner;
        let existing = config.flightSuretyApp.getExistingInsuranceContract(airline, flightNumber, flightTime, {from: config.owner});
        let success = true;
        try {
            await config.flightSuretyApp.buy.sendTransaction(airline, flightNumber, {from: config.owner, value: 1})
        } catch (e) {
            success = false;
        }
        assert.equal(success, false, "Customer should not be able to buy contract for non-existent flight");
    })

    it(`(flight) We cannot buy a contract for a nonexistent flight`, async function () {
        const flightNumber = "UAXXX";
        const airline = config.owner;
        let success = true;
        try {
            await config.flightSuretyApp.buy.sendTransaction(airline, flightNumber, {from: config.owner, value: 1})
        } catch (e) {
            success = false;
        }
        assert.equal(success, false, "Customer should not be able to buy contract for non-existent flight");
    })

})
