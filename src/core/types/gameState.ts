/**
 * Fatebound Breach - Core Game State Types
 * 
 * Defines all interfaces for the deterministic game loop.
 * Based on Section 6 of Fatebound_Breach.md specification.
 */

// ============================================================================
// Packet Types (from VRF mapping - Section 3)
// ============================================================================

/**
 * The five packet types derived from VRF bytes.
 * Each type has a fixed effect value.
 */
export type PacketType = 'ATTACK' | 'DEFEND' | 'CRIT' | 'MISS' | 'HEAL';

/**
 * Byte-to-Packet mapping thresholds (Section 3).
 * These ranges define how raw VRF bytes map to packet types.
 */
export const PACKET_THRESHOLDS = {
    MISS: { min: 0, max: 19 },      // 0x00-0x13, ~7.8%
    ATTACK: { min: 20, max: 150 },  // 0x14-0x96, ~51%
    DEFEND: { min: 151, max: 200 }, // 0x97-0xC8, ~19.6%
    CRIT: { min: 201, max: 240 },   // 0xC9-0xF0, ~15.6%
    HEAL: { min: 241, max: 255 },   // 0xF1-0xFF, ~5.8%
} as const;

/**
 * Fixed effect values for each packet type.
 */
export const PACKET_VALUES: Record<PacketType, number> = {
    MISS: 0,
    ATTACK: 5,
    DEFEND: 5,
    CRIT: 15,
    HEAL: 10,
} as const;

/**
 * A single packet generated from VRF.
 * Represents one "card" in the player's hand.
 */
export interface Packet {
    /** Unique identifier for this packet */
    id: string;
    /** Original hex value from VRF (e.g., "0xFF") */
    hexValue: string;
    /** Numeric byte value (0-255) */
    byteValue: number;
    /** Derived packet type */
    type: PacketType;
    /** Combined Rarity Level */
    rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
    /** Effect value (damage/shield/heal amount) */
    value: number;
}

// ============================================================================
// Position & Grid
// ============================================================================

export interface Position {
    x: number;
    y: number;
}

export interface Grid {
    width: number;
    height: number;
}

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Player entity with health pool and shield.
 */
export interface Player {
    hp: number;
    maxHp: number;
    shield: number;
    position: Position;
}

/**
 * Enemy intent types - what the enemy plans to do next turn.
 * Displayed before planning phase for strategic decisions.
 */
export type EnemyIntent = 'ATTACK' | 'DEFEND' | 'BUFF' | 'IDLE';

/**
 * Enemy entity with pre-calculated intent and damage.
 */
export interface Enemy {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    type: string;
    position: Position;
    /** Current intent (shown during planning) */
    intent: EnemyIntent;
    /** Damage this enemy will deal if intent is ATTACK */
    damage: number;
}

// ============================================================================
// Assignment (Player Action)
// ============================================================================

/**
 * Maps a packet to a target.
 * This is the player's "move" for the turn.
 */
export interface Assignment {
    /** ID of the packet being assigned */
    packetId: string;
    /** ID of the target (enemy ID, 'player', or 'trash') */
    targetId: string;
}

/**
 * Target type classification for validation.
 */
export type TargetType = 'ENEMY' | 'PLAYER' | 'TRASH';

// ============================================================================
// Game State
// ============================================================================

/**
 * Game status phases (from Section 2 - Game Flow).
 */
export type GameStatus =
    | 'INIT'           // Level loading
    | 'WAITING_FOR_VRF' // Awaiting VRF response
    | 'PLANNING'        // Player assigning packets
    | 'EXECUTING'       // Resolving turn
    | 'RESOLVED';       // Turn complete, checking conditions

// Revert back to string union to avoid breaking current store logic
export type TurnResult = 'VICTORY' | 'DEFEAT' | 'CONTINUE';

/**
 * Complete game state - the single source of truth.
 * Must be serializable for replay/verification.
 */
export interface GameState {
    /** Current game phase */
    status: GameStatus;
    /** The VRF seed - source of all randomness */
    levelSeed: string;
    /** Current turn number (1-indexed) */
    turnCounter: number;
    /** Level identifier */
    levelId: number;
    /** Grid dimensions */
    grid: Grid;
    /** Player entity */
    player: Player;
    /** All enemies on the board */
    enemies: Enemy[];
    /** Current hand of packets */
    dataStream: Packet[];
    /** Current assignments (cleared each turn) */
    assignments: Assignment[];
    /** Current score */
    score: number;
    /** Current turn anomaly */
    anomaly: AnomalyType;
    /** Jackpot Status */
    jackpotHit: boolean;
}

export type AnomalyType = 'STABLE' | 'ION_STORM' | 'DATA_LEAK' | 'OVERCLOCK';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep clone helper type for immutable state updates.
 */
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Replay data structure for verification.
 * Contains everything needed to reconstruct a game session.
 */
export interface Replay {
    levelSeed: string;
    levelId: number;
    turnAssignments: Assignment[][];
}
