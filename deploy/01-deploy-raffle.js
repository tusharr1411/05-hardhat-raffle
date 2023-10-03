const { network, ethers } = require("hardhat");
const { DEVELOPMENT_CHAINS, networkConfig } = require("../helper-hardhat-config");
const {verify } = require("../utils/verify");
const { hashMessage } = require("ethers");



const VRF_SUB_FUND_AMOUNT = ethers.parseEther("30");



module.exports =async({getNamedAccounts, deployments})=> {
    const {deploy , log} = deployments;
    const {deployer} = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfCoordinatorV2_address,subscriptionId;

    const entranceFee = networkConfig[chainId]["entranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    const interval = networkConfig[chainId]["interval"];






    //vrfCoordinatorV2_address and  subscriptionId are different on local network and real testnet
    if(DEVELOPMENT_CHAINS.includes(network.name)){
        // we are grabing the contract as we are on development chains
        const VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        // vrfCoordinatorV2_address = VRFCoordinatorV2Mock.address;// not working only .target working
        vrfCoordinatorV2_address = VRFCoordinatorV2Mock.target;
        // vrfCoordinatorV2_address = VRFCoordinatorV2Mock.getAddress();

        /*creating subscription ID for local development*/
        const transactionResponce = await VRFCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponce.wait(1);
        // subscriptionId = transactionReceipt.events[0].args.subId;//important topic 
        // console.log(transactionReceipt)
        subscriptionId = 1;
        
        
        /*fund the subscription */
        //usually, you'd need the link token on a real network
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId,VRF_SUB_FUND_AMOUNT);
    }
    else{
        // we are on testnet
        vrfCoordinatorV2_address = networkConfig[chainId]["vrfCoordinatorV2"];// from helper-hardhat-config.
        // we can also creat subscription here and fund it.... fund just use web interface and put here from helper-hardhat-config
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }
    
    
    
    
    
    
    /** Deploying Raffle on blockchain     **/
    const raffle = await deploy("Raffle",{
        from: deployer,
        args: [vrfCoordinatorV2_address,entranceFee,gasLane,subscriptionId,  callbackGasLimit,interval],
        log: true,
        waitConfirmations : network.config.blockConfirmations|| 1,
    })
    // console.log("*************************************************************************************")


        // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
        if (DEVELOPMENT_CHAINS.includes(network.name)) {
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
            await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
        }


    /** verifying the contract on etherscan   **/
    if(!DEVELOPMENT_CHAINS.includes(network.name) && process.env.ETHERSCAN_API_KEY){
        log("Verifying... ");
        await verify(raffle.address, [vrfCoordinatorV2_address,entranceFee,gasLane,subscriptionId,  callbackGasLimit,interval])// verify is from utils/verify
    }
    log("------------------------------Done------------------------------------");
}


module.exports.tags = ["all", "raffle"];