import Config from './config.json';
import FlightsData from '../shared/flightsData.json';

export default class ServerApi {
    constructor(host, port, firstAirlineAddress) {
        console.log("Host is: " + host);
        this.host = host;
        this.port = port;
        this.baseUrl = `http://${host}:${port}`;
        console.log("First airline address is: " + firstAirlineAddress);
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

    async pingServer() {
        const url = `${this.baseUrl}/api`;
        await fetch(url, { method: "GET"});
    }

    async registerOracles() {
        console.log("Inside method registerOracles...");
        console.log("Base URL is: " + this.baseUrl)
        const url = `${this.baseUrl}/api/registerOracles`;
        const res = await fetch(url, { method: "POST"})
        const data = await res.json()
        return data.count;
    }

    async registerOracleListener() {
        console.log("Inside method registerOracleListener...");
        console.log("Base URL is: " + this.baseUrl)
        const url = `${this.baseUrl}/api/registerOracleListener`;
        const res = await fetch(url, { method: "POST"})
        const data = await res.json()
        return data.count;
    }
    async oraclesReady() {
        console.log("Inside method oraclesReady...");
        console.log("Base URL is: " + this.baseUrl)
        const url = `${this.baseUrl}/api/oraclesReady`;
        const res = await fetch(url, { method: "GET"})
        const data = await res.json()
        return data;
    }

}