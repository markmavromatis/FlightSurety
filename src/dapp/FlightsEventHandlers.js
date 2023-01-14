export default class FlightsEventHandlers {

    constructor(c, serverApi) {
        this.contract = c;
        this.serverApi = serverApi;
    }

    async buyPolicy(flights, i, price) {
        const airline = flights[i].address;
        const flight = flights[i].flightNumber;
        const timestamp = flights[i].departureTime;


        // Check that flight exists
        try {
            await this.contract.getFlightStatus(airline, flight, timestamp);
        } catch (e) {
            // Flight not found! Register the flight
            try {
                await this.contract.registerFlight(airline, flight, timestamp);
            } catch (e) {
                console.error(e);
                return
            }
        };
        
        await this.contract.buyPolicy(airline, flight, timestamp, price);

        // Update local data model
        flights[i].hasPolicy = true
    }

    async getStatus(flight) {
        console.log("Getting flight for: " + flight.address + " " + flight.flightNumber + " " + flight.departureTime);
        try {
            const result = await this.contract.getFlightStatus(flight.address, flight.flightNumber, flight.departureTime);
            console.log("Status is now: " + result);
            if (result != 0) {
                flight.status = result;
            }
        } catch (e) {
            // Flight status not available. Leave a console message and continue.
            console.error("No status available for flight " + flight.flightNumber);
        }
    }

    async getPolicies() {
        console.log("Retrieving policies...");
        try {
            const result = await this.contract.getPolicyCount();
            console.log("Status is now: " + result);
            // if (result != 0) {
            //     flight.status = result;
            // }
        } catch (e) {
            // Flight status not available. Leave a console message and continue.
            console.error("Error calling getPolicies(): e");
        }
    }

    async fetchStatus(flight) {
        try {
            await this.contract.registerFlight(flight.address, flight.flightNumber, flight.departureTime);
        } catch (e) {
            // The flight is already registered. Continue to fetch policy.
        }
        this.contract.fetchFlightStatus(flight.address, flight.flightNumber, flight.departureTime, (error, result) => {
            console.log('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
        });
    }
}