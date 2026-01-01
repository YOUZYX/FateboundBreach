import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { keccak256, stringToBytes } from 'viem';
import { RotateCcw, CheckCircle, XCircle, Terminal, WifiOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';

interface BreachReportProps {
    onReset: () => void;
    onClaimVictory?: () => void;
}

export function BreachReport({ onReset, onClaimVictory }: BreachReportProps) {
    const gameResult = useGameStore((s) => s.gameResult);
    const gameState = useGameStore((s) => s.gameState);
    const currentSeed = useGameStore((s) => s.currentLevelSeed);
    const moveHistory = useGameStore((s) => s.moveHistory);

    const [proofHash, setProofHash] = useState<string>('');
    const [isClaiming, setIsClaiming] = useState(false);

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={cn(
                    "w-full max-w-lg p-6 rounded-lg border-2 shadow-2xl font-mono",
                    isVictory
                        ? "bg-zinc-900/90 border-green-500/50 shadow-green-500/10"
                        : "bg-zinc-900/90 border-red-500/50 shadow-red-500/10"
                )}
            >
                {/* ... Header & Receipt Content same ... */}

                {/* Header */}
                <div className="flex items-start justify-between mb-6 border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                        {isVictory ? (
                            <div className="p-2 bg-green-500/10 rounded-full">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                        ) : (
                            <div className="p-2 bg-red-500/10 rounded-full">
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                        )}
                        <div>
                            <h2 className={cn(
                                "text-xl font-bold tracking-wider",
                                isVictory ? "text-green-400" : "text-red-500"
                            )}>
                                {isVictory ? "BREACH SUCCESSFUL" : "CONNECTION LOST"}
                            </h2>
                            <p className="text-zinc-500 text-xs">
                                {isVictory ? "PAYLOAD DELIVERED" : "SIGNAL INTERRUPTED"}
                            </p>
                        </div>
                    </div>
                    <Terminal className="w-6 h-6 text-zinc-700" />
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
                        <div className="text-[10px] sm:text-xs text-zinc-600 break-all bg-zinc-950 p-2 rounded border border-zinc-900 select-all font-mono">
                            {proofHash || "GENERATING..."}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {isVictory && onClaimVictory && (
                        <button
                            onClick={handleClaim}
                            disabled={isClaiming}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-bold transition-all border bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isClaiming ? "VERIFYING..." : "CLAIM GLORY"}
                        </button>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={onReset}
                            disabled={isClaiming}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-bold transition-all border",
                                isVictory
                                    ? "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                                    : "bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20"
                            )}
                        >
                            {isVictory ? (
                                <>
                                    <RotateCcw className="w-5 h-5" />
                                    NEW MISSION
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-5 h-5" />
                                    RECONNECT SIGNAL
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
