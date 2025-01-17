const REGISTRATION_FEE = 1; // 1 wei
const ORACLE_COUNT = 20;
const GAS_PRICE = 100000000000;
const GAS_AMOUNT = 4800000;


const STATUS_CODES = [0, 10, 20, 30, 40, 50];

export default class OracleService {

  // Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)

    constructor(accounts, flightSuretyApp) {
        this.oracles = [];
        this.oraclesRegistered = false;
        this.oracleListenerRegistered = false;
        this.flightSuretyApp = flightSuretyApp;

        const requiredAccountsLength = ORACLE_COUNT + 1
        if (requiredAccountsLength > accounts.length) {
          throw new Error(`Oracle registration requires access to at least ${requiredAccountsLength} accounts`);
        }
        for (let i = 0; i < ORACLE_COUNT; i++) {
          let newOracle = {};
          newOracle.address = accounts[i + 1];
          this.oracles.push(newOracle);
        }
          
    };

    areOraclesReady() {
      console.log("Oracle registered?" + this.oraclesRegistered);
      console.log("Listener registered?" + this.oracleListenerRegistered);
      return this.oraclesRegistered && this.oracleListenerRegistered;
    }

    async registerOracles() {
        console.log("Registering Oracles...");
        for (let i = 0; i < this.oracles.length; i++) {
            const oracle = this.oracles[i];
            await this.flightSuretyApp.methods.registerOracle()
            .send({ from: oracle.address, value: REGISTRATION_FEE,
                "gasPrice": GAS_PRICE, "gas": GAS_AMOUNT
            }, (error, result) => {
                if (error) {
                throw new Error("Failed to register oracle. Reason: " + error);
                }
            });
    
            console.log("Registering indices for oracle " + (i + 1));
            // Retrieve indexes
            await this.flightSuretyApp.methods.getOracleIndexes()
                .call({ from: oracle.address}, (error, result) => {
                    if (error) {
                    throw new Error("Failed to call getOracleIndexes()! Reason: " + error);
                    }
                    oracle.indexLookup = {};
                    oracle.indexLookup[result[0]] = true;
                    oracle.indexLookup[result[1]] = true;
                    oracle.indexLookup[result[2]] = true;
                })
            console.log("Finished setting up oracle " + (i + 1) + " " + JSON.stringify(oracle.indexLookup));
            this.oraclesRegistered = true;
        }
        
    }

    async registerOracleListener() {
      // Event listener for OracleRequest events
      await this.flightSuretyApp.events.OracleRequest()
      .on('data', event => {

        console.log("***** EVENT")
        // Iterate over oracles and send updates for matches
        // Generate random status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)
        // To test out the payment of late airlines, I find it easier to increase the probability of hitting code 20.
        let AMENDED_STATUS_CODES = STATUS_CODES;
        AMENDED_STATUS_CODES.push(20);
        AMENDED_STATUS_CODES.push(20);
        AMENDED_STATUS_CODES.push(20);
        const randomIndex = Math.floor(Math.random() * AMENDED_STATUS_CODES.length);
        const statusCode = AMENDED_STATUS_CODES[randomIndex];
        const requestIndex = event.returnValues[0];
        this.oracles.map(async (oracle, index) => {
          if (oracle.indexLookup[requestIndex] == true) {
            const requestAirline = event.returnValues[1];
            const requestFlight = event.returnValues[2];
            const requestTimestamp = event.returnValues[3];
            const requestIndexAsNumber = parseInt(requestIndex);

            await this.flightSuretyApp.methods.submitOracleResponse
            (requestIndexAsNumber, requestAirline,requestFlight, requestTimestamp, statusCode)
            .send({ from: oracle.address, gas: GAS_AMOUNT}, (error, result) => {
              if (error) {
                throw new Error("Failed to call submitOracleResponse. Reason: " + error);
              } else {
                console.log(`Updated status ${statusCode} for flight: ${requestFlight}`);
              }
            });
          }
        })

      })
      this.oracleListenerRegistered = true;
      return true;
    }
}