/**
 * Contract Configuration
 * 
 * Chain config, contract addresses, and ABIs for Fatebound Breach.
 */

import { defineChain } from 'viem';

// ============================================================================
// Monad Testnet Chain Configuration
// ============================================================================

export const monadTestnet = defineChain({
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Monad',
        symbol: 'MON',
    },
    rpcUrls: {
        default: {
            http: ['https://testnet-rpc.monad.xyz'],
        },
        public: {
            http: ['https://testnet-rpc.monad.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Monad Explorer',
            url: 'https://testnet.monadexplorer.com',
        },
    },
    testnet: true,
});

// ============================================================================
// Contract Addresses
// ============================================================================

export const FATEBOUND_ADDRESS = '0x4A206fa22C740173420A99cac8bae3EBe637D047' as const;
export const ENTROPY_ADDRESS = '0x825c0390f379C631f3Cf11A82a37D20BddF93c07' as const;

// ============================================================================
// FateboundCore ABI (Pyth Entropy V2)
// ============================================================================

export const FATEBOUND_ABI = [
    // ===== Events =====
    {
        type: 'event',
        name: 'GameRequested',
        inputs: [
            { name: 'gameId', type: 'uint256', indexed: true },
            { name: 'player', type: 'address', indexed: true },
            { name: 'sequenceNumber', type: 'uint64', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'GameStarted',
        inputs: [
            { name: 'gameId', type: 'uint256', indexed: true },
            { name: 'player', type: 'address', indexed: true },
            { name: 'seed', type: 'bytes32', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'TurnSubmitted',
        inputs: [
            { name: 'gameId', type: 'uint256', indexed: true },
            { name: 'turn', type: 'uint8', indexed: false },
            { name: 'stateHash', type: 'bytes32', indexed: false },
            { name: 'result', type: 'uint8', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'GameCompleted',
        inputs: [
            { name: 'gameId', type: 'uint256', indexed: true },
            { name: 'player', type: 'address', indexed: true },
            { name: 'score', type: 'uint256', indexed: false },
        ],
    },

    // ===== Read Functions =====
    {
        type: 'function',
        name: 'getVRFFee',
        inputs: [],
        outputs: [{ name: '', type: 'uint128' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getGame',
        inputs: [{ name: 'gameId', type: 'uint256' }],
        outputs: [
            { name: 'player', type: 'address' },
            { name: 'seed', type: 'bytes32' },
            { name: 'stateHash', type: 'bytes32' },
            { name: 'currentTurn', type: 'uint8' },
            { name: 'status', type: 'uint8' },
            { name: 'result', type: 'uint8' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'activeGameId',
        inputs: [{ name: 'player', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'hasActiveGame',
        inputs: [{ name: 'player', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getHand',
        inputs: [
            { name: 'seed', type: 'bytes32' },
            { name: 'turn', type: 'uint8' },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple[]',
                components: [
                    { name: 'byteValue', type: 'uint8' },
                    { name: 'packetType', type: 'uint8' },
                    { name: 'value', type: 'uint8' },
                ],
            },
        ],
        stateMutability: 'pure',
    },

    // ===== Write Functions =====
    {
        type: 'function',
        name: 'startGame',
        inputs: [],  // No args in V2 - uses requestV2() internally
        outputs: [
            { name: 'gameId', type: 'uint256' },
            { name: 'sequenceNumber', type: 'uint64' },
        ],
        stateMutability: 'payable',
    },

    {
        type: 'function',
        name: 'claimVictory',
        inputs: [
            { name: 'gameId', type: 'uint256' },
            { name: 'claimedScore', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'forfeitGame',
        inputs: [{ name: 'gameId', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
] as const;

// ============================================================================
// Game Status Constants (Mirrors Solidity)
// ============================================================================

export const GameStatus = {
    NONE: 0,
    WAITING_FOR_VRF: 1,
    ACTIVE: 2,
    COMPLETED: 3,
} as const;

export type GameStatusType = typeof GameStatus[keyof typeof GameStatus];

// ============================================================================
// Helper Types
// ============================================================================

export type OnChainPacket = {
    byteValue: number;
    packetType: number;
    value: number;
};
