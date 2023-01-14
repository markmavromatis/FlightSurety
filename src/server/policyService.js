import OracleService from "./OracleService";

export default class PolicyService {

    constructor(ownerAccount, flightSuretyApp, flightSuretyData) {
        this.owner = ownerAccount;
        this.flightSuretyApp = flightSuretyApp;
        this.flightSuretyData = flightSuretyData;
    };

    async getBalance(accountAddress) {
        console.log("Inside method getBalance...");

        const result = await this.flightSuretyApp.methods.getInsuredBalance(
                accountAddress).call();
        return result;
   }

   async getBalanceEther(accountAddress) {
    console.log("Inside method getBalanceEther...");
    const result = await this.flightSuretyApp.methods.getInsuredBalanceEther(
        accountAddress).call();
    return result;
    }

    async getPolicyCount(accountAddress) {
        console.log("Retrieving policies...");
        console.log("Address = " + accountAddress);
        const count = await this.flightSuretyApp.methods
        .getPolicyCount(accountAddress).call();
        // console.log("COUNT = " + JSON.stringify(count));
        return count;
    }

    async getPolicy(accountAddress, i) {
        console.log("Inside method getPolicy...");
        console.log("Address = " + accountAddress);
        console.log("Index = " + i);
        const policyDetails = await this.flightSuretyApp.methods
        .getPolicyDetails(accountAddress, i).call();
        // console.log("COUNT = " + JSON.stringify(count));
        return {
            account: policyDetails[0],
            airline: policyDetails[1],
            flight: policyDetails[2],
            timestamp: policyDetails[3],
            price: policyDetails[4],
            payout: policyDetails[5],
            expired: policyDetails[6],
            paid: policyDetails[7]
        }
    }

    async getPolicies(accountAddress) {
        const count = await this.getPolicyCount(accountAddress);
        console.log("Policy count is: " + count);
        let policies = [];
        for (let i = 0; i < count; i++) {
            policies.push(await this.getPolicy(accountAddress, i));
        }
        return policies;
    }

    async pay(accountAddress) {
        console.log("Inside method pay...");
        await this.flightSuretyData.methods.pay(accountAddress).send({from: this.owner});
        return {success: true};
   }

}