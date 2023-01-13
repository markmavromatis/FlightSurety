const REGISTRATION_FEE = 1; // 1 wei
const ORACLE_COUNT = 20;

export default class OracleService {

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
                "gas": 4800000,
                "gasPrice": 100000000000
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
        const statusCode = 20;
        const requestIndex = event.returnValues[0];
        this.oracles.map(async (oracle, index) => {
          if (oracle.indexLookup[requestIndex] == true) {
            const requestAirline = event.returnValues[1];
            const requestFlight = event.returnValues[2];
            const requestTimestamp = event.returnValues[3];
            const requestIndexAsNumber = parseInt(requestIndex);

            await this.flightSuretyApp.methods.submitOracleResponse
            (requestIndexAsNumber, requestAirline,requestFlight, requestTimestamp, statusCode)
            .send({ from: oracle.address, gas: 1000000}, (error, result) => {
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