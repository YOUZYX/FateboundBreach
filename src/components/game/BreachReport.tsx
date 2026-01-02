import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { keccak256, stringToBytes } from 'viem';
import { RotateCcw, CheckCircle, XCircle, Terminal, WifiOff, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState, useCallback } from 'react';

interface BreachReportProps {
    onReset: () => void;
    onClaimVictory?: () => void;
    walletAddress?: string;
}

export function BreachReport({ onReset, onClaimVictory, walletAddress }: BreachReportProps) {
    const gameResult = useGameStore((s) => s.gameResult);
    const gameState = useGameStore((s) => s.gameState);
    const currentSeed = useGameStore((s) => s.currentLevelSeed);
    const moveHistory = useGameStore((s) => s.moveHistory);

    const [proofHash, setProofHash] = useState<string>('');
    const [isClaiming, setIsClaiming] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (gameResult && currentSeed) {
            // Generate a deterministic proof hash based on seed and history
            const data = `${currentSeed}-${JSON.stringify(moveHistory)}`;
            const hash = keccak256(stringToBytes(data));
            setProofHash(hash);
        }
    }, [gameResult, currentSeed, moveHistory]);

    if (!gameState || (gameResult !== 'VICTORY' && gameResult !== 'DEFEAT')) return null;

    const isVictory = gameResult === 'VICTORY';

    const handleClaim = async () => {
        if (onClaimVictory) {
            setIsClaiming(true);
            try {
                await onClaimVictory();
            } finally {
                setIsClaiming(false);
            }
        }
    };

    const handleCopyWallet = useCallback(async () => {
        if (walletAddress) {
            try {
                await navigator.clipboard.writeText(walletAddress);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy wallet address:', err);
            }
        }
    }, [walletAddress]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={cn(
                    "w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border-2 shadow-2xl font-mono",
                    isVictory
                        ? "bg-zinc-900 border-green-500/50 shadow-green-500/10"
                        : "bg-zinc-900 border-red-500/50 shadow-red-500/10"
                )}
            >
                {/* Scrollable Content Container */}
                <div className="p-4 md:p-6">
                    {/* ... Header & Receipt Content same ... */}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-6 border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                            {isVictory ? (
                                <div className="p-2 bg-green-500/10 rounded-full">
                                    <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
                                </div>
                            ) : (
                                <div className="p-2 bg-red-500/10 rounded-full">
                                    <XCircle className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
                                </div>
                            )}
                            <div>
                                <h2 className={cn(
                                    "text-lg md:text-xl font-bold tracking-wider",
                                    isVictory ? "text-green-400" : "text-red-500"
                                )}>
                                    {isVictory ? "BREACH SUCCESSFUL" : "CONNECTION LOST"}
                                </h2>
                                <p className="text-zinc-500 text-xs">
                                    {isVictory ? "PAYLOAD DELIVERED" : "SIGNAL INTERRUPTED"}
                                </p>
                            </div>
                        </div>
                        <Terminal className="w-5 h-5 md:w-6 md:h-6 text-zinc-700" />
                    </div>

                    {/* Receipt Content */}
                    <div className="space-y-4 mb-8 bg-black/50 p-4 rounded border border-zinc-800 font-mono text-sm">
                        <div className="flex justify-between items-center text-zinc-400">
                            <span>SESSION ID:</span>
                            <span className="text-zinc-500">#{gameState.turnCounter}-{Math.floor(Math.random() * 9999)}</span>
                        </div>

                        <div className="flex justify-between items-center text-zinc-400">
                            <span>SCORE:</span>
                            <span className="text-yellow-400 font-bold">{gameState.score}</span>
                        </div>

                        <div className="flex justify-between items-center text-zinc-400">
                            <span>LEVEL SEED:</span>
                            <span className="text-cyan-400">{currentSeed?.slice(0, 8)}...{currentSeed?.slice(-6)}</span>
                        </div>

                        <div className="flex justify-between items-center text-zinc-400">
                            <span>DATA PACKETS:</span>
                            <span className="text-white">{moveHistory.length * 5}</span>
                        </div>

                        <div className="h-px bg-zinc-800 my-2" />

                        <div className="space-y-1">
                            <span className="text-zinc-500 text-xs block mb-1">CRYPTOGRAPHIC PROOF</span>
                            <div className="h-16 overflow-y-auto text-[10px] text-zinc-600 break-all bg-zinc-950 p-2 rounded border border-zinc-900 select-all font-mono scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700">
                                {proofHash || "GENERATING..."}
                            </div>
                        </div>
                    </div>

                    {/* Copy Wallet Address Section */}
                    {walletAddress && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between bg-black/50 p-3 rounded border border-zinc-800">
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 text-xs mb-1">OPERATOR WALLET</span>
                                    <span className="text-cyan-400 font-mono text-xs md:text-sm">
                                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                    </span>
                                </div>
                                <motion.button
                                    onClick={handleCopyWallet}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs transition-all border",
                                        isCopied
                                            ? "bg-green-500/20 border-green-500/50 text-green-400"
                                            : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                    )}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isCopied ? (
                                        <>
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            >
                                                <Check className="w-4 h-4" />
                                            </motion.div>
                                            <span>COPIED!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>COPY</span>
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3 mb-4">
                        {isVictory && onClaimVictory && (
                            <button
                                onClick={handleClaim}
                                disabled={isClaiming}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-lg font-bold transition-all border bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                            >
                                {isClaiming ? "VERIFYING..." : "CLAIM GLORY"}
                            </button>
                        )}

                        <button
                            onClick={onReset}
                            disabled={isClaiming}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-lg font-bold transition-all border text-sm md:text-base",
                                isVictory
                                    ? "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                                    : "bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20"
                            )}
                        >
                            {isVictory ? (
                                <>
                                    <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                                    NEW MISSION
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4 md:w-5 md:h-5" />
                                    RECONNECT SIGNAL
                                </>
                            )}
                        </button>
                    </div>
                </div>{/* End Scrollable Content Container */}
            </motion.div>
        </div>
    );
}
