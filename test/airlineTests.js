// var Web3 = require('web3');
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const { default: Web3 } = require('web3');

contract('Flight Surety Airline Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    const firstAirline = config.firstAirline;

    console.log("Flight surety app address = " + config.flightSuretyApp.address);
    await config.flightSuretyData.authorizeCaller.sendTransaction(firstAirline, {from: config.owner});
    await config.flightSuretyData.fund({from: firstAirline, value: web3.utils.toWei("10")});
    console.log("IS FUNDED? " + await config.flightSuretyData.isFunded(firstAirline));
    const airlineCount = await config.flightSuretyApp.getAirlineCount.call({from: firstAirline});
    assert.equal(airlineCount, 1, "There should only be 1 airline");
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(airline) Contract owner already registered as first airline`, async function () {
    let firstAirline = config.firstAirline;
    let result = await config.flightSuretyData.isAirline.call(firstAirline, {from: firstAirline}); 

    assert.equal(result, true, "Contract owner should be registered as first airline!");

    const airlineCount = await config.flightSuretyApp.getAirlineCount.call({from: firstAirline});
    assert.equal(airlineCount, 1, "There should only be 1 airline");

  });

  it(`(airline) 2nd airline (unfunded) added without votes`, async function () {
    const firstAirline = config.firstAirline;
    const secondAirline = accounts[2];
    await config.flightSuretyData.registerAirline(secondAirline, {from: firstAirline});
    let result = await config.flightSuretyData.isAirline.call(secondAirline); 
    assert.equal(result, true, "Contract owner should be registered as second airline!");

    const airlineCount = await config.flightSuretyApp.getAirlineCount({from: accounts[0]});
    assert.equal(airlineCount, 2, "There should be two airlines");
  });

  it(`(airline) 2nd airline cannot register another airline until funding`, async function () {
    const secondAirline = accounts[2];
    const thirdAirlineAirline = accounts[3];
    let succeeded = false;
    try {
      await config.flightSuretyData.registerAirline(thirdAirline, {from: secondAirline});
      succeeded = true;
    } catch (e) {
      // Do nothing
    }
    assert.equal(succeeded, false, "2nd airline should not be able to register another airline (yet)");
  });

  it(`(airline) 3rd airline registered immediately`, async function () {
    const firstAirline = config.firstAirline;
    const thirdAirline = accounts[3];
    await config.flightSuretyData.registerAirline.sendTransaction(thirdAirline, {from: firstAirline});
    let result = await config.flightSuretyData.isAirline.call(thirdAirline); 
    assert.equal(result, true, "Contract owner should be registered as second airline!");

    const airlineCount = await config.flightSuretyApp.getAirlineCount();
    assert.equal(airlineCount, 3, "There should be three airlines");

  });
  it(`(airline) 4th airline registered immediately`, async function () {
    const firstAirline = config.firstAirline;
    const fourthAirline = accounts[4];
    await config.flightSuretyData.registerAirline.sendTransaction(fourthAirline, {from: firstAirline});
    let result = await config.flightSuretyData.isAirline.call(fourthAirline); 
    assert.equal(result, true, "Contract owner should be registered as second airline!");

    const airlineCount = await config.flightSuretyApp.getAirlineCount({from: accounts[0]});
    assert.equal(airlineCount, 4, "There should be 4 airlines");

  });

  // it(`(airline) 5th airline NOT added immediately / 1st vote`, async function () {
  //   // ARRANGE
  //   let firstAirline = accounts[0];
  //   let fifthAirline = accounts[4];

  //   const results = await config.flightSuretyApp.registerAirline.call(fifthAirline, {from: firstAirline});
  //   console.log("** Authorized = " + results[0]);
  //   console.log("** Votes = " + results[1]);
  //   const results2 = await config.flightSuretyData.getAirlineCount.call({from: firstAirline});
  //   const airlineCount = results2[0];
  //   console.log("** Airline count = " + airlineCount);
  //   assert.equal(results[0], false, "5th airline should NOT be added without votes / ante");    

  // });

  // it(`(airline) 5th airline not added after 2 votes`, async function () {

  //   let fifthAirline = accounts[4];

  //   // ACT
  //   try {
  //       await config.flightSuretyApp.registerAirline(fifthAirline, {from: secondAirline});
  //   }
  //   catch(e) {

  //   }
  //   let result = await config.flightSuretyData.isAirline.call(fifthAirline); 

  //   // ASSERT

  //   assert.equal(result, false, "5th airline should not be added after 2 votes");    

  // });

  // it(`(airline) 5th airline registered after 3 votes`, async function () {
  //   // ARRANGE
  //   let fifthAirline = accounts[4];

  //   // ACT
  //   try {
  //       await config.flightSuretyApp.registerAirline(fifthAirline, {from: thirdAirline});
  //   }
  //   catch(e) {

  //   }
  //   let result = await config.flightSuretyData.isAirline.call(fifthAirline); 

  //   // ASSERT

  //   assert.equal(result, true, "5th airline should be registered after 3 votes");    

  // });

  // it(`(airline) 5th airline registered after 4 votes`, async function () {
  //   // ARRANGE
  //   let fifthAirline = accounts[4];

  //   // ACT
  //   try {
  //       await config.flightSuretyApp.registerAirline(fifthAirline, {from: fourthAirline});
  //   }
  //   catch(e) {

  //   }
  //   let result = await config.flightSuretyData.isAirline.call(fifthAirline); 

  //   // ASSERT

  //   assert.equal(result, false, "5th airline should not be added after 4 votes");    

  // });

  // it(`(airline) 5th airline added after 4 votes + ante`, async function () {
  //   // ARRANGE
  //   let fifthAirline = accounts[4];

  //   // ACT
  //   try {
  //     await config.flightSuretyApp.registerAirline(fifthAirline, {from: fourthAirline});
  //       // await config.flightSuretyApp.registerAirline(fifthAirline, {from: fourthAirline});
  //   }
  //   catch(e) {

  //   }
  //   let result = await config.flightSuretyData.isAirline.call(fifthAirline); 

  //   // ASSERT

  //   assert.equal(result, true, "5th airline should be added after 4 votes + ante");    

  // });

});
