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
  oracleService.registerOracles();
}

const app = express();
app.use(cors);
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

app.get('/api/oraclesRegistered', async (req, res) => {
  console.log("Inside method registerOracles...");
  res.send({status: oracleService.oraclesRegistered});
})


app.post('/api/registerOracles', async (req, res) => {
  console.log("Inside method registerOracles...");
  await registerOracles();
  res.send({
    message: "Oracles registered!"
  })
})


export default app;


