// src/scenes/MainScene.ts (Phase 2.1 Update)
/**
 * MainScene with CollisionService integration
 * ADHD-friendly: Reduced from ~200 to ~120 lines
 */

import Phaser from "phaser";
import Player from "../entities/Player";
import Enemy from '../entities/Enemy';
import { createPlayer } from '../factories/EntityFactory';
import DebugOverlay from '../ui/DebugOverlay';
import CollisionDebugOverlay from '../ui/CollisionDebugOverlay';
import Projectile from '../entities/Projectile';
import { EnemySpawnService, DEFAULT_WAVES } from '../services/EnemySpawnService';
import { CollisionService } from '../services/CollisionService';
import type { CollisionGroups, CollisionCallbacks } from '../interfaces/ICollisionSystem';

export default class MainScene extends Phaser.Scene {
    private player!: Player;
    private enemies!: Phaser.Physics.Arcade.Group;
    private projectiles!: Phaser.Physics.Arcade.Group;
    
    // ✨ NEW: Modular services
    private enemySpawner!: EnemySpawnService;
    private collisionService!: CollisionService;
    
    // Wave management
    private currentWaveIndex = 0;
    private waveStartKey!: Phaser.Input.Keyboard.Key;
    
    // Anti-spam logging
    private lastWaveCheckFrame = 0;
    private waveCompleteNotified = false;

    constructor() {
        super("MainScene");
    }

    preload() {
        // No external assets to load; all textures will be generated at runtime
    }

    create() {
        console.log("🎮 MainScene: Starting game (Phase 2.1)");
        
        this.createEntities();
        this.initializeServices();
        this.setupControls();
        this.setupUI();
        this.startFirstWave();
        
        console.log("✅ MainScene: Setup complete (CollisionService active)");
        console.log("💡 Controls: WASD/Arrows=Move, Space=Shoot, N=Next Wave, F1=Debug");
    }

    /**
     * ✨ REFACTORED: Entity creation (extracted from create)
     */
    private createEntities(): void {
        // Projectile group with correct physics settings
        this.projectiles = this.physics.add.group({ 
            classType: Projectile,
            collideWorldBounds: false,
            allowGravity: false,
        });

        // Create player via factory (centred)
        this.player = createPlayer(
          this,
          this.scale.width / 2,
          this.scale.height / 2,
          this.projectiles,
        );

        // Create enemy group
        this.enemies = this.physics.add.group();
    }

    /**
     * ✨ NEW: Service initialization (replaces setupCollisions)
     */
    private initializeServices(): void {
        // Initialize spawn service
        this.enemySpawner = new EnemySpawnService(this, this.enemies, this.player);
        
        // ✨ NEW: Initialize collision service
        this.collisionService = new CollisionService(this);
        
        const collisionGroups: CollisionGroups = {
            player: this.player,
            enemies: this.enemies,
            projectiles: this.projectiles
        };
        
        const collisionCallbacks: CollisionCallbacks = {
            onProjectileHitEnemy: (eventData) => this.onProjectileHitCallback(eventData),
            onEnemyHitPlayer: (eventData) => this.onEnemyHitCallback(eventData),
        };
        
        this.collisionService.initialize(collisionGroups, collisionCallbacks);
        
        // Event listeners for wave system
        this.events.on('wave:spawning-complete', this.onWaveSpawningComplete, this);
        this.events.on('wave:enemies-cleared', this.onWaveEnemiesCleared, this);
    }

    /**
     * ✨ REFACTORED: Controls setup (extracted from create)
     */
    private setupControls(): void {
        this.waveStartKey = this.input.keyboard!.addKey('N'); // 'N' for Next wave
    }

    /**
     * ✨ REFACTORED: UI setup (extracted from create)
     */
    private setupUI(): void {
        new DebugOverlay(this, this.player, this.enemies, this.projectiles);
        new CollisionDebugOverlay(this, this.collisionService);
    }

    /**
     * ✨ REFACTORED: First wave start (extracted from create)
     */
    private startFirstWave(): void {
        this.startNextWave();
    }

    /**
     * Collision event callbacks (optional - for future expansion)
     */
    private onProjectileHitCallback(_eventData: any): void {
        // Future: Custom projectile hit effects, screen shake, particles
        console.log(`🎯 CollisionService: Advanced projectile hit processing`);
    }

    private onEnemyHitCallback(_eventData: any): void {
        // Future: Custom player hit effects, screen shake, damage numbers
        console.log(`⚡ CollisionService: Advanced enemy hit processing`);
    }

    /**
     * Start next wave
     */
    private startNextWave(): void {
        this.waveCompleteNotified = false;
        
        if (this.currentWaveIndex >= DEFAULT_WAVES.length) {
            console.log("🎉 All waves completed! Starting endless mode...");
            this.startEndlessWave();
            return;
        }

        const waveConfig = DEFAULT_WAVES[this.currentWaveIndex];
        console.log(`🌊 Starting wave ${waveConfig.wave}`);
        
        this.enemySpawner.startWave(waveConfig);
        this.currentWaveIndex++;
    }

    /**
     * Endless mode for testing
     */
    private startEndlessWave(): void {
        const endlessWave = {
            wave: this.currentWaveIndex + 1,
            enemies: [
                { count: Math.min(3 + this.currentWaveIndex, 10), rank: 'standard' as const },
                { count: Math.min(1 + Math.floor(this.currentWaveIndex / 2), 3), rank: 'elite' as const },
            ],
            delay: Math.max(500, 1000 - (this.currentWaveIndex * 50)),
        };
        
        this.enemySpawner.startWave(endlessWave);
        this.currentWaveIndex++;
    }

    /**
     * Wave spawning completed
     */
    private onWaveSpawningComplete(wave: number): void {
        console.log(`📈 Wave ${wave} spawning finished. Check for remaining enemies...`);
        this.checkWaveCompletion();
    }

    /**
     * Check if wave is complete (with spam prevention)
     */
    private checkWaveCompletion(): void {
        const aliveEnemies = this.enemies.countActive(true);
        
        if (aliveEnemies === 0 && !this.enemySpawner.isSpawning()) {
            if (!this.waveCompleteNotified) {
                console.log("🏆 Wave cleared! Ready for next wave (Press N)");
                this.events.emit('wave:enemies-cleared', this.currentWaveIndex);
                this.waveCompleteNotified = true;
            }
        } else {
            this.waveCompleteNotified = false;
        }
    }

    /**
     * All enemies cleared
     */
    private onWaveEnemiesCleared(wave: number): void {
        console.log(`✨ Wave ${wave} complete! Press N for next wave.`);
    }

    update(t: number, dt: number) {
        // Player update
        this.player.update(t, dt);

        // Manual wave progression
        if (Phaser.Input.Keyboard.JustDown(this.waveStartKey)) {
            if (!this.enemySpawner.isSpawning()) {
                this.startNextWave();
            } else {
                console.log("⏳ Wave still spawning, please wait...");
            }
        }

        // Enemy AI updates
        this.enemies.getChildren().forEach((child) => {
            const enemy = child as Enemy;
            enemy.pursue(this.player.getCenter(new Phaser.Math.Vector2()));
        });

        // Check wave completion (60 frame limit to prevent spam)
        if (this.lastWaveCheckFrame % 60 === 0) {
            if (!this.enemySpawner.isSpawning()) {
                this.checkWaveCompletion();
            }
        }
        this.lastWaveCheckFrame++;
    }

    /**
     * ✨ ENHANCED: Cleanup with CollisionService
     */
    shutdown(): void {
        this.events.off('wave:spawning-complete', this.onWaveSpawningComplete, this);
        this.events.off('wave:enemies-cleared', this.onWaveEnemiesCleared, this);
        this.enemySpawner.destroy();
        this.collisionService.destroy(); // ✨ NEW: Clean collision service
        console.log("🧹 MainScene: Cleanup complete (CollisionService destroyed)");
    }
}