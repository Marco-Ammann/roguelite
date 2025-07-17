// src/scenes/MainScene.ts (Phase 1 Update)
/**
 * MainScene with EnemySpawnService integration
 * Backward compatible - old code still works
 */

import Phaser from "phaser";
import Player from "../entities/Player";
import Enemy from '../entities/Enemy';
import { createPlayer } from '../factories/EntityFactory';
import DebugOverlay from '../ui/DebugOverlay';
import Projectile from '../entities/Projectile';
import { EnemySpawnService, DEFAULT_WAVES } from '../services/EnemySpawnService';

export default class MainScene extends Phaser.Scene {
    private player!: Player;
    private enemies!: Phaser.Physics.Arcade.Group;
    private projectiles!: Phaser.Physics.Arcade.Group;
    
    // ✨ NEW: Spawn system
    private enemySpawner!: EnemySpawnService;
    private currentWaveIndex = 0;
    private waveStartKey!: Phaser.Input.Keyboard.Key;
    
    // ✅ FIX: Prevent spam logging
    private lastWaveCheckFrame = 0;
    private waveCompleteNotified = false;

    constructor() {
        super("MainScene");
    }

    preload() {
        // No external assets to load; all textures will be generated at runtime
    }

    create() {
        console.log("🎮 MainScene: Starting game");
        
        // ✅ FIX: Projectile group with correct physics settings
        this.projectiles = this.physics.add.group({ 
            classType: Projectile,
            // ✅ CRITICAL: Don't override physics settings!
            collideWorldBounds: false,  // Let projectiles handle their own bounds
            allowGravity: false,        // No group-level gravity
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

        // ✨ NEW: Initialize spawn service with player reference
        this.enemySpawner = new EnemySpawnService(this, this.enemies, this.player);
        
        // ✨ NEW: Add wave progression controls
        this.waveStartKey = this.input.keyboard!.addKey('N'); // 'N' for Next wave
        
        // ✨ NEW: Listen to spawn events
        this.events.on('wave:spawning-complete', this.onWaveSpawningComplete, this);
        this.events.on('wave:enemies-cleared', this.onWaveEnemiesCleared, this);

        // Debug overlay (F1 toggle)
        new DebugOverlay(this, this.player, this.enemies, this.projectiles);

        // ✨ CHANGED: Start first wave instead of manual spawn
        this.startNextWave();
        
        // ✨ NEW: Setup collision detection
        this.setupCollisions();
        
        console.log("✅ MainScene: Setup complete");
        console.log("💡 Controls: WASD/Arrows=Move, Space=Shoot, N=Next Wave, F1=Debug");
    }

    /**
     * ✨ NEW: Collision setup (preparing for Phase 2)
     */
    private setupCollisions(): void {
        // Player bullets vs Enemies
        this.physics.add.overlap(
            this.projectiles,
            this.enemies,
            (obj1, obj2) => this.onBulletHitEnemy(obj1, obj2),
            undefined,
            this
        );

        // Enemies vs Player
        this.physics.add.overlap(
            this.player,
            this.enemies,
            (obj1, obj2) => this.onEnemyHitPlayer(obj1, obj2),
            undefined,
            this
        );
    }

    /**
     * ✨ NEW: Bullet hit enemy callback (Type-safe with runtime checks)
     */
    private onBulletHitEnemy(obj1: any, obj2: any): void {
        // Runtime type checking for safety
        const bullet = (obj1 as Projectile).body ? obj1 as Projectile : obj2 as Projectile;
        const enemy = (obj1 as Enemy).rank !== undefined ? obj1 as Enemy : obj2 as Enemy;
        
        if (bullet && enemy && bullet.destroy && enemy.takeDamage) {
            bullet.destroy();
            enemy.takeDamage(1);
            console.log(`💥 Bullet hit ${enemy.rank} enemy`);
        }
    }

    /**
     * ✨ NEW: Enemy hit player callback (Type-safe with runtime checks)
     */
    private onEnemyHitPlayer(obj1: any, obj2: any): void {
        // Runtime type checking for safety
        const player = (obj1 as Player).hp !== undefined ? obj1 as Player : obj2 as Player;
        const enemy = (obj1 as Enemy).rank !== undefined ? obj1 as Enemy : obj2 as Enemy;
        
        if (player && enemy && player.takeDamage && enemy.rank) {
            player.takeDamage(1, this.time.now);
            console.log(`😵 Player hit by ${enemy.rank} enemy`);
        }
    }

    /**
     * ✨ NEW: Start next wave
     */
    private startNextWave(): void {
        // Reset wave completion flag
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
     * ✨ NEW: Endless mode for testing
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
     * ✨ NEW: Wave spawning completed
     */
    private onWaveSpawningComplete(wave: number): void {
        console.log(`📈 Wave ${wave} spawning finished. Check for remaining enemies...`);
        this.checkWaveCompletion();
    }

    /**
     * ✨ NEW: Check if wave is complete (with spam prevention)
     */
    private checkWaveCompletion(): void {
        const aliveEnemies = this.enemies.countActive(true);
        
        if (aliveEnemies === 0 && !this.enemySpawner.isSpawning()) {
            // Only notify once per wave completion
            if (!this.waveCompleteNotified) {
                console.log("🏆 Wave cleared! Ready for next wave (Press N)");
                this.events.emit('wave:enemies-cleared', this.currentWaveIndex);
                this.waveCompleteNotified = true;
            }
        } else {
            // Reset notification flag when enemies are present
            this.waveCompleteNotified = false;
        }
    }

    /**
     * ✨ NEW: All enemies cleared
     */
    private onWaveEnemiesCleared(wave: number): void {
        console.log(`✨ Wave ${wave} complete! Press N for next wave.`);
    }

    update(t: number, dt: number) {
        // Player update
        this.player.update(t, dt);

        // ✨ NEW: Manual wave progression
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

        // ✅ FIX: Check wave completion only every 60 frames (1 second at 60fps)
        if (this.lastWaveCheckFrame % 60 === 0) {
            if (!this.enemySpawner.isSpawning()) {
                this.checkWaveCompletion();
            }
        }
        this.lastWaveCheckFrame++;
    }

    /**
     * ✨ NEW: Cleanup
     */
    shutdown(): void {
        this.events.off('wave:spawning-complete', this.onWaveSpawningComplete, this);
        this.events.off('wave:enemies-cleared', this.onWaveEnemiesCleared, this);
        this.enemySpawner.destroy();
        console.log("🧹 MainScene: Cleanup complete");
    }
}