const { ethers, network } = require("hardhat");
const fs = require("fs")
require("dotenv").config();

const FRONT_END_ADDRESSES_FILE = "../nextjs-raffle/constants/contractAddresses.json"
const FRONT_END_ABI_FILE =  "../nextjs-raffle/constants/abi.json"

module.exports = async function (){
    if( process.env.UPDATE_FRONT_END){
        console.log("Updating Front End")

        await updateABI();
        await updateContractAddress()

        console.log("Front end Written");


    }
}

async function updateContractAddress(){
    const raffle = await ethers.getContract("Raffle")
    const chainId = network.config.chainId.toString();

    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE,"utf8"));
    if(chainId in currentAddresses){
        if(!currentAddresses[chainId].includes[raffle.target]){
            currentAddresses[chainId].push(raffle.target);
        }
    }
    else{
        currentAddresses[chainId] = [raffle.target]
    }

    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
    console.log("----Address added----")


}

async function updateABI(){
    const raffle  = await ethers.getContract("Raffle");
    // fs.writeFileSync(FRONT_END_ABI_FILE,  raffle.interface.format(ethers.utils.FormatTypes.json))
    fs.writeFileSync(FRONT_END_ABI_FILE, JSON.stringify(raffle.interface.fragments))

    console.log("----ABI added----")


}








module.exports.tags = ["all", "frontend"]