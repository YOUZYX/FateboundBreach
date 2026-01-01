import type { Enemy, Player } from '../types/gameState';
import { toBytes } from 'viem';

/**
 * Procedurally generates a level configuration from a seed.
 * Verifiable and deterministic.
 */
export function generateLevelFromSeed(seed: string): { enemies: Enemy[], player: Player } {
    // 1. Convert seed to bytes
    // Ensure we have enough bytes. A standard bytes32 seed has 32 bytes.
    const bytes = toBytes(seed);

    // Default Player State
    const player: Player = {
        hp: 100,
        maxHp: 100,
        shield: 0,
        position: { x: 0, y: 2 } // Fixed start
    };

    // 2. Determine Enemy Count
    // byte[0] % 3 + 2 => 2, 3, or 4 enemies
    const countByte = bytes[0] || 0;
    const enemyCount = (countByte % 3) + 2;

    const enemies: Enemy[] = [];
    const usedPositions = new Set<string>();
    usedPositions.add(`${player.position.x},${player.position.y}`);

    // 3. Spawn Enemies
    // We start consuming bytes from index 1.
    // Each enemy needs 3 bytes: X, Y, Type
    let bytePtr = 1;

    for (let i = 0; i < enemyCount; i++) {
        // Ensure we don't run out of bytes (wrap around if needed)
        const bX = bytes[(bytePtr++) % bytes.length];
        const bY = bytes[(bytePtr++) % bytes.length];
        const bType = bytes[(bytePtr++) % bytes.length];

        // Map to Grid (6x6)
        let x = bX % 6;
        let y = bY % 6;

        // Collision Handling (Linear Probe)
        // If position is taken, scan reasonably to find an open slot.
        // We limit attempts to avoid infinite loops (though unlikely on 6x6 with max 4 enemies).
        let attempts = 0;
        while (usedPositions.has(`${x},${y}`) && attempts < 36) {
            x = (x + 1) % 6;
            if (x === 0) y = (y + 1) % 6;
            attempts++;
        }

        // Add to used
        usedPositions.add(`${x},${y}`);

        // Determine Type
        let type = 'drone';
        let name = 'DRONE_B';
        let hp = 15;
        let damage = 3;
        let intent: Enemy['intent'] = 'ATTACK';

        // 0-100: Drone, 101-200: Firewall, 201+: Sentinel
        if (bType >= 101 && bType <= 200) {
            type = 'firewall';
            name = 'FIREWALL_A';
            hp = 20;
            damage = 5;
        } else if (bType > 200) {
            type = 'sentinel';
            name = 'SENTINEL_C';
            hp = 30;
            damage = 8;
            intent = 'DEFEND'; // Sentinels often start defending
        }

        enemies.push({
            id: `enemy-${i}`,
            name,
            hp,
            maxHp: hp,
            type,
            position: { x, y },
            intent,
            damage
        });
    }

    // 4. Spawn Zero-Day Cache (Greed Mechanic)
    // Find a spot far from player (> 3 steps)
    let cacheAttempts = 0;
    while (cacheAttempts < 50) {
        const cx = (bytePtr + cacheAttempts) % 6;
        const cy = (bytePtr + cacheAttempts + 3) % 6; // Offset Y

        // Check collision
        if (!usedPositions.has(`${cx},${cy}`)) {
            // Check distance (Manhattan)
            const dist = Math.abs(cx - player.position.x) + Math.abs(cy - player.position.y);

            if (dist >= 3) {
                // Success
                enemies.push({
                    id: `cache-gold`,
                    name: 'ZERO_DAY_CACHE',
                    hp: 1,
                    maxHp: 1,
                    type: 'CACHE_GOLD',
                    position: { x: cx, y: cy },
                    intent: 'IDLE',
                    damage: 0
                });
                break;
            }
        }
        cacheAttempts++;
    }

    return { enemies, player };
}
