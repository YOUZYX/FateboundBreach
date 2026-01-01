import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";

const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {},
        monadTestnet: {
            url: MONAD_RPC_URL,
            chainId: 10143,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
    },
    paths: {
        sources: "./contracts",
        cache: "./cache-hh",
        artifacts: "./artifacts",
    },
};

export default config;
