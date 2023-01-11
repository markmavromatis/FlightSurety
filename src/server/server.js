import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import express from 'express';
import cors from 'cors';
import OracleService from './OracleService';

let config = Config['localhost'];
var Web3 = require('web3');

let oracleService = null;
const web3 = new Web3("ws://127.0.0.1:8555");

let oracles = [];
let flightSuretyApp = null;

web3.eth.net.isListening()
.then(() => {
    console.log("Web3 interface connection valid!")

    web3.eth.getAccounts().then((accounts) => {
      web3.eth.defaultAccount = accounts[0];
      console.log("# accounts = " + accounts.length);

      console.log("Setting up FlightSuretyApp...");
      flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

      console.log("Initializing Oracles service...");
      oracleService = new OracleService(accounts, flightSuretyApp);
    })

  })



async function registerOracles() {
  console.log("Registering Oracles...");
  await oracleService.registerOracles();
  return oracleService.oracles.length;
}

async function registerOracleListener() {
  console.log("Registering Oracle Listener......");
  await oracleService.registerOracleListener();
}

const app = express();
app.use(cors())

app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

app.get('/api/oraclesReady', async (req, res) => {
  const result = await oracleService.areOraclesReady();
  res.send({
    status: result
  })
})


app.post('/api/registerOracles', async (req, res) => {
  console.log("Inside method registerOracles...");
  try {
    const result = await registerOracles();
    console.log("Result is: " + result);
    const response = {message: "Oracles registered!", count: result};
    console.log("Returning response: " + JSON.stringify(response));
    res.json(response);
  } catch (e) {
    console.error(e);
  }
})

app.post('/api/registerOracleListener', async (req, res) => {
  console.log("Inside method registerOracleListener...");
  try {
    const result = await registerOracleListener();
    console.log("Result is: " + result);
    const response = {message: "Oracle listener registered!"};
    console.log("Returning response: " + JSON.stringify(response));
    res.json(response);
  } catch (e) {
    console.error(e);
  }
})

export default app;


