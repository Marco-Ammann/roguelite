// src/services/EnemySpawnService.ts
/**
 * Handles enemy spawning with wave-based progression
 * ADHD-friendly: Small, focused responsibility
 */

import Phaser from 'phaser';
import { createEnemy } from '../factories/EntityFactory';
import { EnemyRank } from '../enums/EnemyRank';
import { GameConfig } from '../config/GameConfig';

export interface SpawnConfig {
  count: number;
  rank: EnemyRank;
  speedMultiplier?: number;
}

export interface WaveConfig {
  wave: number;
  enemies: SpawnConfig[];
  delay: number; // ms between spawns
}

export class EnemySpawnService {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private player?: Phaser.GameObjects.Sprite; // Store player reference
  private spawnTimer?: Phaser.Time.TimerEvent;
  private currentWave = 0;
  private spawnsRemaining: SpawnConfig[] = [];

  constructor(scene: Phaser.Scene, enemies: Phaser.Physics.Arcade.Group, player?: Phaser.GameObjects.Sprite) {
    this.scene = scene;
    this.enemies = enemies;
    this.player = player; // Optional player reference for safe spawning
  }

  /**
   * Starts a new wave with given configuration
   */
  startWave(waveConfig: WaveConfig): void {
    this.currentWave = waveConfig.wave;
    this.spawnsRemaining = [...waveConfig.enemies]; // Copy array
    
    console.log(`🌊 Starting Wave ${this.currentWave}`);
    console.log(`📊 Enemies to spawn:`, this.spawnsRemaining);

    // Start spawning timer
    this.spawnTimer = this.scene.time.addEvent({
      delay: waveConfig.delay,
      callback: this.spawnNext,
      callbackScope: this,
      loop: true
    });
  }

  /**
   * Spawns the next enemy from queue
   */
  private spawnNext(): void {
    if (this.spawnsRemaining.length === 0) {
      this.finishWave();
      return;
    }
  
    const spawnConfig = this.spawnsRemaining.shift()!;
    
    // Spawn multiple enemies if count > 1
    for (let i = 0; i < spawnConfig.count; i++) {
      const enemy = this.createEnemyAtRandomPosition(spawnConfig);
      this.enemies.add(enemy);
    }
  
    console.log(`🎭 Spawned ${spawnConfig.count} ${spawnConfig.rank} enemies`);
  }

  /**
   * Creates enemy at safe spawn position (not near player)
   */
  private createEnemyAtRandomPosition(config: SpawnConfig) {
    const safeDistance = 100; // pixels
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = Phaser.Math.Between(50, this.scene.scale.width - 50);
      const y = Phaser.Math.Between(50, this.scene.scale.height - 50);
      
      // Check distance to player (if player reference exists)
      if (this.player && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > safeDistance) {
        const baseSpeed = this.getBaseSpeed(config.rank);
        const finalSpeed = baseSpeed * (config.speedMultiplier || 1.0);
        
        return createEnemy(this.scene, x, y, config.rank, finalSpeed);
      } else if (!this.player) {
        // No player reference, spawn anywhere
        const baseSpeed = this.getBaseSpeed(config.rank);
        const finalSpeed = baseSpeed * (config.speedMultiplier || 1.0);
        
        return createEnemy(this.scene, x, y, config.rank, finalSpeed);
      }
    }
    
    // Fallback: spawn at edge
    const edge = Phaser.Math.Between(0, 3);
    const x = edge < 2 ? (edge === 0 ? 0 : this.scene.scale.width) : Phaser.Math.Between(0, this.scene.scale.width);
    const y = edge >= 2 ? (edge === 2 ? 0 : this.scene.scale.height) : Phaser.Math.Between(0, this.scene.scale.height);
    
    const baseSpeed = this.getBaseSpeed(config.rank);
    const finalSpeed = baseSpeed * (config.speedMultiplier || 1.0);
    
    return createEnemy(this.scene, x, y, config.rank, finalSpeed);
  }

  /**
   * Gets base speed for enemy rank from GameConfig
   */
  private getBaseSpeed(rank: EnemyRank): number {
    switch (rank) {
      case EnemyRank.Standard:
        return GameConfig.ENEMY.STANDARD.SPEED;
      case EnemyRank.Elite:
        return GameConfig.ENEMY.ELITE.SPEED;
      case EnemyRank.Boss:
        return GameConfig.ENEMY.BOSS.SPEED;
      default:
        return GameConfig.ENEMY.STANDARD.SPEED;
    }
  }

  /**
   * Called when wave is complete
   */
  private finishWave(): void {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = undefined;
    }
    
    console.log(`✅ Wave ${this.currentWave} spawning complete`);
    
    // Emit event for other systems
    this.scene.events.emit('wave:spawning-complete', this.currentWave);
  }

  /**
   * Stops current spawning (emergency stop)
   */
  stopSpawning(): void {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = undefined;
    }
    this.spawnsRemaining = [];
    console.log('🛑 Enemy spawning stopped');
  }

  /**
   * Checks if wave spawning is in progress
   */
  isSpawning(): boolean {
    return this.spawnTimer !== undefined && this.spawnsRemaining.length > 0;
  }

  /**
   * Gets current wave number
   */
  getCurrentWave(): number {
    return this.currentWave;
  }

  /**
   * Gets remaining spawns count
   */
  getRemainingSpawns(): number {
    return this.spawnsRemaining.length;
  }

  /**
   * Cleanup when scene ends
   */
  destroy(): void {
    this.stopSpawning();
  }
}

// Predefined wave configurations for easy testing
export const DEFAULT_WAVES: WaveConfig[] = [
  {
    wave: 1,
    enemies: [
      { count: 5, rank: EnemyRank.Standard }, // mehr enemies
    ],
    delay: 800,
  },
  {
    wave: 2,
    enemies: [
      { count: 7, rank: EnemyRank.Standard },
      { count: 2, rank: EnemyRank.Elite },
    ],
    delay: 600,
  },
  {
    wave: 3,
    enemies: [
      { count: 10, rank: EnemyRank.Standard },
      { count: 3, rank: EnemyRank.Elite },
    ],
    delay: 400,
  },
];