/**
 * src/scenes/MainScene.ts - Complete Pool Integration Implementation
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Integrated ProjectilePool for zero-allocation projectile management
 * - Added PerformanceDebugOverlay for real-time pool monitoring
 * - Proper cleanup of all pooled resources on scene shutdown
 * - Memory-efficient entity management with pooling systems
 * 
 * FEATURES:
 * - Wave-based enemy spawning with configurable difficulty
 * - Pool-aware collision system with frame-gate protection
 * - Advanced weapon system with pierce and explosive projectiles
 * - Comprehensive debug overlays (F1: general, F2: collision, F3: performance)
 * - Clean shutdown and resource management
 */

import Phaser from "phaser";
import Player from "../entities/Player";
import Enemy from '../entities/Enemy';
import { createPlayer } from '../factories/EntityFactory';
import DebugOverlay from '../ui/DebugOverlay';
import CollisionDebugOverlay from '../ui/CollisionDebugOverlay';
import PerformanceDebugOverlay from '../ui/PerformanceDebugOverlay';
import WeaponDisplay from '../ui/WeaponDisplay';
import Projectile from '../entities/Projectile';
import { EnemySpawnService, DEFAULT_WAVES } from '../services/EnemySpawnService';
import { CollisionService } from '../services/CollisionService';
import { WeaponSystem } from '../systems/WeaponSystem';
import type { CollisionGroups, CollisionCallbacks } from '../interfaces/ICollisionSystem';
import Logger from '../utils/Logger';

export default class MainScene extends Phaser.Scene {
    // ========================================
    // Core Game Entities
    // ========================================
    private player!: Player;
    private enemies!: Phaser.Physics.Arcade.Group;
    private projectiles!: Phaser.Physics.Arcade.Group;
    
    // ========================================
    // Modular Service Systems
    // ========================================
    private enemySpawner!: EnemySpawnService;
    private collisionService!: CollisionService;
    private weaponSystem!: WeaponSystem;
    
    // ========================================
    // Wave Management
    // ========================================
    private currentWaveIndex = 0;
    private waveStartKey!: Phaser.Input.Keyboard.Key;
    
    // ========================================
    // Performance Monitoring
    // ========================================
    private performanceOverlay!: PerformanceDebugOverlay;
    private lastWaveCheckFrame = 0;
    private waveCompleteNotified = false;
    
    // ========================================
    // Scene Lifecycle
    // ========================================

    constructor() {
        super("MainScene");
    }

    /**
     * Preload assets - currently uses procedural graphics only
     */
    preload(): void {
        // No external assets to load; all textures generated at runtime
        Logger.info('MainScene: Preload complete - using procedural graphics');
    }

    /**
     * Create scene - initializes all game systems with pool integration
     */
    create(): void {
        Logger.info("🎮 MainScene: Starting game initialization (Phase 1.1 - Pool Integration)");
        
        // Initialize systems in dependency order
        this.createGameEntities();
        this.initializePoolSystems();
        this.initializeServices();
        this.setupInputControls();
        this.setupUserInterface();
        this.startGameplay();
        
        Logger.info("✅ MainScene: Setup complete with ProjectilePool integration");
        Logger.info("💡 Controls: WASD/Arrows=Move, Space=Shoot, Q=Switch Weapon, N=Next Wave");
        Logger.info("🔧 Debug: F1=General, F2=Collision, F3=Performance");
    }

    // ========================================
    // Initialization Methods
    // ========================================

    /**
     * Create core game entities with proper physics configuration
     */
    private createGameEntities(): void {
        Logger.info("📦 MainScene: Creating game entities");
        
        // Create projectile group with optimized physics settings
        this.projectiles = this.physics.add.group({ 
            classType: Projectile,
            collideWorldBounds: false,
            allowGravity: false,
            maxSize: 100, // Limit group size for performance
            runChildUpdate: true
        });
        
        // Create player at center of screen
        this.player = createPlayer(
            this,
            this.scale.width / 2,
            this.scale.height / 2,
            this.projectiles,
        );
        
        // Create enemy group with physics
        this.enemies = this.physics.add.group({
            maxSize: 50, // Limit enemy count for performance
            runChildUpdate: false // Enemies update manually
        });
        
        Logger.info("✅ MainScene: Game entities created successfully");
    }

    /**
     * Initialize pooling systems for performance optimization
     */
    private initializePoolSystems(): void {
        Logger.info("⚡ MainScene: Initializing pooling systems");
        
        // Create weapon system with projectile pool
        this.weaponSystem = new WeaponSystem(this, this.projectiles);
        
        // Update player's weapon system reference
        (this.player as any).weaponSystem = this.weaponSystem;
        
        Logger.info("✅ MainScene: Pooling systems initialized");
    }

    /**
     * Initialize modular services (spawning, collision, etc.)
     */
    private initializeServices(): void {
        Logger.info("🔧 MainScene: Initializing game services");
        
        // Initialize enemy spawn service
        this.enemySpawner = new EnemySpawnService(this, this.enemies, this.player);
        
        // Initialize collision service with pool awareness
        this.collisionService = new CollisionService(this);
        
        // Configure collision groups for service
        const collisionGroups: CollisionGroups = {
            player: this.player,
            enemies: this.enemies,
            projectiles: this.projectiles
        };
        
        // Configure collision callbacks
        const collisionCallbacks: CollisionCallbacks = {
            onProjectileHitEnemy: (eventData) => this.handleProjectileHitCallback(eventData),
            onEnemyHitPlayer: (eventData) => this.handleEnemyHitCallback(eventData),
        };
        
        // Initialize collision system
        this.collisionService.initialize(collisionGroups, collisionCallbacks);
        
        // Setup wave management event listeners
        this.events.on('wave:spawning-complete', this.onWaveSpawningComplete, this);
        this.events.on('wave:enemies-cleared', this.onWaveEnemiesCleared, this);
        
        Logger.info("✅ MainScene: Game services initialized");
    }

    /**
     * Setup input controls for gameplay
     */
    private setupInputControls(): void {
        Logger.info("🎮 MainScene: Setting up input controls");
        
        // Wave progression control
        this.waveStartKey = this.input.keyboard!.addKey('N');
        
        Logger.info("✅ MainScene: Input controls configured");
    }

    /**
     * Setup user interface elements
     */
    private setupUserInterface(): void {
        Logger.info("🖥️ MainScene: Setting up user interface");
        
        // Create debug overlays
        new DebugOverlay(this, this.player, this.enemies, this.projectiles);
        new CollisionDebugOverlay(this, this.collisionService);
        
        // Create performance overlay with pool monitoring
        this.performanceOverlay = new PerformanceDebugOverlay(this, this.weaponSystem);
        
        // Create weapon display
        new WeaponDisplay(this);
        
        Logger.info("✅ MainScene: User interface created");
    }

    /**
     * Start gameplay with first wave
     */
    private startGameplay(): void {
        Logger.info("🌊 MainScene: Starting gameplay");
        
        // Start first wave
        this.startNextWave();
        
        Logger.info("✅ MainScene: Gameplay started");
    }

    // ========================================
    // Collision Event Handlers
    // ========================================

    /**
     * Handle projectile hit events - can be extended for special effects
     * 
     * @param eventData - Collision event data from CollisionService
     */
    private handleProjectileHitCallback(eventData: any): void {
        // Future: Add screen shake, particle effects, sound effects
        Logger.debug(`🎯 MainScene: Projectile hit processed - advanced effects ready`);
        
        // Example: Screen shake effect
        this.cameras.main.shake(50, 0.01);
        
        // Example: Emit event for other systems
        this.events.emit('gameplay:projectile-hit', eventData);
    }

    /**
     * Handle enemy hit events - can be extended for player feedback
     * 
     * @param eventData - Collision event data from CollisionService
     */
    private handleEnemyHitCallback(eventData: any): void {
        // Future: Add damage indicators, screen effects, audio feedback
        Logger.debug(`⚡ MainScene: Enemy hit processed - feedback systems ready`);
        
        // Example: Screen flash effect
        this.cameras.main.flash(100, 255, 0, 0, false);
        
        // Example: Emit event for other systems
        this.events.emit('gameplay:player-hit', eventData);
    }

    // ========================================
    // Wave Management System
    // ========================================

    /**
     * Start next wave in sequence or endless mode
     */
    private startNextWave(): void {
        this.waveCompleteNotified = false;
        
        if (this.currentWaveIndex >= DEFAULT_WAVES.length) {
            Logger.info("🎉 MainScene: All preset waves completed - starting endless mode");
            this.startEndlessWave();
            return;
        }

        const waveConfig = DEFAULT_WAVES[this.currentWaveIndex];
        Logger.info(`🌊 MainScene: Starting wave ${waveConfig.wave}`);
        
        this.enemySpawner.startWave(waveConfig);
        this.currentWaveIndex++;
    }

    /**
     * Generate endless wave configuration for continued gameplay
     */
    private startEndlessWave(): void {
        const waveNumber = this.currentWaveIndex + 1;
        const endlessWave = {
            wave: waveNumber,
            enemies: [
                { 
                    count: Math.min(3 + this.currentWaveIndex, 15), 
                    rank: 'standard' as const,
                    speedMultiplier: 1 + (this.currentWaveIndex * 0.1)
                },
                { 
                    count: Math.min(1 + Math.floor(this.currentWaveIndex / 2), 5), 
                    rank: 'elite' as const,
                    speedMultiplier: 1 + (this.currentWaveIndex * 0.05)
                },
            ],
            delay: Math.max(300, 1000 - (this.currentWaveIndex * 30)),
        };
        
        Logger.info(`🔄 MainScene: Endless wave ${waveNumber} generated`);
        this.enemySpawner.startWave(endlessWave);
        this.currentWaveIndex++;
    }

    /**
     * Handle wave spawning completion event
     * 
     * @param wave - Wave number that completed spawning
     */
    private onWaveSpawningComplete(wave: number): void {
        Logger.info(`📈 MainScene: Wave ${wave} spawning finished - checking for remaining enemies`);
        this.checkWaveCompletion();
    }

    /**
     * Check if current wave is complete (all enemies defeated)
     */
    private checkWaveCompletion(): void {
        const aliveEnemies = this.enemies.countActive(true);
        const isSpawning = this.enemySpawner.isSpawning();
        
        if (aliveEnemies === 0 && !isSpawning) {
            if (!this.waveCompleteNotified) {
                Logger.info("🏆 MainScene: Wave cleared! Ready for next wave (Press N)");
                this.events.emit('wave:enemies-cleared', this.currentWaveIndex);
                this.waveCompleteNotified = true;
            }
        } else {
            this.waveCompleteNotified = false;
        }
    }

    /**
     * Handle wave completion event
     * 
     * @param wave - Wave number that was completed
     */
    private onWaveEnemiesCleared(wave: number): void {
        Logger.info(`✨ MainScene: Wave ${wave} complete! Press N for next wave`);
        
        // Future: Add wave completion rewards, statistics, etc.
        this.events.emit('gameplay:wave-complete', wave);
    }

    // ========================================
    // Main Game Loop
    // ========================================

    /**
     * Main update loop - handles game logic and input
     * 
     * @param time - Current game time
     * @param delta - Time delta since last update
     */
    update(time: number, delta: number): void {
        // Update player (handles movement, shooting, weapon switching)
        this.player.update(time, delta);

        // Handle manual wave progression
        if (Phaser.Input.Keyboard.JustDown(this.waveStartKey)) {
            if (!this.enemySpawner.isSpawning()) {
                this.startNextWave();
            } else {
                Logger.info("⏳ MainScene: Wave still spawning - please wait");
            }
        }

        // Update enemy AI (pursuit behavior)
        this.updateEnemyAI();

        // Check wave completion periodically (performance optimization)
        if (this.shouldCheckWaveCompletion()) {
            this.checkWaveCompletion();
        }
    }

    /**
     * Update enemy AI behavior - optimized for performance
     */
    private updateEnemyAI(): void {
        const playerCenter = this.player.getCenter(new Phaser.Math.Vector2());
        
        // Only update active enemies
        this.enemies.getChildren().forEach((child) => {
            if (child.active) {
                const enemy = child as Enemy;
                enemy.pursue(playerCenter);
            }
        });
    }

    /**
     * Check if we should perform wave completion check (performance optimization)
     * 
     * @returns true if wave completion should be checked
     */
    private shouldCheckWaveCompletion(): boolean {
        // Check every 60 frames (1 second at 60 FPS) to prevent spam
        this.lastWaveCheckFrame++;
        if (this.lastWaveCheckFrame >= 60) {
            this.lastWaveCheckFrame = 0;
            return !this.enemySpawner.isSpawning();
        }
        return false;
    }

    // ========================================
    // Scene Cleanup
    // ========================================

    /**
     * Scene shutdown - properly cleanup all resources and pools
     */
    shutdown(): void {
        Logger.info("🧹 MainScene: Starting cleanup process");
        
        // Remove wave management event listeners
        this.events.off('wave:spawning-complete', this.onWaveSpawningComplete, this);
        this.events.off('wave:enemies-cleared', this.onWaveEnemiesCleared, this);
        
        // Cleanup services
        if (this.enemySpawner) {
            this.enemySpawner.destroy();
        }
        
        if (this.collisionService) {
            this.collisionService.destroy();
        }
        
        // Cleanup weapon system and projectile pool
        if (this.weaponSystem) {
            this.weaponSystem.destroy();
        }
        
        // Emergency cleanup of any remaining entities
        if (this.projectiles) {
            this.projectiles.clear(true, true);
        }
        
        if (this.enemies) {
            this.enemies.clear(true, true);
        }
        
        Logger.info("✅ MainScene: Cleanup complete - all resources released");
    }

    // ========================================
    // Debug and Utility Methods
    // ========================================

    /**
     * Get current game statistics for debugging
     * 
     * @returns Object with current game state information
     */
    public getGameStats(): any {
        return {
            currentWave: this.currentWaveIndex,
            activeEnemies: this.enemies.countActive(true),
            activeProjectiles: this.projectiles.countActive(true),
            playerHp: this.player.hp,
            poolStats: this.weaponSystem.getPoolStats(),
            isSpawning: this.enemySpawner.isSpawning()
        };
    }

    /**
     * Emergency cleanup for development/debugging
     */
    public emergencyCleanup(): void {
        Logger.warn("⚠️ MainScene: Emergency cleanup triggered");
        
        if (this.weaponSystem) {
            this.weaponSystem.emergencyCleanup();
        }
        
        if (this.enemySpawner) {
            this.enemySpawner.stopSpawning();
        }
        
        // Clear all active entities
        this.enemies.clear(true, true);
        this.projectiles.clear(true, true);
        
        Logger.info("🚨 MainScene: Emergency cleanup complete");
    }
}