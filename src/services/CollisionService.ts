/**
 * CollisionService - Modular Collision Management
 * src/services/CollisionService.ts
 */

import Phaser from 'phaser';
import type { 
  ICollisionService, 
  CollisionGroups, 
  CollisionCallbacks,
  CollisionEventData,
  DamageType 
} from '../interfaces/ICollisionSystem';
import type Player from '../entities/Player';
import type Enemy from '../entities/Enemy';
import type Projectile from '../entities/Projectile';
import Logger from '../utils/Logger';

export class CollisionService implements ICollisionService {
  private scene: Phaser.Scene;
  private groups?: CollisionGroups;
  private callbacks?: CollisionCallbacks;
  private stats: Record<string, number> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.resetStats();
    Logger.info('CollisionService: Initialized');
  }

  /**
   * Initialize collision detection with groups and callbacks
   */
  initialize(groups: CollisionGroups, callbacks: CollisionCallbacks): void {
    this.groups = groups;
    this.callbacks = callbacks;
    
    this.setupPhysicsOverlaps();
    Logger.info('CollisionService: Physics overlaps configured');
  }

  /**
   * Setup Phaser physics overlaps (extracted from MainScene)
   */
  private setupPhysicsOverlaps(): void {
    if (!this.groups) return;

    // Projectiles vs Enemies
    this.scene.physics.add.overlap(
      this.groups.projectiles,
      this.groups.enemies,
      (obj1, obj2) => this.handleProjectileEnemyCollision(obj1, obj2),
      undefined,
      this.scene
    );

    // Enemies vs Player  
    this.scene.physics.add.overlap(
      this.groups.player,
      this.groups.enemies,
      (obj1, obj2) => this.handleEnemyPlayerCollision(obj1, obj2),
      undefined,
      this.scene
    );

    Logger.info('CollisionService: Physics overlaps setup complete');
  }

  /**
   * Handle projectile hitting enemy (Type-safe version of MainScene method)
   */
  private handleProjectileEnemyCollision(obj1: any, obj2: any): void {
    const { projectile, enemy } = this.identifyProjectileEnemy(obj1, obj2);
    
    if (!projectile || !enemy) {
      Logger.warn('CollisionService: Invalid projectile-enemy collision');
      return;
    }

    const eventData = this.createCollisionEvent(
      projectile,
      enemy,
      'normal', // Default damage type for Phase 1 compatibility
      1,        // Default damage for Phase 1 compatibility
      this.scene.time.now
    );

    this.processProjectileHit(eventData);
    this.incrementStat('projectileHits');
  }

  /**
   * Handle enemy hitting player (Type-safe version of MainScene method)
   */
  private handleEnemyPlayerCollision(obj1: any, obj2: any): void {
    const { player, enemy } = this.identifyPlayerEnemy(obj1, obj2);
    
    if (!player || !enemy) {
      Logger.warn('CollisionService: Invalid enemy-player collision');
      return;
    }

    const eventData = this.createCollisionEvent(
      enemy,
      player,
      'normal', // Default damage type
      1,        // Default damage
      this.scene.time.now
    );

    this.processEnemyHit(eventData);
    this.incrementStat('playerHits');
  }

  /**
   * Type-safe projectile/enemy identification
   */
  private identifyProjectileEnemy(obj1: any, obj2: any): { projectile?: Projectile, enemy?: Enemy } {
    // Runtime type checking (safer than MainScene version)
    const hasBody = (obj: any): boolean => obj?.body !== undefined;
    const hasRank = (obj: any): boolean => obj?.rank !== undefined;
    
    if (hasBody(obj1) && hasRank(obj2)) {
      return { projectile: obj1 as Projectile, enemy: obj2 as Enemy };
    } else if (hasBody(obj2) && hasRank(obj1)) {
      return { projectile: obj2 as Projectile, enemy: obj1 as Enemy };
    }
    
    return {};
  }

  /**
   * Type-safe player/enemy identification  
   */
  private identifyPlayerEnemy(obj1: any, obj2: any): { player?: Player, enemy?: Enemy } {
    const hasHp = (obj: any): boolean => obj?.hp !== undefined && obj?.maxHp !== undefined;
    const hasRank = (obj: any): boolean => obj?.rank !== undefined;
    
    if (hasHp(obj1) && hasRank(obj2)) {
      return { player: obj1 as Player, enemy: obj2 as Enemy };
    } else if (hasHp(obj2) && hasRank(obj1)) {
      return { player: obj2 as Player, enemy: obj1 as Enemy };
    }
    
    return {};
  }

  /**
   * Create standardized collision event data
   */
  private createCollisionEvent(
    attacker: any,
    target: any,
    damageType: DamageType,
    damage: number,
    timestamp: number
  ): CollisionEventData {
    const position = new Phaser.Math.Vector2(target.x, target.y);
    
    return {
      attacker,
      target,
      damageType,
      damage,
      position,
      timestamp
    };
  }

  /**
   * Process projectile hit (Phase 1 compatibility)
   */
  private processProjectileHit(eventData: CollisionEventData): void {
    const projectile = eventData.attacker as Projectile;
    const enemy = eventData.target as Enemy;
    
    // Phase 1 behavior: Destroy projectile, damage enemy
    projectile.destroy();
    enemy.takeDamage(eventData.damage);
    
    Logger.info(`💥 Projectile hit ${enemy.rank} enemy`);
    
    // Event system for future expansion
    this.callbacks?.onProjectileHitEnemy?.(eventData);
    this.scene.events.emit('collision:projectile-enemy', eventData);
  }

  /**
   * Process enemy hit (Phase 1 compatibility)
   */
  private processEnemyHit(eventData: CollisionEventData): void {
    const enemy = eventData.attacker as Enemy;
    const player = eventData.target as Player;
    
    // Phase 1 behavior: Damage player with timestamp
    player.takeDamage(eventData.damage, eventData.timestamp);
    
    Logger.info(`😵 Player hit by ${enemy.rank} enemy`);
    
    // Event system for future expansion
    this.callbacks?.onEnemyHitPlayer?.(eventData);
    this.scene.events.emit('collision:enemy-player', eventData);
  }

  /**
   * Statistics tracking
   */
  private incrementStat(statName: string): void {
    this.stats[statName] = (this.stats[statName] || 0) + 1;
  }

  private resetStats(): void {
    this.stats = {
      projectileHits: 0,
      playerHits: 0,
      explosiveHits: 0, // Future
      effectsApplied: 0 // Future
    };
  }

  // ✨ PUBLIC API for future expansion

  addDamageMultiplier(type: DamageType, multiplier: number): void {
    // Future implementation for damage scaling
    Logger.info(`CollisionService: Damage multiplier ${type} = ${multiplier}x`);
  }

  getCollisionStats(): Record<string, number> {
    return { ...this.stats };
  }

  destroy(): void {
    this.groups = undefined;
    this.callbacks = undefined;
    this.resetStats();
    Logger.info('CollisionService: Destroyed');
  }
}