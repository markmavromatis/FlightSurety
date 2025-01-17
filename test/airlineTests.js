// var Web3 = require('web3');
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const { default: Web3 } = require('web3');

contract('Flight Surety Airline Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    const firstAirline = config.firstAirline;

    const airlineCount = await config.flightSuretyData.getAirlineCount.call({from: firstAirline});
    assert.equal(airlineCount, 1, "There should only be 1 airline");
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(airline) Contract owner already registered as first airline`, async function () {
    let firstAirline = config.firstAirline;
    let result = await config.flightSuretyData.isAirline.call(firstAirline, {from: firstAirline}); 

    assert.equal(result, true, "Contract owner should be registered as first airline!");

    const airlineCount = await config.flightSuretyData.getAirlineCount.call({from: firstAirline});
    assert.equal(airlineCount, 1, "There should only be 1 airline");

  });

  it(`(airline) 2nd airline (unfunded) added without votes`, async function () {
    const firstAirline = config.firstAirline;
    const secondAirline = accounts[2];
    const secondAirlineName = config.airlineNames[2];

    await config.flightSuretyApp.registerAirline(secondAirline, secondAirlineName, {from: firstAirline});

    let result = await config.flightSuretyData.isAirline.call(secondAirline); 
    assert.equal(result, true, "Contract owner should be registered as second airline!");

    const airlineCount = await config.flightSuretyData.getAirlineCount({from: accounts[0]});
    assert.equal(airlineCount, 2, "There should be two airlines");
  });

  it(`(airline) 2nd airline cannot register another airline until funding`, async function () {
    const secondAirline = accounts[2];
    const thirdAirline = accounts[3];
    const thirdAirlineName = config.airlineNames[3];
    let succeeded = false;
    try {
      await config.flightSuretyApp.registerAirline(thirdAirline, thirdAirlineName, {from: secondAirline});
      succeeded = true;
    } catch (e) {
      // Do nothing
    }
    assert.equal(succeeded, false, "2nd airline should not be able to register another airline (yet)");
  });


  it(`(airline) 3rd airline registered immediately`, async function () {
    const firstAirline = config.firstAirline;
    const thirdAirline = accounts[3];
    const thirdAirlineName = config.airlineNames[4];

    await config.flightSuretyApp.registerAirline(thirdAirline, thirdAirlineName, {from: firstAirline});
    let result = await config.flightSuretyData.isAirline.call(thirdAirline); 
    assert.equal(result, true, "Contract owner should be registered as second airline!");

    const airlineCount = await config.flightSuretyData.getAirlineCount();
    assert.equal(airlineCount, 3, "There should be three airlines");

  });
  it(`(airline) 4th airline registered immediately`, async function () {
    const firstAirline = config.firstAirline;
    const fourthAirline = accounts[4];
    const fourthAirlineName = config.airlineNames[4];

    await config.flightSuretyApp.registerAirline(fourthAirline, fourthAirlineName, {from: firstAirline});
    let result = await config.flightSuretyData.isAirline.call(fourthAirline); 
    assert.equal(result, true, "Contract owner should be registered as second airline!");

    const airlineCount = await config.flightSuretyData.getAirlineCount({from: accounts[0]});
    assert.equal(airlineCount, 4, "There should be 4 airlines");

  });

  it(`(airline) 5th airline NOT added immediately / 1st vote`, async function () {
    const firstAirline = config.firstAirline;
    let fifthAirline = accounts[5];
    const fifthAirlineName = config.airlineNames[5];

    await config.flightSuretyApp.registerAirline(fifthAirline, fifthAirlineName, {from: firstAirline});
    let result = await config.flightSuretyData.isAirline.call(fifthAirline);
    assert.equal(result, false, "Fifth airline is not yet registered!");

    const airlineCount = await config.flightSuretyData.getAirlineCount.call({from: firstAirline});
    assert.equal(airlineCount, 4);
  });

  it(`(airline) 5th airline NOT added after duplicate vote`, async function () {
    const firstAirline = config.firstAirline;
    let fifthAirline = accounts[5];

    await config.flightSuretyApp.registerAirline(fifthAirline, "", {from: firstAirline});
    let result = await config.flightSuretyData.isAirline.call(fifthAirline); 
    assert.equal(result, false, "Fifth airline is not yet registered!");

    const airlineCount = await config.flightSuretyData.getAirlineCount.call({from: firstAirline});
    assert.equal(airlineCount, 4);
  });

  it(`(airline) 5th airline added after 2 (4 airlines / 2) votes`, async function () {
    const secondAirline = accounts[2];
    let fifthAirline = accounts[5];

    // Fund 3rd airline
    await config.flightSuretyApp.fund({from: secondAirline, value: web3.utils.toWei("10")});


    await config.flightSuretyApp.registerAirline(fifthAirline, "", {from: secondAirline});
    let result = await config.flightSuretyData.isAirline.call(fifthAirline);
    assert.equal(result, true, "Fifth airline should now be registered!");

    const airlineCount = await config.flightSuretyData.getAirlineCount.call({from: secondAirline});
    assert.equal(airlineCount.toString(), "5");
  });

  it(`(airline) 6th airline added after 3 (5 / 2) votes`, async function () {
    const firstAirline = config.firstAirline;
    const secondAirline = accounts[2];
    const thirdAirline = accounts[3];
    let sixthAirline = accounts[6];
    const sixthAirlineName = config.airlineNames[6];

    // Fund 3rd airline
    await config.flightSuretyApp.fund({from: thirdAirline, value: web3.utils.toWei("10")});


    await config.flightSuretyApp.registerAirline(sixthAirline, sixthAirlineName, {from: firstAirline});
    let result = await config.flightSuretyData.isAirline.call(sixthAirline);
    assert.equal(result, false, "Sixth airline should not be approved after 1 vote!");
    await config.flightSuretyApp.registerAirline(sixthAirline, "", {from: secondAirline});
    result = await config.flightSuretyData.isAirline.call(sixthAirline);
    assert.equal(result, false, "Sixth airline should not be approved after 2 vote!");
    await config.flightSuretyApp.registerAirline(sixthAirline, "", {from: thirdAirline});
    result = await config.flightSuretyData.isAirline.call(sixthAirline);
    assert.equal(result, true, "Sixth airline should now be registered!");

    const airlineCount = await config.flightSuretyData.getAirlineCount.call({from: firstAirline});
    assert.equal(airlineCount.toString(), "6");
  });



});
