require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: MNEMONIC
      }
    }
  }
};
