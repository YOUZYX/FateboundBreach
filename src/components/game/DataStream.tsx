/**
 * Data Stream Component
 * 
 * Horizontal list of packet cards representing the player's "hand".
 * The conveyor belt / command line visualization.
 */

import { motion } from 'framer-motion';
import { useGameStore, usePendingAssignments } from '../../store/gameStore';
import { PacketCard } from './PacketCard';

export function DataStream() {
    const packetQueue = useGameStore((s) => s.packetQueue);
    const selectedPacketIds = useGameStore((s) => s.selectedPacketIds); // array
    const hoveredPacketId = useGameStore((s) => s.hoveredPacketId);
    const selectPacket = useGameStore((s) => s.selectPacket);
    const hoverPacket = useGameStore((s) => s.hoverPacket);
    const pendingAssignments = usePendingAssignments();
    const isAnimating = useGameStore((s) => s.isAnimating);

    const assignedPacketIds = new Set(pendingAssignments.map(a => a.packetId));

    if (packetQueue.length === 0) {
        return (
            <div className="w-full h-40 flex items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <span className="text-zinc-500 font-mono text-sm">
                    NO DATA STREAM ACTIVE
                </span>
            </div>
        );
    }

    return (
        <motion.div
            className="w-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-xs font-mono text-cyan-400">DATA STREAM</span>
                </div>
                <div className="text-xs font-mono text-zinc-500">
                    {pendingAssignments.length}/{packetQueue.length} ROUTED
                </div>
            </div>

            {/* Packet Cards */}
            <div className="flex items-center justify-center gap-3 overflow-x-auto py-4 px-2">
                {packetQueue.map((packet, index) => {
                    const isSelected = selectedPacketIds.includes(packet.id);
                    const isHovered = hoveredPacketId === packet.id;
                    const isAssigned = assignedPacketIds.has(packet.id);

                    return (
                        <PacketCard
                            key={packet.id}
                            index={index}
                            packet={packet}
                            isSelected={isSelected}
                            isHovered={isHovered}
                            isAssigned={isAssigned}
                            onClick={(e: React.MouseEvent) => {
                                // Standard behavior: Shift to toggle, Click to select single
                                const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                                selectPacket(packet.id, isMulti);
                            }}
                            onCheckboxClick={() => {
                                // Checkbox behavior: ALWAYS Multi-select (toggle)
                                selectPacket(packet.id, true);
                            }}
                            onHoverStart={() => hoverPacket(packet.id)}
                            onHoverEnd={() => hoverPacket(null)}
                        />
                    );
                })}
            </div>

            {/* Instructions */}
            <div className="mt-4 text-center space-y-1">
                {isAnimating ? (
                    <span className="text-xs font-mono text-cyan-400 animate-pulse">
                        DECODING INCOMING PACKETS...
                    </span>
                ) : selectedPacketIds.length > 0 ? (
                    <span className="text-xs font-mono text-cyan-400">
                        SELECT A TARGET ON THE GRID TO ROUTE {selectedPacketIds.length} PACKET(S)
                    </span>
                ) : (
                    <>
                        <span className="text-xs font-mono text-zinc-500 block">
                            CLICK TO SELECT • SHIFT+CLICK OR USE CHECKBOX FOR MULTI-SELECT
                        </span>
                    </>
                )}
            </div>
        </motion.div>
    );
}
