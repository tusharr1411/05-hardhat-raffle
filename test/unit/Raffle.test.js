


//unit tests are for development chains

const {network, getNamedAccounts, deployments, ethers} = require("hardhat");
const {DEVELOPMENT_CHAINS,networkConfig} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");


!DEVELOPMENT_CHAINS.includes(network.name)
? describe.skip 
: describe("Raffle Contract:", ()=>{
    let raffle,vrfCoordinatorV2Mock,raffleEntranceFee,deployer,interval;
    const chainId = network.config.chainId;



    beforeEach(async()=>{
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);// this will deploy all the contracts with "alll" keywords....(both raffle and mock)
        raffle = await ethers.getContract("Raffle",deployer) // here deployer is optional
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock",deployer)
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();



    })



    /* Test for the constructor */
    describe("Test 1: Constructor", ()=>{
        it("should set the constructor parameters correctly", async()=>{
            //ideally 1 asserts per "it"
            const raffleState = await raffle.getRaffleState();
            assert.equal(raffleState.toString(),"0")
            assert.equal(interval.toString(),networkConfig[chainId]["interval"]);
            // just skipped other parameters
        })
    });

    /* Tests for the enterRaffle Function */
    describe("Test 2: enterRaffle()", ()=>{
        it("should revert if you don't pay enough", async ()=>{
            await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
        })
        it("should revert if raffle is not open", async ()=>{
            await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotOpen")
        })
        it("records players when they enter", async()=>{
            await raffle.enterRaffle({value:raffleEntranceFee+"33"}) // we are connected to deployer so this enterRaffle is called by deployer
            const playerFromContract = await raffle.getPlayerAt(0);
            assert.equal(playerFromContract,deployer);

        })
        it("emits event on enter",async ()=>{
            await expect(raffle.enterRaffle({value:raffleEntranceFee})).to.emit(raffle,"RaffleEnter");//emit from chai matchers

        })
        it("deosn't allow entrance when raffle is calulating", async()=>{
            /*we wanna raffle in a closed state ... so it is possible when performing upkeep( with  upkeepNeeded true).
            So we pretend to be chainlink keepers network , to keep calling checkUpkeep ( with upkeepNeeded true) and 
            once it's true we will pretend chainlink keepers network and call perform upkeep to go in calculating state*/
            /* Hardhat Methods and Time travel */
            //evm_increaseTime increases the time of our local blockchain and EVM
            //evm_mine allow us to mine or create new blocks 

            await network.provider.send("evm_increaseTime", [Number(interval )+1]) //increased blockchain time by (interval+1)
            await network.provider.send("evm_mine",[]);
            
            // await network.provider.request({method:"evm_mine", param:[]})// same as above line

            // so now checkUpkeep should return true 
            
            //we pretend to be a chainlink keeper
            await raffle.performUpkeep("0x")
            console.log("*************************************")
            //now it's in a calculating state

            await expect(raffle.enterRaffle({value:raffleEntranceFee})).to.be.revertedWith("Raffle__NotOpen")
        })

    })

    describe("Test 3: CheckUpkeep()", ()=>{
        it("returns false if people haven't sent any ETH",async()=>{
            await network.provider.send("evm_increaseTime", [Number(interval )+1]);
            await network.provider.send("evm_mine", []);

            // now we hace to call checkUpkeep and it should return false
            // const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([]);
            const{ upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
            // console.log(upkeepNeeded)
            assert(!upkeepNeeded);
        })
        it("returns false if raffle is not open", async()=>{
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [Number(interval )+1]);
            await network.provider.send("evm_mine", []);


            await raffle.performUpkeep("0x")  // 0x is blank byte object

            const raffleState = await raffle.getRaffleState();

            const {upkeepNeeded} = await raffle.checkUpkeep.staticCall("0x");

            assert.equal(raffleState.toString(), "1");
            assert.equal(upkeepNeeded,false);
        })
        it("returns false it enough time hasn't passed", async ()=>{
            await raffle.enterRaffle({value:raffleEntranceFee});
            await network.provider.send("evm_increaseTime",[Number(interval)-1])
            await network.provider.request({method:"evm_mine", params:[]})

            const {upkeepNeeded} = await raffle.checkUpkeep.staticCall("0x");
            assert(!upkeepNeeded)


        })

        it("returns true if enough time has passed , has players, eth and is open", async ()=>{
            await raffle.enterRaffle({value:raffleEntranceFee});
            await network.provider.send("evm_increaseTime",[Number(interval)+1])
            await network.provider.request({method:"evm_mine", params:[]});

            const {upkeepNeeded} = await raffle.checkUpkeep.staticCall("0x");
            assert(upkeepNeeded);
        })
    })



    describe("Test 4: performUpkeep()", ()=>{
        it("can only run if checkUpkeep returns true",async ()=>{
            await raffle.enterRaffle({value:raffleEntranceFee});
            await network.provider.send("evm_increaseTime",[Number(interval)+1])
            await network.provider.request({method:"evm_mine", params:[]});

            const tx = await raffle.performUpkeep("0x");
            assert(tx);

        })

        it("reverts when checkUpkeep returns false", async ()=>{
            await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle_UpkeepNotNeeded")
        })

        it("updates the raffleState, emits an event, and calls the vrfCoordinator", async ()=>{
            await raffle.enterRaffle({value:raffleEntranceFee});
            await network.provider.send("evm_increaseTime",[Number(interval)+1])
            await network.provider.request({method:"evm_mine", params:[]});

            const txResponse = await raffle.performUpkeep([]);
            const txReciept = await txResponse.wait(1);
            const requestId = txReciept.events[1].arg.requestId;
            const raffleState = await raffle.getRaffleState();
            assert(Number(requestId) > 0)
            assert(raffleState.toString() =="1");
        })
    })



    describe("Test 5: fulfillRandomWords()",()=>{
        //before test make sure someone has alredy entered the raffle
        beforeEach(async()=>{
            await raffle.enterRaffle({value:raffleEntranceFee});
            await network.provider.send("evm_increaseTime",[Number(interval)+1]);
            await network.provider.send("evm_mine", [])

        })

        it("can only be called after performUpkeep", async function(){
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0,raffle.address)).to.be.reverted("nonexistent request")
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1,raffle.address)).to.be.reverted("nonexistent request")

        })
        // the big test[15:52:10]
        it("picks a winner, resets the lottery and send money to the winner", async ()=>{
            // giving entery to some other people
            const additionalEntrants = 3
            const accounts = await ethers.getSigners();
            //wanna have some more fake accounts from ehters
            const startingAccountIndex= 1// since deployer = 0
            for (let i =startingAccountIndex;i<startingAccountIndex+additionalEntrants;i++){

                const accountConnectedRaffle = raffle.connect(accounts[i]);
                await accountConnectedRaffle.enterRaffle({value:raffleEntranceFee})
            }//now we have 4 people in raffle

            const startingTimeStamp = await raffle.getLastTimeStamp();

            //want to performupkeep(mock being chainlink keepers)
            //this will kick off fulfillRandomWords(Mock being chainlink VRF)
            // we wil have to wait for filfillRandomWords to be called 
            await new Promise(async (resolve, reject) =>{
                raffle.once("WinnerPicked", async ()=>{
                    console.log("Found the event!")

                    try {
                        const recentWinner = await raffle.getRecentWinnerAddress();
                        console.log(recentWinner);
                        console.log(accounts[0].address);
                        console.log(accounts[1].address);
                        console.log(accounts[2].address);
                        console.log(accounts[3].address);
                        const winnerEndingBalance =  await accounts[1].getBalance();


                        
                        const raffleState = await raffle.getRaffleState();
                        const endingTimeStamp = await raffle.getLastTimeStamp();

                        //player array resets to zero
                        const numPlayers = await raffle.getNumberOfPlayers()
                        asssert.equal(numPlayers.toString(),"0");
                        assert.equal(raffleState.toString(), "0")
                        assert(endingTimeStamp > startingTimeStamp)
                        ////
                        assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee.mul(additionalEntrants).add(raffleEntranceFee)).toString())
                        

                     
                    }
                    catch(error){
                        reject(error);
                    }
                    resolve();

                })// if this event not get fired in 200 seconds then it will be considered as failure


                // setting up the listener 

                //below, we will fire the event, and the listner will pick up, nd resolve;
                const tx = await raffle.performUpkeep([])
                const txReceipt = await tx.wait(1);
                 const winnerStartingBalance =  await accounts[1].getBalance();
                await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.event[1].arf.requestId, raffle.address)



            })



        })
    })










})


/*--------------------------------------------------------------------------
Mocha is a feature-rich JavaScript test framework running on Node.js
and in the browser, making asynchronous testing simple and fun. Mocha
tests run serially, allowing for flexible and accurate reporting, while
mapping uncaught exceptions to the correct test cases.
*Mocha is one of the most-depended-upon modules on npm (source: libraries.io), and
*Mocha is an independent open-source project, maintained exclusively by volunteers.
-------------------------------------------------------------------------------------*/



/*--------------------------------------------------------------------------
Chai is a BDD / TDD assertion library for node and the browser that can be 
delightfully paired with any javascript testing framework.
--------------------------------------------------------------------------*/


/*--------------------------------------------------------------------------
Waffle is a library for writing and testing smart contracts.
Works with ethers-js.
--------------------------------------------------------------------------*/




/*--------------------------------------------------------------------------
deployments is a destructured variable imported from the "hardhat" package.
In Hardhat, the deployments object provides functionality and utilities for 
deploying and managing smart contracts on various Ethereum networks.It simplifies
the deployment process and allows you to interact with deployed contracts.

the beforeEach block is using deployments.fixture(["all"]) to ensure that certain
contracts are deployed before each test is run. The exact behavior of this fixture 
deployment would depend on the configuration set up in your Hardhat project.

1. Deploy Smart Contracts: You can use the deployments.deploy method to deploy 
   smartcontracts to the specified Ethereum network. This method takes care of
   compiling your contract, estimating gas costs, and sending transactions to 
   deploy the contract.

2. Track Deployed Contracts: Hardhat keeps track of deployed contracts, and you
   can retrieve information about these contracts using deployments.get.

3. Upgrade Contracts: If you need to upgrade your smart contracts, you can use 
   the deployments.upgrade method to deploy a new version and handle the upgrade
   process.

4. Fixture Deployment: In your testing code, like in your beforeEach block, you 
   can use deployments.fixture to ensure that specific contracts are deployed 
   before running your tests. This is useful for ensuring a consistent environment
for testing.

5. Configuration: You can configure deployment parameters and strategies in your 
   Hardhat configuration file (usually hardhat.config.js or hardhat.config.ts) 
   under the deployments section.
--------------------------------------------------------------------------*/
