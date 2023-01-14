const truffleAssert = require('truffle-assertions');

var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;
  var config;
  const STATUS_CODE_LATE_AIRLINE = 20;

  before('setup contract', async () => {
    config = await Test.Config(accounts);

    // Watch contract events
    const STATUS_CODE_UNKNOWN = 0;
    const STATUS_CODE_ON_TIME = 10;
    const STATUS_CODE_LATE_WEATHER = 30;
    const STATUS_CODE_LATE_TECHNICAL = 40;
    const STATUS_CODE_LATE_OTHER = 50;

  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {
      console.log("Account #" + a, accounts[a]);
      await config.flightSuretyApp.registerOracle.sendTransaction({ from: accounts[a], value: fee });
      await config.flightSuretyApp.getOracleIndexes.call({from: accounts[a]});
    }
  });

  it('can request flight status', async () => {
    
    // ARRANGE
    const airline = config.firstAirline;
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);


    // Register a flight
    await config.flightSuretyApp.registerFlight.sendTransaction(airline, flight, timestamp, {from: config.owner});

    // Make request for an on-time flight
    await makeOracleRequestAndConfirmStatus(airline, flight, timestamp, 10)

  });

  it(`(contract) User gets no money when flight is on-time`, async function () {
    // ARRANGE
    const airline = config.firstAirline;
    let flight = 'Flight on-time'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);


    // Register a flight
    await config.flightSuretyApp.registerFlight.sendTransaction(airline, flight, timestamp, {from: config.owner});

    // Buy contract
    await config.flightSuretyApp.buy(airline, flight, timestamp, {from: config.owner, value: 1});

    // Confirm payout in policy
    const policy = await config.flightSuretyApp.getExistingInsuranceContract(airline, flight, timestamp, {from: config.owner});
    const payout = policy[1];

    // Confirm account balance before status update
    const balanceBefore = parseInt(await config.flightSuretyApp.getInsuredBalance(config.owner));

    // Make request for an on-time flight
    await makeOracleRequestAndConfirmStatus(airline, flight, timestamp, 10)

    // Confirm account balance is unchanged
    const balanceAfter = parseInt(await config.flightSuretyApp.getInsuredBalance(config.owner));
    assert.equal(balanceBefore, balanceAfter, "Insured balance should be unchanged for on-time flights");

  })

  it(`(contract) User gets money when flight is late`, async function () {
    // ARRANGE
    const airline = config.firstAirline;
    let flight = 'Flight is late'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);


    // Register a flight
    await config.flightSuretyApp.registerFlight.sendTransaction(airline, flight, timestamp, {from: config.owner});

    // Buy contract
    await config.flightSuretyApp.buy(airline, flight, timestamp, {from: config.owner, value: 1000});

    // Confirm payout in policy
    const policy = await config.flightSuretyApp.getExistingInsuranceContract(airline, flight, timestamp, {from: config.owner});
    const payout = parseInt(policy[1]);
    const paidBefore = policy[2];
    assert.equal(paidBefore, false, "Policy should be marked as not paid!");

    // Confirm account balance before status update
    const balanceBefore = parseInt(await config.flightSuretyApp.getInsuredBalance(config.owner));

    // Make request for an on-time flight
    await makeOracleRequestAndConfirmStatus(airline, flight, timestamp, STATUS_CODE_LATE_AIRLINE)

    // Confirm account balance has increased
    const balanceAfter = parseInt(await config.flightSuretyApp.getInsuredBalance(config.owner));
    assert.equal(balanceBefore + payout, balanceAfter, "Insured balance be updated to reflect payout");
    console.log("Balance after = " + balanceAfter);

    // Check policy fields
    const policyAfter = await config.flightSuretyApp.getExistingInsuranceContract(airline, flight, timestamp, {from: config.owner});
    const paid = policyAfter[2];
    assert.equal(paid, true, "Policy should be marked as paid!");
  })

async function makeOracleRequestAndConfirmStatus(airline, flight, timestamp, targetStatus) {
  const oracleRequest = await config.flightSuretyApp.fetchFlightStatusFromOracles.sendTransaction(airline, flight, timestamp, {from: config.owner});
  truffleAssert.eventEmitted(oracleRequest, 'OracleRequest', (args) => {
    assert.equal(args[1], airline);
    assert.equal(args[2], flight);
    assert.equal(args[3], timestamp);
    return true;
  });

  const flightStatusBefore = await config.flightSuretyApp.getFlightStatus.call(airline, flight, timestamp);
  assert.equal(flightStatusBefore, 0, "Flight status should be unknown");

  // Submit a request for oracles to get status information for a flight
  // ACT

  // Since the Index assigned to each test account is opaque by design
  // loop through all the accounts and for each account, all its Indexes (indices?)
  // and submit a response. The contract will reject a submission if it was
  // not requested so while sub-optimal, it's a good test of that feature
  for(let a=1; a<TEST_ORACLES_COUNT; a++) {

    // Get oracle information
    let oracleIndexes = await config.flightSuretyApp.getOracleIndexes.call({ from: accounts[a]});
    for(let idx=0;idx<3;idx++) {
      try {
        // Submit a response...it will only be accepted if there is an Index match
        await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], airline, flight, timestamp, targetStatus, { from: accounts[a] });
        // console.log('\nSuccess', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
      }
      catch(e) {
        // Enable this when debugging
        //  console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
      }

    }
  }

  const flightStatus = await config.flightSuretyApp.getFlightStatus.call(airline, flight, timestamp);
  assert.equal(flightStatus, targetStatus, "Flight status should match requested status");
}
 
});
