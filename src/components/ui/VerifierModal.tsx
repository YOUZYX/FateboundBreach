

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Grid3X3, Database } from 'lucide-react';
import { derivePacketsFromSeed } from '../../core/logic/vrfMapper';
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
        gridPreview: { x: number; y: number; type: 'player' | 'enemy' | 'cache' }[];
    } | null>(null);

    const handleVerify = () => {
        try {
            if (!inputSeed) return;
            // Derive packets for the specific target turn
            const { packets } = derivePacketsFromSeed(inputSeed, targetTurn);
            const { enemies, player } = generateLevelFromSeed(inputSeed);

            const gridPreview = [
                { x: player.position.x, y: player.position.y, type: 'player' as const },
                ...enemies.map(e => ({
                    x: e.position.x,
                    y: e.position.y,
                    type: e.type === 'CACHE_GOLD' ? 'cache' as const : 'enemy' as const
                }))
            ];

            setResult({ packets, gridPreview });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSeedChange = (val: string) => {
        setInputSeed(val);
        // Auto-verify if valid length (hex seed is usually 66 chars)
        if (val.length > 10) {
            // debounced in real app, but direct here is fine for prototype
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop with high z-index and blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[99998] bg-black/90 backdrop-blur-xl"
                        onClick={onClose}
                    />
                    {/* Modal Content - Centered */}
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
                                                Level Layout
                                            </div>
                                            <div className="bg-zinc-950/50 rounded-lg p-3 md:p-4 border border-zinc-800 min-h-[150px] md:min-h-[200px] flex items-center justify-center">
                                                <div className="grid grid-cols-6 gap-0.5 md:gap-1">
                                                    {Array.from({ length: 36 }).map((_, i) => {
                                                        const x = i % 6;
                                                        const y = Math.floor(i / 6);
                                                        const entity = result.gridPreview.find(e => e.x === x && e.y === y);

                                                        return (
                                                            <div
                                                                key={i}
                                                                className={cn(
                                                                    "w-6 h-6 md:w-8 md:h-8 rounded border flex items-center justify-center text-[8px] md:text-[10px]",
                                                                    entity?.type === 'player' ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" :
                                                                        entity?.type === 'enemy' ? "border-red-500/50 bg-red-500/20 text-red-400" :
                                                                            entity?.type === 'cache' ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-400" :
                                                                                "border-zinc-800 bg-zinc-900/50"
                                                                )}
                                                            >
                                                                {entity?.type === 'player' && "P"}
                                                                {entity?.type === 'enemy' && "E"}
                                                                {entity?.type === 'cache' && "$"}
                                                            </div>
                                                        );
                                                    })}
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
