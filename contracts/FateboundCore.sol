// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TurnVerifier.sol";

// =========================================================================
// Pyth Entropy V2 Interface (Monad Testnet)
// =========================================================================

/**
 * @title IEntropyV2
 * @notice Interface for Pyth Entropy V2 on Monad
 */
interface IEntropyV2 {
    /**
     * @notice Request randomness (simplest form - uses default provider)
     * @return sequenceNumber Unique identifier for this request
     */
    function requestV2() external payable returns (uint64 sequenceNumber);
    
    /**
     * @notice Get the fee required for a randomness request
     * @return fee The fee in wei
     */
    function getFeeV2() external view returns (uint128 fee);
}

/**
 * @title IEntropyConsumer
 * @notice Interface that contracts must implement to receive entropy callbacks
 */
interface IEntropyConsumer {
    /**
     * @notice Called by Entropy contract with the random number
     * @param sequenceNumber The sequence number from the request
     * @param provider The provider that generated the randomness
     * @param randomNumber The random number generated
     */
    function _entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) external;
}

/**
 * @title FateboundCore
 * @author Fatebound Breach Team
 * @notice Main game contract with Pyth Entropy V2 VRF integration
 * @dev Uses Pyth Entropy V2 for verifiable randomness on Monad Testnet
 */
contract FateboundCore is IEntropyConsumer {
    using TurnVerifier for *;

    // =========================================================================
    // Constants
    // =========================================================================
    
    /// @notice Pyth Entropy V2 contract address on Monad Testnet (Verified working address)
    address public constant ENTROPY = 0x825c0390f379C631f3Cf11A82a37D20BddF93c07;
    
    /// @notice Default player HP for Level 1
    uint16 constant DEFAULT_PLAYER_HP = 100;

    // =========================================================================
    // Events
    // =========================================================================
    
    event GameRequested(
        uint256 indexed gameId,
        address indexed player,
        uint64 sequenceNumber
    );
    
    event GameStarted(
        uint256 indexed gameId,
        address indexed player,
        bytes32 seed
    );
    
    event TurnSubmitted(
        uint256 indexed gameId,
        uint8 turn,
        bytes32 stateHash,
        TurnVerifier.TurnResult result
    );
    
    event GameCompleted(
        uint256 indexed gameId,
        address indexed player,
        uint256 score // Updated to uint256 as requested
    );

    // =========================================================================
    // Enums
    // =========================================================================
    
    enum GameStatus {
        NONE,
        WAITING_FOR_VRF,
        ACTIVE,
        COMPLETED
    }

    // =========================================================================
    // Structs
    // =========================================================================
    
    /// @notice Game session data
    struct Game {
        address player;
        bytes32 seed;
        bytes32 stateHash;
        uint8 currentTurn;
        uint32 score; // Track score on-chain
        GameStatus status;
        TurnVerifier.TurnResult result;
    }

    // =========================================================================
    // State Variables
    // =========================================================================
    
    /// @notice Game counter for unique IDs
    uint256 public gameCounter;
    
    /// @notice All games by ID
    mapping(uint256 => Game) public games;
    
    /// @notice Active game per player (one game at a time)
    mapping(address => uint256) public activeGameId;
    
    /// @notice Maps Pyth sequence numbers to game IDs for callback routing
    mapping(uint64 => uint256) public sequenceToGameId;

    // =========================================================================
    // Modifiers
    // =========================================================================
    
    /// @notice Ensures only the Entropy contract can call the callback
    modifier onlyEntropy() {
        require(msg.sender == ENTROPY, "Only Entropy contract can call");
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================
    
    constructor() {
        // No initialization needed - uses constant ENTROPY address
    }

    // =========================================================================
    // Game Management - VRF Flow
    // =========================================================================
    
    /**
     * @notice Starts a new game by requesting VRF randomness
     * @dev Payable - requires sending enough ETH to cover VRF fee
     * @return gameId The new game's ID
     * @return sequenceNumber The Pyth sequence number for tracking
     */
    function startGame() external payable returns (
        uint256 gameId,
        uint64 sequenceNumber
    ) {
        // Check player doesn't have an active game in progress
        uint256 existingGame = activeGameId[msg.sender];
        if (existingGame != 0) {
            GameStatus existingStatus = games[existingGame].status;
            require(
                existingStatus == GameStatus.COMPLETED || existingStatus == GameStatus.NONE,
                "Complete or forfeit existing game first"
            );
        }
        
        // Calculate and verify fee using V2 interface
        uint128 fee = IEntropyV2(ENTROPY).getFeeV2();
        require(msg.value >= fee, "Insufficient fee for VRF");
        
        // Create game record
        gameCounter++;
        gameId = gameCounter;
        
        games[gameId] = Game({
            player: msg.sender,
            seed: bytes32(0), // Will be set in callback
            stateHash: bytes32(0),
            currentTurn: 0,
            score: 0,
            status: GameStatus.WAITING_FOR_VRF,
            result: TurnVerifier.TurnResult.CONTINUE
        });
        
        activeGameId[msg.sender] = gameId;
        
        // Request randomness from Pyth Entropy V2 (simplest form)
        sequenceNumber = IEntropyV2(ENTROPY).requestV2{value: fee}();
        
        // Map sequence to game for callback
        sequenceToGameId[sequenceNumber] = gameId;
        
        emit GameRequested(gameId, msg.sender, sequenceNumber);
        
        // Refund excess ETH
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    /**
     * @notice Callback from Pyth Entropy with the random number
     * @dev Only callable by the Entropy contract (V2 callback signature)
     * @param sequenceNumber The sequence number from the request
     * @param _provider The provider address (unused but required by interface)
     * @param randomNumber The VRF-generated random number
     */
    function _entropyCallback(
        uint64 sequenceNumber,
        address _provider,
        bytes32 randomNumber
    ) external override onlyEntropy {
        _provider; // Silence unused variable warning
        
        uint256 gameId = sequenceToGameId[sequenceNumber];
        require(gameId != 0, "Unknown sequence number");
        
        Game storage game = games[gameId];
        require(game.status == GameStatus.WAITING_FOR_VRF, "Game not waiting for VRF");
        
        // Set the seed and initialize game state
        game.seed = randomNumber;
        game.currentTurn = 1;
        game.status = GameStatus.ACTIVE;
        
        // Compute initial state hash
        TurnVerifier.Player memory initialPlayer = TurnVerifier.Player({
            hp: DEFAULT_PLAYER_HP,
            maxHp: DEFAULT_PLAYER_HP,
            shield: 0
        });
        
        TurnVerifier.Enemy[] memory initialEnemies = _getDefaultEnemies();
        
        game.stateHash = TurnVerifier.computeStateHash(
            initialPlayer,
            initialEnemies,
            1,
            0 // Initial score
        );
        
        // Clean up mapping
        delete sequenceToGameId[sequenceNumber];
        
        emit GameStarted(gameId, game.player, randomNumber);
    }
    
    /**
     * @notice Submits a turn for verification
     * @param gameId The game ID
     * @param player Claimed player state before turn
     * @param enemies Claimed enemy states before turn
     * @param assignments Packet-to-target assignments
     */
    function submitTurn(
        uint256 gameId,
        TurnVerifier.Player memory player,
        TurnVerifier.Enemy[] memory enemies,
        TurnVerifier.Assignment[] memory assignments
    ) external {
        Game storage game = games[gameId];
        
        require(msg.sender == game.player, "Not your game");
        require(game.status == GameStatus.ACTIVE, "Game not active");
        
        // Verify claimed pre-state matches stored hash
        // (Note: computeStateHash signature changed)
        bytes32 claimedStateHash = TurnVerifier.computeStateHash(
            player,
            enemies,
            game.currentTurn,
            game.score
        );
        require(claimedStateHash == game.stateHash, "State mismatch - invalid pre-state");
        
        // Resolve turn using deterministic logic
        (
            TurnVerifier.Player memory newPlayer,
            TurnVerifier.Enemy[] memory newEnemies,
            TurnVerifier.TurnResult result,
            uint32 newScore
        ) = TurnVerifier.resolveTurn(
            game.seed,
            player,
            enemies,
            game.currentTurn,
            assignments,
            game.score
        );
        
        // Update game state
        game.currentTurn++;
        game.score = newScore;
        game.stateHash = TurnVerifier.computeStateHash(
            newPlayer,
            newEnemies,
            game.currentTurn,
            newScore
        );
        
        emit TurnSubmitted(gameId, game.currentTurn - 1, game.stateHash, result);
        
        // Handle game end
        if (result != TurnVerifier.TurnResult.CONTINUE) {
            game.status = GameStatus.COMPLETED;
            game.result = result;
            
            emit GameCompleted(
                gameId, 
                msg.sender, 
                newScore
            );
        }
    }

    /**
     * @notice Claims victory and submits verification data.
     * @dev Alternative to submitTurn if we move fully client-side verification.
     *      For now, we trust submitTurn.
     *      BUT current task asks for a specific claimVictory.
     */
    /**
     * @notice Claims victory and submits verification data.
     * @param gameId The ID of the game to claim.
     * @param claimedScore The final score claimed by the player.
     * @dev We are using "Optimistic Scoring" for this prototype.
     */
    function claimVictory(
        uint256 gameId, 
        uint256 claimedScore
    ) external {
        Game storage game = games[gameId];
        require(msg.sender == game.player, "Not your game");
        require(game.status == GameStatus.ACTIVE, "Game not active");
        
        // Optimistic: We trust the score in this specific claim function
        game.status = GameStatus.COMPLETED;
        game.result = TurnVerifier.TurnResult.VICTORY;
        // Cast to uint32 for storage, assuming it fits.
        game.score = uint32(claimedScore); 
        
        emit GameCompleted(
            gameId, 
            msg.sender, 
            claimedScore
        );
    }
    
    /**
     * @notice Forfeits an active game
     */
    function forfeitGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.player, "Not your game");
        require(
            game.status == GameStatus.ACTIVE || game.status == GameStatus.WAITING_FOR_VRF,
            "Game not active"
        );
        
        game.status = GameStatus.COMPLETED;
        game.result = TurnVerifier.TurnResult.DEFEAT;
        
        emit GameCompleted(
            gameId, 
            msg.sender, 
            game.score
        );
    }

    // =========================================================================
    // View Functions
    // =========================================================================
    
    /**
     * @notice Gets the current VRF fee required to start a game
     * @return fee The fee in wei
     */
    function getVRFFee() external view returns (uint128) {
        return IEntropyV2(ENTROPY).getFeeV2();
    }
    
    /**
     * @notice Gets full game information
     */
    function getGame(uint256 gameId) external view returns (
        address player,
        bytes32 seed,
        bytes32 stateHash,
        uint8 currentTurn,
        GameStatus status,
        TurnVerifier.TurnResult result
    ) {
        Game storage game = games[gameId];
        return (
            game.player,
            game.seed,
            game.stateHash,
            game.currentTurn,
            game.status,
            game.result
        );
    }
    
    /**
     * @notice Gets the current game state hash for a game
     */
    function getGameStateHash(uint256 gameId) external view returns (bytes32) {
        return games[gameId].stateHash;
    }
    
    /**
     * @notice Checks if a player has an active game
     */
    function hasActiveGame(address player) external view returns (bool) {
        uint256 gameId = activeGameId[player];
        if (gameId == 0) return false;
        GameStatus status = games[gameId].status;
        return status == GameStatus.ACTIVE || status == GameStatus.WAITING_FOR_VRF;
    }
    
    /**
     * @notice Gets the hand of packets for a given turn
     */
    function getHand(
        bytes32 seed, 
        uint8 turn
    ) external pure returns (TurnVerifier.Packet[] memory) {
        return TurnVerifier.deriveHand(seed, turn);
    }
    
    /**
     * @notice Simulates a turn resolution
     */
    function simulateTurn(
        bytes32 seed,
        TurnVerifier.Player memory player,
        TurnVerifier.Enemy[] memory enemies,
        uint8 turn,
        TurnVerifier.Assignment[] memory assignments,
        uint32 initialScore
    ) external pure returns (
        TurnVerifier.Player memory newPlayer,
        TurnVerifier.Enemy[] memory newEnemies,
        TurnVerifier.TurnResult result,
        uint32 newScore
    ) {
        return TurnVerifier.resolveTurn(seed, player, enemies, turn, assignments, initialScore);
    }

    // =========================================================================
    // Internal Functions
    // =========================================================================
    
    /**
     * @notice Returns the default enemy configuration (Level 1)
     */
    function _getDefaultEnemies() internal pure returns (TurnVerifier.Enemy[] memory) {
        TurnVerifier.Enemy[] memory enemies = new TurnVerifier.Enemy[](3);
        
        // FIREWALL_A
        enemies[0] = TurnVerifier.Enemy({
            id: 0,
            hp: 20,
            maxHp: 20,
            damage: 5,
            isAttacking: true,
            isCache: false
        });
        
        // DRONE_B
        enemies[1] = TurnVerifier.Enemy({
            id: 1,
            hp: 15,
            maxHp: 15,
            damage: 3,
            isAttacking: true,
            isCache: false
        });
        
        // SENTINEL_C
        enemies[2] = TurnVerifier.Enemy({
            id: 2,
            hp: 30,
            maxHp: 30,
            damage: 8,
            isAttacking: false,
            isCache: false
        });
        
        return enemies;
    }

    // =========================================================================
    // Receive ETH
    // =========================================================================
    
    receive() external payable {}
}
