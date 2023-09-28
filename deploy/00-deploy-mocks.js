const { DEVELOPMENT_CHAINS } = require("../helper-hardhat-config");
// const { network } = require("hardhat");






const BASE_FEE = ethers.parseEther("0.25"); // this will convert human readable string representation of an ether amount into wei unit means 0.25ETH = 250000000000000000
// 0.25 is the premium. It cost 0.25 links per request
const GAS_PRICE_LINK = 1e9; // gas per link // 10**9//calculated value based on the gas price of the chain

//If we requests random number on ETH mainnet and the price of eth increases to $1B then gas would be incredibly expensive 
//chainlink nodes pay the gas fee to give us randomness and do external execuation , it is the fee paid by the chainlink nodes to call fulfilrandomNum and upkeep functions
// The chainlink nodes get paid link token as gas fee
//thats why chanlink nodes have a calculated price (gas price per link) which fluctuates based of the price of the actual chain...so that they never go bankrupt;




module.exports = async ({getNamedAccounts,deployments})=>{ //from hre
    const {deploy,log} = deployments;
    const {deployer } =  await getNamedAccounts();
    const chainId = network.config.chainId;


    if(DEVELOPMENT_CHAINS.includes(network.name)){
        log("directly or indirectly local network detected... deploying mock........")
        //deploy a mock vrfCoordinator
        await deploy("VRFCoordinatorV2Mock",{
            from: deployer,
            log: true,
            args:[BASE_FEE,GAS_PRICE_LINK],
        })

        log("Mock Deployed");
        log("----------------------------------------------");

    }


}

module.exports.tags = ["all","mocks"];


