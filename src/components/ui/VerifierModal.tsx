
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Grid3X3, Database, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { derivePacketsFromSeed, deriveTurnSeed, hexToBytes } from '../../core/logic/vrfMapper';
import { generateLevelFromSeed } from '../../core/logic/levelGenerator';
import { cn } from '../../lib/utils';
import { PacketCard } from '../game/PacketCard';
import type { Packet } from '../../core/types/gameState';

interface VerifierModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSeed?: string;
}

export function VerifierModal({ isOpen, onClose, currentSeed }: VerifierModalProps) {
    const [inputSeed, setInputSeed] = useState(currentSeed || '');
    const [targetTurn, setTargetTurn] = useState<number>(1);
    const [result, setResult] = useState<{
        packets: Packet[];
        gridPreview: { x: number; y: number; type: 'player' | 'enemy' | 'cache', id?: string }[];
        movementLog: string[];
        vectors: { enemyId: string; dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'STAY' }[];
    } | null>(null);

    // ==========================================
    // GHOST SIMULATOR
    // ==========================================
    const simulateTurnState = (seed: string, targetTurn: number) => {
        // 1. Initialize State
        const { enemies, player } = generateLevelFromSeed(seed);

        // 2. Loop through PREVIOUS turns to get Start-of-Turn State
        // Tricky bit: logic runs at end of turn.
        // So for Turn 1 Start state: loop 0 times (use spawn).
        // For Turn 2 Start state: loop 1 time (apply Turn 1 moves).

        for (let t = 1; t < targetTurn; t++) {
            const turnSeed = deriveTurnSeed(seed, t);
            const seedBytes = hexToBytes(turnSeed);

            enemies.forEach((enemy, index) => {
                if (enemy.type === 'FIREWALL' || enemy.type === 'CACHE_GOLD') return;

                const moveByte = seedBytes[(20 + index) % seedBytes.length];
                let dx = 0; let dy = 0;

                if (moveByte <= 50) dy = -1;
                else if (moveByte <= 100) dy = 1;
                else if (moveByte <= 150) dx = -1;
                else if (moveByte <= 200) dx = 1;

                const newX = enemy.position.x + dx;
                const newY = enemy.position.y + dy;

                const isInsideGrid = newX >= 0 && newX < 6 && newY >= 0 && newY < 6;
                if (isInsideGrid) {
                    enemy.position = { x: newX, y: newY };
                }
            });
        }

        // 3. Calculate Projected Vectors for CURRENT Turn
        // This simulates what WILL happen at the end of this turn
        const currentTurnSeed = deriveTurnSeed(seed, targetTurn);
        const currentBytes = hexToBytes(currentTurnSeed);
        const vectors: { enemyId: string; dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'STAY' }[] = [];
        const logs: string[] = [];
        let turnLog = `TURN ${targetTurn} PROJECTION: `;

        enemies.forEach((enemy, index) => {
            if (enemy.type === 'FIREWALL' || enemy.type === 'CACHE_GOLD') return;

            const moveByte = currentBytes[(20 + index) % currentBytes.length];
            let dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'STAY' = 'STAY';

            if (moveByte <= 50) dir = 'UP';
            else if (moveByte <= 100) dir = 'DOWN';
            else if (moveByte <= 150) dir = 'LEFT';
            else if (moveByte <= 200) dir = 'RIGHT';

            if (dir !== 'STAY') {
                turnLog += `[${enemy.id.split('-')[1]} -> ${dir}] `;
            }

            vectors.push({ enemyId: enemy.id, dir });
        });
        logs.push(turnLog);


        return { enemies, player, vectors, logs };
    };


    const handleVerify = () => {
        try {
            if (!inputSeed) return;
            const { packets } = derivePacketsFromSeed(inputSeed, targetTurn);

            // Run Ghost Simulation
            const { enemies, player, vectors, logs } = simulateTurnState(inputSeed, targetTurn);

            const gridPreview = [
                { x: player.position.x, y: player.position.y, type: 'player' as const },
                ...enemies.map(e => ({
                    x: e.position.x,
                    y: e.position.y,
                    type: e.type === 'CACHE_GOLD' ? 'cache' as const : 'enemy' as const,
                    id: e.id
                }))
            ];

            setResult({ packets, gridPreview, movementLog: logs, vectors });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSeedChange = (val: string) => {
        setInputSeed(val);
    };

    // Auto verify when mounted with seed
    useEffect(() => {
        if (isOpen && currentSeed) {
            handleVerify();
        }
    }, [isOpen, currentSeed, targetTurn]); // Added targetTurn dependency


    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[99998] bg-black/90 backdrop-blur-xl"
                        onClick={onClose}
                    />
                    {/* Modal Content */}
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-4xl lg:max-w-4xl max-w-lg bg-zinc-900 border border-cyan-500/30 rounded-xl shadow-[0_0_60px_rgba(0,255,255,0.15)] overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-5 h-5 text-green-400" />
                                    <h2 className="text-lg font-bold font-mono text-white">PROVABLY FAIR VERIFIER</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Input Section */}
                                <div className="space-y-2">
                                    <label className="text-xs font-mono text-zinc-500 uppercase">VRF Seed (Input)</label>
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={inputSeed}
                                                onChange={(e) => handleSeedChange(e.target.value)}
                                                placeholder="0x..."
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 md:px-4 md:py-3 font-mono text-xs md:text-sm text-green-400 focus:outline-none focus:border-green-500/50 transition-colors truncate"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                value={targetTurn}
                                                onChange={(e) => setTargetTurn(Math.max(1, parseInt(e.target.value) || 1))}
                                                placeholder="Turn"
                                                className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 md:px-4 md:py-3 font-mono text-xs md:text-sm text-cyan-400 focus:outline-none focus:border-cyan-500/50 transition-colors text-center"
                                            />
                                            <button
                                                onClick={handleVerify}
                                                disabled={!inputSeed}
                                                className="px-4 md:px-6 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg font-bold font-mono transition-colors text-sm"
                                            >
                                                VERIFY
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 font-mono">
                                        Paste any game seed to deterministically reconstruct the level and hand.
                                    </p>
                                </div>

                                {/* Result Section */}
                                {result && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                    >
                                        {/* Calculated Hand */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase">
                                                <Database className="w-4 h-4" />
                                                Derived Hand (Turn {targetTurn})
                                            </div>
                                            <div className="bg-zinc-950/50 rounded-lg p-3 md:p-4 border border-zinc-800 min-h-[150px] md:min-h-[200px]">
                                                <div className="flex flex-wrap gap-1 md:gap-2 justify-center">
                                                    {result.packets.map((p, i) => (
                                                        <div key={i} className="scale-[0.6] md:scale-75 origin-top-left">
                                                            <PacketCard
                                                                packet={p}
                                                                index={i}
                                                                isSelected={false}
                                                                isHovered={false}
                                                                isAssigned={false}
                                                                onClick={(_e) => { }}
                                                                onCheckboxClick={() => { }}
                                                                onHoverStart={() => { }}
                                                                onHoverEnd={() => { }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Level Preview */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-mono text-yellow-400 uppercase">
                                                <Grid3X3 className="w-4 h-4" />
                                                Level Layout & Predicted Moves
                                            </div>
                                            <div className="bg-zinc-950/50 rounded-lg p-3 md:p-4 border border-zinc-800 min-h-[150px] md:min-h-[200px] flex flex-col gap-4">
                                                {/* GRID */}
                                                <div className="flex items-center justify-center">
                                                    <div className="grid grid-cols-6 gap-0.5 md:gap-1">
                                                        {Array.from({ length: 36 }).map((_, i) => {
                                                            const x = i % 6;
                                                            const y = Math.floor(i / 6);
                                                            const entity = result.gridPreview.find(e => e.x === x && e.y === y);
                                                            const vector = entity?.type === 'enemy'
                                                                ? result.vectors.find(v => v.enemyId === entity.id)
                                                                : null;

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={cn(
                                                                        "relative w-6 h-6 md:w-8 md:h-8 rounded border flex items-center justify-center text-[8px] md:text-[10px]",
                                                                        entity?.type === 'player' ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" :
                                                                            entity?.type === 'enemy' ? "border-red-500/50 bg-red-500/20 text-red-400" :
                                                                                entity?.type === 'cache' ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-400" :
                                                                                    "border-zinc-800 bg-zinc-900/50"
                                                                    )}
                                                                >
                                                                    {entity?.type === 'player' && "P"}
                                                                    {entity?.type === 'enemy' && "E"}
                                                                    {entity?.type === 'cache' && "$"}

                                                                    {/* Render Movement Arrow (Top-Left) */}
                                                                    {vector && vector.dir !== 'STAY' && (
                                                                        <div className="absolute top-0 left-0 w-3 h-3 text-cyan-400 drop-shadow-md -translate-x-1 -translate-y-1 pointer-events-none z-10">
                                                                            {vector.dir === 'UP' && <ArrowUp className="w-full h-full" />}
                                                                            {vector.dir === 'DOWN' && <ArrowDown className="w-full h-full" />}
                                                                            {vector.dir === 'LEFT' && <ArrowLeft className="w-full h-full" />}
                                                                            {vector.dir === 'RIGHT' && <ArrowRight className="w-full h-full" />}
                                                                        </div>
                                                                    )}

                                                                    {/* Render Index Label (Bottom-Right) */}
                                                                    {entity?.type === 'enemy' && (
                                                                        <div className="absolute bottom-0 right-0.5 text-[6px] md:text-[8px] font-mono text-gray-400 opacity-75 pointer-events-none">
                                                                            #{entity.id?.split('-')[1] || '?'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* MOVEMENT LOG */}
                                                <div className="p-3 bg-black/50 border border-white/10 rounded text-[10px] md:text-xs font-mono text-zinc-400">
                                                    <div className="text-zinc-500 uppercase font-bold mb-1">
                                                        Turn {targetTurn} Projected Movement:
                                                    </div>
                                                    {result.movementLog.length > 0 ? (
                                                        result.movementLog.map((log, i) => (
                                                            <div key={i}>{log}</div>
                                                        ))
                                                    ) : (
                                                        <div>No movement projections.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
