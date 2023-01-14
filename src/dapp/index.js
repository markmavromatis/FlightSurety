import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import FlightsEventHandlers from './FlightsEventHandlers';
import ServerApi from './serverApi';
import Config from './config.json';

const APPLICATION_TABS = ["airlines-tab", "flights-tab", "policies-tab"]
const SERVER_PORT = 3000;

let status = {
    online: null,
    blockchainConnectivity: false,
    contractsAvailable: false,
    inOperation: null,
    oraclesRegistered: false,
    serverUp: false
};
let serverApi = new ServerApi('localhost', SERVER_PORT);

function updateSystemStatus() {
    const systemStatusSpan = DOM.elid("systemStatus");
    status.onlineStatus = false;
    let description = "";
    if (!status.blockchainConnectivity) {
        description = "Web3 interface is down. Check blockchain connectivity!"
    } else if (!status.contractsAvailable) {
        description = "Contracts not available in blockchain!";
    } else if (!status.serverUp) {
        description = "Server is down!";
    } else if (!status.inOperation) {
        description = "FlightSurety is not operational!";
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
let contract;

(async() => {

    let network = 'localhost';
    contract = new Contract(network, () => {

        DOM.elid('registerOracles').addEventListener('click', async () => {

            const oraclesCount = await serverApi.registerOracles();
            console.log("Registered " + oraclesCount + " oracles!");
            console.log("Registering Oracle event listener...");
            await serverApi.registerOracleListener();
            const result = await serverApi.oraclesReady()
            status.oraclesRegistered = result.status;
            document.getElementById("registerOracles").style.display = "none";
            updateSystemStatus();
            displaySystemStatus();
        })

    });

    DOM.elid('disableSystem').addEventListener('click', async() => {
        console.log("Disabling system...");
        toggleSystemStatus(false);
    })

    DOM.elid('enableSystem').addEventListener('click', async() => {
        console.log("Enabling system...");
        toggleSystemStatus(true);
    })

    async function toggleSystemStatus(mode) {
        await serverApi.setOperatingStatus(mode);
        const result = await serverApi.isOperational();
        status.inOperation = result;
        updateSystemStatus();
        displaySystemStatus();
    }

    flightsEventHandlers = new FlightsEventHandlers(contract, serverApi);

    $('button[data-bs-target="#airlines"]').on('shown.bs.tab', function(e){
        console.log('Airlines will be visible now!');
        serverApi.getAirlines().then((airlines) => {displayAirlines(airlines)});
    });

    $('button[data-bs-target="#flights"]').on('shown.bs.tab', function(e){
        console.log('Flights will be visible now!');
        displayFlights(serverApi.getFlights(), {}, contract);
    });

    $('button[data-bs-target="#policies"]').on('shown.bs.tab', async function(e){
        console.log('Policies will be visible now!');
        displayPolicies();
    });
    

    console.log("Checking connectivity with blockchain...");
    contract.web3.eth.net.isListening()
    .then(async () => {
        console.log("Web3 interface connection confirmed!")
        status.blockchainConnectivity = true;

        // Check if contracts loaded
        try {
            const result = await contract.isOperational();
            status.contractsAvailable = true;
            status.inOperation = result;
        } catch (e) {
            status.contractsAvailable = false;
        }
        // Now check that server is running...
        let serverApi = new ServerApi('localhost', 3000);
        status.serverUp = false;
        try {
            await serverApi.pingServer()
            status.serverUp = true;
        } catch (e) {
            console.error("Server down: " + e);
        }
        updateSystemStatus();
        displaySystemStatus();

    })
    .catch(() => {
        // Blockchain offline
        // If web3 isn't connecting, status updated here
        updateSystemStatus();
        displaySystemStatus();
    })






})();

var exampleModal = document.getElementById('exampleModal')
exampleModal.addEventListener('show.bs.modal', function (event) {
    DOM.elid('buy-warning').classList.add('hidden');
    DOM.elid('buy-price').value = "";
    var button = event.relatedTarget // Button that triggered the modal

    var modal = $(this)
    modal.find('.modal-title').text('Buy Policy');
    modal.find('#buy-flight-number').val(button.getAttribute('data-bs-flight-number'));
    modal.find('#buy-departure-time').val(button.getAttribute('data-bs-departure-time'));
    modal.find('#buy-airline-address').val(button.getAttribute('data-bs-airline-address'));
    modal.find('#buy-airline-index').val(button.getAttribute('data-bs-index'));
  })

displaySystemStatus();

async function displaySystemStatus() {
    let displayDiv = DOM.elid("display-wrapper");
    displayDiv.innerHTML = "";
    let section = DOM.section();

    const TITLE = "System Status";
    const DESCRIPTION = "Check if contract is operational";
    section.appendChild(DOM.h2(TITLE));
    section.appendChild(DOM.h5(DESCRIPTION));
    let result = null;
    let error = null;

    addSystemStatusRow(section, 'Operational Status', status.inOperation ? "ONLINE" : "OFFLINE");
    addSystemStatusRow(section, 'Oracles Status', status.oraclesRegistered ? "ONLINE" : "OFFLINE");
    displayDiv.append(section);

    // Disable tabs if system is offline
    if (status.inOperation) {
        APPLICATION_TABS.forEach((tabName) => {
            DOM.elid(tabName).classList.remove('disabled')
        });
        DOM.elid('disableSystem').style.display = "";
        DOM.elid('enableSystem').style.display = "none";
    } else {
        APPLICATION_TABS.forEach((tabName) => {
            DOM.elid(tabName).classList.add('disabled');
        })
        DOM.elid('disableSystem').style.display = "none";
        DOM.elid('enableSystem').style.display = "";
    }

    // Disable Register Oracles button if oracles already registered or server down
    if (!status.oraclesRegistered && status.serverUp) {
        document.getElementById("registerOracles").style.display = "";
    } else {
        document.getElementById("registerOracles").style.display = "none";
    }
}

function addSystemStatusRow(section, col1, col2) {
    let row = section.appendChild(DOM.div({className:'row'}));
    row.appendChild(DOM.div({className: 'col-sm-4 field'}, col1));
    row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, col2));
    console.log("Appending row: " + col1);
    section.appendChild(row);
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
        cell2.innerHTML = result.address.substring(0,10) + "...";
        let cell3 = newRow.insertCell(2);
        cell3.innerHTML = result.description;
    })
}

function displayFlights(flights) {
    let displayTable = DOM.elid("flights-table-body");
    let numberRows = displayTable.rows.length;
    for (let i = 0; i < numberRows; i++) {
        displayTable.deleteRow(0);
    }
    flights.map(async (result, i) => {
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
        if (result.status == "Unknown" && status.oraclesRegistered) {
            // Add "Check Status" button
            var checkStatusButton = document.createElement('button');
            checkStatusButton.textContent = 'Fetch Status';
            checkStatusButton.addEventListener("click", async () => {
                await flightsEventHandlers.fetchStatus(result);
                result.status = "Pending";
                displayFlights(flights);
            });
            cell6.appendChild(checkStatusButton);
        } else if (result.status == "Pending") {
            // Add "Get Status" button
            var getStatusButton = document.createElement('button');
            getStatusButton.textContent = 'Get Status';
            getStatusButton.addEventListener("click", async () => {
                await flightsEventHandlers.getStatus(result);
                displayFlights(flights);
            });
            cell6.appendChild(getStatusButton);
        }
        let cell7 = newRow.insertCell(6);
        if (flights[i].hasPolicy) {
            cell7.textContent = "*";
        } else if (flights[i].status == "Unknown") {
            var buyPolicyButton = document.createElement('button');
            buyPolicyButton.classList.add("btn");
            buyPolicyButton.classList.add("btn-primary");
            buyPolicyButton.setAttribute("type", "button");
            buyPolicyButton.setAttribute("data-bs-toggle", "modal");
            buyPolicyButton.setAttribute("data-bs-target", "#exampleModal");
            buyPolicyButton.setAttribute("data-bs-airline-address", result.address);
            buyPolicyButton.setAttribute("data-bs-index", i);
            buyPolicyButton.setAttribute("data-bs-flight-number", result.flightNumber);
            buyPolicyButton.setAttribute("data-bs-departure-time", result.departureTime);
            buyPolicyButton.textContent = 'Buy';
            cell7.appendChild(buyPolicyButton);
        }
    })
}


DOM.elid('buy-confirm').addEventListener('click', async() => {
    const index = DOM.elid('buy-airline-index').value;
    const price = DOM.elid('buy-price').value;
    // Validate price < 1 ether
    const warningMessageDiv = DOM.elid('buy-warning');
    warningMessageDiv.classList.add('hidden');
    let warning = "";
    const priceAsNumber = Number(price);
    if (price == "") {
        warning = "Please enter a price!";
    } else {
        if (isNaN(priceAsNumber) || priceAsNumber != parseInt(priceAsNumber)) {
            warning = "Please enter a valid integer!";
        } else if (priceAsNumber >= contract.web3.utils.toWei('1', 'ether')) {
            warning  = "Please enter a value less than 1 ether!";
        }
    }
    if (!warning) {
        try {
            const flights = serverApi.getFlights();
            await flightsEventHandlers.buyPolicy(flights, index, priceAsNumber);
            displayFlights(flights);
            $("#exampleModal").modal('hide');
        } catch(e) {
            warning = "Failed to buy policy. Reason: " + e;
        }
    }
    if (warning) {
        warningMessageDiv.textContent = warning;
        DOM.elid('buy-warning').classList.remove('hidden');
    }
})
                // })

DOM.elid('pay').addEventListener('click', async () => {
    await serverApi.pay(contract.owner);
    displayPolicies();
})

async function displayPolicies() {
    console.log("Inside method displayBalance...");
    const policies = await serverApi.getPolicies(contract.owner);
    const balance = await serverApi.getBalance(contract.owner);

    let displaySuretyBalance = DOM.elid("display-surety-balance");
    let displayEthereumBalance = DOM.elid("display-ethereum-balance");

    const ethereumBalance = await serverApi.getBalanceEther(contract.owner);
    displayEthereumBalance.innerText = Number(ethereumBalance).toLocaleString("en-us");

    document.getElementById("pay").style.display = balance > 0 ? "" : "none";


    displaySuretyBalance.innerText = Number(balance).toLocaleString();

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
        const departureDate = new Date(result.timestamp * 1000);
        const departureDateString = (departureDate.getYear() + 1900) + "/" + (departureDate.getMonth() + 1) + "/" + departureDate.getDate();
        const departureTimeString = departureDate.getHours() + ":" + departureDate.getMinutes();
        cell3.innerHTML = departureDateString + " " + departureTimeString;
        let cell4 = newRow.insertCell(3);
        cell4.innerHTML = Number(result.price).toLocaleString();
        let cell5 = newRow.insertCell(4);
        cell5.innerHTML = Number(result.payout).toLocaleString();
        let cell6 = newRow.insertCell(5);
        cell6.innerHTML = result.paid;
    })
}

