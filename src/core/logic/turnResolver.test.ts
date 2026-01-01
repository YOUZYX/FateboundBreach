/**
 * Turn Resolver Unit Tests
 * 
 * Tests the deterministic turn resolution logic.
 */

import { describe, it, expect } from 'vitest';
import {
    resolveTurn,
    applyPacketEffect,
    checkTurnResult,
    validateAssignments,
} from './turnResolver';
import type { GameState, Packet, Assignment } from '../types/gameState';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestPacket(overrides?: Partial<Packet>): Packet {
    return {
        id: 'packet-0',
        hexValue: '0x64',
        byteValue: 100,
        type: 'ATTACK',
        value: 5,
        rarity: 'COMMON',
        ...overrides,
    };
}

function createTestState(overrides?: Partial<GameState>): GameState {
    return {
        status: 'EXECUTING',
        levelSeed: '0x1234',
        turnCounter: 1,
        levelId: 1,
        grid: { width: 6, height: 6 },
        player: { hp: 100, maxHp: 100, shield: 0, position: { x: 0, y: 0 } },
        enemies: [
            {
                id: 'enemy-0',
                name: 'Drone',
                hp: 20,
                maxHp: 20,
                type: 'basic',
                position: { x: 3, y: 3 },
                intent: 'ATTACK',
                damage: 5,
            },
        ],
        dataStream: [createTestPacket()],
        assignments: [],
        score: 0,
        anomaly: 'STABLE',
        jackpotHit: false,
        ...overrides,
    };
}

// ============================================================================
// applyPacketEffect Tests
// ============================================================================

describe('applyPacketEffect', () => {
    it('ATTACK should reduce enemy HP by 5', () => {
        const state = createTestState();
        const packet = createTestPacket({ type: 'ATTACK', value: 5 });

        applyPacketEffect(state, packet, 'enemy-0');

        expect(state.enemies[0].hp).toBe(15);
    });

    it('CRIT should reduce enemy HP by 15', () => {
        const state = createTestState();
        const packet = createTestPacket({ type: 'CRIT', value: 15 });

        applyPacketEffect(state, packet, 'enemy-0');

        expect(state.enemies[0].hp).toBe(5);
    });

    it('MISS should not reduce enemy HP', () => {
        const state = createTestState();
        const packet = createTestPacket({ type: 'MISS', value: 0 });

        applyPacketEffect(state, packet, 'enemy-0');

        expect(state.enemies[0].hp).toBe(20);
    });

    it('DEFEND should add shield to player', () => {
        const state = createTestState();
        const packet = createTestPacket({ type: 'DEFEND', value: 5 });

        applyPacketEffect(state, packet, 'player');

        expect(state.player.shield).toBe(5);
    });

    it('HEAL should restore player HP', () => {
        const state = createTestState({
            player: { hp: 50, maxHp: 100, shield: 0, position: { x: 0, y: 0 } },
        });
        const packet = createTestPacket({ type: 'HEAL', value: 10 });

        applyPacketEffect(state, packet, 'player');

        expect(state.player.hp).toBe(60);
    });

    it('HEAL should cap at maxHp', () => {
        const state = createTestState({
            player: { hp: 95, maxHp: 100, shield: 0, position: { x: 0, y: 0 } },
        });
        const packet = createTestPacket({ type: 'HEAL', value: 10 });

        applyPacketEffect(state, packet, 'player');

        expect(state.player.hp).toBe(100);
    });

    it('trash target should have no effect', () => {
        const state = createTestState();
        const initialEnemyHp = state.enemies[0].hp;
        const packet = createTestPacket({ type: 'ATTACK', value: 5 });

        applyPacketEffect(state, packet, 'trash');

        expect(state.enemies[0].hp).toBe(initialEnemyHp);
    });

    it('OVERKILL: excess damage is wasted', () => {
        const state = createTestState();
        state.enemies[0].hp = 2; // Only 2 HP left
        const packet = createTestPacket({ type: 'CRIT', value: 15 });

        applyPacketEffect(state, packet, 'enemy-0');

        // HP should be 0, not negative
        expect(state.enemies[0].hp).toBe(0);
    });
});

// ============================================================================
// Player Damage with Shield Tests
// ============================================================================

describe('applyDamageToPlayer via enemy phase', () => {
    it('damage should be absorbed by shield first', () => {
        const state = createTestState({
            player: { hp: 100, maxHp: 100, shield: 10, position: { x: 0, y: 0 } },
        });
        state.enemies[0].intent = 'ATTACK';
        state.enemies[0].damage = 8;

        // Simulate enemy attack through resolveTurn
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];
        const nextState = resolveTurn(state, assignments);

        // Shield should absorb 8 damage
        expect(nextState.player.shield).toBe(2);
        expect(nextState.player.hp).toBe(100);
    });

    it('excess damage after shield goes to HP', () => {
        const state = createTestState({
            player: { hp: 100, maxHp: 100, shield: 3, position: { x: 0, y: 0 } },
        });
        state.enemies[0].intent = 'ATTACK';
        state.enemies[0].damage = 10;

        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];
        const nextState = resolveTurn(state, assignments);

        // Shield absorbs 3, HP takes 7
        expect(nextState.player.shield).toBe(0);
        expect(nextState.player.hp).toBe(93);
    });
});

// ============================================================================
// checkTurnResult Tests
// ============================================================================

describe('checkTurnResult', () => {
    it('should return VICTORY when all enemies dead', () => {
        const state = createTestState();
        state.enemies = [];

        expect(checkTurnResult(state)).toBe('VICTORY');
    });

    it('should return DEFEAT when player HP is 0', () => {
        const state = createTestState();
        state.player.hp = 0;

        expect(checkTurnResult(state)).toBe('DEFEAT');
    });

    it('should return CONTINUE when game is ongoing', () => {
        const state = createTestState();

        expect(checkTurnResult(state)).toBe('CONTINUE');
    });
});

// ============================================================================
// validateAssignments Tests
// ============================================================================

describe('validateAssignments', () => {
    it('should accept valid assignments', () => {
        const state = createTestState();
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];

        expect(() => validateAssignments(state, assignments)).not.toThrow();
    });

    it('should throw for invalid packet ID', () => {
        const state = createTestState();
        const assignments: Assignment[] = [{ packetId: 'invalid', targetId: 'enemy-0' }];

        expect(() => validateAssignments(state, assignments)).toThrow();
    });

    it('should throw for duplicate packet assignment', () => {
        const state = createTestState({
            dataStream: [
                createTestPacket({ id: 'packet-0' }),
                createTestPacket({ id: 'packet-1' }),
            ],
        });
        const assignments: Assignment[] = [
            { packetId: 'packet-0', targetId: 'enemy-0' },
            { packetId: 'packet-0', targetId: 'player' }, // Duplicate!
        ];

        expect(() => validateAssignments(state, assignments)).toThrow();
    });

    it('should throw for invalid target', () => {
        const state = createTestState();
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'invalid-target' }];

        expect(() => validateAssignments(state, assignments)).toThrow();
    });

    it('should throw if not all packets assigned', () => {
        const state = createTestState({
            dataStream: [
                createTestPacket({ id: 'packet-0' }),
                createTestPacket({ id: 'packet-1' }),
            ],
        });
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];

        expect(() => validateAssignments(state, assignments)).toThrow();
    });
});

// ============================================================================
// resolveTurn Tests
// ============================================================================

describe('resolveTurn', () => {
    it('should not mutate original state (immutability)', () => {
        const state = createTestState();
        const originalHp = state.enemies[0].hp;
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];

        resolveTurn(state, assignments);

        expect(state.enemies[0].hp).toBe(originalHp);
    });

    it('should increment turn counter', () => {
        const state = createTestState();
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];

        const nextState = resolveTurn(state, assignments);

        expect(nextState.turnCounter).toBe(2);
    });

    it('should clear dataStream after resolution', () => {
        const state = createTestState();
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];

        const nextState = resolveTurn(state, assignments);

        expect(nextState.dataStream).toEqual([]);
    });

    it('should remove dead enemies', () => {
        const state = createTestState();
        state.enemies[0].hp = 5; // Will die from ATTACK
        const packet = createTestPacket({ type: 'ATTACK', value: 5 });
        state.dataStream = [packet];
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];

        const nextState = resolveTurn(state, assignments);

        expect(nextState.enemies.length).toBe(0);
    });

    it('DETERMINISM: same input produces same output', () => {
        const state = createTestState();
        const assignments: Assignment[] = [{ packetId: 'packet-0', targetId: 'enemy-0' }];

        const result1 = resolveTurn(state, assignments);
        const result2 = resolveTurn(state, assignments);

        expect(result1).toEqual(result2);
    });
});
