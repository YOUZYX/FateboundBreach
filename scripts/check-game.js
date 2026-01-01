import hre from "hardhat";

async function main() {
    const player = "0x73C978453ebAf65b243d1C42E86BfD8fd2Dff0DA";
    const contractAddress = "0x20c25fb89B94Fc47B9F38Eb59dBDeCC3f7122bE3";

    console.log("Checking game state for:", player);

    // Create contract instance
    const FateboundCore = await hre.ethers.getContractFactory("FateboundCore");
    const contract = FateboundCore.attach(contractAddress);

    // Get active game ID
    const gameId = await contract.activeGameId(player);
    console.log("Active Game ID:", gameId.toString());

    if (gameId > 0) {
        // Get game details
        const game = await contract.games(gameId);
        console.log("Game Status:", game.status.toString());
        console.log("Details:");
        console.log(" - Player:", game.player);
        console.log(" - Seed:", game.seed);
        console.log(" - Turn:", game.currentTurn.toString());

        const statusMap = ["NONE", "WAITING_FOR_VRF", "ACTIVE", "COMPLETED"];
        console.log("\nReadable Status:", statusMap[Number(game.status)]);

        if (Number(game.status) === 1) {
            console.log("\n⚠️ Game is stuck waiting for VRF callback.");
            console.log("This means Pyth Entropy provider has not responded yet.");
        } else if (Number(game.status) === 2) {
            console.log("\n✅ Game is ACTIVE! The frontend just missed the event.");
        }
    } else {
        console.log("No active game found.");
    }
}

main().catch(console.error);
