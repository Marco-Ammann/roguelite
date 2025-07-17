/**
 * src/entities/ExplosiveProjectile.ts - Fixed TypeScript Issues
 *
 * FIXES:
 * - Removed private isInitialized conflict with base class
 * - Uses protected isInitialized from base class
 * - Fixed unused parameter warnings
 * - Proper type annotations and cleanup
 */

import Phaser from "phaser";
import Projectile from "./Projectile";
import type { Direction } from "../gfx/TextureGenerator";

export default class ExplosiveProjectile extends Projectile {
  /** Radius of explosion damage in pixels */
  private readonly explosionRadius: number;

  /** Flag to prevent multiple explosions */
  private hasExploded = false;

  /** Set of enemy IDs that have been damaged by this explosion */
  private readonly damagedEnemies = new Set<string>();

  /** Reference to explosion VFX graphics for cleanup */
  private explosionVfx?: Phaser.GameObjects.Graphics;

  /** Reference to explosion timer for cleanup */
  private explosionTimer?: Phaser.Time.TimerEvent;

  /**
   * Creates a new ExplosiveProjectile instance
   *
   * @param scene - Active Phaser scene
   * @param x - Initial world X coordinate
   * @param y - Initial world Y coordinate
   * @param dir - Cardinal direction for projectile movement
   * @param radius - Explosion radius in pixels (default: 60)
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dir: Direction,
    radius = 60
  ) {
    super(scene, x, y, dir);
    this.explosionRadius = radius;
    this.initializeExplosiveProjectile();
  }

  /**
   * Initialize explosive-specific properties (called once in constructor)
   */
  private initializeExplosiveProjectile(): void {
    if (this.isInitialized) return;

    // Apply orange tint to indicate explosive projectile
    this.setTint(0xff6600);

    // Add pulsing effect to indicate explosive nature
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    console.info(
      `💥 Explosive projectile initialized (radius ${this.explosionRadius}px)`
    );
  }

  /**
   * Reset projectile for pool reuse - clears all internal state
   *
   * @param x - New world X coordinate
   * @param y - New world Y coordinate
   * @param direction - New cardinal direction for movement
   */
  public override reset(x: number, y: number, direction: Direction): void {
    // Call parent reset first (handles physics, position, timers)
    super.reset(x, y, direction);

    // Clear explosive-specific state
    this.hasExploded = false;
    this.damagedEnemies.clear();

    // Clean up any existing VFX
    if (this.explosionVfx) {
      this.explosionVfx.destroy();
      this.explosionVfx = undefined;
    }

    // Clean up any existing timers
    if (this.explosionTimer) {
      this.explosionTimer.destroy();
      this.explosionTimer = undefined;
    }

    // Reapply explosive projectile visual effects
    this.setTint(0xff6600);
    this.setAlpha(1.0);

    // Restart pulsing animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    console.info(
      `💥 Explosive projectile reset: ${direction} at (${x},${y}) - radius ${this.explosionRadius}px`
    );
  }

  /**
   * Handles collision with enemy - called by CollisionService
   *
   * Always explodes on first contact and returns true to destroy projectile
   *
   * @param _enemy - Enemy GameObject that was hit (triggers explosion)
   * @returns Always true - explosive projectiles are consumed on impact
   */
  public onHitEnemy(_enemy: Phaser.GameObjects.GameObject): boolean {
    if (!this.hasExploded) {
      this.hasExploded = true;

      // Stop pulsing animation
      this.scene.tweens.killTweensOf(this);

      // Trigger explosion at current position
      this.explode();

      console.info(
        `💥 Explosive projectile detonated at (${this.x}, ${this.y})`
      );
    }

    // Always destroy explosive projectiles after explosion
    return true;
  }

  /**
   * Trigger explosion - damages all enemies within radius and creates VFX
   */
  private explode(): void {
    // Disable physics body to prevent further collisions
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }

    // Find all enemies within explosion radius using Phaser's physics
    this.damageEnemiesInRadius();

    // Create visual explosion effect
    this.createExplosionVfx();

    // Play explosion sound effect (if audio system exists)
    this.scene.events.emit("audio:play", "explosion", { volume: 0.3 });

    console.info(
      `💥 Explosion complete: ${this.damagedEnemies.size} enemies damaged (radius ${this.explosionRadius}px)`
    );
  }

  /**
   * Find and damage all enemies within explosion radius
   *
   * Uses Phaser's physics.overlapCirc() for efficient circular area detection
   */
  private damageEnemiesInRadius(): void {
    const scene = this.scene as Phaser.Scene;

    // Get all physics bodies within explosion radius
    const bodies = scene.physics.overlapCirc(
      this.x,
      this.y,
      this.explosionRadius,
      true, // includeDynamic
      false // includeStatic
    ) as Phaser.Physics.Arcade.Body[];

    // Process each body found in explosion radius
    bodies.forEach((body) => {
      const enemyObj = body.gameObject as Phaser.GameObjects.GameObject;

      // Skip if body has no associated GameObject
      if (!enemyObj) return;

      // Check if this is actually an enemy (has takeDamage method)
      const enemyAny = enemyObj as any;
      if (typeof enemyAny.takeDamage !== "function") return;

      // Get unique enemy identifier
      const enemyId = this.getEnemyIdentifier(enemyObj);

      // Prevent double-damage to same enemy
      if (this.damagedEnemies.has(enemyId)) return;

      // Mark enemy as damaged and apply damage
      this.damagedEnemies.add(enemyId);
      enemyAny.takeDamage(2); // Explosive damage is 2 (base config)

      console.debug(`💥 Explosion damaged enemy ${enemyId}`);
    });
  }

  /**
   * Get unique identifier for enemy - handles different enemy types
   *
   * @param enemy - Enemy GameObject
   * @returns Unique string identifier for this enemy
   */
  private getEnemyIdentifier(enemy: Phaser.GameObjects.GameObject): string {
    // Priority: unique enemyId > name > position-based fallback
    const enemyAny = enemy as any;

    if (enemyAny.enemyId) {
      return enemyAny.enemyId;
    }

    if (enemy.name) {
      return enemy.name;
    }

    // Fallback: position-based identifier (less reliable)
    const sprite = enemy as Phaser.GameObjects.Sprite;
    return `enemy_${Math.round(sprite.x)}_${Math.round(sprite.y)}`;
  }

  /**
   * Create visual explosion effect using procedural graphics
   *
   * Creates expanding circle animation with color gradient
   */
  private createExplosionVfx(): void {
    this.explosionVfx = this.scene.add.graphics();
    this.explosionVfx.setDepth(100); // Higher depth to be visible

    // Immediate large explosion
    this.explosionVfx.fillStyle(0xff6600, 0.8);
    this.explosionVfx.fillCircle(this.x, this.y, this.explosionRadius);

    this.explosionVfx.fillStyle(0xffff00, 0.6);
    this.explosionVfx.fillCircle(this.x, this.y, this.explosionRadius * 0.7);

    this.explosionVfx.fillStyle(0xffffff, 0.8);
    this.explosionVfx.fillCircle(this.x, this.y, this.explosionRadius * 0.4);

    // Remove after 500ms
    this.scene.time.delayedCall(500, () => {
      if (this.explosionVfx) {
        this.explosionVfx.destroy();
        this.explosionVfx = undefined;
      }
    });
  }

  /**
   * Override destroy to ensure proper cleanup
   */
  public override destroy(): void {
    // Clean up VFX and timers
    if (this.explosionVfx) {
      this.explosionVfx.destroy();
      this.explosionVfx = undefined;
    }

    if (this.explosionTimer) {
      this.explosionTimer.destroy();
      this.explosionTimer = undefined;
    }

    // Kill any running tweens
    this.scene.tweens.killTweensOf(this);

    // Clear internal state
    this.damagedEnemies.clear();
    this.hasExploded = false;

    // Call parent destroy (which handles pool return)
    super.destroy();
  }

  /**
   * Actual destruction for scene cleanup - called by pool system
   */
  public override actualDestroy(): void {
    // Ensure all resources are cleaned up
    if (this.explosionVfx) {
      this.explosionVfx.destroy();
      this.explosionVfx = undefined;
    }

    if (this.explosionTimer) {
      this.explosionTimer.destroy();
      this.explosionTimer = undefined;
    }

    this.scene.tweens.killTweensOf(this);
    this.damagedEnemies.clear();

    super.actualDestroy();
  }

  // ========================================
  // PUBLIC API - Getters for debug/UI
  // ========================================

  /**
   * Get explosion radius in pixels
   *
   * @returns Explosion radius
   */
  public getExplosionRadius(): number {
    return this.explosionRadius;
  }

  /**
   * Check if projectile has already exploded
   *
   * @returns true if exploded, false if still active
   */
  public hasExplodedAlready(): boolean {
    return this.hasExploded;
  }

  /**
   * Get number of enemies damaged by this explosion
   *
   * @returns Number of enemies damaged
   */
  public getDamagedEnemiesCount(): number {
    return this.damagedEnemies.size;
  }

  /**
   * Get list of enemy IDs that were damaged by this explosion
   *
   * @returns Array of enemy identifiers
   */
  public getDamagedEnemies(): string[] {
    return Array.from(this.damagedEnemies);
  }

  /**
   * Get projectile type identifier for debugging
   *
   * @returns String identifier for this projectile type
   */
  public getProjectileType(): string {
    return "explosive";
  }
}
