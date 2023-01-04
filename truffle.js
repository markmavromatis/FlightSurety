const HDWalletProvider = require("@truffle/hdwallet-provider");
var mnemonic = "essay aspect awful day work poem gate love bus slice retreat quality";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:9545/", 0, 50);
      },
      network_id: '*',
      gas: 9999999
    }
  },
  compilers: {
    solc: {
      version: "0.5.16"
    }
  }
};