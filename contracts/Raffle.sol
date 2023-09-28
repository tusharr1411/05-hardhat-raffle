//SPDX-License-Identifier:MIT


// Enter the Raffle (with paying some amount);
//Pick a random winner( verifiably random) [Chainlink oracle( vrf)
//after x time passes (automatically ) [chainlink oracle(keepers)]
// Transfer lottery fund to winner and reset lottery


pragma solidity ^0.8.0;


/*imports*/
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";






/* Custom Errors  */ 
error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle_UpkeepNotNeeded(uint256 currentBalance, uint256 numberOfPlayers , uint256 raffleState );




contract Raffle is VRFConsumerBaseV2 , KeeperCompatibleInterface{


    /** Type Declarations */
    enum RaffleState{
        OPEN,CALCULATING
    }// uint256 0 = OPEN, 1 = CALCULATING




    /*Global/ State  Variables */
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    address payable[] private s_players;
    uint256 private immutable i_entranceFee;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUMBER_OF_WORDS = 1; // how many numbers are requested 




    /*lottery state variables*/
    address private s_recentWinnerAddress;
    // bool private s_isOpen; //to true , false.... but what if we have tons of states.... like pending, open, closed, calculatng
    // Here comes Enums into the play
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;
    
    
    
    /*Events*/
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);


    /*Constructor */
    //vrfCoordinator is the address of contract that does the random number verification
    constructor(address vrfCoordinatorV2_address,uint256 entranceFee ,bytes32 gasLane,uint64 subscriptionId , uint32 callbackGasLimit, uint256 interval) VRFConsumerBaseV2(vrfCoordinatorV2_address){  //VRFConsumerBaseV2(vrfCoordinator) is the constructor for VRFConsumerBaseV2.sol
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2_address);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN; // RaffleState(0)
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }



    /* Functions  */
    function enterRaffle() public payable {
        if(msg.value<i_entranceFee){revert Raffle__NotEnoughETHEntered();} //require msg.value >= i_entranceFee
        if(s_raffleState != RaffleState.OPEN){ revert Raffle__NotOpen();}

        s_players.push(payable(msg.sender));
        //emit an event wwhen wwe updaate a dynamic array or  mapping
        // Name eventss with the function name reversed.
        emit RaffleEnter(msg.sender);  
    }/******************************************************************************/






    /**
     * @dev This is the function that the chainlink Keeper node call
     * they look for the upkeepNeeded to return true
     * The following should be true in order to return true
     * 1. Our time interval should have passed
     * 2. Lottery should have atleast 1 player, and have some eth
     * 3. Then our subscription is funded with LINK
     * 4. The lottery should be in an "open" state.
     */
    function checkUpkeep(bytes memory /*checkData*/) public view  override returns (bool upkeepNeeded, bytes memory /*performData*/){
        upkeepNeeded = ((s_raffleState == RaffleState.OPEN) && (block.timestamp - s_lastTimeStamp > i_interval) &&(s_players.length>0) && (address(this).balance > 0));
        return (upkeepNeeded, "0x0");
    }/******************************************************************************/






    //with the help of chainlink VRF
    // this function will be called by chainlink keepers so that we can automatically choose the winner
    // external because it will be called outside this contracts
    // also externals are cheeper
    function performUpkeep(bytes calldata /**performData */) external override{

        (bool upkeepNeeded, ) = checkUpkeep("");
        if(!upkeepNeeded) { revert Raffle_UpkeepNotNeeded(address(this).balance,s_players.length,uint256(s_raffleState));}



        //we have to request the random number
        // choose winner based on random number
        // transfer the fund
        // chainlink vrf is 2 transaction process(intentionally)

        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,                       // The gasLane or Key hash value which is the maximum gas price you are willing to pay for a request in wei.It functions as an ID of the off-chain VSR job that runs in response to request*/
            i_subscriptionId,                // the subscription ID that this contract uses for funding requests
            REQUEST_CONFIRMATIONS,           // How many confirmations the Chainlink node should wait before responding.The longer the node waits,the more secure tge random value it.It must be greater than the minimum RequestBlockConfirmations limit on the contract*/
            i_callbackGasLimit,              // The limit for how much gas to use for the callback request to your contract's fulfillRandomWords function. It must be less than the maxGasLimit on the coordinator contract. Adjust this value for larger requests depending on how your fulfillRandomWords function processes and stores the received random values. If your callbackGasLimit is not sufficient, the callback will fail and your subscriptionis still charged for the work done to generate your requested random values.*/
            NUMBER_OF_WORDS                  // How many random values to request. If you can use several random values in a single callback, you can reduce the amount of gas that you spend per random value. */
        );

        emit RequestedRaffleWinner(requestId); // we are printing the requestId in log of EVM so that nodes can see it
    }/*************************************************************************/ 



    //fulfillRandomWords function is from VRFConsumerBaseV2.sol and we are overriding it
    function  fulfillRandomWords(uint256 /*requestId*/ , uint256 [] memory randomWords) internal override {
        uint256 winnerIndex = randomWords[0] % s_players.length;
        address payable recentWinnerAddress = s_players[winnerIndex];
        s_recentWinnerAddress = recentWinnerAddress;
        s_players = new address payable[](0);


        //pay the money to winner
        (bool success,) = recentWinnerAddress.call{value:address(this).balance}("");
        if(!success){revert Raffle__TransferFailed();}

        // we want to store winners in EVM log ...so emit an event
        emit WinnerPicked(recentWinnerAddress);



        //update the lottery state 
        s_lastTimeStamp = block.timestamp;
        s_raffleState = RaffleState.OPEN;
    } /*********************************************/







    /************           View/ Pure Functions             ***********/
    function getEntranceFee() view public returns(uint256){return i_entranceFee;}
    function getPlayerAt(uint256 index) view public returns(address){return s_players[index];}
    function getRecentWinnerAddress() view public returns(address) {return s_recentWinnerAddress;}
    function getRaffleState() view public returns(RaffleState){ return s_raffleState;}
    //as the NUM_WORDS is stored in the byte code of the contract, is not getting read from storage.That's why it is not a view function. it's equavalent to return 1;
    function getNumberOfWords() pure public returns(uint32) {return NUMBER_OF_WORDS;}
    function getNumberOfPlayers() view public returns(uint256){return s_players.length;}
    function getLastTimeStamp() view public returns(uint256){return s_lastTimeStamp;}
    function getRequestConfirmations() public pure returns(uint16)  {return REQUEST_CONFIRMATIONS;}
    function getInterval() public view returns(uint256) {return i_interval;}
    function getSubscriptionId() public view returns(uint64) {return i_subscriptionId;}





}
