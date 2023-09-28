


//staging tests are for testnet chains

const {network, getNamedAccounts, deployments, ethers} = require("hardhat");
const {DEVELOPMENT_CHAINS,networkConfig} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");


DEVELOPMENT_CHAINS.includes(network.name)
? describe.skip 
: describe("Raffle Contract:", ()=>{
    let raffle,raffleEntranceFee,deployer;
    const chainId = network.config.chainId;



    beforeEach(async()=>{
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle",deployer) // here deployer is optional
        raffleEntranceFee = await raffle.getEntranceFee();
        // interval = await raffle.getInterval();
    })

    describe(" fulfillRandomWords",function (){
        it("works with live chainlink Keepers and chainlink VRF, we get get a random Winner", async ()=>{

            // enter the raffle
            //nothing else .... because chainlink keepers vrf are gonna kick off the lottery

            const startingTimeStamp = await raffle.getLastTimeStamp();
            const account   = await ethers.getSigners()

            await  new Promise(async (resolve,reject) =>{
                raffle.once("WinnerPicked", async () =>{
                    console.log("WinnerPicked event fired !")

                    try {
                        //add asserts 
                        const recentWinner = await raffle.getRecentWinnerAddbress();
                        const raffleState = await raffle.getRaffleState();
                        const winnerEndingBalance = await account[0].getBalance();
                        const endingTimeStamp = await raffle.getLastTimeStamp();


                        await expect(raffle.getPlayerAt(0)).to.be.reverted
                        assert.equal(recentWinner.toString(), account[0].address)
                        assert.equal(raffleState,0)
                        assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee).toString)
                        assert(endingTimeStamp > startingTimeStamp)
                        resolve();



                    } catch(error){
                        console.log(error)
                        reject(error)
                        
                    }
                })
                // entering the raffle

                await raffle.enterRaffle({value: raffleEntranceFee})
                const winnerStartingBalance = await account[0].getBalance();

                // and this code won't complete until our listner has finished listening:

            })
            
            
            //setup listner before we enter the raffle

            // just in case the blockchain moves really fast
            
            
            
            
            
        })
    })





})


/*   In order to test on a testnet or a mainnet 



1. get our SubId for chainlink VRF
2. Deploy our contract using subID
3. Register the contract with chainlink VRF and it's subID
4. Register the contract with chainlink Keepers
5. Run staging tests



*/
