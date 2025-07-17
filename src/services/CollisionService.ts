/**
 * CollisionService - Modular Collision Management
 */

import Phaser from "phaser";
import type {
  ICollisionService,
  CollisionGroups,
  CollisionCallbacks,
  CollisionEventData,
} from "../interfaces/ICollisionSystem";
import { DamageType } from "../interfaces/ICollisionSystem";
import type Player from "../entities/Player";
import type Enemy from "../entities/Enemy";
import type Projectile from "../entities/Projectile";
import Logger from "../utils/Logger";

export class CollisionService implements ICollisionService {
  private scene: Phaser.Scene;
  private groups?: CollisionGroups;
  private callbacks?: CollisionCallbacks;
  private stats: Record<string, number> = {};
  /** Frame‑gate cache: "<projId>:<enemyId>" ➜ lastFrame */
  private readonly frameGate = new Map<string, number>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.resetStats();
    Logger.info("CollisionService: Initialized");
  }

  /**
   * Returns `true` iff this projectile/enemy pair has *not* been
   * processed in the current game‑frame.  Prevents collision spam.
   */
  private shouldProcessCollision(key: string): boolean {
    const frame = this.scene.game.loop.frame;
    if (this.frameGate.get(key) === frame) return false;
    this.frameGate.set(key, frame);
    return true;
  }

  /**
   * Initialize collision detection with groups and callbacks
   */
  initialize(groups: CollisionGroups, callbacks: CollisionCallbacks): void {
    this.groups = groups;
    this.callbacks = callbacks;

    this.setupPhysicsOverlaps();
    Logger.info("CollisionService: Physics overlaps configured");
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

    Logger.info("CollisionService: Physics overlaps setup complete");
  }

  /**
   * Handle projectile → enemy collision.
   * Uses frame‑gate + projectile‑internal logic to suppress duplicates.
   */
  private handleProjectileEnemyCollision(obj1: any, obj2: any): void {
    const { projectile, enemy } = this.identifyProjectileEnemy(obj1, obj2);
    if (!projectile || !enemy) return;

    /* ---------- global frame‑gate (service level) ------------------- */
    const gateKey = `${projectile.name}:${
      (enemy as any).enemyId ?? enemy.name
    }`;
    if (!this.shouldProcessCollision(gateKey)) return;
    /* ---------------------------------------------------------------- */

    /* Build event payload once (re‑use for UI, analytics, etc.) */
    const eventData = this.createCollisionEvent(
      projectile,
      enemy,
      DamageType.Normal,
      1,
      this.scene.time.now
    );

    /* Let the projectile decide if damage counts & if it survives */
    const shouldDestroy = (projectile as any).onHitEnemy
      ? (projectile as any).onHitEnemy(enemy)
      : true;

    /* Damage application happens exactly once per valid hit */
    enemy.takeDamage(eventData.damage);

    if (shouldDestroy) projectile.destroy();

    /* Event hooks for external systems */
    this.callbacks?.onProjectileHitEnemy?.(eventData);
    this.scene.events.emit("collision:projectile-enemy", eventData);
  }

  /**
   * Handle enemy hitting player (Type-safe version of MainScene method)
   */
  private handleEnemyPlayerCollision(obj1: any, obj2: any): void {
    const { player, enemy } = this.identifyPlayerEnemy(obj1, obj2);

    if (!player || !enemy) {
      Logger.warn("CollisionService: Invalid enemy-player collision");
      return;
    }

    const eventData = this.createCollisionEvent(
      enemy,
      player,
      DamageType.Normal, // Fixed: Use enum value
      1, // Default damage
      this.scene.time.now
    );

    this.processEnemyHit(eventData);
    this.incrementStat("playerHits");
  }

  /**
   * Type-safe projectile/enemy identification
   */
  private identifyProjectileEnemy(
    obj1: any,
    obj2: any
  ): { projectile?: Projectile; enemy?: Enemy } {
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
  private identifyPlayerEnemy(
    obj1: any,
    obj2: any
  ): { player?: Player; enemy?: Enemy } {
    const hasHp = (obj: any): boolean =>
      obj?.hp !== undefined && obj?.maxHp !== undefined;
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
      timestamp,
    };
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
    this.scene.events.emit("collision:enemy-player", eventData);
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
      effectsApplied: 0, // Future
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
    Logger.info("CollisionService: Destroyed");
  }
}
