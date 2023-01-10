import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

import ServerApi from './serverApi';

(async() => {

    let status = {
        onlineStatus: true,
        details: ""
    };
    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
    });

    $('button[data-bs-target="#airlines"]').on('shown.bs.tab', function(e){
        console.log('Airlines will be visible now!');
        let serverApi = new ServerApi('localhost', contract.firstAirlineAddress);
        displayAirlines(serverApi.getAirlines());
    });

    $('button[data-bs-target="#flights"]').on('shown.bs.tab', function(e){
        console.log('Flights will be visible now!');
        let serverApi = new ServerApi('localhost', contract.firstAirlineAddress);
        displayFlights(serverApi.getFlights(), {});
    });

    $('button[data-bs-target="#policies"]').on('shown.bs.tab', function(e){
        console.log('New tab will be visible now!');
    });
    

    console.log("Checking connectivity with blockchain...");
    contract.web3.eth.net.isListening()
    .then(() => {
        console.log("Web3 interface connection confirmed!")
    }) // Do nothing)
    .catch(e => {
        status.onlineStatus = false;
        status.description = "Web3 interface is down. Check blockchain connectivity!"
        const systemStatusSpan = DOM.elid("systemStatus");
        systemStatusSpan.appendChild(DOM.h4(status.description));
    });

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

function displayFlights(flights, contracts) {

    let displayTable = DOM.elid("flights-table-body");
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
                console.log("Checking status...");
            });
            cell6.appendChild(checkStatusButton);
        }
        const hasContract = contracts[result.flightNumber] != undefined
                && contracts[result.flightNumber][result.departureTime] != undefined;
        let cell7 = newRow.insertCell(6);
        cell7.innerHTML = hasContract ? "Yes" : "No";
        var btn = document.createElement('button');
        btn.textContent = 'Buy';
        btn.addEventListener("click", () => {
            contracts[result.flightNumber] = {};
            contracts[result.flightNumber][result.departureTime] = 1;
            cell7.innerHTML = "Yes";
        });
        cell7.appendChild(btn);
    })
}






