import Config from './config.json';
import FlightsData from '../shared/flightsData.json';

export default class ServerApi {
    constructor(host, port) {
        console.log("Host is: " + host);
        this.host = host;
        this.port = port;
        this.baseUrl = `http://${host}:${port}`;
        this.initialize();
    }

    initialize() {
        // console.log(this.getAirlines());
    }

    async getAirlines() {
        const url = `${this.baseUrl}/api/airlines`;
        console.log("URL is: " + url);
        const res = await fetch(url);
        const data = await res.json();
        return data.AirlinesData;
    }

    getFlights() {
        return FlightsData;
    }

    async getBalance(accountAddress) {
        console.log("Inside method getBalance...");
        const url = `${this.baseUrl}/api/balance/${accountAddress}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.balance;
    }

    async getPolicyCount(accountAddress) {
        const url = `${this.baseUrl}/api/policies/${accountAddress}`;
        console.log("URL is: " + url);
        const res = await fetch(url);
        const data = await res.json();
        return data.result;
    }

    async getPolicies(userAddress) {
        const url = `${this.baseUrl}/api/policies/${userAddress}`;
        console.log("URL is: " + url);
        const res = await fetch(url);
        const data = await res.json();
        return data.result;
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