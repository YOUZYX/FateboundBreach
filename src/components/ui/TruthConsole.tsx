/**
 * Truth Console - The "Aha!" Moment Component
 * 
 * Displays the raw VRF seed and visualizes how each byte
 * maps to a game packet. This proves "The Cards ARE the Hash."
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, useByteMappings } from '../../store/gameStore';
import { cn } from '../../lib/utils';
import { Eye, EyeOff, ChevronDown, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { VerifierModal } from './VerifierModal';
import { deriveTurnSeed } from '../../core/logic/vrfMapper';

export function TruthConsole() {
    const currentLevelSeed = useGameStore((s) => s.currentLevelSeed);
    const gameState = useGameStore((s) => s.gameState);
    const showTruthConsole = useGameStore((s) => s.showTruthConsole);
    const hoveredByteIndex = useGameStore((s) => s.hoveredByteIndex);
    const hoveredPacketId = useGameStore((s) => s.hoveredPacketId);
    const isAnimating = useGameStore((s) => s.isAnimating);
    const toggleTruthConsole = useGameStore((s) => s.toggleTruthConsole);
    const hoverByte = useGameStore((s) => s.hoverByte);
    const byteMappings = useByteMappings();

    // ALL HOOKS MUST BE BEFORE ANY EARLY RETURN
    const [isVerifierOpen, setIsVerifierOpen] = useState(false);

    if (!currentLevelSeed) return null;

    // Use DERIVED Turn Seed for display to match bytes to cards
    // This makes the highlighting actually correct (1st byte = 1st card)
    const turnSeed = gameState
        ? deriveTurnSeed(currentLevelSeed, gameState.turnCounter)
        : currentLevelSeed;

    // Split seed into displayable bytes
    const seedHex = turnSeed.slice(2); // Remove 0x prefix
    const byteChunks: string[] = [];
    for (let i = 0; i < seedHex.length; i += 2) {
        byteChunks.push(seedHex.slice(i, i + 2).toUpperCase());
    }

    return (
        <div className="w-full bg-zinc-900/80 backdrop-blur-sm border-b border-cyan-500/30">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2">
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={toggleTruthConsole}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            LINKED TO MONAD TESTNET
                        </span>
                    </div>
                    <span className="text-zinc-600">|</span>
                    <span className="text-xs font-mono text-cyan-400 group-hover:text-cyan-300 transition-colors">
                        TRUTH CONSOLE
                    </span>
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 text-zinc-500 transition-transform duration-300",
                            showTruthConsole && "rotate-180"
                        )}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsVerifierOpen(true)}
                        className="px-2 py-1 flex items-center gap-1.5 rounded bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-green-500/50 transition-all group"
                    >
                        <CheckCircle className="w-3.5 h-3.5 text-zinc-500 group-hover:text-green-400" />
                        <span className="text-[10px] font-mono text-zinc-500 group-hover:text-green-400">
                            VERIFY
                        </span>
                    </button>
                    <div
                        onClick={toggleTruthConsole}
                        className="p-1 cursor-pointer hover:bg-zinc-800 rounded"
                    >
                        {showTruthConsole ? (
                            <Eye className="w-4 h-4 text-cyan-400" />
                        ) : (
                            <EyeOff className="w-4 h-4 text-zinc-500" />
                        )}
                    </div>
                </div>
            </div>

            <VerifierModal
                isOpen={isVerifierOpen}
                onClose={() => setIsVerifierOpen(false)}
                currentSeed={currentLevelSeed}
            />

            {/* Expandable Content */}
            <AnimatePresence>
                {showTruthConsole && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4">
                            {/* Source Hash Display - FULL HASH */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-zinc-500 uppercase tracking-wider">
                                            DERIVED TURN {gameState?.turnCounter || 1} HASH
                                        </span>
                                        <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[200px] md:max-w-none">
                                            Keccak256(LevelSeed + "Turn{gameState?.turnCounter}")
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-cyan-400/60">
                                        {byteMappings.length} BYTES → {byteMappings.length} CARDS
                                    </span>
                                </div>

                                {/* Full Hash Display with Active Byte Highlighting */}
                                <div className="p-4 bg-zinc-950 rounded-lg border border-cyan-500/20 overflow-x-auto">
                                    <div className="mt-2 text-[10px] font-mono flex flex-wrap items-center gap-4 border-t border-zinc-800 pt-2">
                                        <div><span className="text-cyan-400 font-bold">CYAN</span> = TYPE</div>
                                        <div><span className="text-purple-400 font-bold">PURPLE</span> = RARE</div>
                                        <div><span className="text-yellow-400 font-bold">GOLD</span> = LEGENDARY</div>
                                        <div><span className="text-red-500 font-bold">RED</span> = ANOMALY</div>
                                        <div><span className="text-pink-500 font-bold">PINK</span> = JACKPOT</div>
                                    </div>
                                    <div className="flex flex-wrap gap-0.5 font-mono text-sm leading-relaxed">
                                        <span className="text-cyan-500 font-bold">0x</span>
                                        {byteChunks.map((byte, index) => {
                                            const packetIndex = Math.floor(index / 2);
                                            const isActiveCard = packetIndex < byteMappings.length;
                                            const mapping = byteMappings[packetIndex];
                                            const isHovered = hoveredByteIndex === packetIndex ||
                                                (hoveredPacketId && mapping?.packetId === hoveredPacketId);

                                            const isRarityByte = index % 2 === 1;
                                            const byteVal = parseInt(byte, 16);

                                            // Determine color class
                                            let colorClass = "text-zinc-600"; // Default inactive

                                            // Special System Bytes (Priority)
                                            if (index === 12) {
                                                colorClass = "text-red-500 font-bold animate-pulse"; // Anomaly
                                            } else if (index === 31) {
                                                colorClass = "text-pink-500 font-bold animate-pulse"; // Jackpot
                                            } else if (isActiveCard) {
                                                if (isHovered) {
                                                    colorClass = "bg-cyan-400 text-zinc-900 font-bold scale-110 shadow-[0_0_15px_rgba(0,255,255,0.6)]";
                                                } else if (!isRarityByte) {
                                                    // Type Byte (Even)
                                                    colorClass = "text-cyan-300 font-bold";
                                                } else {
                                                    // Rarity Byte (Odd)
                                                    if (byteVal > 240) colorClass = "text-yellow-400 font-bold"; // Legendary
                                                    else if (byteVal > 200) colorClass = "text-purple-400 font-bold"; // Rare
                                                    else colorClass = "text-zinc-400"; // Common
                                                }
                                            }

                                            return (
                                                <motion.span
                                                    key={index}
                                                    onMouseEnter={() => isActiveCard && hoverByte(packetIndex)}
                                                    onMouseLeave={() => hoverByte(null)}
                                                    className={cn(
                                                        "px-0.5 py-0.5 rounded transition-all",
                                                        colorClass,
                                                        isActiveCard && !isHovered && "cursor-pointer hover:bg-zinc-800",
                                                        index >= 16 && "hidden md:inline-block"
                                                    )}
                                                    animate={isHovered ? { scale: 1.15 } : { scale: 1 }}
                                                >
                                                    {byte}
                                                </motion.span>
                                            );
                                        })}
                                    </div>
                                    {/* Legend */}
                                    {/* Legend removed (moved to top) */}
                                </div>
                            </div>

                            {/* Proof Text */}
                            <AnimatePresence>
                                {hoveredByteIndex !== null && byteMappings[hoveredByteIndex] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="p-3 bg-zinc-950/50 rounded-lg border border-cyan-500/20"
                                    >
                                        <ProofExplanation
                                            byteValue={byteMappings[hoveredByteIndex].byteValue}
                                            hexValue={byteMappings[hoveredByteIndex].hexValue}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Animation Overlay During Hash-to-Card Transition */}
                            <AnimatePresence>
                                {isAnimating && (
                                    <motion.div
                                        initial={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center justify-center py-2"
                                    >
                                        <motion.div
                                            animate={{
                                                opacity: [0.5, 1, 0.5],
                                                scale: [1, 1.02, 1],
                                            }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className="flex items-center gap-2 text-cyan-400 text-sm font-mono"
                                        >
                                            <span className="inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                            DECODING VRF STREAM...
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// Proof Explanation Sub-component
// ============================================================================

function ProofExplanation({ byteValue, hexValue }: { byteValue: number; hexValue: string }) {
    // Determine which range this byte falls into
    let range = '';
    let packetType = '';
    let color = '';

    if (byteValue <= 19) {
        range = '0-19';
        packetType = 'CORRUPT (Miss)';
        color = 'text-zinc-400';
    } else if (byteValue <= 150) {
        range = '20-150';
        packetType = 'DATA SHARD (Attack)';
        color = 'text-red-400';
    } else if (byteValue <= 200) {
        range = '151-200';
        packetType = 'FIREWALL (Defend)';
        color = 'text-blue-400';
    } else if (byteValue <= 240) {
        range = '201-240';
        packetType = 'OVERCLOCK (Crit)';
        color = 'text-yellow-400';
    } else {
        range = '241-255';
        packetType = 'PATCH (Heal)';
        color = 'text-green-400';
    }

    return (
        <div className="flex flex-col gap-1">
            <p className="text-xs text-zinc-400 font-mono">
                Byte <span className="text-cyan-300">{hexValue}</span> ({byteValue})
                falls between <span className="text-cyan-300">{range}</span>
            </p>
            <p className="text-sm font-mono">
                → Generates <span className={color}>{packetType}</span> Packet
            </p>
        </div>
    );
}
