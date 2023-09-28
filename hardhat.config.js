
require("hardhat-deploy")
require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-waffle")
require("hardhat-contract-sizer")
require("hardhat-gas-reporter")
require("dotenv").config();
require("solidity-coverage")




const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY;

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;

const GANACHE_RPC_URL = process.env.GANACHE_RPC_URL;
const GANACHE_PRIVATE_KEY = process.env.GANACHE_PRIVATE_KEY;

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;








/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
    solidity: "0.8.7",

    defaultNetwork: "hardhat",
    networks: {
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [GOERLI_PRIVATE_KEY],
            chainId: 5,
            blockConfirmation: 6,
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [SEPOLIA_PRIVATE_KEY],
            chainId: 11155111,
            blockConfirmation: 6,
        },
        ganache: {
            url: GANACHE_RPC_URL,
            accounts: [GANACHE_PRIVATE_KEY],
            chainId:1337
        },
        localhost: {
            url: "http://127.0.0.1:8545/",
            gas: 2100000,
            gasPrice: 8000000000,
            // accounts:[PRIVATE_KEY], // hardhat will auto set
            chainId: 31337, // same as hardhat
            // no need to add chain ID in newer versions
        },
    },

    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },

    gasReporter:{
        enabled:false,
        currency:"USD",
        outputFile:"gas-report.txt",
        noColors:true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },

    mocha:{
        timeout: 200000, // 200 senonds max
    },

    etherscan: {
        apiKey: {
          sepolia: ETHERSCAN_API_KEY
        }
      }

};
