import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import express from 'express';
import cors from 'cors';
import OracleService from './OracleService';
import PolicyService from './policyService';
import AirlinesData from '../shared/airlinesData.json';

let config = Config['localhost'];
var Web3 = require('web3');

let oracleService = null;
let policyService = null;
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

      console.log("Initializing Policies service...");
      policyService = new PolicyService(flightSuretyApp);
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

app.get('/api/airlines', (req, res) => {
  res.json({
    AirlinesData
  })
})

app.get('/api/policies/:address', async (req, res) => {
  console.log("API call: policies");
  const address = req.params.address;
  console.log("Address is: " + address);
  const result = await policyService.getPolicies(address);

  res.json({result: result});
})

app.get('/api/policy/:address/:index', async (req, res) => {
  console.log("API call: policy");
  const address = req.params.address;
  const index = req.params.index;
  console.log("Address is: " + address);
  console.log("Index is: " + index);
  const result = await policyService.getPolicy(address, index);

  res.json({result: result});
})

app.get('/api/policyCount/:address', async (req, res) => {
  console.log("API call: policyCount");
  const address = req.params.address;
  console.log("Address is: " + address);
  const result = await policyService.getPolicyCount(address);

  res.json({result: result});
})

app.get('/api/oraclesReady', async (req, res) => {
  const result = await oracleService.areOraclesReady();
  res.send({
    status: result
  })
})


app.post('/api/registerOracles', async (req, res) => {
  console.log("API call: registerOracles");
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
  console.log("API call: registerOracleListener");
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


