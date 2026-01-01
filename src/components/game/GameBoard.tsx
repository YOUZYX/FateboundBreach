/**
 * Game Board Component
 * 
 * 6x6 grid displaying player, enemies, and available targets.
 * Includes damage animations and game result overlay.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
    useGameStore,
    usePendingAssignments,
    useGameResult,
    useDamageEvents,
    useIsExecuting,
} from '../../store/gameStore';
import { cn } from '../../lib/utils';
import { User, Bot, Shield, Trash2, Trophy, Skull, Heart, X, Swords, Lock } from 'lucide-react';
import type { Enemy } from '../../core/types/gameState';
import { useEffect, useState } from 'react';

export function GameBoard() {
    const gameState = useGameStore((s) => s.gameState);
    const selectedPacketIds = useGameStore((s) => s.selectedPacketIds); // array
    const assignPacket = useGameStore((s) => s.assignPacket);
    const isValidAssignment = useGameStore((s) => s.isValidAssignment);
    const getValidTargetsForPacket = useGameStore((s) => s.getValidTargetsForPacket);
    const packetQueue = useGameStore((s) => s.packetQueue);
    const pendingAssignments = usePendingAssignments();
    const gameResult = useGameResult();
    const damageEvents = useDamageEvents();
    const isExecuting = useIsExecuting();
    const resetGame = useGameStore((s) => s.resetGame);

    const [shake, setShake] = useState(false);

    // Shake Effect on CRIT
    useEffect(() => {
        const hasCrit = damageEvents.some(d => d.timestamp > Date.now() - 500 && d.amount >= 15);
        if (hasCrit) {
            setShake(true);
            const t = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(t);
        }
    }, [damageEvents]);

    if (!gameState) {
        return (
            <div className="flex items-center justify-center h-96 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <span className="text-zinc-500 font-mono">NO ACTIVE BREACH</span>
            </div>
        );
    }

    const { grid, player, enemies } = gameState;
    // For display, just pick first selected packet or show generic "Multi" hint?
    // Let's use the first one for hint, but logic handles all.
    const selectedPacket = selectedPacketIds.length > 0
        ? packetQueue.find(p => p.id === selectedPacketIds[0])
        : null;

    // Get valid targets for current selection (Union of all valid targets?)
    // Actually, intersection is safer to ensure ALL selected can go there. 
    // Or just highlight if ANY is valid?
    // Let's go with: Highlight if VALID for the FIRST selected packet types.
    // Simplifying: Just use the first packet type for validity check.
    const validTargets = selectedPacket
        ? new Set(getValidTargetsForPacket(selectedPacket.id))
        : new Set<string>();

    // Get assignments for display
    const assignmentsByTarget = new Map<string, string[]>();
    pendingAssignments.forEach(a => {
        const list = assignmentsByTarget.get(a.targetId) || [];
        list.push(a.packetId);
        assignmentsByTarget.set(a.targetId, list);
    });

    const handleCellClick = (x: number, y: number) => {
        if (selectedPacketIds.length === 0 || isExecuting) return;

        let targetId: string | null = null;
        const enemy = enemies.find(e => e.position.x === x && e.position.y === y);

        if (enemy) targetId = enemy.id;
        else if (player.position.x === x && player.position.y === y) targetId = 'player';

        if (targetId) {
            // Apply ALL selected packets that are valid for this target
            selectedPacketIds.forEach(pid => {
                if (isValidAssignment(pid, targetId!)) {
                    assignPacket(pid, targetId!);
                }
            });
        }
    };

    const handleTrashClick = () => {
        if (selectedPacketIds.length > 0 && !isExecuting) {
            selectedPacketIds.forEach(pid => {
                assignPacket(pid, 'trash');
            });
        }
    };

    return (
        <div className="w-full max-w-[500px] aspect-square flex flex-col items-center gap-2 md:gap-4 relative mx-auto">
            {/* Grid Header */}
            <div className="flex items-center justify-between w-full px-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] md:text-xs font-mono text-zinc-500">GRID</span>
                    <span className="text-[10px] md:text-xs font-mono text-cyan-400">
                        {grid.width}x{grid.height}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] md:text-xs font-mono">
                    <span className="text-zinc-400">
                        HP: <span className={cn(
                            player.hp > 50 ? "text-green-400" : player.hp > 25 ? "text-yellow-400" : "text-red-400"
                        )}>{player.hp}</span>/{player.maxHp}
                    </span>
                    {player.shield > 0 && (
                        <span className="text-zinc-400">
                            SHD: <span className="text-blue-400">{player.shield}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Selection Hint */}
            {selectedPacket && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono"
                >
                    <span className="text-zinc-400">SELECT TARGET FOR: </span>
                    <span className={cn(
                        selectedPacket.type === 'ATTACK' && "text-red-400",
                        selectedPacket.type === 'CRIT' && "text-yellow-400",
                        selectedPacket.type === 'DEFEND' && "text-blue-400",
                        selectedPacket.type === 'HEAL' && "text-green-400",
                        selectedPacket.type === 'MISS' && "text-zinc-400",
                    )}>
                        {selectedPacket.type} ({selectedPacket.hexValue})
                    </span>
                    {(selectedPacket.type === 'HEAL' || selectedPacket.type === 'DEFEND') && (
                        <span className="text-cyan-400 ml-2">→ PLAYER ONLY</span>
                    )}
                    {(selectedPacket.type === 'ATTACK' || selectedPacket.type === 'CRIT' || selectedPacket.type === 'MISS') && (
                        <span className="text-red-400 ml-2">→ ENEMIES ONLY</span>
                    )}
                </motion.div>
            )}

            {/* Grid */}
            <motion.div
                className={cn(
                    "grid gap-1 p-4 bg-zinc-900/80 backdrop-blur-sm border rounded-lg transition-all",
                    isExecuting ? "border-cyan-500/50" : "border-zinc-800"
                )}
                style={{ gridTemplateColumns: `repeat(${grid.width}, 1fr)` }}
                animate={shake ? { x: [-2, 2, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
            >
                {Array.from({ length: grid.height }).map((_, y) =>
                    Array.from({ length: grid.width }).map((_, x) => {
                        const enemy = enemies.find(e => e.position.x === x && e.position.y === y && e.hp > 0);
                        const isPlayerCell = player.position.x === x && player.position.y === y;

                        let targetId: string | null = null;
                        if (enemy) targetId = enemy.id;
                        else if (isPlayerCell) targetId = 'player';

                        const isValidTarget = targetId ? validTargets.has(targetId) : false;
                        const isInvalidTarget = selectedPacketIds.length > 0 && targetId && !isValidTarget;

                        let assignedCount = 0;
                        if (enemy) {
                            assignedCount = assignmentsByTarget.get(enemy.id)?.length || 0;
                        } else if (isPlayerCell) {
                            assignedCount = assignmentsByTarget.get('player')?.length || 0;
                        }

                        // Get damage events for this cell
                        const cellDamageEvents = damageEvents.filter(
                            e => e.targetId === targetId
                        );

                        return (
                            <GridCell
                                key={`${x}-${y}`}
                                x={x}
                                y={y}
                                enemy={enemy}
                                isPlayer={isPlayerCell}
                                isValidTarget={isValidTarget}
                                isInvalidTarget={!!isInvalidTarget}
                                assignedCount={assignedCount}
                                damageEvents={cellDamageEvents}
                                onClick={() => handleCellClick(x, y)}
                                playerHp={player.hp}
                                playerMaxHp={player.maxHp}
                                playerShield={player.shield}
                            />
                        );
                    })
                )}
            </motion.div>

            {/* Trash Port */}
            <motion.button
                onClick={handleTrashClick}
                disabled={selectedPacketIds.length === 0 || isExecuting}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                    selectedPacketIds.length > 0 && !isExecuting
                        ? "border-zinc-500 bg-zinc-800/50 hover:bg-zinc-700/50 cursor-pointer text-zinc-300"
                        : "border-zinc-800 bg-zinc-900/50 cursor-not-allowed text-zinc-600"
                )}
                whileHover={selectedPacketIds.length > 0 && !isExecuting ? { scale: 1.05 } : {}}
                whileTap={selectedPacketIds.length > 0 && !isExecuting ? { scale: 0.95 } : {}}
            >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-mono">DISPOSAL NODE</span>
                {assignmentsByTarget.get('trash')?.length ? (
                    <span className="text-xs font-mono text-zinc-400">
                        ({assignmentsByTarget.get('trash')?.length})
                    </span>
                ) : null}
            </motion.button>

            {/* Enemy Intent Display */}
            <EnemyIntents enemies={enemies} />

            {/* Game Result Overlay */}
            <AnimatePresence>
                {gameResult && gameResult !== 'CONTINUE' && (
                    <GameResultOverlay result={gameResult} onReset={resetGame} />
                )}
            </AnimatePresence>
        </div >
    );
}

// ============================================================================
// Grid Cell Sub-component
// ============================================================================

interface DamageEvent {
    id: string;
    targetId: string;
    amount: number;
    type: 'damage' | 'heal' | 'shield' | 'miss';
}

interface GridCellProps {
    x: number;
    y: number;
    enemy?: Enemy;
    isPlayer: boolean;
    isValidTarget: boolean;
    isInvalidTarget: boolean;
    assignedCount: number;
    damageEvents: DamageEvent[];
    onClick: () => void;
    playerHp?: number;
    playerMaxHp?: number;
    playerShield?: number;
}

function GridCell({
    enemy,
    isPlayer,
    isValidTarget,
    isInvalidTarget,
    assignedCount,
    damageEvents,
    onClick,
    playerHp = 100,
    playerMaxHp = 100,
    playerShield = 0,
}: GridCellProps) {
    const baseClasses = "w-14 h-14 rounded border flex items-center justify-center relative transition-all";

    if (enemy) {
        const hpPercent = (enemy.hp / enemy.maxHp) * 100;
        const isCache = enemy.type === 'CACHE_GOLD';

        if (isCache) {
            return (
                <motion.div
                    onClick={isValidTarget ? onClick : undefined}
                    className={cn(
                        baseClasses,
                        "border-yellow-500/50 bg-yellow-500/10",
                        isValidTarget && "cursor-pointer hover:border-yellow-400 hover:bg-yellow-500/20 ring-2 ring-yellow-500/50 animate-pulse",
                        isInvalidTarget && "opacity-30 cursor-not-allowed"
                    )}
                    whileHover={isValidTarget ? { scale: 1.1 } : {}}
                    whileTap={isValidTarget ? { scale: 0.95 } : {}}
                >
                    <div className="flex flex-col items-center">
                        <Lock className="w-6 h-6 text-yellow-400 mb-1" />
                        <span className="text-[9px] font-mono text-yellow-400 leading-none">REQ:CRIT</span>
                    </div>

                    {/* Assigned Count Badge */}
                    {assignedCount > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-zinc-900"
                        >
                            {assignedCount}
                        </motion.div>
                    )}

                    {/* Damage Animation */}
                    <AnimatePresence>
                        {damageEvents.map((event, i) => (
                            <DamageNumber key={event.id} event={event} delay={i * 0.1} />
                        ))}
                    </AnimatePresence>
                </motion.div>
            );
        }

        return (
            <motion.div
                onClick={isValidTarget ? onClick : undefined}
                className={cn(
                    baseClasses,
                    "border-red-500/50 bg-red-500/10",
                    isValidTarget && "cursor-pointer hover:border-red-400 hover:bg-red-500/20 ring-2 ring-red-500/50 animate-pulse",
                    isInvalidTarget && "opacity-30 cursor-not-allowed"
                )}
                whileHover={isValidTarget ? { scale: 1.1 } : {}}
                whileTap={isValidTarget ? { scale: 0.95 } : {}}
            >
                <Bot className="w-6 h-6 text-red-400" />

                {/* HP Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-700 rounded-b">
                    <motion.div
                        className="h-full bg-red-500 rounded-b"
                        initial={{ width: `${hpPercent}%` }}
                        animate={{ width: `${hpPercent}%` }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    />
                </div>

                {/* HP Text */}
                <div className="absolute -bottom-5 left-0 right-0 text-center">
                    <span className="text-[10px] font-mono text-red-400">{enemy.hp}</span>
                </div>

                {/* Assigned Count Badge */}
                {assignedCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-zinc-900"
                    >
                        {assignedCount}
                    </motion.div>
                )}

                {/* Damage Animation */}
                <AnimatePresence>
                    {damageEvents.map((event, i) => (
                        <DamageNumber key={event.id} event={event} delay={i * 0.1} />
                    ))}
                </AnimatePresence>
            </motion.div>
        );
    }

    if (isPlayer) {
        const hpPercent = (playerHp / playerMaxHp) * 100;

        return (
            <motion.div
                onClick={isValidTarget ? onClick : undefined}
                className={cn(
                    baseClasses,
                    "border-cyan-500/50 bg-cyan-500/10",
                    isValidTarget && "cursor-pointer hover:border-cyan-400 hover:bg-cyan-500/20 ring-2 ring-cyan-500/50 animate-pulse",
                    isInvalidTarget && "opacity-30 cursor-not-allowed"
                )}
                whileHover={isValidTarget ? { scale: 1.1 } : {}}
                whileTap={isValidTarget ? { scale: 0.95 } : {}}
            >
                <User className="w-6 h-6 text-cyan-400" />

                {/* HP Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-700 rounded-b">
                    <motion.div
                        className={cn(
                            "h-full rounded-b",
                            hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        initial={{ width: `${hpPercent}%` }}
                        animate={{ width: `${hpPercent}%` }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    />
                </div>

                {/* Shield indicator */}
                {playerShield > 0 && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                )}

                {/* Assigned Count Badge */}
                {assignedCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold text-zinc-900"
                    >
                        {assignedCount}
                    </motion.div>
                )}

                {/* Damage Animation */}
                <AnimatePresence>
                    {damageEvents.map((event, i) => (
                        <DamageNumber key={event.id} event={event} delay={i * 0.1} />
                    ))}
                </AnimatePresence>
            </motion.div>
        );
    }

    return (
        <div className={cn(baseClasses, "border-zinc-800 bg-zinc-900/30")} />
    );
}

// ============================================================================
// Damage Number Animation
// ============================================================================

function DamageNumber({ event, delay }: { event: DamageEvent; delay: number }) {
    const config = {
        damage: { color: 'text-red-400', prefix: '-', icon: Swords },
        heal: { color: 'text-green-400', prefix: '+', icon: Heart },
        shield: { color: 'text-blue-400', prefix: '+', icon: Shield },
        miss: { color: 'text-zinc-500', prefix: '', icon: X },
    };

    // Special handler for "Jackpot" score pop (simulated by checking if it's a huge damage to cache, 
    // or we can just strictly look for > 100 since max normal dmg is usually lower, cache kill is implicit)
    // Actually, we don't have "Score" events here yet, but we can fake it:
    // If we land a CRIT on a Cache, the damage is effectively "Kill".
    // Let's just assume if dmg > 900 it's a Score Pop (since we added +1000 score, but damage might be recorded differently? 
    // Actually damageEvents come from turnResolver which uses packet values. 
    // Wait, the Score event is NOT in damageEvents. The +1000 is score. 
    // However, I can cheat: If packet value is CRIT, we can show "CRIT!" and "JACKPOT!".
    // But damageEvents just have 'amount' from packet value. Packet value for CRIT is 30 (or similar).
    // So I can't detect +1000 here easily without passing more info.
    // I will stick to "CRIT!" visuals for now, and maybe "GOLD" color if I could know it's a cache.
    // GridCell knows if it's a cache. 
    // I'll accept this limitation for now and just make the animation really nice.

    // Actually, I can pass `isCache` prop to DamageNumber? No, GridCell calls it.
    // I'll just make standard damage look good.

    const { color, prefix, icon: Icon } = config[event.type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -30, scale: 1.5 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ delay, duration: 0.5, type: 'spring' }}
            className={cn("absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-1 font-bold z-20 pointer-events-none drop-shadow-md", color)}
        >
            <Icon className="w-4 h-4" />
            <span className="text-lg">
                {event.type === 'miss' ? 'MISS' : `${prefix}${event.amount}`}
            </span>
        </motion.div>
    );
}

// ============================================================================
// Enemy Intents Display
// ============================================================================

function EnemyIntents({ enemies }: { enemies: Enemy[] }) {
    const livingEnemies = enemies.filter(e => e.hp > 0);

    if (livingEnemies.length === 0) return null;

    return (
        <div className="w-full max-w-xl">
            <div className="text-xs font-mono text-zinc-500 mb-2">ENEMY INTENTS</div>
            <div className="grid grid-cols-3 gap-2">
                {livingEnemies.map(enemy => (
                    <div
                        key={enemy.id}
                        className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded text-xs font-mono"
                    >
                        <Bot className="w-4 h-4 text-red-400" />
                        <span className="text-zinc-400 truncate">{enemy.name}</span>
                        <span className="text-zinc-600">|</span>
                        <span className={cn(
                            enemy.intent === 'ATTACK' && "text-red-400",
                            enemy.intent === 'DEFEND' && "text-blue-400",
                            enemy.intent === 'IDLE' && "text-zinc-500"
                        )}>
                            {enemy.intent === 'ATTACK' && `ATK ${enemy.damage}`}
                            {enemy.intent === 'DEFEND' && <Shield className="w-3 h-3 inline" />}
                            {enemy.intent === 'IDLE' && 'IDLE'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Game Result Overlay
// ============================================================================

function GameResultOverlay({
    result,
    onReset
}: {
    result: 'VICTORY' | 'DEFEAT';
    onReset: () => void;
}) {
    const isVictory = result === 'VICTORY';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm rounded-lg z-50"
        >
            <motion.div
                initial={{ scale: 0.5, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex flex-col items-center gap-4 md:gap-6 p-4 md:p-8"
            >
                {/* Icon */}
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: isVictory ? [0, 5, -5, 0] : [0, -5, 5, 0],
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={cn(
                        "w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center",
                        isVictory ? "bg-green-500/20 border-2 border-green-500" : "bg-red-500/20 border-2 border-red-500"
                    )}
                >
                    {isVictory ? (
                        <Trophy className="w-6 h-6 md:w-10 md:h-10 text-green-400" />
                    ) : (
                        <Skull className="w-6 h-6 md:w-10 md:h-10 text-red-400" />
                    )}
                </motion.div>

                {/* Text */}
                <div className="text-center">
                    <h2 className={cn(
                        "text-xl md:text-3xl font-bold tracking-wider",
                        isVictory ? "text-green-400" : "text-red-400"
                    )}>
                        {isVictory ? 'BREACH SUCCESSFUL' : 'CONNECTION LOST'}
                    </h2>
                    <p className="text-zinc-500 font-mono text-xs md:text-sm mt-2">
                        {isVictory
                            ? 'All hostile nodes eliminated.'
                            : 'System integrity compromised.'}
                    </p>
                </div>

                {/* Actions */}
                <motion.button
                    onClick={onReset}
                    className={cn(
                        "px-4 py-2 md:px-6 md:py-3 rounded-lg font-mono text-xs md:text-sm transition-all",
                        isVictory
                            ? "bg-green-500 text-zinc-900 hover:bg-green-400"
                            : "bg-red-500 text-zinc-900 hover:bg-red-400"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {isVictory ? 'NEXT BREACH' : 'RETRY'}
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
