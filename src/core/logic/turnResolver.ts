/**
 * Turn Resolver - Deterministic Game State Transition
 * 
 * Implements the pure function that resolves a turn given
 * current state and player assignments.
 * 
 * Based on Section 6 of Fatebound_Breach.md specification.
 * 
 * CRITICAL: This module must be PURE. No side effects, no Math.random().
 * Given the same input, must ALWAYS produce the same output.
 */

import type {
    GameState,
    Assignment,
    Packet,
    TurnResult,
} from '../types/gameState';

// ============================================================================
// Deep Clone Utility
// ============================================================================

/**
 * Creates a deep clone of the game state.
 * Required for immutable state updates.
 */
function cloneState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state));
}

// ============================================================================
// Effect Application
// ============================================================================

/**
 * Applies a packet's effect to its target.
 * Modifies the state in place (called on a cloned state).
 * 
 * Target types:
 * - Enemy ID (e.g., "enemy-0"): Apply damage/effects to enemy
 * - "player": Apply buffs/heals to player
 * - "trash": Discard packet with no effect
 * 
 * OVERKILL RULE: Excess damage is wasted. If an enemy has 2 HP
 * and takes 15 damage, only 2 HP is consumed.
 * 
 * @param state - Game state to modify (should be a clone)
 * @param packet - The packet being applied
 * @param targetId - ID of the target
 */
export function applyPacketEffect(
    state: GameState,
    packet: Packet,
    targetId: string
): void {
    // Handle trash disposal
    if (targetId === 'trash') {
        // Packet discarded - no effect
        return;
    }

    // Calculate Rarity Multiplier
    // COMMON: x1.0
    // RARE: x1.5 (Round down)
    // LEGENDARY: x2.0
    let effectiveValue = packet.value;
    if (packet.rarity === 'RARE') {
        effectiveValue = Math.floor(packet.value * 1.5);
    } else if (packet.rarity === 'LEGENDARY') {
        effectiveValue = packet.value * 2;
    }

    // OVERCLOCK Anomaly: +5 Damage to ATTACK packets
    if (state.anomaly === 'OVERCLOCK' && packet.type === 'ATTACK') {
        effectiveValue += 5;
    }

    // Handle player-targeted packets
    if (targetId === 'player') {
        switch (packet.type) {
            case 'HEAL':
                // Heal player, capped at maxHp
                state.player.hp = Math.min(
                    state.player.hp + effectiveValue,
                    state.player.maxHp
                );
                break;
            case 'DEFEND':
                // Add shield to player
                state.player.shield += effectiveValue;
                break;
            case 'ATTACK':
            case 'CRIT':
                // Damage packets can target player (self-damage, usually not intended)
                // But allowed for flexibility
                applyDamageToPlayer(state, effectiveValue);
                break;
            case 'MISS':
                // No effect
                break;
        }
        return;
    }

    // Handle enemy-targeted packets
    const enemy = state.enemies.find((e) => e.id === targetId);
    if (!enemy) {
        throw new Error(`Invalid target: ${targetId} not found`);
    }

    // CACHE_GOLD Immunity Rule
    if (enemy.type === 'CACHE_GOLD') {
        if (packet.type === 'CRIT') {
            // Unlocked! Infinite damage to ensure open
            enemy.hp = 0;
            return;
        } else {
            // Deflected
            return;
        }
    }

    switch (packet.type) {
        case 'ATTACK':
        case 'CRIT':
            // Apply damage to enemy (overkill is wasted)
            enemy.hp = Math.max(0, enemy.hp - effectiveValue);
            break;
        case 'MISS':
            // No damage
            break;
        case 'DEFEND':
        case 'HEAL':
            // These don't make sense on enemies but are allowed
            break;
    }
}

/**
 * Applies damage to the player, accounting for shield.
 * Shield absorbs damage first, then HP takes the rest.
 * 
 * @param state - Game state to modify
 * @param damage - Amount of damage to apply
 */
function applyDamageToPlayer(state: GameState, damage: number): void {
    let remainingDamage = damage;

    // Shield absorbs first
    if (state.player.shield > 0) {
        const shieldAbsorbed = Math.min(state.player.shield, remainingDamage);
        state.player.shield -= shieldAbsorbed;
        remainingDamage -= shieldAbsorbed;
    }

    // Remaining damage hits HP
    if (remainingDamage > 0) {
        state.player.hp = Math.max(0, state.player.hp - remainingDamage);
    }
}

// ============================================================================
// Enemy Phase
// ============================================================================

/**
 * Executes the enemy phase after player actions.
 * All surviving enemies execute their pre-calculated intents.
 * 
 * Enemy AI is DETERMINISTIC - intents are calculated and displayed
 * before the planning phase. No randomness in enemy actions.
 * 
 * @param state - Game state to modify (should be a clone)
 */
export function executeEnemyPhase(state: GameState): void {
    // Only living enemies attack
    const livingEnemies = state.enemies.filter((e) => e.hp > 0);

    for (const enemy of livingEnemies) {
        switch (enemy.intent) {
            case 'ATTACK':
                applyDamageToPlayer(state, enemy.damage);
                break;
            case 'DEFEND':
                // Enemy gains shield (future feature)
                break;
            case 'BUFF':
                // Enemy buffs self or allies (future feature)
                break;
            case 'IDLE':
                // Do nothing
                break;
        }
    }
}

// ============================================================================
// Dead Enemy Cleanup
// ============================================================================

/**
 * Removes dead enemies (HP <= 0) from the game state.
 * 
 * @param state - Game state to modify
 */
export function removeDeadEnemies(state: GameState): void {
    state.enemies = state.enemies.filter((e) => e.hp > 0);
}

// ============================================================================
// Victory/Defeat Checking
// ============================================================================

/**
 * Checks the win/loss condition after turn resolution.
 * 
 * @param state - Current game state
 * @returns 'VICTORY' | 'DEFEAT' | 'CONTINUE'
 */
export function checkTurnResult(state: GameState): TurnResult {
    // Defeat: Player HP <= 0
    if (state.player.hp <= 0) {
        return 'DEFEAT';
    }

    // Victory: All enemies eliminated
    if (state.enemies.length === 0 || state.enemies.every((e) => e.hp <= 0)) {
        return 'VICTORY';
    }

    // Continue: Game not yet decided
    return 'CONTINUE';
}

// ============================================================================
// Main Turn Resolution
// ============================================================================

/**
 * The core pure function for turn resolution.
 * Takes current state and player assignments, returns next state.
 * 
 * This function is the heart of the deterministic game loop.
 * It MUST be pure: no side effects, no randomness.
 * Given the same inputs, it MUST always produce the same output.
 * 
 * Resolution order:
 * 1. Apply all player packet assignments
 * 2. Remove dead enemies
 * 3. Execute enemy phase (surviving enemies attack)
 * 4. Update turn counter and status
 * 
 * @param currentState - The current game state
 * @param assignments - Array of packet-to-target assignments
 * @returns The new game state after resolution
 */
export function resolveTurn(
    currentState: GameState,
    assignments: Assignment[]
): GameState {
    // 1. Deep clone to ensure immutability
    const nextState = cloneState(currentState);

    // 1.1 Apply Start-of-Turn Anomalies & Jackpot
    if (nextState.jackpotHit) {
        // Jackpot!
        nextState.score += 5000;
        // Reset flag to avoid double counting if state persists (though it shouldn't)
        nextState.jackpotHit = false;
    }

    if (nextState.anomaly === 'DATA_LEAK') {
        nextState.player.hp = Math.min(nextState.player.hp + 5, nextState.player.maxHp);
    }

    // 2. Validate all assignments
    validateAssignments(nextState, assignments);

    // 3. Apply all packet effects
    for (const assignment of assignments) {
        const packet = nextState.dataStream.find((p) => p.id === assignment.packetId);
        if (!packet) {
            throw new Error(`Packet not found: ${assignment.packetId}`);
        }
        applyPacketEffect(nextState, packet, assignment.targetId);
    }

    // 4. Calculate Score & Remove dead enemies
    for (const enemy of nextState.enemies) {
        // Check if enemy is dying (was alive 0, now <= 0)
        // Wait, applyPacketEffect already modified nextState.enemies.
        // We need to know if they died THIS TURN.
        // We compare against currentState (which is immutable input).

        // Find original enemy state
        const originalEnemy = currentState.enemies.find(e => e.id === enemy.id);

        // If it was alive before AND is dead now
        if (originalEnemy && originalEnemy.hp > 0 && enemy.hp <= 0) {
            // Standard Kill: +100 Points (Any unit)
            nextState.score += 100;

            // Jackpot: +1000 Points (Using CACHE_GOLD unit)
            if (enemy.type === 'CACHE_GOLD') {
                nextState.score += 1000;
            }
        }
    }
    removeDeadEnemies(nextState);

    // 5. Execute enemy phase (surviving enemies attack)
    executeEnemyPhase(nextState);

    // 5.1 Apply End-of-Turn Anomalies
    if (nextState.anomaly === 'ION_STORM') {
        // 5 DMG to Player
        applyDamageToPlayer(nextState, 5);

        // 5 DMG to All Enemies
        nextState.enemies.forEach(e => {
            if (e.hp > 0) e.hp = Math.max(0, e.hp - 5);
        });

        // Cleanup enemies killed by storm
        removeDeadEnemies(nextState);
    }

    // 6. Clear assignments and data stream for next turn
    nextState.assignments = [];
    nextState.dataStream = [];

    // 7. Increment turn counter
    nextState.turnCounter += 1;

    // 8. Update status based on result
    const result = checkTurnResult(nextState);
    if (result === 'VICTORY' || result === 'DEFEAT') {
        nextState.status = 'RESOLVED';

        if (result === 'VICTORY') {
            // Completion Bonus: +500 Points
            nextState.score += 500;

            // Flawless Bonus: +200 Points (If Player HP == MaxHP)
            if (nextState.player.hp === nextState.player.maxHp) {
                nextState.score += 200;
            }
        }
    } else {
        nextState.status = 'WAITING_FOR_VRF';
    }

    return nextState;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates that all assignments are legal.
 * Throws an error if any assignment is invalid.
 * 
 * Rules:
 * - All packets in dataStream must be assigned
 * - Each packet can only be assigned once
 * - Targets must exist (enemy ID, 'player', or 'trash')
 * 
 * @param state - Current game state
 * @param assignments - Proposed assignments
 */
export function validateAssignments(
    state: GameState,
    assignments: Assignment[]
): void {
    const packetIds = new Set(state.dataStream.map((p) => p.id));
    const assignedPackets = new Set<string>();

    for (const assignment of assignments) {
        // Check packet exists
        if (!packetIds.has(assignment.packetId)) {
            throw new Error(`Invalid packet ID: ${assignment.packetId}`);
        }

        // Check for duplicate assignments
        if (assignedPackets.has(assignment.packetId)) {
            throw new Error(`Packet already assigned: ${assignment.packetId}`);
        }
        assignedPackets.add(assignment.packetId);

        // Validate target
        const validTarget =
            assignment.targetId === 'player' ||
            assignment.targetId === 'trash' ||
            state.enemies.some((e) => e.id === assignment.targetId);

        if (!validTarget) {
            throw new Error(`Invalid target: ${assignment.targetId}`);
        }
    }

    // Check all packets are assigned
    if (assignedPackets.size !== packetIds.size) {
        throw new Error(
            `Not all packets assigned. Expected ${packetIds.size}, got ${assignedPackets.size}`
        );
    }
}

// ============================================================================
// State Hashing (for verification)
// ============================================================================

/**
 * Generates a deterministic hash of the game state.
 * Used for replay verification and on-chain checkpoints.
 * 
 * @param state - Game state to hash
 * @returns Serialized state string (for hashing with keccak256)
 */
export function serializeStateForHash(state: GameState): string {
    // Create a normalized representation for consistent hashing
    const normalized = {
        status: state.status,
        levelSeed: state.levelSeed,
        turnCounter: state.turnCounter,
        levelId: state.levelId,
        player: {
            hp: state.player.hp,
            shield: state.player.shield,
        },
        enemies: state.enemies
            .map((e) => ({ id: e.id, hp: e.hp }))
            .sort((a, b) => a.id.localeCompare(b.id)),
    };

    return JSON.stringify(normalized);
}
