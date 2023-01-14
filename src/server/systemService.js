export default class SystemService {

    constructor(ownerAccount, flightSuretyData) {
        this.flightSuretyData = flightSuretyData;          
        this.owner = ownerAccount;
    };

    async isOperational() {
        let result;
        try {
            result = await this.flightSuretyData.methods.isOperational().call({from: this.owner});
        } catch (e) {
            return {successful: false, error: e};
        }
        return {status: result}
    }
    async setOperatingStatus(mode) {
        console.log("Inside method setOperatingStatus...");
        console.log("Owner = " + this.owner);
        console.log("Mode = " + mode);
        try {
            await this.flightSuretyData.methods.setOperatingStatus(mode).send({from: this.owner});
        } catch (e) {
            return {successful: false, error: e};
        }

        return {successful: true}
    }
}