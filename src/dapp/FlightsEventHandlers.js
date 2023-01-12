export default class FlightsEventHandlers {

    constructor(c) {
        this.contract = c;
    }

    async buyPolicy(airlineAddress, flightNumber, departureTime) {
        console.log("Buy policy");

        // Check that flight exists
        try {
            await this.contract.getFlightStatus(airlineAddress, flightNumber, departureTime);
        } catch (e) {
            // Flight not found! Register the flight
            await this.contract.registerFlight2(airlineAddress, flightNumber, departureTime);
            console.log("Registered flight");
        };
        
        try {
            const result = await this.contract.buyPolicy(airlineAddress, flightNumber, departureTime);
            console.log("Buy policy result = " + result);
        } catch (e) {
            console.error("Failed in buy call " + e);
            console.error(JSON.stringify(e));
            return false;
        }

        console.log("IN BETWEEN");
        // Let's try to get it back
        try {
            const result2 = await this.contract.getPolicy(airlineAddress, flightNumber, departureTime);
            console.log("Get policy result = " + JSON.stringify(result2));
        } catch (e) {
            console.error("Failed in getPolicy call " + e);
        }
        return true;
    }

    async getStatus(flight) {
        console.log("Getting flight for: " + flight.flightNumber + " " + flight.departureTime);
        try {
            const result = await this.contract.getFlightStatus("", flight.flightNumber, flight.departureTime);
            console.log("Status is now: " + result);
            if (result != 0) {
                flight.status = result;
            }
        } catch (e) {
            // Flight status not available. Leave a console message and continue.
            console.error("No status available for flight " + flight.flightNumber);
        }
    }

}