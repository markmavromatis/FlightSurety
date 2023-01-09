var Test = require('../config/testConfig.js');
// var BigNumber = require('bignumber.js');
const { default: Web3 } = require('web3');

contract('Contract Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

    it(`(contract) User cannot purchase a contract for a non-existent flight`, async function () {
        const firstAirline = config.firstAirline;
        const flightTime = Math.round((new Date("Jan 1, 2023 12:00")).getTime() / 1000);
        const flightNumber = "UA123";
        let success = true;
        try {
            await config.flightSuretyApp.buy(config.owner, flightNumber, flightTime, {from: config.owner, value: "1"});
        } catch (e) {
            success = false;
        }
        assert.equal(success, false, "User should not be able to purchase contract on non-existing flight!");
    })

    it(`(contract) User can purchase a contract for an existing flight`, async function () {
        const firstAirline = config.firstAirline;
        const flightTime = Math.round((new Date("Jan 1, 2023 12:00")).getTime() / 1000);
        const flightNumber = "UA123";
        const price = 1;
        console.log("Test addresses: " + config.testAddresses[0]);
        await config.flightSuretyApp.registerFlight.sendTransaction(firstAirline, flightNumber, flightTime, {from: config.owner});
        await config.flightSuretyApp.buy.sendTransaction(firstAirline, flightNumber, flightTime, {from: config.owner, value: price});
        // const contractAmount = await config.flightSuretyApp.getExistingInsuranceContract.call(firstAirline, flightNumber, flightTime, {from: config.owner});
        // assert.equal(contractAmount, price, "Insurance policy should be for same amount as price");
    })

    it(`(contract) Payout for 1wei policy should be 2wei`, async function () {
        const firstAirline = config.firstAirline;
        const flightTime = Math.round((new Date("Jan 1, 2023 12:00")).getTime() / 1000);
        const flightNumber = "1wei price";
        const price = 1;
        console.log("Test addresses: " + config.testAddresses[0]);
        await config.flightSuretyApp.registerFlight.sendTransaction(firstAirline, flightNumber, flightTime, {from: config.owner});
        await config.flightSuretyApp.buy.sendTransaction(firstAirline, flightNumber, flightTime, {from: config.owner, value: price});
        const results = await config.flightSuretyApp.getExistingInsuranceContract.call(firstAirline, flightNumber, flightTime, {from: config.owner});
        const payout = results[1];
        assert.equal(payout, 2, "1-wei policy should pay out 2-wei");
    })

    it(`(contract) Payout for 2wei policy should be 3wei`, async function () {
        const firstAirline = config.firstAirline;
        const flightTime = Math.round((new Date("Jan 1, 2023 12:00")).getTime() / 1000);
        const flightNumber = "2wei price";
        const price = 2;
        console.log("Test addresses: " + config.testAddresses[0]);
        await config.flightSuretyApp.registerFlight.sendTransaction(firstAirline, flightNumber, flightTime, {from: config.owner});
        await config.flightSuretyApp.buy.sendTransaction(firstAirline, flightNumber, flightTime, {from: config.owner, value: price});
        const results = await config.flightSuretyApp.getExistingInsuranceContract.call(firstAirline, flightNumber, flightTime, {from: config.owner});
        const payout = results[1];
        assert.equal(payout, 3, "2-wei policy should pay out 3-wei");
    })

})
