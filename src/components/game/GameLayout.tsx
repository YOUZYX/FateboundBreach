/**
 * Game Layout Component
 * 
 * Main layout assembling all game components.
 * Integrates with Privy for wallet authentication.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom } from 'viem';
import { TruthConsole } from '../ui/TruthConsole';
import { DataStream } from './DataStream';
import { GameBoard } from './GameBoard';
import { BreachReport } from './BreachReport';
import { DisconnectModal } from '../ui/DisconnectModal';
import { HowToPlay } from '../ui/HowToPlay'; // New
import { Leaderboard } from '../ui/Leaderboard'; // New
import {
    useGameStore,
    usePendingAssignments,
    useIsExecuting,
    useGameResult,
    useOnChainStatus,
    useOnChainError,
    useTxHash,
} from '../../store/gameStore';
import { Play, RotateCcw, Zap, Loader2, Wallet, ExternalLink, TriangleAlert, Database, Gem, HelpCircle, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';
import { monadTestnet } from '../../contracts/config';

export function GameLayout() {
    const { authenticated, login, logout, user } = usePrivy();
    const { wallets } = useWallets();
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [showHowToPlay, setShowHowToPlay] = useState(false); // New
    const [showLeaderboard, setShowLeaderboard] = useState(false); // New

    const gameState = useGameStore((s) => s.gameState);
    const packetQueue = useGameStore((s) => s.packetQueue);
    const executeTurn = useGameStore((s) => s.executeTurn);
    const resetGame = useGameStore((s) => s.resetGame);
    const initiateGameOnChain = useGameStore((s) => s.initiateGameOnChain);
    const checkActiveGame = useGameStore((s) => s.checkActiveGame); // Added
    const forfeitGameOnChain = useGameStore((s) => s.forfeitGameOnChain); // Added
    const claimVictoryOnChain = useGameStore((s) => s.claimVictoryOnChain);

    const pendingAssignments = usePendingAssignments();
    const isExecuting = useIsExecuting();
    const gameResult = useGameResult();
    const onChainStatus = useOnChainStatus();
    const onChainError = useOnChainError();
    const txHash = useTxHash();

    // Auto-resume active game on auth
    useEffect(() => {
        const check = async () => {
            if (authenticated && wallets.length > 0) {
                const wallet = wallets[0];
                const provider = await wallet.getEthereumProvider();
                const walletClient = createWalletClient({
                    account: wallet.address as `0x${string}`,
                    chain: monadTestnet,
                    transport: custom(provider),
                });

                checkActiveGame(walletClient);
            }
        };
        check();
    }, [authenticated, wallets, checkActiveGame]);

    const allPacketsAssigned = packetQueue.length > 0 &&
        pendingAssignments.length === packetQueue.length;

    const canExecute = allPacketsAssigned && !isExecuting && gameResult === null;

    const handleInitiateBreach = async () => {
        if (!authenticated || wallets.length === 0) {
            console.error('No wallet connected');
            return;
        }

        const wallet = wallets[0];

        try {
            // Switch to Monad Testnet if needed
            await wallet.switchChain(monadTestnet.id);

            // Get the provider
            const provider = await wallet.getEthereumProvider();

            // Create Viem wallet client
            const walletClient = createWalletClient({
                chain: monadTestnet,
                transport: custom(provider),
            });

            // Initiate game on-chain
            await initiateGameOnChain(walletClient);
        } catch (error) {
            console.error('Failed to initiate breach:', error);
        }
    };

    const handleForfeit = async () => {
        if (!authenticated || wallets.length === 0) return;
        const wallet = wallets[0];
        try {
            const provider = await wallet.getEthereumProvider();
            const walletClient = createWalletClient({
                account: wallet.address as `0x${string}`,
                chain: monadTestnet,
                transport: custom(provider),
            });
            await forfeitGameOnChain(walletClient);
        } catch (error) {
            console.error('Failed to forfeit:', error);
        }
    };

    const showForfeitOption = onChainError?.includes('forfeit existing game') || false;

    return (
        <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30">
            {/* Header */}
            <header className="border-b border-zinc-800 px-4 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-cyan-400" />
                        <h1 className="text-lg font-bold tracking-wider">
                            <span className="text-cyan-400">FATEBOUND</span>
                            <span className="text-zinc-400"> BREACH</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {gameState && (
                            <>
                                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs font-mono">
                                    <span className="text-zinc-500">
                                        TURN: <span className="text-cyan-400">{gameState.turnCounter}</span>
                                    </span>
                                    <span className="text-center text-zinc-500 px-2 border-l border-zinc-800">
                                        LEVEL: <span className="text-cyan-400">{gameState.levelId}</span>
                                    </span>
                                    {isExecuting && (
                                        <span className="flex items-center gap-1 text-yellow-400 border-l border-zinc-800 pl-2">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span className="hidden md:inline">EXECUTING</span>
                                        </span>
                                    )}
                                </div>
                                {/* System Status Indicator */}
                                {gameState.anomaly !== 'STABLE' && (
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1 rounded border text-xs font-bold animate-pulse",
                                        gameState.anomaly === 'ION_STORM' ? "bg-red-500/10 border-red-500/50 text-red-500" :
                                            gameState.anomaly === 'DATA_LEAK' ? "bg-green-500/10 border-green-500/50 text-green-500" :
                                                "bg-orange-500/10 border-orange-500/50 text-orange-500"
                                    )}>
                                        {gameState.anomaly === 'ION_STORM' && <TriangleAlert className="w-3 h-3" />}
                                        {gameState.anomaly === 'DATA_LEAK' && <Database className="w-3 h-3" />}
                                        {gameState.anomaly === 'OVERCLOCK' && <Zap className="w-3 h-3" />}
                                        <span>
                                            {gameState.anomaly === 'ION_STORM' && "WARNING: ION STORM (-5 HP)"}
                                            {gameState.anomaly === 'DATA_LEAK' && "LEAK DETECTED (+5 HP)"}
                                            {gameState.anomaly === 'OVERCLOCK' && "SYS OVERCLOCK (+5 DMG)"}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Meta Controls */}
                        <div className="flex items-center gap-2 mr-2">
                            <button
                                onClick={() => setShowHowToPlay(true)}
                                className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700 transition-colors"
                                title="How to Play"
                            >
                                <HelpCircle className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowLeaderboard(true)}
                                className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-700 transition-colors"
                                title="Leaderboard"
                            >
                                <Trophy className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Wallet Connection Status */}
                        {authenticated ? (
                            <button
                                onClick={() => setShowDisconnectModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                            >
                                <Wallet className="w-3 h-3 text-green-400" />
                                {user?.wallet?.address?.slice(0, 6)}...{user?.wallet?.address?.slice(-4)}
                            </button>
                        ) : (
                            <button
                                onClick={login}
                                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/50 rounded text-xs font-mono text-cyan-400 hover:bg-cyan-500/30 transition-all"
                            >
                                <Wallet className="w-3 h-3" />
                                CONNECT
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Truth Console */}
            <TruthConsole />

            {/* Jackpot Banner */}
            <AnimatePresence>
                {gameState?.jackpotHit && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-pink-500/20 border-b border-pink-500/50 overflow-hidden"
                    >
                        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-pink-400 font-bold font-mono text-sm tracking-wider animate-pulse">
                            <Gem className="w-4 h-4" />
                            CRITICAL DATA MINE DISCOVERED! EXECUTE TO EXTRACT +5000 CREDITS
                            <Gem className="w-4 h-4" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 p-2 md:p-6 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-center gap-4 lg:gap-8">
                    {!gameState ? (
                        <StartScreen
                            authenticated={authenticated}
                            onLogin={login}
                            onInitiateBreach={handleInitiateBreach}
                            onForfeit={handleForfeit}
                            showForfeit={showForfeitOption}
                            onChainStatus={onChainStatus}
                            onChainError={onChainError}
                            txHash={txHash}
                        />
                    ) : (
                        <>
                            {/* Left Column: Game Grid */}
                            <div className="w-full lg:flex-1 flex justify-center">
                                <GameBoard />
                            </div>

                            {/* Right Column: Console & Controls */}
                            <div className="w-full lg:w-[480px] flex flex-col gap-4">
                                <DataStream />

                                {/* Action Buttons */}
                                <AnimatePresence mode="wait">
                                    {gameResult === null && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="grid grid-cols-2 gap-3"
                                        >
                                            <motion.button
                                                onClick={executeTurn}
                                                disabled={!canExecute}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-mono text-sm transition-all",
                                                    canExecute
                                                        ? "bg-cyan-500 text-zinc-900 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                                                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                )}
                                                whileHover={canExecute ? { scale: 1.02 } : {}}
                                                whileTap={canExecute ? { scale: 0.98 } : {}}
                                            >
                                                {isExecuting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Processing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4" />
                                                        <span>EXECUTE</span>
                                                    </>
                                                )}
                                            </motion.button>

                                            <motion.button
                                                onClick={resetGame}
                                                disabled={isExecuting}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-mono text-sm border transition-all",
                                                    isExecuting
                                                        ? "border-zinc-800 text-zinc-600 cursor-not-allowed"
                                                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                                )}
                                                whileHover={!isExecuting ? { scale: 1.02 } : {}}
                                                whileTap={!isExecuting ? { scale: 0.98 } : {}}
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                <span>ABORT</span>
                                            </motion.button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Progress Indicator */}
                            {!isExecuting && gameResult === null && (
                                <div className="flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                                        <span>PACKETS ROUTED:</span>
                                        <span className={cn(
                                            allPacketsAssigned ? "text-green-400" : "text-yellow-400"
                                        )}>
                                            {pendingAssignments.length}/{packetQueue.length}
                                        </span>
                                        {allPacketsAssigned && (
                                            <span className="text-green-400 ml-2">✓ READY</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <BreachReport
                    onClaimVictory={async () => {
                        if (authenticated && wallets.length > 0) {
                            try {
                                const wallet = wallets[0];
                                const provider = await wallet.getEthereumProvider();
                                const walletClient = createWalletClient({
                                    account: wallet.address as `0x${string}`,
                                    chain: monadTestnet,
                                    transport: custom(provider),
                                });
                                await claimVictoryOnChain(walletClient);
                            } catch (e) {
                                console.error('Error claiming victory:', e);
                            }
                        }
                    }}
                    onReset={async () => {
                        if (authenticated && wallets.length > 0) {
                            try {
                                const wallet = wallets[0];
                                const provider = await wallet.getEthereumProvider();
                                const walletClient = createWalletClient({
                                    account: wallet.address as `0x${string}`,
                                    chain: monadTestnet,
                                    transport: custom(provider),
                                });
                                // We use forfeit to "complete" the game on-chain for now, 
                                // as we are not submitting full turn proofs yet.
                                // This clears the activeGameId so a new game can start.
                                await forfeitGameOnChain(walletClient);
                            } catch (e) {
                                console.error('Error ending game on-chain:', e);
                            }
                        }
                        resetGame();
                    }}
                />
                <DisconnectModal
                    isOpen={showDisconnectModal}
                    onClose={() => setShowDisconnectModal(false)}
                    onConfirm={async () => {
                        await logout();
                        resetGame();
                        setShowDisconnectModal(false);
                    }}
                />
                <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
                <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-800 px-4 py-2">
                <div className="max-w-6xl mx-auto flex items-center justify-between text-xs font-mono text-zinc-600">
                    <span>MISSION X</span>
                    <span>VERIFIABLY FAIR • PYTH VRF • MONAD TESTNET</span>
                </div>
            </footer>
        </div>
    );
}

// ============================================================================
// Start Screen Sub-component
// ============================================================================

interface StartScreenProps {
    authenticated: boolean;
    onLogin: () => void;
    onInitiateBreach: () => void;
    onForfeit: () => void; // New
    showForfeit: boolean; // New
    onChainStatus: string;
    onChainError: string | null;
    txHash: string | null;
}

function StartScreen({
    authenticated,
    onLogin,
    onInitiateBreach,
    onForfeit,
    showForfeit,
    onChainStatus,
    onChainError,
    txHash,
}: StartScreenProps) {
    const isLoading = onChainStatus === 'REQUESTING_VRF' || onChainStatus === 'WAITING_FOR_VRF';

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            {/* Logo Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
            >
                <div className="flex items-center justify-center gap-3">
                    <Zap className="w-12 h-12 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold tracking-widest">
                    <span className="text-cyan-400">FATEBOUND</span>
                    <span className="text-zinc-400"> BREACH</span>
                </h2>
                <p className="text-zinc-500 font-mono text-sm max-w-md">
                    A verifiably fair tactical puzzle game where randomness determines your resources,
                    but skill determines victory.
                </p>
            </motion.div>

            {/* Start Button or Forfeit Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-4"
            >
                {!authenticated ? (
                    // Connect Wallet Button
                    <button
                        onClick={onLogin}
                        className="relative group"
                    >
                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-xl group-hover:bg-cyan-500/30 transition-all" />
                        <div className="relative flex items-center gap-3 px-8 py-4 bg-zinc-900 border-2 border-cyan-500/50 rounded-xl text-cyan-400 font-mono hover:border-cyan-400 transition-all">
                            <Wallet className="w-5 h-5" />
                            CONNECT WALLET
                        </div>
                    </button>
                ) : showForfeit ? (
                    // Forfeit Button
                    <button
                        onClick={onForfeit}
                        disabled={isLoading}
                        className="relative group"
                    >
                        <div className={cn(
                            "absolute inset-0 blur-xl rounded-xl transition-all",
                            isLoading ? "bg-red-500/20" : "bg-red-500/20 group-hover:bg-red-500/30"
                        )} />
                        <div className={cn(
                            "relative flex items-center gap-3 px-8 py-4 bg-zinc-900 border-2 rounded-xl font-mono transition-all",
                            isLoading
                                ? "border-red-500/50 text-red-400"
                                : "border-red-500/50 text-red-400 hover:border-red-400"
                        )}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    FORFEITING...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-5 h-5" />
                                    FORFEIT & RESTART
                                </>
                            )}
                        </div>
                    </button>
                ) : (
                    // Initiate Breach Button
                    <button
                        onClick={onInitiateBreach}
                        disabled={isLoading}
                        className="relative group"
                    >
                        <div className={cn(
                            "absolute inset-0 blur-xl rounded-xl transition-all",
                            isLoading ? "bg-yellow-500/20" : "bg-cyan-500/20 group-hover:bg-cyan-500/30"
                        )} />
                        <div className={cn(
                            "relative flex items-center gap-3 px-8 py-4 bg-zinc-900 border-2 rounded-xl font-mono transition-all",
                            isLoading
                                ? "border-yellow-500/50 text-yellow-400"
                                : "border-cyan-500/50 text-cyan-400 hover:border-cyan-400"
                        )}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {onChainStatus === 'REQUESTING_VRF' ? 'REQUESTING VRF...' : 'WAITING FOR SEED...'}
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    INITIATE BREACH
                                </>
                            )}
                        </div>
                    </button>
                )}

                {/* Status Messages */}
                {onChainStatus === 'WAITING_FOR_VRF' && txHash && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-xs font-mono text-zinc-500"
                    >
                        <span>TX:</span>
                        <a
                            href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline flex items-center gap-1"
                        >
                            {txHash.slice(0, 10)}...{txHash.slice(-8)}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </motion.div>
                )}

                {onChainError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs font-mono text-red-400 text-center max-w-md bg-red-900/10 border border-red-500/20 p-2 rounded"
                    >
                        {showForfeit ? (
                            <span>⚠️ Active game found. Please forfeit to start a new one.</span>
                        ) : (
                            <span>⚠️ {onChainError}</span>
                        )}
                    </motion.div>
                )}
            </motion.div>

            {/* Info */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-6 text-xs font-mono text-zinc-600"
            >
                <span>PYTH VRF</span>
                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                <span>100% DETERMINISTIC</span>
                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                <span>MONAD TESTNET</span>
            </motion.div>

            {/* How to Play */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="max-w-lg text-center space-y-3"
            >
                <h3 className="text-sm font-mono text-zinc-400">HOW TO PLAY</h3>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono text-zinc-500">
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                        <div className="text-cyan-400 mb-1">1. OBSERVE</div>
                        <div>Your hand is derived from the VRF hash</div>
                    </div>
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                        <div className="text-cyan-400 mb-1">2. ASSIGN</div>
                        <div>Route each packet to a valid target</div>
                    </div>
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                        <div className="text-cyan-400 mb-1">3. EXECUTE</div>
                        <div>Deterministic resolution reveals outcome</div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
