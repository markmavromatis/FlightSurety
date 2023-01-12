import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import FlightsEventHandlers from './FlightsEventHandlers';
import ServerApi from './serverApi';
import Web3 from 'web3';
import Config from './config.json';

let status = {
    online: false,
    blockchainConnectivity: false,
    contractsAvailable: false,
    inOperation: false,
    oraclesRegistered: false,
    serverUp: false
};
let serverApi = null;

function updateSystemStatus() {
    const systemStatusSpan = DOM.elid("systemStatus");
    status.onlineStatus = false;
    let description = "";
    if (!status.blockchainConnectivity) {
        description = "Web3 interface is down. Check blockchain connectivity!"
    } else if (!status.contractsAvailable) {
        description = "Contracts not available in blockchain!";
    } else if (!status.inOperation) {
        description = "Surety smart contracts are not operational!";
    } else if (!status.serverUp) {
        description = "Server is down!";
    } else if (!status.oraclesRegistered) {
        description = "Oracles are not yet registered!";
    } else {
        description = '';
        status.onlineStatus = true;
    }
    status.description = description;
    systemStatusSpan.textContent = description;
}

let flightsEventHandlers;
let userAccount = null;

(async() => {


    let result = null;
    // Set user account initially
    let network = 'localhost';
    let config = Config[network];
    // this.appAddress = config.appAddress;
    const web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    web3.eth.getAccounts((error, accts) => {
        userAccount = accts[0];

    })

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Fetch flight status
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('registerOracles').addEventListener('click', async () => {
            let serverApi = new ServerApi('localhost', 3000, contract.firstAirlineAddress);
            const oraclesCount = await serverApi.registerOracles();
            console.log("Registered " + oraclesCount + " oracles!");
            console.log("Registering Oracle event listener...");
            await serverApi.registerOracleListener();
            const result = await serverApi.oraclesReady()
            status.oraclesRegistered = result.status;
            updateSystemStatus();
        })

        serverApi = new ServerApi('localhost', 3000, contract.firstAirlineAddress);

        displayAirlines(serverApi.getAirlines());
    });

    flightsEventHandlers = new FlightsEventHandlers(contract, new ServerApi('localhost', 3000, contract.firstAirlineAddress));

    $('button[data-bs-target="#airlines"]').on('shown.bs.tab', function(e){
        console.log('Airlines will be visible now!');
        let serverApi = new ServerApi('localhost', contract.firstAirlineAddress);
        displayAirlines(serverApi.getAirlines());
    });

    $('button[data-bs-target="#flights"]').on('shown.bs.tab', function(e){
        console.log('Flights will be visible now!');
        let serverApi = new ServerApi('localhost', contract.firstAirlineAddress);
        displayFlights(serverApi.getFlights(), {}, contract);
    });

    $('button[data-bs-target="#policies"]').on('shown.bs.tab', async function(e){
        console.log('Policies will be visible now!');
        // displayFlights(serverApi.getFlights(), {}, contract);
        // let serverApi = new ServerApi('localhost', contract.firstAirlineAddress);
        displayPolicies(await serverApi.getPolicies(userAccount));
    });
    

    console.log("Checking connectivity with blockchain...");
    contract.web3.eth.net.isListening()
    .then(async () => {
        console.log("Web3 interface connection confirmed!")
        status.blockchainConnectivity = true;

        // Check if contracts loaded
        contract.isOperational(async (error, result) => {
            if (error){
                status.contractsAvailable = false;
            } else {
                status.contractsAvailable = true;
                status.inOperation = result;

                // Now check that server is running...
                let serverApi = new ServerApi('localhost', 3000, contract.firstAirlineAddress);
                try {
                    console.log("Connecting...");
                    serverApi.pingServer()
                    .then((err, response) => {
                        console.log("Error: " + JSON.stringify(err));
                        console.log("Response: " + JSON.stringify(response));
                        status.serverUp = true;
                        updateSystemStatus();
                    })
                    .catch((e) => {
                        console.log("**** ERROR ping");
                        status.serverUp = false;
                        updateSystemStatus();
                    })
                } catch (e) {
                    status.serverUp = false;
                }
            };

            updateSystemStatus();
        });

    })
    .catch(() => {
        // Blockchain offline
        // If web3 isn't connecting, status updated here
        updateSystemStatus();
    })


    function displayFlights(flights) {
        console.log("Entering displayFlights...");
        console.log("Flight 0 status = " + flights[0].status);

        let displayTable = DOM.elid("flights-table-body");
        let numberRows = displayTable.rows.length;
        for (let i = 0; i < numberRows; i++) {
            displayTable.deleteRow(0);
        }
        flights.map((result, i) => {
            let newRow = displayTable.insertRow(-1);
            let cell1 = newRow.insertCell(0);
            cell1.innerHTML = i + 1;
            let cell2 = newRow.insertCell(1);
            cell2.innerHTML = result.flightNumber;
            let cell3 = newRow.insertCell(2);
            cell3.innerHTML = result.origin;
            let cell4 = newRow.insertCell(3);
            cell4.innerHTML = result.destination;
            let cell5 = newRow.insertCell(4);
            cell5.innerHTML = result.departureTime;
            let cell6 = newRow.insertCell(5);
            cell6.innerHTML = result.status;
            if (result.status == "Unknown") {
                // Add "Check Status" button
                var checkStatusButton = document.createElement('button');
                checkStatusButton.textContent = 'Check Status';
                checkStatusButton.addEventListener("click", () => {
                    try {
                        contract.registerFlight(result.address, result.flightNumber, result.departureTime, (error, result) => {
                            console.log("Registered flight");
                        });
                    } catch (e) {
                        // Do nothing
                        console.error("Error: " + e);
                    }
                    contract.fetchFlightStatus(result.address, result.flightNumber, result.departureTime, (error, result) => {
                        console.log('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
                    });
                });
                cell6.appendChild(checkStatusButton);
                // Add "Get Status" button
                var getStatusButton = document.createElement('button');
                getStatusButton.textContent = 'Get Status';
                getStatusButton.addEventListener("click", async () => {
                    await flightsEventHandlers.getStatus(result);
                    displayFlights(flights);
                });
                cell6.appendChild(getStatusButton);
                let cell7 = newRow.insertCell(6);
                if (flights[i].hasPolicy) {
                    // TODO: Show a policy here
                    cell7.textContent = "*";
                } else {
                    var buyPolicyButton = document.createElement('button');
                    buyPolicyButton.textContent = 'Buy';
                    buyPolicyButton.addEventListener("click", async () => {
                        await flightsEventHandlers.buyPolicy(flights, i);
                        displayFlights(flights);
                    })
                    cell7.appendChild(buyPolicyButton);
                }
            }
            // const hasContract = contracts[result.flightNumber] != undefined
            //         && contracts[result.flightNumber][result.departureTime] != undefined;
            // let cell7 = newRow.insertCell(6);
            // cell7.innerHTML = hasContract ? "Yes" : "No";
            // var btn = document.createElement('button');
            // btn.textContent = 'Buy';
            // btn.addEventListener("click", () => {
            //     contracts[result.flightNumber] = {};
            //     contracts[result.flightNumber][result.departureTime] = 1;
            //     cell7.innerHTML = "Yes";
            // });
            // cell7.appendChild(btn);
        })
    }



})();



function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}

function displayAirlines(airlines) {

    let displayTable = DOM.elid("airlines-table-body");
    let numberRows = displayTable.rows.length;
    for (let i = 0; i < numberRows; i++) {
        displayTable.deleteRow(0);
    }
    airlines.map((result) => {
        let newRow = displayTable.insertRow(0);
        let cell1 = newRow.insertCell(0);
        cell1.innerHTML = 1;
        let cell2 = newRow.insertCell(1);
        cell2.innerHTML = result.address;
        let cell3 = newRow.insertCell(2);
        cell3.innerHTML = result.description;
    })
}



function displayPolicies(policies) {

    let displayTable = DOM.elid("policies-table-body");
    let numberRows = displayTable.rows.length;
    for (let i = 0; i < numberRows; i++) {
        displayTable.deleteRow(0);
    }
    policies.map((result, i) => {
        let newRow = displayTable.insertRow(-1);
        let cell1 = newRow.insertCell(0);
        cell1.innerHTML = i + 1;
        let cell2 = newRow.insertCell(1);
        cell2.innerHTML = result.flight;
        let cell3 = newRow.insertCell(2);
        cell3.innerHTML = result.timestamp;
        let cell4 = newRow.insertCell(3);
        cell4.innerHTML = result.price;
        let cell5 = newRow.insertCell(4);
        cell5.innerHTML = result.payout;
        let cell6 = newRow.insertCell(5);
        cell6.innerHTML = result.paid;
    })
}
