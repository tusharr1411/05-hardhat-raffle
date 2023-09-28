const { ethers } = require("hardhat");

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        entranceFee: ethers.parseEther("0.01"),
        gasLane:"0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "557",
        callbackGasLimit: "500000", // 500,000
        interval: "30",
    
    },
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        entranceFee: ethers.parseEther("0.01"),
        gasLane:"0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "",
        callbackGasLimit: "500000",
        interval: "30",
    },
    137: {
        name: "polygon",
        vrfCoordinatorV2: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: 0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f,
        subscriptionId: "",
        callbackGasLimit: "500000",
        interval: "30",
    },
    31337: {
        name: "localhost",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", //mocs doesn't care about gasLane
        callbackGasLimit: "500000",
        interval: "30",
    },
    1337: {
        name: "ganache",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", //mocs doesn't care about gasLane
        callbackGasLimit: "500000",
        interval: "30",
    },
};

const DEVELOPMENT_CHAINS = ["hardhat", "localhost", "ganache"];
module.exports = {
    networkConfig,
    DEVELOPMENT_CHAINS,
};
