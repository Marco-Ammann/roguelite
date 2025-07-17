/**
 * src/services/CollisionService.ts - Fixed TypeScript Issues
 *
 * FIXES:
 * - Fixed Logger.debug calls (changed to Logger.info)
 * - Fixed DamageType assignments and typing
 * - Removed unused imports
 * - Fixed unused parameter warnings
 * - Proper type annotations throughout
 */

import Phaser from "phaser";
import type {
  ICollisionService,
  CollisionGroups,
  CollisionCallbacks,
  CollisionEventData,
} from "../interfaces/ICollisionSystem";
import { DamageType } from "../interfaces/ICollisionSystem";
import type PierceProjectile from "../entities/PierceProjectile";
import type ExplosiveProjectile from "../entities/ExplosiveProjectile";
import Logger from "../utils/Logger";

export class CollisionService implements ICollisionService {
  // ========================================
  // Core Service Properties
  // ========================================
  private scene: Phaser.Scene;
  private groups?: CollisionGroups;
  private callbacks?: CollisionCallbacks;

  // ========================================
  // Performance Optimization
  // ========================================
  /** Global frame-gate cache: "<projId>:<enemyId>" → lastFrame */
  private readonly frameGate = new Map<string, number>();

  /** Collision statistics for debugging and monitoring */
  private stats: Record<string, number> = {};

  // ========================================
  // Event Tracking
  // ========================================
  private eventHistory: CollisionEventData[] = [];
  private readonly maxEventHistory = 100;

  /**
   * Creates a new CollisionService instance
   *
   * @param scene - Active Phaser scene
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.resetStatistics();
    Logger.info("CollisionService: Initialized with pool integration");
  }

  // ========================================
  // Service Initialization
  // ========================================

  /**
   * Initialize collision detection with entity groups and callbacks
   *
   * @param groups - Entity groups for collision detection
   * @param callbacks - Callback functions for collision events
   */
  initialize(groups: CollisionGroups, callbacks: CollisionCallbacks): void {
    this.groups = groups;
    this.callbacks = callbacks;

    this.setupPhysicsOverlaps();
    this.setupEventListeners();

    Logger.info("CollisionService: Physics overlaps and events configured");
  }

  /**
   * Setup Phaser physics overlap detection
   */
  private setupPhysicsOverlaps(): void {
    if (!this.groups) return;

    // Projectiles vs Enemies collision
    this.scene.physics.add.overlap(
      this.groups.projectiles,
      this.groups.enemies,
      (obj1, obj2) => this.handleProjectileEnemyCollision(obj1, obj2),
      undefined,
      this.scene
    );

    // Enemies vs Player collision
    this.scene.physics.add.overlap(
      this.groups.player,
      this.groups.enemies,
      (obj1, obj2) => this.handleEnemyPlayerCollision(obj1, obj2),
      undefined,
      this.scene
    );

    Logger.info("CollisionService: Physics overlaps configured");
  }

  /**
   * Setup event listeners for collision system
   */
  private setupEventListeners(): void {
    // Listen for projectile pool return events
    this.scene.events.on("projectile:return", this.onProjectileReturn, this);

    Logger.info("CollisionService: Event listeners configured");
  }

  // ========================================
  // Frame-Gate Optimization System
  // ========================================

  /**
   * Check if collision should be processed (frame-gate optimization)
   *
   * @param key - Unique collision identifier
   * @returns true if collision should be processed, false if blocked
   */
  private shouldProcessCollision(key: string): boolean {
    const currentFrame = this.scene.game.loop.frame;
    const lastFrame = this.frameGate.get(key);

    // Block if already processed in current frame
    if (lastFrame === currentFrame) {
      return false;
    }

    // Update frame-gate and allow processing
    this.frameGate.set(key, currentFrame);
    return true;
  }

  /**
   * Generate unique collision key for frame-gate
   *
   * @param projectile - Projectile object
   * @param enemy - Enemy object
   * @returns Unique collision key
   */
  private generateCollisionKey(projectile: any, enemy: any): string {
    const projId = projectile.name || `proj_${projectile.x}_${projectile.y}`;
    const enemyId =
      enemy.enemyId || enemy.name || `enemy_${enemy.x}_${enemy.y}`;
    return `${projId}:${enemyId}`;
  }

  // ========================================
  // Projectile-Enemy Collision Handling
  // ========================================

  /**
   * Handle projectile hitting enemy with pool-aware logic
   *
   * @param obj1 - First collision object
   * @param obj2 - Second collision object
   */
  private handleProjectileEnemyCollision(obj1: any, obj2: any): void {
    const { projectile, enemy } = this.identifyProjectileEnemy(obj1, obj2);

    if (!projectile || !enemy) {
      Logger.warn(
        "CollisionService: Invalid projectile-enemy collision objects"
      );
      return;
    }

    // Global frame-gate check
    const collisionKey = this.generateCollisionKey(projectile, enemy);
    if (!this.shouldProcessCollision(collisionKey)) {
      return; // Blocked by frame-gate
    }

    // Process collision based on projectile type
    this.processProjectileCollision(projectile, enemy);
  }

  /**
   * Process collision based on projectile type
   *
   * @param projectile - Projectile that hit
   * @param enemy - Enemy that was hit
   */
  private processProjectileCollision(projectile: any, enemy: any): void {
    // *** ADD FRAME-GATE HERE ***
    const collisionKey = this.generateCollisionKey(projectile, enemy);
    if (!this.shouldProcessCollision(collisionKey)) {
      return; // Exit early - collision already processed this frame
    }

    let shouldDestroy = true;
    let damageType: DamageType = DamageType.Normal;
    let damage = 1;

    if (this.isPierceProjectile(projectile)) {
      shouldDestroy = this.handlePierceProjectileHit(projectile, enemy);
      damageType = DamageType.Pierce;
      damage = 1;
    } else if (this.isExplosiveProjectile(projectile)) {
      shouldDestroy = this.handleExplosiveProjectileHit(projectile, enemy);
      damageType = DamageType.Explosive;
      damage = 2;
    } else {
      shouldDestroy = this.handleNormalProjectileHit(enemy);
      damageType = DamageType.Normal;
      damage = 1;
    }

    // Apply damage to enemy
    if (enemy.takeDamage) {
      enemy.takeDamage(damage);
    }

    // *** ONLY DESTROY IF PROJECTILE SAYS SO ***
    if (shouldDestroy) {
      this.destroyProjectile(projectile);
    }

    // Create collision event and trigger callbacks
    const eventData = this.createCollisionEvent(
      projectile,
      enemy,
      damageType,
      damage,
      this.scene.time.now
    );
    this.updateCollisionStats(damageType);
    this.triggerCollisionCallbacks(eventData);
  }

  /**
   * Handle normal projectile collision
   *
   * @param enemy - Enemy that was hit
   * @returns true (normal projectiles always destroyed)
   */
  private handleNormalProjectileHit(enemy: any): boolean {
    Logger.info(`🎯 Normal projectile hit enemy ${enemy.enemyId || "unknown"}`);
    return true; // Always destroy normal projectiles
  }

  /**
   * Handle pierce projectile collision
   *
   * @param projectile - Pierce projectile
   * @param enemy - Enemy that was hit
   * @returns true if projectile should be destroyed
   */
  private handlePierceProjectileHit(
    projectile: PierceProjectile,
    enemy: any
  ): boolean {
    const shouldDestroy = projectile.onHitEnemy(enemy);
    Logger.info(`⚡ Pierce projectile hit - destroy: ${shouldDestroy}`);

    // RESPECT the pierce projectile's decision!
    return shouldDestroy; // Don't force destroy!
  }

  /**
   * Handle explosive projectile collision
   *
   * @param projectile - Explosive projectile
   * @param enemy - Enemy that was hit
   * @returns true (explosive projectiles always destroyed)
   */
  private handleExplosiveProjectileHit(
    projectile: ExplosiveProjectile,
    enemy: any
  ): boolean {
    if (typeof projectile.onHitEnemy === "function") {
      const shouldDestroy = projectile.onHitEnemy(enemy);
      Logger.info(`💥 Explosive projectile hit - destroy: ${shouldDestroy}`);
      return shouldDestroy;
    }

    Logger.warn(
      "CollisionService: Explosive projectile missing onHitEnemy method"
    );
    return true;
  }

  /**
   * Safely destroy projectile (returns to pool)
   *
   * @param projectile - Projectile to destroy
   */
  private destroyProjectile(projectile: any): void {
    try {
      if (projectile.destroy) {
        projectile.destroy();
      }
    } catch (error) {
      Logger.error("CollisionService: Error destroying projectile", error);
    }
  }

  // ========================================
  // Enemy-Player Collision Handling
  // ========================================

  /**
   * Handle enemy hitting player
   *
   * @param obj1 - First collision object
   * @param obj2 - Second collision object
   */
  private handleEnemyPlayerCollision(obj1: any, obj2: any): void {
    const { player, enemy } = this.identifyPlayerEnemy(obj1, obj2);

    if (!player || !enemy) {
      Logger.warn("CollisionService: Invalid enemy-player collision objects");
      return;
    }

    // Create collision event
    const eventData = this.createCollisionEvent(
      enemy,
      player,
      DamageType.Normal,
      1, // Default enemy damage
      this.scene.time.now
    );

    // Apply damage to player
    if (player.takeDamage) {
      player.takeDamage(eventData.damage, eventData.timestamp);
    }

    // Update statistics
    this.incrementStat("playerHits");

    // Trigger callbacks and events
    this.callbacks?.onEnemyHitPlayer?.(eventData);
    this.scene.events.emit("collision:enemy-player", eventData);

    Logger.info(`😵 Enemy ${enemy.enemyId || "unknown"} hit player`);
  }

  // ========================================
  // Type Detection Utilities
  // ========================================

  /**
   * Check if projectile is a pierce projectile
   *
   * @param projectile - Projectile to check
   * @returns true if pierce projectile
   */
  private isPierceProjectile(projectile: any): boolean {
    return (
      projectile.constructor.name === "PierceProjectile" ||
      (typeof projectile.onHitEnemy === "function" &&
        typeof projectile.getPierceCount === "function")
    );
  }

  /**
   * Check if projectile is an explosive projectile
   *
   * @param projectile - Projectile to check
   * @returns true if explosive projectile
   */
  private isExplosiveProjectile(projectile: any): boolean {
    return (
      projectile.constructor.name === "ExplosiveProjectile" ||
      (typeof projectile.onHitEnemy === "function" &&
        typeof projectile.getExplosionRadius === "function")
    );
  }

  /**
   * Type-safe projectile/enemy identification
   *
   * @param obj1 - First object
   * @param obj2 - Second object
   * @returns Identified projectile and enemy
   */
  private identifyProjectileEnemy(
    obj1: any,
    obj2: any
  ): { projectile?: any; enemy?: any } {
    // Check for projectile characteristics
    const hasProjectileBody = (obj: any): boolean =>
      obj?.body !== undefined && typeof obj.getDirection === "function";

    // Check for enemy characteristics
    const hasEnemyRank = (obj: any): boolean =>
      obj?.rank !== undefined && typeof obj.pursue === "function";

    if (hasProjectileBody(obj1) && hasEnemyRank(obj2)) {
      return { projectile: obj1, enemy: obj2 };
    } else if (hasProjectileBody(obj2) && hasEnemyRank(obj1)) {
      return { projectile: obj2, enemy: obj1 };
    }

    return {};
  }

  /**
   * Type-safe player/enemy identification
   *
   * @param obj1 - First object
   * @param obj2 - Second object
   * @returns Identified player and enemy
   */
  private identifyPlayerEnemy(
    obj1: any,
    obj2: any
  ): { player?: any; enemy?: any } {
    // Check for player characteristics
    const hasPlayerHp = (obj: any): boolean =>
      obj?.hp !== undefined &&
      obj?.maxHp !== undefined &&
      typeof obj.getCurrentDirection === "function";

    // Check for enemy characteristics
    const hasEnemyRank = (obj: any): boolean =>
      obj?.rank !== undefined && typeof obj.pursue === "function";

    if (hasPlayerHp(obj1) && hasEnemyRank(obj2)) {
      return { player: obj1, enemy: obj2 };
    } else if (hasPlayerHp(obj2) && hasEnemyRank(obj1)) {
      return { player: obj2, enemy: obj1 };
    }

    return {};
  }

  // ========================================
  // Event Management
  // ========================================

  /**
   * Create standardized collision event data
   *
   * @param attacker - Object that initiated collision
   * @param target - Object that was hit
   * @param damageType - Type of damage dealt
   * @param damage - Amount of damage
   * @param timestamp - When collision occurred
   * @returns Collision event data
   */
  private createCollisionEvent(
    attacker: any,
    target: any,
    damageType: DamageType,
    damage: number,
    timestamp: number
  ): CollisionEventData {
    const position = new Phaser.Math.Vector2(target.x, target.y);

    const eventData: CollisionEventData = {
      attacker,
      target,
      damageType,
      damage,
      position,
      timestamp,
    };

    // Add to event history
    this.eventHistory.push(eventData);
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory.shift();
    }

    return eventData;
  }

  /**
   * Trigger collision callbacks and events
   *
   * @param eventData - Collision event data
   */
  private triggerCollisionCallbacks(eventData: CollisionEventData): void {
    // Trigger appropriate callback based on collision type
    if (eventData.attacker.constructor.name.includes("Projectile")) {
      this.callbacks?.onProjectileHitEnemy?.(eventData);
      this.scene.events.emit("collision:projectile-enemy", eventData);
    }

    // Trigger damage type specific callbacks
    if (eventData.damageType === DamageType.Explosive) {
      this.callbacks?.onExplosiveDamage?.(eventData);
    }
  }

  /**
   * Handle projectile return to pool
   *
   * @param projectile - Projectile being returned
   */
  private onProjectileReturn(projectile: any): void {
    // Clean up frame-gate entries for this projectile
    const projId = projectile.name || `proj_${projectile.x}_${projectile.y}`;

    // Remove all frame-gate entries for this projectile
    for (const [key] of this.frameGate) {
      if (key.startsWith(projId + ":")) {
        this.frameGate.delete(key);
      }
    }

    Logger.info(
      `🔄 CollisionService: Cleaned frame-gate for returned projectile`
    );
  }

  // ========================================
  // Statistics and Monitoring
  // ========================================

  /**
   * Update collision statistics
   *
   * @param damageType - Type of damage that occurred
   */
  private updateCollisionStats(damageType: DamageType): void {
    this.incrementStat("totalHits");

    switch (damageType) {
      case DamageType.Normal:
        this.incrementStat("normalHits");
        break;
      case DamageType.Pierce:
        this.incrementStat("pierceHits");
        break;
      case DamageType.Explosive:
        this.incrementStat("explosiveHits");
        break;
    }
  }

  /**
   * Increment collision statistic
   *
   * @param statName - Name of statistic to increment
   */
  private incrementStat(statName: string): void {
    this.stats[statName] = (this.stats[statName] || 0) + 1;
  }

  /**
   * Reset collision statistics
   */
  private resetStatistics(): void {
    this.stats = {
      totalHits: 0,
      normalHits: 0,
      pierceHits: 0,
      explosiveHits: 0,
      playerHits: 0,
      effectsApplied: 0,
    };
  }

  // ========================================
  // Public API
  // ========================================

  /**
   * Add damage multiplier for specific damage type
   *
   * @param type - Damage type
   * @param multiplier - Damage multiplier
   */
  addDamageMultiplier(type: DamageType, multiplier: number): void {
    // Future implementation for damage scaling
    Logger.info(
      `CollisionService: Damage multiplier ${type} = ${multiplier}x (not yet implemented)`
    );
  }

  /**
   * Get collision statistics for debugging
   *
   * @returns Copy of collision statistics
   */
  getCollisionStats(): Record<string, number> {
    return { ...this.stats };
  }

  /**
   * Get recent collision events
   *
   * @param count - Number of recent events to return
   * @returns Array of recent collision events
   */
  getRecentCollisionEvents(count: number = 10): CollisionEventData[] {
    return this.eventHistory.slice(-count);
  }

  /**
   * Get frame-gate cache size for debugging
   *
   * @returns Number of entries in frame-gate cache
   */
  getFrameGateCacheSize(): number {
    return this.frameGate.size;
  }

  /**
   * Clear frame-gate cache (for debugging)
   */
  clearFrameGateCache(): void {
    this.frameGate.clear();
    Logger.info("CollisionService: Frame-gate cache cleared");
  }

  // ========================================
  // Cleanup and Destruction
  // ========================================

  /**
   * Cleanup collision service resources
   */
  destroy(): void {
    // Remove event listeners
    this.scene.events.off("projectile:return", this.onProjectileReturn, this);

    // Clear caches
    this.frameGate.clear();
    this.eventHistory.length = 0;

    // Reset references
    this.groups = undefined;
    this.callbacks = undefined;

    // Reset statistics
    this.resetStatistics();

    Logger.info("CollisionService: Destroyed and cleaned up");
  }
}
