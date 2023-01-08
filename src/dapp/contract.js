import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.appAddress = config.appAddress;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            // Setup first airline
            let self = this;
            self.flightSuretyData.methods
            .authorizeCaller(self.owner, "United Airlines")
            .send({ from: self.owner, gas: 4712388 }, (error, result) => {
                callback(error, "blah");
            });

            self.flightSuretyData.methods
            .setAppContractAddress(self.appAddress)
            .send({ from: self.owner, gas: 4712388 }, (error, result) => {
                callback(error, "blah");
            });

            self.flightSuretyApp.methods
            .fund()
            .send({ from: self.owner, gas: 4712388, value: 10000000000000000000 }, (error, result) => {
                callback(error, result);
            });
            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
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


}