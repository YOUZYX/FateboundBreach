// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TurnVerifier
 * @author Fatebound Breach Team
 * @notice Deterministic game logic library that mirrors vrfMapper.ts and turnResolver.ts
 * @dev This contract MUST produce the exact same results as the TypeScript version.
 *      Used for on-chain verification of game outcomes.
 * 
 * CRITICAL: All logic here must be pure/deterministic. Same inputs = same outputs.
 */
library TurnVerifier {
    // =========================================================================
    // Constants - Must match gameState.ts PACKET_THRESHOLDS and PACKET_VALUES
    // =========================================================================
    
    // Packet Type Enum (matches TypeScript PacketType)
    enum PacketType { MISS, ATTACK, DEFEND, CRIT, HEAL }
    
    // Byte-to-Packet Thresholds (from vrfMapper.ts)
    // | Range     | Type   | Effect      |
    // |-----------|--------|-------------|
    // | 0-19      | MISS   | 0 Damage    |
    // | 20-150    | ATTACK | 5 Damage    |
    // | 151-200   | DEFEND | 5 Shield    |
    // | 201-240   | CRIT   | 15 Damage   |
    // | 241-255   | HEAL   | 10 HP       |
    uint8 constant THRESHOLD_MISS   = 19;
    uint8 constant THRESHOLD_ATTACK = 150;
    uint8 constant THRESHOLD_DEFEND = 200;
    uint8 constant THRESHOLD_CRIT   = 240;
    // 241-255 = HEAL
    
    // Packet effect values (from PACKET_VALUES in gameState.ts)
    uint8 constant VALUE_MISS   = 0;
    uint8 constant VALUE_ATTACK = 5;
    uint8 constant VALUE_DEFEND = 5;
    uint8 constant VALUE_CRIT   = 15;
    uint8 constant VALUE_HEAL   = 10;
    
    // =========================================================================
    // Structs - Mirror TypeScript interfaces
    // =========================================================================
    
    /// @notice A single packet derived from VRF bytes
    struct Packet {
        uint8 byteValue;        // Raw byte (0-255)
        PacketType packetType;  // Derived type
        uint8 value;            // Effect value
    }
    
    /// @notice Player state
    struct Player {
        uint16 hp;
        uint16 maxHp;
        uint16 shield;
    }
    
    /// @notice Enemy state
    // Flag for CACHE_GOLD (using high ID or specific property is better, 
    // but for simplicity we'll assume ID 99 or specific bool isCache)
    // Actually, let's add isCache to Enemy struct.
    struct Enemy {
        uint8 id;
        uint16 hp;
        uint16 maxHp;
        uint8 damage;       // Intent damage
        bool isAttacking;   // true if intent is ATTACK
        bool isCache;       // true if it's a loot cache (Zero-Day Cache)
    }
    
    /// @notice Complete game state for verification
    struct GameState {
        Player player;
        Enemy[] enemies;
        uint8 turnCounter;
        uint32 score; // Added score
    }

    /// @notice Assignment - maps packet index to target
    /// @dev targetType: 0 = trash, 1 = player, 2+ = enemy index + 2
    struct Assignment {
        uint8 packetIndex;
        uint8 targetType;   // 0=trash, 1=player, 2=enemy0, 3=enemy1, etc.
    }
    
    /// @notice Turn result after resolution
    enum TurnResult { CONTINUE, VICTORY, DEFEAT }
    
    // =========================================================================
    // VRF Mapper Functions (mirrors vrfMapper.ts)
    // =========================================================================
    
    /**
     * @notice Maps a single byte (0-255) to a PacketType
     * @dev Exact mirror of mapByteToPacketType() in vrfMapper.ts
     * @param byteValue The raw VRF byte
     * @return The derived PacketType
     */
    function mapByteToPacketType(uint8 byteValue) internal pure returns (PacketType) {
        if (byteValue <= THRESHOLD_MISS) {
            return PacketType.MISS;
        }
        if (byteValue <= THRESHOLD_ATTACK) {
            return PacketType.ATTACK;
        }
        if (byteValue <= THRESHOLD_DEFEND) {
            return PacketType.DEFEND;
        }
        if (byteValue <= THRESHOLD_CRIT) {
            return PacketType.CRIT;
        }
        return PacketType.HEAL;
    }
    
    /**
     * @notice Gets the effect value for a packet type
     * @dev Mirror of PACKET_VALUES lookup in vrfMapper.ts
     */
    function getPacketValue(PacketType pType) internal pure returns (uint8) {
        if (pType == PacketType.MISS) return VALUE_MISS;
        if (pType == PacketType.ATTACK) return VALUE_ATTACK;
        if (pType == PacketType.DEFEND) return VALUE_DEFEND;
        if (pType == PacketType.CRIT) return VALUE_CRIT;
        if (pType == PacketType.HEAL) return VALUE_HEAL;
        return 0;
    }
    
    /**
     * @notice Calculates number of packets for a given turn
     * @dev Formula: 5 + (turn % 3) - matches calculatePacketCount() in vrfMapper.ts
     * @param turn Turn number (1-indexed)
     * @return Number of packets for this turn
     */
    function calculatePacketCount(uint8 turn) internal pure returns (uint8) {
        return 5 + (turn % 3);
    }
    
    /**
     * @notice Derives the turn-specific seed from level seed
     * @dev Uses keccak256(levelSeed + "TurnN") - matches deriveTurnSeed() in vrfMapper.ts
     */
    function deriveTurnSeed(bytes32 levelSeed, uint8 turn) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(levelSeed, "Turn", turn));
    }
    
    /**
     * @notice Derives a hand of packets from level seed and turn number
     * @dev Main entry point - mirrors derivePacketsFromSeed() in vrfMapper.ts
     * @param levelSeed The VRF level seed
     * @param turn Current turn number
     * @return packets Array of derived Packet structs
     */
    function deriveHand(
        bytes32 levelSeed, 
        uint8 turn
    ) internal pure returns (Packet[] memory packets) {
        uint8 packetCount = calculatePacketCount(turn);
        bytes32 turnSeed = deriveTurnSeed(levelSeed, turn);
        
        packets = new Packet[](packetCount);
        
        for (uint8 i = 0; i < packetCount; i++) {
            // Each byte of the hash maps to one packet
            uint8 byteValue = uint8(turnSeed[i % 32]);
            PacketType pType = mapByteToPacketType(byteValue);
            
            packets[i] = Packet({
                byteValue: byteValue,
                packetType: pType,
                value: getPacketValue(pType)
            });
        }
    }
    
    // =========================================================================
    // Turn Resolver Functions (mirrors turnResolver.ts)
    // =========================================================================
    
    /**
     * @notice Applies a packet effect to player
     * @dev Mirrors player-targeted logic in applyPacketEffect()
     */
    function applyPacketToPlayer(
        Player memory player,
        Packet memory packet
    ) internal pure returns (Player memory) {
        if (packet.packetType == PacketType.HEAL) {
            // Heal player, capped at maxHp
            uint16 newHp = player.hp + packet.value;
            player.hp = newHp > player.maxHp ? player.maxHp : newHp;
        } else if (packet.packetType == PacketType.DEFEND) {
            // Add shield
            player.shield += packet.value;
        }
        // ATTACK, CRIT, MISS on player = no effect in standard rules
        return player;
    }

    /**
     * @notice Applies a packet effect to enemy
     * @dev Mirrors enemy-targeted logic in applyPacketEffect()
     * @dev OVERKILL RULE: Excess damage is wasted
     * @dev IMMUNITY RULE: Cache only takes damage from CRIT.
     */
    function applyPacketToEnemy(
        Enemy memory enemy,
        Packet memory packet
    ) internal pure returns (Enemy memory) {
        // IMMUNITY RULE
        if (enemy.isCache) {
            if (packet.packetType == PacketType.CRIT) {
                // Instantly destroyed
                enemy.hp = 0;
            }
            // Else deflected (no damage)
            return enemy;
        }

        if (packet.packetType == PacketType.ATTACK || packet.packetType == PacketType.CRIT) {
            // Apply damage (overkill is wasted, HP cannot go below 0)
            if (enemy.hp > packet.value) {
                enemy.hp -= packet.value;
            } else {
                enemy.hp = 0;
            }
        }
        // MISS, DEFEND, HEAL on enemies = no effect
        return enemy;
    }

    /**
     * @notice Applies damage to player accounting for shield
     * @dev Mirrors applyDamageToPlayer() in turnResolver.ts
     */
    function applyDamageToPlayer(
        Player memory player,
        uint16 damage
    ) internal pure returns (Player memory) {
        uint16 remainingDamage = damage;
        
        // Shield absorbs first
        if (player.shield > 0) {
            if (player.shield >= remainingDamage) {
                player.shield -= remainingDamage;
                return player;
            } else {
                remainingDamage -= player.shield;
                player.shield = 0;
            }
        }
        
        // Remaining damage hits HP
        if (player.hp > remainingDamage) {
            player.hp -= remainingDamage;
        } else {
            player.hp = 0;
        }
        
        return player;
    }
    
    /**
     * @notice Executes enemy attack phase
     * @dev Mirrors executeEnemyPhase() in turnResolver.ts
     */
    function executeEnemyPhase(
        Player memory player,
        Enemy[] memory enemies
    ) internal pure returns (Player memory) {
        for (uint8 i = 0; i < enemies.length; i++) {
            // Only living enemies with ATTACK intent deal damage
            if (enemies[i].hp > 0 && enemies[i].isAttacking) {
                player = applyDamageToPlayer(player, enemies[i].damage);
            }
        }
        return player;
    }
    
    /**
     * @notice Checks win/loss conditions
     * @dev Mirrors checkTurnResult() in turnResolver.ts
     */
    function checkTurnResult(
        Player memory player,
        Enemy[] memory enemies
    ) internal pure returns (TurnResult) {
        // DEFEAT: Player HP <= 0
        if (player.hp == 0) {
            return TurnResult.DEFEAT;
        }
        
        // VICTORY: All enemies dead
        bool allEnemiesDead = true;
        for (uint8 i = 0; i < enemies.length; i++) {
            if (enemies[i].hp > 0) {
                allEnemiesDead = false;
                break;
            }
        }
        
        if (allEnemiesDead) {
            return TurnResult.VICTORY;
        }
        
        return TurnResult.CONTINUE;
    }

    /**
     * @notice Resolves a complete turn given state and assignments
     * @dev Main entry point - mirrors resolveTurn() in turnResolver.ts
     *      This is a PURE function that produces deterministic results.
     */
    function resolveTurn(
        bytes32 levelSeed,
        Player memory initialPlayer,
        Enemy[] memory initialEnemies,
        uint8 turn,
        Assignment[] memory assignments,
        uint32 initialScore
    ) internal pure returns (
        Player memory newPlayer,
        Enemy[] memory newEnemies,
        TurnResult result,
        uint32 newScore
    ) {
        // Generate hand from seed
        Packet[] memory hand = deriveHand(levelSeed, turn);
        
        // Validate assignment count
        require(assignments.length == hand.length, "Invalid assignment count");
        
        // Copy state for modification
        newPlayer = initialPlayer;
        newScore = initialScore;
        newEnemies = new Enemy[](initialEnemies.length);
        for (uint8 i = 0; i < initialEnemies.length; i++) {
            newEnemies[i] = initialEnemies[i];
        }
        
        // Phase 1: Apply player packet assignments
        for (uint8 i = 0; i < assignments.length; i++) {
            Packet memory packet = hand[assignments[i].packetIndex];
            uint8 targetType = assignments[i].targetType;
            
            if (targetType == 0) {
                // Trash - no effect
                continue;
            } else if (targetType == 1) {
                // Player target
                newPlayer = applyPacketToPlayer(newPlayer, packet);
            } else {
                // Enemy target (targetType - 2 = enemy index)
                uint8 enemyIndex = targetType - 2;
                require(enemyIndex < newEnemies.length, "Invalid enemy target");
                
                // Track HP before to see if it died this turn (simplified logic)
                // Actually easier to check dead caches after all packets applied
                newEnemies[enemyIndex] = applyPacketToEnemy(newEnemies[enemyIndex], packet);
            }
        }
        
        // Check for newly dead caches/enemies to award score
        // If it was alive in initial and dead in new, award points.
        for (uint8 i = 0; i < newEnemies.length; i++) {
            if (initialEnemies[i].hp > 0 && newEnemies[i].hp == 0) {
                // Standard Kill: +100 Points (Any unit)
                newScore += 100;

                // Jackpot: +1000 Points (Using CACHE_GOLD unit)
                if (newEnemies[i].isCache) {
                    newScore += 1000;
                }
            }
        }
        
        // Phase 2: Enemy attacks (only if game hasn't ended)
        result = checkTurnResult(newPlayer, newEnemies);
        if (result == TurnResult.CONTINUE) {
            newPlayer = executeEnemyPhase(newPlayer, newEnemies);
            // Re-check after enemy phase
            result = checkTurnResult(newPlayer, newEnemies);
        }
        
        // Bonus for Victory
        if (result == TurnResult.VICTORY) {
            // Completion Bonus: +500 Points
            newScore += 500;

            // Flawless Bonus: +200 Points (If Player HP == MaxHP)
            if (newPlayer.hp == newPlayer.maxHp) {
                newScore += 200;
            }
        }
    }
    
    /**
     * @notice Computes a deterministic hash of the game state
     * @dev Used for on-chain state verification without storing full state
     */
    function computeStateHash(
        Player memory player,
        Enemy[] memory enemies,
        uint8 turn,
        uint32 score
    ) internal pure returns (bytes32) {
        bytes memory enemyData;
        for (uint8 i = 0; i < enemies.length; i++) {
            enemyData = abi.encodePacked(
                enemyData,
                enemies[i].id,
                enemies[i].hp,
                enemies[i].maxHp,
                enemies[i].damage,
                enemies[i].isAttacking,
                enemies[i].isCache
            );
        }
        
        return keccak256(abi.encodePacked(
            player.hp,
            player.maxHp,
            player.shield,
            turn,
            score,
            enemyData
        ));
    }
}
