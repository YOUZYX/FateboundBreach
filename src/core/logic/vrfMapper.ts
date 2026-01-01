/**
 * VRF Mapper - Byte-to-Packet Conversion
 * 
 * Implements the deterministic mapping from VRF bytes to game packets.
 * Based on Section 3 of Fatebound_Breach.md specification.
 * 
 * CRITICAL: This module must be PURE. No side effects, no Math.random().
 */

import type { Packet, PacketType, AnomalyType } from '../types/gameState';
import { PACKET_THRESHOLDS, PACKET_VALUES } from '../types/gameState';
import { keccak256, concat, toBytes } from 'viem';

// ============================================================================
// Byte-to-Packet Mapping
// ============================================================================

/**
 * Maps a single byte (0-255) to a PacketType.
 * Uses threshold ranges from Section 3.
 * 
 * | Range     | Type   | Effect      |
 * |-----------|--------|-------------|
 * | 0-19      | MISS   | 0 Damage    |
 * | 20-150    | ATTACK | 5 Damage    |
 * | 151-200   | DEFEND | 5 Shield    |
 * | 201-240   | CRIT   | 15 Damage   |
 * | 241-255   | HEAL   | 10 HP       |
 */
export function mapByteToPacketType(byte: number): PacketType {
    if (byte < 0 || byte > 255) {
        throw new Error(`Invalid byte value: ${byte}. Must be 0-255.`);
    }

    if (byte <= PACKET_THRESHOLDS.MISS.max) {
        return 'MISS';
    }
    if (byte <= PACKET_THRESHOLDS.ATTACK.max) {
        return 'ATTACK';
    }
    if (byte <= PACKET_THRESHOLDS.DEFEND.max) {
        return 'DEFEND';
    }
    if (byte <= PACKET_THRESHOLDS.CRIT.max) {
        return 'CRIT';
    }
    return 'HEAL';
}

/**
 * Creates a Packet from a single byte value (and optional rarity byte).
 * 
 * @param byte - The raw byte value from VRF (0-255) for TYPE.
 * @param index - The packet index (used for ID generation)
 * @param rarityByte - Optional second byte for RARITY (defaults to 0/COMMON)
 * @returns A fully formed Packet object
 */
export function mapByteToPacket(byte: number, index: number, rarityByte: number = 0): Packet {
    const type = mapByteToPacketType(byte);
    const hexValue = `0x${byte.toString(16).padStart(2, '0').toUpperCase()}`;

    // Rarity Logic:
    // > 240: LEGENDARY
    // > 200: RARE
    // Else: COMMON
    let rarity: 'COMMON' | 'RARE' | 'LEGENDARY' = 'COMMON';
    if (rarityByte > 240) rarity = 'LEGENDARY';
    else if (rarityByte > 200) rarity = 'RARE';

    return {
        id: `packet-${index}`,
        hexValue,
        byteValue: byte,
        type,
        rarity,
        value: PACKET_VALUES[type],
    };
}

// ============================================================================
// Turn-Based Packet Generation
// ============================================================================

/**
 * Calculates the number of packets for a given turn.
 * Formula: 5 + (turn % 3)
 * 
 * Turn 1: 6 packets (5 + 1%3 = 5 + 1)
 * Turn 2: 7 packets (5 + 2%3 = 5 + 2)
 * Turn 3: 5 packets (5 + 3%3 = 5 + 0)
 * Turn 4: 6 packets (5 + 4%3 = 5 + 1)
 * ...
 * 
 * @param turn - Current turn number (1-indexed)
 * @returns Number of packets to generate
 */
export function calculatePacketCount(turn: number): number {
    if (turn < 1) {
        throw new Error(`Invalid turn number: ${turn}. Must be >= 1.`);
    }
    return 5 + (turn % 3);
}

/**
 * Derives the turn-specific seed from the level seed.
 * Uses Keccak256(LevelSeed + "TurnN") as per Section 3.
 * 
 * @param levelSeed - The VRF level seed (hex string)
 * @param turn - Current turn number
 * @returns Derived turn seed as hex string
 */
export function deriveTurnSeed(levelSeed: string, turn: number): `0x${string}` {
    // Combine level seed with turn identifier
    const turnSuffix = `Turn${turn}`;
    const seedBytes = toBytes(levelSeed as `0x${string}`);
    const turnBytes = new TextEncoder().encode(turnSuffix);

    // Concatenate and hash
    const combined = concat([seedBytes, turnBytes]);
    return keccak256(combined);
}

/**
 * Derives a full hand of packets from a level seed and turn number.
 * This is the main entrypoint for VRF-to-packets conversion.
 * 
 * @param levelSeed - The VRF level seed (hex string, e.g., "0x8f2a...")
 * @param turn - Current turn number (1-indexed)
 * @returns Array of Packet objects forming the player's hand
 */
export function derivePacketsFromSeed(levelSeed: string, turn: number): { packets: Packet[], anomaly: AnomalyType, jackpotHit: boolean } {
    // Calculate how many packets we need
    const packetCount = calculatePacketCount(turn);

    // Derive turn-specific randomness
    const turnSeed = deriveTurnSeed(levelSeed, turn);

    // Convert hex seed to bytes array
    // Each byte maps to one packet
    const seedBytes = hexToBytes(turnSeed);

    // B. ANOMALY Check (Byte 12)
    const anomalyByte = seedBytes[12];
    let anomaly: AnomalyType = 'STABLE';
    if (anomalyByte <= 30) anomaly = 'ION_STORM';
    else if (anomalyByte <= 60) anomaly = 'DATA_LEAK';
    else if (anomalyByte <= 90) anomaly = 'OVERCLOCK';

    // C. JACKPOT Check (Byte 31)
    const jackpotByte = seedBytes[31];
    const jackpotHit = jackpotByte >= 250;

    // Generate packets consuming 2 BYTES per packet
    const packets: Packet[] = [];
    for (let i = 0; i < packetCount; i++) {
        // We need 2 bytes per packet:
        // Byte 1: Type
        // Byte 2: Rarity
        const baseIndex = i * 2;

        // Ensure we don't overflow the 32-byte hash (wrap around if needed)
        const typeByteIndex = baseIndex % seedBytes.length;
        const rarityByteIndex = (baseIndex + 1) % seedBytes.length;

        const typeByte = seedBytes[typeByteIndex];
        const rarityByte = seedBytes[rarityByteIndex];

        packets.push(mapByteToPacket(typeByte, i, rarityByte));
    }

    return { packets, anomaly, jackpotHit };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a hex string to a Uint8Array of bytes.
 * 
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Array of byte values
 */
export function hexToBytes(hex: string): Uint8Array {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

    // Validate hex string
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
        throw new Error(`Invalid hex string: ${hex}`);
    }

    // Pad to even length if necessary
    const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;

    // Convert to bytes
    const bytes = new Uint8Array(paddedHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(paddedHex.substr(i * 2, 2), 16);
    }

    return bytes;
}

/**
 * Formats a byte value as a hex string with 0x prefix.
 * 
 * @param byte - Byte value (0-255)
 * @returns Formatted hex string (e.g., "0xFF")
 */
export function byteToHex(byte: number): string {
    return `0x${byte.toString(16).padStart(2, '0').toUpperCase()}`;
}
