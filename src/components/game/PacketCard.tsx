/**
 * Packet Card Component
 * 
 * Visual representation of a single VRF-derived packet.
 * Shows type, value, and source hex byte.
 */

import { motion } from 'framer-motion';
import type { Packet } from '../../core/types/gameState';
import { cn } from '../../lib/utils';
import {
    Swords,
    Shield,
    Zap,
    XCircle,
    Heart,
    Check,
    type LucideIcon
} from 'lucide-react';

interface PacketCardProps {
    packet: Packet;
    isSelected: boolean;
    isHovered: boolean;
    isAssigned: boolean;
    onClick: (e: React.MouseEvent) => void;
    onCheckboxClick?: (e: React.MouseEvent) => void;
    onHoverStart: () => void;
    onHoverEnd: () => void;
    index: number;
}

const PACKET_CONFIG: Record<string, {
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    label: string;
}> = {
    ATTACK: {
        icon: Swords,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/50',
        glowColor: 'shadow-red-500/30',
        label: 'DATA SHARD',
    },
    CRIT: {
        icon: Zap,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/50',
        glowColor: 'shadow-yellow-500/30',
        label: 'OVERCLOCK',
    },
    DEFEND: {
        icon: Shield,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/50',
        glowColor: 'shadow-blue-500/30',
        label: 'FIREWALL',
    },
    HEAL: {
        icon: Heart,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/50',
        glowColor: 'shadow-green-500/30',
        label: 'PATCH',
    },
    MISS: {
        icon: XCircle,
        color: 'text-zinc-500',
        bgColor: 'bg-zinc-500/10',
        borderColor: 'border-zinc-500/50',
        glowColor: 'shadow-zinc-500/30',
        label: 'CORRUPT',
    },
};

export function PacketCard({
    packet,
    isSelected,
    isHovered,
    isAssigned,
    onClick,
    onCheckboxClick,
    onHoverStart,
    onHoverEnd,
    index,
}: PacketCardProps) {
    const config = PACKET_CONFIG[packet.type];
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{
                opacity: isAssigned ? 0.4 : 1,
                y: 0,
                scale: isSelected ? 1.1 : 1,
            }}
            whileHover={{ scale: isAssigned ? 1 : 1.05 }}
            transition={{
                delay: index * 0.1,
                type: 'spring',
                stiffness: 400,
                damping: 25,
            }}
            onClick={isAssigned ? undefined : onClick}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            className={cn(
                "relative w-24 h-32 rounded-lg border-2 cursor-pointer transition-all",
                "flex flex-col items-center justify-between p-2",
                config.bgColor,
                config.borderColor,
                packet.rarity === 'LEGENDARY' && "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]",
                packet.rarity === 'RARE' && "border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]",
                isSelected && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-950",
                isHovered && !isSelected && `shadow-lg ${config.glowColor}`,
                isAssigned && "cursor-not-allowed opacity-50"
            )}
        >
            {/* Source Hex Byte (Top Right Corner) */}
            <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[10px] font-mono text-cyan-400">
                {packet.hexValue}
            </div>

            {/* Icon */}
            <div className={cn("mt-3", config.color)}>
                <Icon className="w-8 h-8" />
            </div>

            {/* Value */}
            <div className="text-center">
                <div className={cn("text-2xl font-bold", config.color)}>
                    {packet.value}
                </div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    {config.label}
                </div>
            </div>

            {/* Multi-Select Checkbox (Top Left) */}
            {!isAssigned && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                        "absolute -top-2 -left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer z-10",
                        isSelected
                            ? "bg-cyan-500 border-cyan-400"
                            : "bg-zinc-800 border-zinc-600 hover:border-cyan-500"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCheckboxClick?.(e);
                    }}
                >
                    {isSelected && <Check className="w-3 h-3 text-zinc-900" strokeWidth={3} />}
                </motion.div>
            )}

            {/* Assigned Indicator */}
            {isAssigned && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-lg"
                >
                    <span className="text-xs font-mono text-green-400">ROUTED</span>
                </motion.div>
            )}

            {/* Selection Glow Effect */}
            {isSelected && (
                <motion.div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    animate={{
                        boxShadow: [
                            '0 0 20px rgba(0, 243, 255, 0.3)',
                            '0 0 40px rgba(0, 243, 255, 0.5)',
                            '0 0 20px rgba(0, 243, 255, 0.3)',
                        ],
                    }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                />
            )}
        </motion.div>
    );
}
