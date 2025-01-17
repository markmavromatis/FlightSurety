import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

const DEFAULT_GAS = 1000000;

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        this.appAddress = config.appAddress;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.firstAirlineAddress = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {

        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[22];
            this.firstAirlineAddress = accts[1];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    async buyPolicy(airlineAddress, flight, timestamp, price) {
        let self = this;
        const sender = self.owner;
        const timestampSolidity = Math.floor(new Date(timestamp).getTime() / 1000);
        return self.flightSuretyApp.methods
            .buy(airlineAddress, flight, timestampSolidity)
            .send({ from: sender, gas: DEFAULT_GAS, value: price})
    }

    async getPolicy(airlineAddress, flight, timestamp) {
        let self = this;
        console.log("Inside method getPolicy...");
        const sender = self.owner;
        const timestampSolidity = Math.floor(new Date(timestamp).getTime() / 1000);
        return self.flightSuretyApp.methods
            .getExistingInsuranceContract(airlineAddress, flight, timestampSolidity)
            .call({ from: sender});
    }

    async isOperational() {
       let self = this;
       return self.flightSuretyApp.methods
            .isOperational().call({ from: self.owner});
    }

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor(new Date(timestamp).getTime() / 1000)
        } 
        console.log(JSON.stringify(payload));
        self.flightSuretyApp.methods
            .fetchFlightStatusFromOracles(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    async getFlightStatus(airline, flight, timestamp) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor((new Date(timestamp)).getTime() / 1000)
        }
        return self.flightSuretyApp.methods
            .getFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .call({ from: self.owner});
    }

    async registerFlight(airline, flight, timestamp) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor((new Date(timestamp)).getTime() / 1000)
        }
        return self.flightSuretyApp.methods
            .registerFlight(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner, gas: DEFAULT_GAS})
    }

    registerAirline(airlineAccount, airlineName, callback) {
        let self = this;
        console.log("Inside method registerAirline...");
        const sender = self.owner;
        let payload = {
            airline: airlineAccount,
            airlineName: airlineName
        };
        self.flightSuretyApp.methods
            .registerAirline(payload.airline, payload.airlineName)
            .call({ from: sender}, (error, result) => {
                callback(error, payload);
            });
    }

    async getAirlineCount(callback) {
        let self = this;
        self.flightSuretyData.methods
            .getAirlineCount()
            .call({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }

    async getPolicyCount() {
        let self = this;
        return self.flightSuretyData.methods
            .getPolicyCount()
            .call({ from: self.owner}, (error, result) => {});
    }

    async getEtherBalance() {
        let self = this;
        return self.web3.eth.getBalance(self.owner);
    }

}