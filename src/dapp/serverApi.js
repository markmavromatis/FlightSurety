import Config from './config.json';
import FlightsData from '../shared/flightsData.json';

export default class ServerApi {
    constructor(network, firstAirlineAddress) {
        console.log("Network is: " + network);
        console.log("First airline address is: " + firstAirlineAddress);
        let config = Config[network];
        // let serverPort = Config[network];
        this.firstAirlineAddress = firstAirlineAddress;
        this.initialize();
    }

    initialize() {
        // console.log(this.getAirlines());
    }

    getAirlines() {
        return [{
            address: this.firstAirlineAddress,
            description: "United Airlines"
        }];
    }

    getFlights() {
        return FlightsData;
    }

}