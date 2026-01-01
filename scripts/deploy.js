/**
 * Deployment Script for Fatebound Breach Contracts (Pyth VRF V2)
 * 
 * Deploys FateboundCore with Pyth Entropy V2 integration
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.js --network monadTestnet
 */

import hre from "hardhat";
import { writeFileSync } from "fs";

// Pyth Entropy V2 address on Monad Testnet (Verified working address)
const ENTROPY_ADDRESS = "0x825c0390f379C631f3Cf11A82a37D20BddF93c07";

async function main() {
    console.log("=".repeat(60));
    console.log("FATEBOUND BREACH - DEPLOYMENT (Pyth Entropy V2)");
    console.log("=".repeat(60));
    console.log("\nNetwork: Monad Testnet");
    console.log("Pyth Entropy V2:", ENTROPY_ADDRESS);

    const [deployer] = await hre.ethers.getSigners();
    console.log("\nDeployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "MON\n");

    // Deploy FateboundCore
    console.log("Deploying FateboundCore...");
    const FateboundCore = await hre.ethers.getContractFactory("FateboundCore");
    const fateboundCore = await FateboundCore.deploy();
    await fateboundCore.waitForDeployment();
    const fateboundCoreAddress = await fateboundCore.getAddress();
    console.log("FateboundCore deployed to:", fateboundCoreAddress);

    // Get VRF fee info  
    console.log("\nFetching VRF fee from Pyth Entropy V2...");
    try {
        const vrfFee = await fateboundCore.getVRFFee();
        console.log("✓ Current VRF Fee:", hre.ethers.formatEther(vrfFee), "MON");
    } catch (e) {
        console.log("✗ Could not fetch VRF fee:", e.message);
    }

    // Save deployment info
    const deployment = {
        network: "monadTestnet",
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            FateboundCore: fateboundCoreAddress,
            PythEntropyV2: ENTROPY_ADDRESS,
        },
        config: {
            VITE_CORE_ADDRESS: fateboundCoreAddress,
            VITE_ENTROPY_ADDRESS: ENTROPY_ADDRESS,
        }
    };

    writeFileSync("deployment-addresses.json", JSON.stringify(deployment, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log("\nContract Addresses:");
    console.log("  FateboundCore:   ", fateboundCoreAddress);
    console.log("  Pyth Entropy V2: ", ENTROPY_ADDRESS);
    console.log("\nView on Monad Explorer:");
    console.log(`  https://testnet.monadexplorer.com/address/${fateboundCoreAddress}`);
    console.log("\nAdd to frontend .env:");
    console.log(`  VITE_CORE_ADDRESS=${fateboundCoreAddress}`);
    console.log(`  VITE_ENTROPY_ADDRESS=${ENTROPY_ADDRESS}`);
    console.log("\nAddresses saved to deployment-addresses.json");
    console.log("=".repeat(60));
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
});
