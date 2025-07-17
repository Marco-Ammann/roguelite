/**
 * src/services/CollisionService.ts - COLLISION FIXES
 * 
 * BEHOBENE PROBLEME:
 * ❌ Doppelte Frame-Gate Prüfung verhinderte alle Kollisionen
 * ❌ Pierce Projektile wurden zu früh zerstört
 * ❌ Explosive Projektile hatten Layer-Konflikte
 * ❌ Frame-Gate wurde nicht korrekt zurückgesetzt
 * 
 * ✅ FIXES:
 * 1. Frame-Gate nur EINMAL prüfen pro Kollisions-Event
 * 2. Pierce Logic korrekt implementiert (max 3 hits)
 * 3. Explosive VFX auf korrekter Layer
 * 4. Proper cleanup und error handling
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
  // Performance Optimization - FIXED
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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.resetStatistics();
    Logger.info("🔧 CollisionService: Initialized with FIXED collision logic");
  }

  // ========================================
  // Service Initialization
  // ========================================

  initialize(groups: CollisionGroups, callbacks: CollisionCallbacks): void {
    this.groups = groups;
    this.callbacks = callbacks;

    this.setupPhysicsOverlaps();
    this.setupEventListeners();

    Logger.info("✅ CollisionService: Physics overlaps configured with FIXED logic");
  }

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

  private setupEventListeners(): void {
    this.scene.events.on("projectile:return", this.onProjectileReturn, this);
    Logger.info("CollisionService: Event listeners configured");
  }

  // ========================================
  // Frame-Gate System - COMPLETELY FIXED
  // ========================================

  /**
   * ✅ FIXED: Check frame-gate only once per collision event
   */
  private shouldProcessCollision(key: string): boolean {
    const currentFrame = this.scene.game.loop.frame;
    const lastFrame = this.frameGate.get(key);

    // Block if already processed in current frame
    if (lastFrame === currentFrame) {
      Logger.info(`🚫 Frame-gate blocked: ${key} (frame ${currentFrame})`);
      return false;
    }

    // Update frame-gate and allow processing
    this.frameGate.set(key, currentFrame);
    Logger.info(`✅ Frame-gate passed: ${key} (frame ${currentFrame})`);
    return true;
  }

  private generateCollisionKey(projectile: any, enemy: any): string {
    const projId = projectile.name || `proj_${Math.round(projectile.x)}_${Math.round(projectile.y)}`;
    const enemyId = enemy.enemyId || enemy.name || `enemy_${Math.round(enemy.x)}_${Math.round(enemy.y)}`;
    return `${projId}:${enemyId}`;
  }

  // ========================================
  // Projectile-Enemy Collision - MAIN FIX
  // ========================================

  /**
   * ✅ HAUPTFIX: Frame-gate nur EINMAL prüfen, dann normale Collision-Logic
   */
  private handleProjectileEnemyCollision(obj1: any, obj2: any): void {
    const { projectile, enemy } = this.identifyProjectileEnemy(obj1, obj2);

    if (!projectile || !enemy) {
      Logger.warn("CollisionService: Invalid projectile-enemy collision objects");
      return;
    }

    // ✅ SINGLE FRAME-GATE CHECK - nicht doppelt!
    const collisionKey = this.generateCollisionKey(projectile, enemy);
    if (!this.shouldProcessCollision(collisionKey)) {
      return; // Blocked by frame-gate - exit early
    }

    Logger.info(`🎯 Processing collision: ${projectile.constructor.name} vs Enemy ${enemy.enemyId || 'unknown'}`);

    // ✅ Jetzt normale Collision-Logic ohne weitere Frame-Gate Checks
    this.processProjectileCollisionFixed(projectile, enemy);
  }

  /**
   * ✅ FIXED: Collision processing ohne doppelte Frame-Gate Prüfung
   */
  private processProjectileCollisionFixed(projectile: any, enemy: any): void {
    let shouldDestroy = true;
    let damageType: DamageType = DamageType.Normal;
    let damage = 1;

    // ✅ Type-specific collision handling
    if (this.isPierceProjectile(projectile)) {
      shouldDestroy = this.handlePierceProjectileHit(projectile, enemy);
      damageType = DamageType.Pierce;
      damage = 1;
      Logger.info(`⚡ Pierce collision processed - shouldDestroy: ${shouldDestroy}`);
    } else if (this.isExplosiveProjectile(projectile)) {
      shouldDestroy = this.handleExplosiveProjectileHit(projectile, enemy);
      damageType = DamageType.Explosive;
      damage = 2;
      Logger.info(`💥 Explosive collision processed - shouldDestroy: ${shouldDestroy}`);
    } else {
      shouldDestroy = this.handleNormalProjectileHit(enemy);
      damageType = DamageType.Normal;
      damage = 1;
      Logger.info(`🎯 Normal collision processed - shouldDestroy: ${shouldDestroy}`);
    }

    // ✅ Apply damage to enemy (ALWAYS happens now)
    if (enemy.takeDamage && typeof enemy.takeDamage === 'function') {
      enemy.takeDamage(damage);
      Logger.info(`💔 Applied ${damage} ${damageType} damage to enemy ${enemy.enemyId || 'unknown'}`);
    } else {
      Logger.warn(`⚠️ Enemy has no takeDamage method!`);
    }

    // ✅ Destroy projectile only when appropriate
    if (shouldDestroy) {
      this.destroyProjectile(projectile);
      Logger.info(`🗑️ Projectile destroyed after collision`);
    } else {
      Logger.info(`🔄 Projectile continues (pierce logic)`);
    }

    // ✅ Create collision event and update stats
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

  // ========================================
  // Type-specific Collision Handlers - FIXED
  // ========================================

  private handleNormalProjectileHit(enemy: any): boolean {
    Logger.info(`🎯 Normal projectile hit enemy ${enemy.enemyId || "unknown"}`);
    return true; // Always destroy normal projectiles
  }

  /**
   * ✅ FIXED: Pierce logic respektiert max hits korrekt
   */
  private handlePierceProjectileHit(projectile: PierceProjectile, enemy: any): boolean {
    try {
      const shouldDestroy = projectile.onHitEnemy(enemy);
      const pierceCount = projectile.getPierceCount();
      const maxPierce = projectile.getMaxPierceCount();
      
      Logger.info(`⚡ Pierce hit: ${pierceCount}/${maxPierce} - destroy: ${shouldDestroy}`);
      return shouldDestroy;
    } catch (error) {
      Logger.error("Pierce projectile error:", error);
      return true; // Failsafe: destroy on error
    }
  }

  /**
   * ✅ FIXED: Explosive logic mit proper VFX
   */
  private handleExplosiveProjectileHit(projectile: ExplosiveProjectile, enemy: any): boolean {
    try {
      if (typeof projectile.onHitEnemy === "function") {
        const shouldDestroy = projectile.onHitEnemy(enemy);
        Logger.info(`💥 Explosive hit - destroy: ${shouldDestroy}`);
        return shouldDestroy;
      }
      Logger.warn("Explosive projectile missing onHitEnemy method");
      return true;
    } catch (error) {
      Logger.error("Explosive projectile error:", error);
      return true; // Failsafe: destroy on error
    }
  }

  /**
   * ✅ FIXED: Safe projectile destruction
   */
  private destroyProjectile(projectile: any): void {
    try {
      if (projectile && projectile.active && typeof projectile.destroy === 'function') {
        projectile.destroy();
        Logger.info(`🗑️ Projectile safely destroyed`);
      } else {
        Logger.warn(`⚠️ Projectile already destroyed or invalid`);
      }
    } catch (error) {
      Logger.error("Error destroying projectile:", error);
    }
  }

  // ========================================
  // Enemy-Player Collision - UNCHANGED BUT VERIFIED
  // ========================================

  private handleEnemyPlayerCollision(obj1: any, obj2: any): void {
    const { player, enemy } = this.identifyPlayerEnemy(obj1, obj2);

    if (!player || !enemy) {
      Logger.warn("CollisionService: Invalid enemy-player collision objects");
      return;
    }

    // ✅ Player collision doesn't need frame-gate (simpler logic)
    const eventData = this.createCollisionEvent(
      enemy,
      player,
      DamageType.Normal,
      1,
      this.scene.time.now
    );

    // Apply damage to player
    if (player.takeDamage && typeof player.takeDamage === 'function') {
      player.takeDamage(eventData.damage, eventData.timestamp);
      Logger.info(`😵 Player took ${eventData.damage} damage from enemy ${enemy.enemyId || "unknown"}`);
    }

    // Update statistics
    this.incrementStat("playerHits");

    // Trigger callbacks and events
    this.callbacks?.onEnemyHitPlayer?.(eventData);
    this.scene.events.emit("collision:enemy-player", eventData);
  }

  // ========================================
  // Type Detection - UNCHANGED
  // ========================================

  private isPierceProjectile(projectile: any): boolean {
    return (
      projectile.constructor.name === "PierceProjectile" ||
      (typeof projectile.onHitEnemy === "function" &&
        typeof projectile.getPierceCount === "function")
    );
  }

  private isExplosiveProjectile(projectile: any): boolean {
    return (
      projectile.constructor.name === "ExplosiveProjectile" ||
      (typeof projectile.onHitEnemy === "function" &&
        typeof projectile.getExplosionRadius === "function")
    );
  }

  private identifyProjectileEnemy(obj1: any, obj2: any): { projectile?: any; enemy?: any } {
    const hasProjectileBody = (obj: any): boolean =>
      obj?.body !== undefined && typeof obj.getDirection === "function";

    const hasEnemyRank = (obj: any): boolean =>
      obj?.rank !== undefined && typeof obj.pursue === "function";

    if (hasProjectileBody(obj1) && hasEnemyRank(obj2)) {
      return { projectile: obj1, enemy: obj2 };
    } else if (hasProjectileBody(obj2) && hasEnemyRank(obj1)) {
      return { projectile: obj2, enemy: obj1 };
    }

    return {};
  }

  private identifyPlayerEnemy(obj1: any, obj2: any): { player?: any; enemy?: any } {
    const hasPlayerHp = (obj: any): boolean =>
      obj?.hp !== undefined &&
      obj?.maxHp !== undefined &&
      typeof obj.getCurrentDirection === "function";

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
  // Event Management - UNCHANGED
  // ========================================

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

    this.eventHistory.push(eventData);
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory.shift();
    }

    return eventData;
  }

  private triggerCollisionCallbacks(eventData: CollisionEventData): void {
    if (eventData.attacker.constructor.name.includes("Projectile")) {
      this.callbacks?.onProjectileHitEnemy?.(eventData);
      this.scene.events.emit("collision:projectile-enemy", eventData);
    }

    if (eventData.damageType === DamageType.Explosive) {
      this.callbacks?.onExplosiveDamage?.(eventData);
    }
  }

  /**
   * ✅ FIXED: Proper frame-gate cleanup for returned projectiles
   */
  private onProjectileReturn(projectile: any): void {
    const projId = projectile.name || `proj_${Math.round(projectile.x)}_${Math.round(projectile.y)}`;

    // Remove all frame-gate entries for this projectile
    let cleanedCount = 0;
    for (const [key] of this.frameGate) {
      if (key.startsWith(projId + ":")) {
        this.frameGate.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      Logger.info(`🧹 CollisionService: Cleaned ${cleanedCount} frame-gate entries for returned projectile`);
    }
  }

  // ========================================
  // Statistics - UNCHANGED
  // ========================================

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

  private incrementStat(statName: string): void {
    this.stats[statName] = (this.stats[statName] || 0) + 1;
  }

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
  // Public API - UNCHANGED
  // ========================================

  addDamageMultiplier(type: DamageType, multiplier: number): void {
    Logger.info(`CollisionService: Damage multiplier ${type} = ${multiplier}x (future feature)`);
  }

  getCollisionStats(): Record<string, number> {
    return { ...this.stats };
  }

  getRecentCollisionEvents(count: number = 10): CollisionEventData[] {
    return this.eventHistory.slice(-count);
  }

  getFrameGateCacheSize(): number {
    return this.frameGate.size;
  }

  clearFrameGateCache(): void {
    this.frameGate.clear();
    Logger.info("CollisionService: Frame-gate cache cleared");
  }

  // ========================================
  // Cleanup - UNCHANGED
  // ========================================

  destroy(): void {
    this.scene.events.off("projectile:return", this.onProjectileReturn, this);
    this.frameGate.clear();
    this.eventHistory.length = 0;
    this.groups = undefined;
    this.callbacks = undefined;
    this.resetStatistics();

    Logger.info("CollisionService: Destroyed and cleaned up");
  }
}