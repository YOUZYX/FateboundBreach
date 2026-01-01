/**
 * Game Store - Zustand State Management
 * 
 * Central state for Fatebound Breach.
 * Connects UI to Core Logic (vrfMapper, turnResolver) and On-Chain contracts.
 */

import { create } from 'zustand';
import { createPublicClient, http, type WalletClient, keccak256, encodePacked } from 'viem';
import type {
    GameState,
    Packet,
    Assignment,
    Enemy,
    GameStatus,
    TurnResult,
    PacketType,
} from '../core/types/gameState';
import { derivePacketsFromSeed } from '../core/logic/vrfMapper';
import { generateLevelFromSeed } from '../core/logic/levelGenerator';
import { resolveTurn, checkTurnResult } from '../core/logic/turnResolver';
import { monadTestnet, FATEBOUND_ADDRESS, FATEBOUND_ABI } from '../contracts/config';
import { supabase } from '../services/supabase';

// ============================================================================
// Types
// ============================================================================

interface ByteMapping {
    byteIndex: number;
    hexValue: string;
    byteValue: number;
    packetId: string;
}

interface HistoryEntry {
    turn: number;
    action: string;
    timestamp: number;
}

interface DamageEvent {
    id: string;
    targetId: string;
    amount: number;
    type: 'damage' | 'heal' | 'shield' | 'miss';
    timestamp: number;
}

export interface ActionLog {
    turnNumber: number;
    seed: string;
    damageDealt: number;
    packetsUsed: number;
}

// On-chain state tracking
type OnChainStatus = 'IDLE' | 'REQUESTING_VRF' | 'WAITING_FOR_VRF' | 'READY' | 'ERROR';

interface GameStore {
    // === Core State ===
    gameState: GameState | null;
    currentLevelSeed: string | null;
    gameResult: TurnResult | null;

    // === On-Chain State ===
    onChainStatus: OnChainStatus;
    onChainGameId: bigint | null;
    onChainError: string | null;
    txHash: string | null;

    // === Packet Queue (The Hand) ===
    packetQueue: Packet[];
    byteMappings: ByteMapping[];

    // === UI State ===
    selectedPacketIds: string[]; // Changed from single ID to array
    hoveredPacketId: string | null;
    hoveredByteIndex: number | null;
    isAnimating: boolean;
    isExecuting: boolean;
    showTruthConsole: boolean;

    // === Animation Queue ===
    damageEvents: DamageEvent[];

    // === Assignments (Current Turn) ===
    pendingAssignments: Assignment[];

    // === History ===
    historyLog: HistoryEntry[];
    moveHistory: ActionLog[];

    // === Actions ===
    startGame: (seed: string) => void;
    initiateGameOnChain: (walletClient: WalletClient) => Promise<void>;
    checkActiveGame: (walletClient: WalletClient) => Promise<void>;
    forfeitGameOnChain: (walletClient: WalletClient) => Promise<void>;
    claimVictoryOnChain: (walletClient: WalletClient) => Promise<void>;
    watchGameEvents: (playerAddress: `0x${string}`) => void;
    selectPacket: (packetId: string | null, multiSelect?: boolean) => void;
    hoverPacket: (packetId: string | null) => void;
    hoverByte: (byteIndex: number | null) => void;
    assignPacket: (packetId: string, targetId: string) => boolean;
    unassignPacket: (packetId: string) => void;
    executeTurn: () => void;
    generateNewHand: () => void;
    setAnimating: (isAnimating: boolean) => void;
    toggleTruthConsole: () => void;
    resetGame: () => void;

    // === Validation ===
    isValidAssignment: (packetId: string, targetId: string) => boolean;
    getValidTargetsForPacket: (packetId: string) => string[];
}

// ============================================================================
// Public Client (Read-Only)
// ============================================================================

const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
});

// ============================================================================
// Validation Helpers
// ============================================================================

function canAssignPacketToTarget(
    packetType: PacketType,
    targetId: string,
    enemies: Enemy[]
): boolean {
    if (targetId === 'trash') return true;

    const isEnemy = enemies.some(e => e.id === targetId);
    const isPlayer = targetId === 'player';

    switch (packetType) {
        case 'ATTACK':
        case 'CRIT':
        case 'MISS':
            return isEnemy;
        case 'HEAL':
        case 'DEFEND':
            return isPlayer;
        default:
            return false;
    }
}

// ============================================================================
// Initial State Helpers
// ============================================================================


function updateEnemyIntents(enemies: Enemy[], turnCounter: number): Enemy[] {
    return enemies.map((enemy, index) => {
        const pattern = (turnCounter + index) % 3;
        let intent: Enemy['intent'] = 'ATTACK';

        if (pattern === 0) {
            intent = 'ATTACK';
        } else if (pattern === 1) {
            intent = enemy.type === 'sentinel' ? 'DEFEND' : 'ATTACK';
        } else {
            intent = 'IDLE';
        }

        return { ...enemy, intent };
    });
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useGameStore = create<GameStore>((set, get) => ({
    // === Initial State ===
    gameState: null,
    currentLevelSeed: null,
    gameResult: null,
    onChainStatus: 'IDLE',
    onChainGameId: null,
    onChainError: null,
    txHash: null,
    packetQueue: [],
    byteMappings: [],
    selectedPacketIds: [], // array
    hoveredPacketId: null,
    hoveredByteIndex: null,
    isAnimating: false,
    isExecuting: false,
    showTruthConsole: true,
    damageEvents: [],
    pendingAssignments: [],
    historyLog: [],
    moveHistory: [],

    // === On-Chain Actions ===

    /**
     * Checks if the user has an active game and resumes it
     */
    checkActiveGame: async (walletClient: WalletClient) => {
        try {
            const [address] = await walletClient.getAddresses();
            console.log('Checking for active game for:', address);

            const gameId = await publicClient.readContract({
                address: FATEBOUND_ADDRESS,
                abi: FATEBOUND_ABI,
                functionName: 'activeGameId',
                args: [address],
            }) as bigint;

            if (gameId > 0n) {
                const game = await publicClient.readContract({
                    address: FATEBOUND_ADDRESS,
                    abi: FATEBOUND_ABI,
                    functionName: 'getGame',
                    args: [gameId],
                }) as any;

                // Handle Viem return (Array or Object)
                const status = game.status !== undefined ? Number(game.status) : Number(game[4]);
                const seed = game.seed !== undefined ? game.seed : game[1];

                // Status 2 is ACTIVE, 1 is WAITING
                if (status === 2 || status === 1) {
                    console.log('🔄 Found existing active game:', gameId);

                    if (status === 2) {
                        // Game is ready to play
                        console.log('Resuming game with seed:', seed);
                        set({
                            onChainStatus: 'READY',
                            onChainGameId: gameId,
                        });
                        get().startGame(seed);
                    } else {
                        // Game is waiting for VRF
                        console.log('Game is waiting for VRF - starting watcher');
                        set({
                            onChainStatus: 'WAITING_FOR_VRF',
                            onChainGameId: gameId,
                        });
                        get().watchGameEvents(address);
                    }
                }
            }
        } catch (err) {
            console.error('Error checking active game:', err);
        }
    },

    /**
     * Forfeits the current on-chain game
     */
    forfeitGameOnChain: async (walletClient: WalletClient) => {
        let { onChainGameId } = get();
        const [address] = await walletClient.getAddresses();

        // If we don't know the ID, try to find it on-chain
        if (!onChainGameId) {
            try {
                console.log('Searching for active game ID to forfeit...');
                const gameId = await publicClient.readContract({
                    address: FATEBOUND_ADDRESS,
                    abi: FATEBOUND_ABI,
                    functionName: 'activeGameId',
                    args: [address],
                }) as bigint;

                if (gameId > 0n) {
                    onChainGameId = gameId;
                    console.log('Found active game ID for forfeit:', gameId);
                }
            } catch (e) {
                console.error('Could not fetch active game ID', e);
            }
        }

        if (!onChainGameId) {
            console.error('No game ID known to forfeit');
            set({ onChainError: 'Could not find active game to forfeit. Please try refreshing or check console.' });
            return;
        }

        try {
            set({ onChainStatus: 'REQUESTING_VRF' }); // Reuse loading state

            console.log('Forfeiting game:', onChainGameId);

            const hash = await walletClient.writeContract({
                address: FATEBOUND_ADDRESS,
                abi: FATEBOUND_ABI,
                functionName: 'forfeitGame',
                args: [onChainGameId],
                chain: monadTestnet,
                account: address,
            });

            console.log('Forfeit TX submitted:', hash);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log('Game forfeited successfully');

            set({
                onChainStatus: 'IDLE',
                onChainGameId: null,
                gameState: null,
                onChainError: null, // Clear error to remove Forfeit button
            });

            // Allow restart immediately
        } catch (error: any) {
            console.error('Failed to forfeit game:', error);
            set({
                onChainStatus: 'ERROR',
                onChainError: error.shortMessage || error.message || 'Failed to forfeit game',
            });
        }
    },

    /**
     * Claims victory for the current game
     */
    claimVictoryOnChain: async (walletClient: WalletClient) => {
        const { onChainGameId, gameState } = get();
        const [address] = await walletClient.getAddresses();

        if (!onChainGameId || !gameState) {
            console.error('No active game to claim victory for');
            return;
        }

        try {
            set({ onChainStatus: 'REQUESTING_VRF' }); // Reuse loading state (spinner)

            console.log('Claiming victory:', {
                gameId: onChainGameId,
                score: gameState.score,
            });

            const hash = await walletClient.writeContract({
                address: FATEBOUND_ADDRESS,
                abi: FATEBOUND_ABI,
                functionName: 'claimVictory',
                args: [onChainGameId, BigInt(gameState.score)],
                chain: monadTestnet,
                account: address,
            });

            console.log('Claim Victory TX submitted:', hash);
            set({ txHash: hash });

            await publicClient.waitForTransactionReceipt({ hash });
            console.log('Victory claimed successfully');

            // --- Update Supabase Leaderboard ---
            try {
                const { data: existing } = await supabase
                    .from('leaderboard')
                    .select('score')
                    .eq('operator', address)
                    .single();

                const currentScore = existing?.score || 0;
                const newTotal = Number(currentScore) + Number(gameState.score);

                const { error: upsertError } = await supabase
                    .from('leaderboard')
                    .upsert({
                        operator: address,
                        score: newTotal
                    }, { onConflict: 'operator' });

                if (upsertError) throw upsertError;
                console.log('✅ Leaderboard updated on Supabase:', newTotal);
            } catch (sbError) {
                console.error('Failed to update Supabase leaderboard:', sbError);
            }
            // -----------------------------------

            // UX: Reset local state immediately so player can start new run
            get().resetGame();

        } catch (error: any) {
            console.error('Failed to claim victory:', error);
            set({
                onChainStatus: 'ERROR',
                onChainError: error.shortMessage || error.message || 'Failed to claim victory',
            });
        }
    },

    /**
     * Initiate game on-chain using Pyth Entropy V2
     * @param walletClient - Viem wallet client from Privy
     */
    initiateGameOnChain: async (walletClient: WalletClient) => {
        // First check if we already have a game (resume instead of start)
        // Only if we are not explicitly starting fresh
        const { onChainStatus: currentStatus } = get();
        if (currentStatus === 'READY' || currentStatus === 'WAITING_FOR_VRF') {
            await get().checkActiveGame(walletClient);
            const { onChainStatus } = get();
            if (onChainStatus === 'READY' || onChainStatus === 'WAITING_FOR_VRF') {
                console.log('Skipping initiation, game already active/waiting');
                return;
            }
        }

        // 1. WIPE THE STATE CLEAN (Force Uniqueness)
        set({
            gameState: null,
            currentLevelSeed: null,
            gameResult: null,
            packetQueue: [],
            byteMappings: [],
            pendingAssignments: [],
            historyLog: [],
            moveHistory: [],
            damageEvents: [],
            onChainStatus: 'REQUESTING_VRF',
            onChainError: null,
            txHash: null,
            onChainGameId: null, // Critical: Forget old game
        });

        try {
            const [address] = await walletClient.getAddresses();
            console.log('Initiating game for:', address);

            // 2. Generate Highly Unique Input (User Randomness)
            // Even if the V2 contract doesn't accept args, we generate this to ensure
            // we are logically creating a new session hash on the client side.
            const uniqueInput = keccak256(
                encodePacked(
                    ['address', 'uint256', 'string'],
                    [address, BigInt(Date.now()), crypto.randomUUID()]
                )
            );
            console.log('Generated User Randomness (Session ID):', uniqueInput);

            // Get VRF fee from contract (uses Pyth Entropy V2 getFeeV2)
            const fee = await publicClient.readContract({
                address: FATEBOUND_ADDRESS,
                abi: FATEBOUND_ABI,
                functionName: 'getVRFFee',
            }) as bigint;

            console.log('VRF Fee:', fee, 'wei (', Number(fee) / 1e18, 'MON)');

            // Request game start on-chain
            // Note: The V2 contract in config.ts does not accept arguments for startGame.
            // We rely on the state wipe ensures the UI waits for the NEW event.
            const hash = await walletClient.writeContract({
                address: FATEBOUND_ADDRESS,
                abi: FATEBOUND_ABI,
                functionName: 'startGame',
                args: [],
                value: fee,
                chain: monadTestnet,
                account: address,
            });

            console.log('🎮 Game request TX submitted:', hash);

            set({
                txHash: hash,
                onChainStatus: 'WAITING_FOR_VRF',
                historyLog: [{
                    turn: 0,
                    action: `VRF requested. Session: ${uniqueInput.slice(0, 8)}...`,
                    timestamp: Date.now(),
                }],
            });

            // Wait for transaction confirmation
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log('✓ Transaction confirmed in block:', receipt.blockNumber);

            // Start watching for GameStarted event (callback from Pyth)
            get().watchGameEvents(address);

        } catch (error: any) {
            console.error('❌ On-chain game initiation failed:', error);

            const errorMessage = error.shortMessage || error.message || 'Failed to initiate game';
            set({
                onChainStatus: 'ERROR',
                onChainError: errorMessage,
            });
        }
    },

    /**
     * Watch for GameStarted event to get the seed
     */
    watchGameEvents: (playerAddress: `0x${string}`) => {
        console.log('👀 Watching for GameStarted events for:', playerAddress);
        let found = false;

        // 1. Setup Event Listener
        const unwatch = publicClient.watchContractEvent({
            address: FATEBOUND_ADDRESS,
            abi: FATEBOUND_ABI,
            eventName: 'GameStarted',
            args: { player: playerAddress },
            onLogs: (logs) => {
                if (found) return;
                console.log('🎉 GameStarted event received:', logs);

                for (const log of logs) {
                    const { gameId, seed } = log.args as { gameId: bigint; player: string; seed: `0x${string}` };
                    handleGameStart(gameId, seed);
                }
            },
        });

        // 2. Setup Polling Fallback (every 1 second)
        const pollInterval = setInterval(async () => {
            if (found) {
                clearInterval(pollInterval);
                return;
            }

            try {
                // Check for active game
                const gameId = await publicClient.readContract({
                    address: FATEBOUND_ADDRESS,
                    abi: FATEBOUND_ABI,
                    functionName: 'activeGameId',
                    args: [playerAddress],
                }) as bigint;

                if (gameId > 0n) {
                    const game = await publicClient.readContract({
                        address: FATEBOUND_ADDRESS,
                        abi: FATEBOUND_ABI,
                        functionName: 'getGame',
                        args: [gameId],
                    }) as any;

                    console.log('Polling raw game data:', game);

                    // Handle Viem return (Array or Object)
                    // Struct: player, seed, stateHash, currentTurn, status, result
                    const status = game.status !== undefined ? Number(game.status) : Number(game[4]);
                    const seed = game.seed !== undefined ? game.seed : game[1];

                    console.log(`Polling status for game ${gameId}: ${status}`);

                    // Status 2 is ACTIVE
                    if (status === 2 && !found) {
                        console.log('🔄 Polling found active game:', gameId);
                        handleGameStart(gameId, seed);
                    }
                }
            } catch (err) {
                // Ignore transient RPC errors
            }
        }, 1000);

        // Common handler
        const handleGameStart = (gameId: bigint, seed: string) => {
            if (found) return;
            found = true;
            console.log('✓ Game started with VRF seed:', seed);

            clearInterval(pollInterval);
            unwatch();

            set({
                onChainStatus: 'READY',
                onChainGameId: gameId,
            });

            get().startGame(seed);
        };

        // Timeout after 3 minutes
        setTimeout(() => {
            if (!found) {
                const { onChainStatus } = get();
                if (onChainStatus === 'WAITING_FOR_VRF') {
                    console.warn('⏱️ VRF callback timeout - seed not received');
                    set({
                        onChainStatus: 'ERROR',
                        onChainError: 'VRF callback timeout. Please try again or check console.',
                    });
                    clearInterval(pollInterval);
                    unwatch();
                }
            }
        }, 180000);
    },

    // === Game Actions ===

    startGame: (seed: string) => {
        // Generate Level (New Procedural Logic)
        const { enemies, player } = generateLevelFromSeed(seed);
        const { packets, anomaly, jackpotHit } = derivePacketsFromSeed(seed, 1);

        const byteMappings: ByteMapping[] = packets.map((packet, index) => ({
            byteIndex: index,
            hexValue: packet.hexValue,
            byteValue: packet.byteValue,
            packetId: packet.id,
        }));

        // Construct Initial State
        const gameState: GameState = {
            status: 'PLANNING',
            levelSeed: seed,
            turnCounter: 1,
            levelId: 1,
            grid: { width: 6, height: 6 },
            player,
            enemies,
            dataStream: packets,
            assignments: [],
            score: 0,
            anomaly,
            jackpotHit,
        };

        set({
            gameState,
            currentLevelSeed: seed,
            gameResult: null,
            packetQueue: packets,
            byteMappings,
            pendingAssignments: [],
            selectedPacketIds: [], // array
            hoveredPacketId: null,
            isAnimating: true,
            isExecuting: false,
            damageEvents: [],
            historyLog: [...get().historyLog, {
                turn: 1,
                action: `Game started with seed ${seed.slice(0, 10)}...`,
                timestamp: Date.now(),
            }],
        });

        setTimeout(() => {
            set({ isAnimating: false });
        }, 2000);
    },

    selectPacket: (packetId, multiSelect = false) => {
        const { selectedPacketIds, packetQueue } = get();

        if (packetId === null) {
            set({ selectedPacketIds: [] });
            return;
        }

        // Validate packet exists
        const packet = packetQueue.find(p => p.id === packetId);
        if (!packet) return;

        if (multiSelect) {
            // Toggle selection
            if (selectedPacketIds.includes(packetId)) {
                set({ selectedPacketIds: selectedPacketIds.filter(id => id !== packetId) });
            } else {
                set({ selectedPacketIds: [...selectedPacketIds, packetId] });
            }
        } else {
            // Single select (replace)
            set({ selectedPacketIds: [packetId] });
        }
    },

    hoverPacket: (packetId: string | null) => {
        set({ hoveredPacketId: packetId });
    },

    hoverByte: (byteIndex: number | null) => {
        const { byteMappings } = get();
        if (byteIndex === null) {
            set({ hoveredByteIndex: null, hoveredPacketId: null });
            return;
        }

        const mapping = byteMappings[byteIndex];
        set({
            hoveredByteIndex: byteIndex,
            hoveredPacketId: mapping?.packetId || null,
        });
    },

    isValidAssignment: (packetId: string, targetId: string): boolean => {
        const { packetQueue, gameState, pendingAssignments } = get();
        if (!gameState) return false;

        const packet = packetQueue.find(p => p.id === packetId);
        if (!packet) return false;

        if (pendingAssignments.some(a => a.packetId === packetId)) return false;

        if (targetId.startsWith('enemy-')) {
            const enemy = gameState.enemies.find(e => e.id === targetId);
            if (!enemy || enemy.hp <= 0) return false;
        }

        return canAssignPacketToTarget(packet.type, targetId, gameState.enemies);
    },

    getValidTargetsForPacket: (packetId: string): string[] => {
        const { packetQueue, gameState } = get();
        if (!gameState) return [];

        const packet = packetQueue.find(p => p.id === packetId);
        if (!packet) return [];

        const validTargets: string[] = ['trash'];

        switch (packet.type) {
            case 'ATTACK':
            case 'CRIT':
            case 'MISS':
                gameState.enemies
                    .filter(e => e.hp > 0)
                    .forEach(e => validTargets.push(e.id));
                break;
            case 'HEAL':
            case 'DEFEND':
                validTargets.push('player');
                break;
        }

        return validTargets;
    },

    assignPacket: (packetId, targetId) => {
        const { pendingAssignments, packetQueue, historyLog, gameState, isValidAssignment, selectedPacketIds } = get();

        // If assignment fails, return false
        if (!isValidAssignment(packetId, targetId)) {
            console.warn(`Invalid assignment: ${packetId} → ${targetId}`);
            return false;
        }

        const filtered = pendingAssignments.filter(a => a.packetId !== packetId);
        const newAssignment: Assignment = { packetId, targetId };
        const packet = packetQueue.find(p => p.id === packetId);

        set({
            pendingAssignments: [...filtered, newAssignment],
            // Remove from selection if it was selected, to avoid double-assignment confusion or stickiness
            selectedPacketIds: selectedPacketIds.filter(id => id !== packetId),
            historyLog: [...historyLog, {
                turn: gameState?.turnCounter || 1,
                action: `Assigned ${packet?.type} (${packet?.hexValue}) → ${targetId}`,
                timestamp: Date.now(),
            }],
        });

        return true;
    },

    unassignPacket: (packetId: string) => {
        const { pendingAssignments } = get();
        set({
            pendingAssignments: pendingAssignments.filter(a => a.packetId !== packetId),
        });
    },

    executeTurn: () => {
        const { gameState, pendingAssignments, historyLog, packetQueue, moveHistory } = get();
        if (!gameState) return;

        if (pendingAssignments.length !== gameState.dataStream.length) {
            console.warn('Not all packets assigned!');
            return;
        }

        set({ isExecuting: true });

        const damageEvents: DamageEvent[] = pendingAssignments.map((assignment, index) => {
            const packet = packetQueue.find(p => p.id === assignment.packetId);
            let type: DamageEvent['type'] = 'damage';
            if (packet?.type === 'HEAL') type = 'heal';
            else if (packet?.type === 'DEFEND') type = 'shield';
            else if (packet?.type === 'MISS') type = 'miss';

            return {
                id: `dmg-${index}`,
                targetId: assignment.targetId,
                amount: packet?.value || 0,
                type,
                timestamp: Date.now() + (index * 300),
            };
        });

        // Calculate total damage dealt this turn
        const totalDamage = damageEvents
            .filter(e => e.type === 'damage')
            .reduce((acc, curr) => acc + curr.amount, 0);

        set({ damageEvents });

        setTimeout(() => {
            try {
                const nextState = resolveTurn(gameState, pendingAssignments);
                const result = checkTurnResult(nextState);

                if (result === 'CONTINUE') {
                    nextState.enemies = updateEnemyIntents(
                        nextState.enemies,
                        nextState.turnCounter
                    );
                }

                set({
                    gameState: nextState,
                    gameResult: result,
                    pendingAssignments: [],
                    damageEvents: [],
                    historyLog: [...historyLog, {
                        turn: nextState.turnCounter - 1,
                        action: `Turn executed. Result: ${result}`,
                        timestamp: Date.now(),
                    }],
                    moveHistory: [...moveHistory, {
                        turnNumber: gameState.turnCounter,
                        seed: gameState.levelSeed,
                        damageDealt: totalDamage,
                        packetsUsed: pendingAssignments.length
                    }],
                });

                if (result === 'CONTINUE') {
                    setTimeout(() => {
                        set({ isExecuting: false });
                        get().generateNewHand();
                    }, 500);
                } else {
                    set({ isExecuting: false });
                }
            } catch (error) {
                console.error('Turn resolution failed:', error);
                set({ isExecuting: false, damageEvents: [] });
            }
        }, 1500);
    },

    generateNewHand: () => {
        const { gameState, currentLevelSeed, historyLog } = get();
        if (!gameState || !currentLevelSeed) return;

        const { packets, anomaly, jackpotHit } = derivePacketsFromSeed(currentLevelSeed, gameState.turnCounter);

        const byteMappings: ByteMapping[] = packets.map((packet, index) => ({
            byteIndex: index,
            hexValue: packet.hexValue,
            byteValue: packet.byteValue,
            packetId: packet.id,
        }));

        const updatedState = {
            ...gameState,
            dataStream: packets,
            anomaly,
            jackpotHit,
            status: 'PLANNING' as GameStatus,
        };

        set({
            gameState: updatedState,
            packetQueue: packets,
            byteMappings,
            isAnimating: true,
            gameResult: null,
            selectedPacketIds: [],
            hoveredPacketId: null,
            pendingAssignments: [],
            historyLog: [...historyLog, {
                turn: gameState.turnCounter,
                action: `New hand generated (${packets.length} packets)`,
                timestamp: Date.now(),
            }],
        });

        setTimeout(() => {
            set({ isAnimating: false });
        }, 1500);
    },

    setAnimating: (isAnimating: boolean) => {
        set({ isAnimating });
    },

    toggleTruthConsole: () => {
        set((state) => ({ showTruthConsole: !state.showTruthConsole }));
    },

    resetGame: () => {
        set({
            gameState: null,
            currentLevelSeed: null,
            gameResult: null,
            onChainStatus: 'IDLE',
            onChainGameId: null,
            onChainError: null,
            txHash: null,
            packetQueue: [],
            byteMappings: [],
            selectedPacketIds: [],
            hoveredPacketId: null,
            hoveredByteIndex: null,
            isAnimating: false,
            isExecuting: false,
            damageEvents: [],
            pendingAssignments: [],
            historyLog: [],
            moveHistory: [],
        });
    },

}));

// ============================================================================
// Selector Hooks (for performance)
// ============================================================================

export const usePacketQueue = () => useGameStore((s) => s.packetQueue);
export const useSelectedPacket = () => useGameStore((s) => s.selectedPacketIds);
export const useHoveredPacket = () => useGameStore((s) => s.hoveredPacketId);
export const useByteMappings = () => useGameStore((s) => s.byteMappings);
export const useIsAnimating = () => useGameStore((s) => s.isAnimating);
export const useIsExecuting = () => useGameStore((s) => s.isExecuting);
export const usePendingAssignments = () => useGameStore((s) => s.pendingAssignments);
export const useGameResult = () => useGameStore((s) => s.gameResult);
export const useDamageEvents = () => useGameStore((s) => s.damageEvents);
export const useOnChainStatus = () => useGameStore((s) => s.onChainStatus);
export const useOnChainError = () => useGameStore((s) => s.onChainError);
export const useTxHash = () => useGameStore((s) => s.txHash);
