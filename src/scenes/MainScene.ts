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

    constructor() {
        super("MainScene");
    }

    preload() {
        // No external assets to load; all textures will be generated at runtime
    }

    create() {
        console.log("🎮 MainScene: Starting game");
        
        // Projectile group
        this.projectiles = this.physics.add.group({ classType: Projectile });

        // Create player via factory (centred)
        this.player = createPlayer(
          this,
          this.scale.width / 2,
          this.scale.height / 2,
          this.projectiles,
        );
        this.player.setName('player'); // For spawn service

        // Create enemy group
        this.enemies = this.physics.add.group();

        // ✨ NEW: Initialize spawn service
        this.enemySpawner = new EnemySpawnService(this, this.enemies);
        
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
            this.onBulletHitEnemy,
            undefined,
            this
        );

        // Enemies vs Player
        this.physics.add.overlap(
            this.player,
            this.enemies,
            this.onEnemyHitPlayer,
            undefined,
            this
        );
    }

    /**
     * ✨ NEW: Bullet hit enemy callback
     */
    private onBulletHitEnemy(bullet: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject): void {
        const projectile = bullet as Projectile;
        const enemyEntity = enemy as Enemy;
        
        projectile.destroy();
        enemyEntity.takeDamage(1);
        
        console.log(`💥 Bullet hit ${enemyEntity.rank} enemy`);
    }

    /**
     * ✨ NEW: Enemy hit player callback
     */
    private onEnemyHitPlayer(player: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject): void {
        const playerEntity = player as Player;
        const enemyEntity = enemy as Enemy;
        
        playerEntity.takeDamage(1, this.time.now);
        console.log(`😵 Player hit by ${enemyEntity.rank} enemy`);
    }

    /**
     * ✨ NEW: Start next wave
     */
    private startNextWave(): void {
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
     * ✨ NEW: Check if wave is complete
     */
    private checkWaveCompletion(): void {
        const aliveEnemies = this.enemies.countActive(true);
        
        if (aliveEnemies === 0 && !this.enemySpawner.isSpawning()) {
            console.log("🏆 Wave cleared! Ready for next wave.");
            this.events.emit('wave:enemies-cleared', this.currentWaveIndex);
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

        // ✨ NEW: Check wave completion every frame
        if (!this.enemySpawner.isSpawning()) {
            this.checkWaveCompletion();
        }
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