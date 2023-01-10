import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import express from 'express';


let config = Config['localhost'];
var Web3 = require('web3');
const web3 = new Web3("ws://127.0.0.1:8555");

const REGISTRATION_FEE = 1; // 1 wei
const ORACLE_COUNT = 20;

let oracles = [];

web3.eth.net.isListening()
.then(() => {
    console.log("Web3 interface connection valid!")

    web3.eth.getAccounts().then((accounts) => {
      web3.eth.defaultAccount = accounts[0];
      console.log("Account = " + web3.eth.defaultAccount);
      console.log("# accounts = " + accounts.length);
      console.log("Checking connectivity with blockchain...");

      // Initialize Oracles
      oracles = [];
      const requiredAccountsLength = ORACLE_COUNT + 1
      if (requiredAccountsLength > accounts.length) {
        throw new Error(`Oracle registration requires access to at least ${requiredAccountsLength} accounts`);
      }
      for (let i = 0; i < ORACLE_COUNT; i++) {
        let newOracle = {};
        newOracle.address = accounts[i + 1];
        oracles.push(newOracle);
      }

      console.log("Setting up FlightSuretyApp...");
      let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
      // console.log("Flight Surety App = " + JSON.stringify(flightSuretyApp));
      // Register as an oracle, retrieve indexes
      console.log("Registering Oracles...");
      for (let i = 0; i < oracles.length; i++) {
        flightSuretyApp.methods.registerOracle()
        .send({ from: oracles[i].address, gas: 1000000, value: REGISTRATION_FEE}, (error, result) => {
          if (error) {
            throw new Error("Failed to register oracle. Reason: " + error);
          }
        }).then(() => {
            // Retrieve indexes
            flightSuretyApp.methods.getOracleIndexes()
            .call({ from: oracles[i].address}, (error, result) => {
              if (error) {
                throw new Error("Failed to call getOracleIndexes()! Reason: " + error);
              }
              oracles[i].indexLookup = {};
              oracles[i].indexLookup[result[0]] = true;
              oracles[i].indexLookup[result[1]] = true;
              oracles[i].indexLookup[result[2]] = true;
            }).then(() => {
              console.log("Finished setting up oracle " + (i + 1) + " " + JSON.stringify(oracles[i].indexLookup));
            })
          })
      };

      // Event listener for OracleRequest events
      flightSuretyApp.events.OracleRequest()
      .on('data', event => {

        console.log("***** EVENT")
        // Iterate over oracles and send updates for matches
        const statusCode = 20;
        const requestIndex = event.returnValues[0];
        oracles.map((oracle, index) => {
          if (oracle.indexLookup[requestIndex] == true) {

            const requestAirline = event.returnValues[1];
            const requestFlight = event.returnValues[2];
            const requestTimestamp = event.returnValues[3];
            const requestIndexAsNumber = parseInt(requestIndex);
            flightSuretyApp.methods.submitOracleResponse
            (requestIndexAsNumber, requestAirline,requestFlight, requestTimestamp, statusCode)
            .send({ from: oracle.address, gas: 100000}, (error, result) => {
              if (error) {
                throw new Error("Failed to call submitOracleResponse. Reason: " + error);
              }
            });
          }
        })

      });
    })

  })
const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})


export default app;


