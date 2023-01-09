const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');


module.exports = function(deployer, network, accounts) {

    deployer.deploy(FlightSuretyData)
    .then(() => {
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(() => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:8555',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    })
    .then(async () => {
        const data =await FlightSuretyData.deployed()
        // Setup app address in data contract
        await data.setAppContractAddress(FlightSuretyApp.address, {from: accounts[0]});

        // Setup initial airline and fund it
        await data.authorizeCaller(accounts[1], "United Airlines", { from: accounts[0] })
        const app = await FlightSuretyApp.deployed();
        await app.fund({from: accounts[1], value: web3.utils.toWei("10")});

    });
}