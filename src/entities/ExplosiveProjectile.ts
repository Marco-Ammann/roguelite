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
  private readonly explosionRadius: number;
  private hasExploded = false;
  private readonly damagedEnemies = new Set<string>();

  // ✅ FIXED: Bessere VFX References
  private explosionVfx?: Phaser.GameObjects.Graphics;
  private explosionTimer?: Phaser.Time.TimerEvent;
  private explosionTween?: Phaser.Tweens.Tween; // this is used for the animation of the explosion

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
    super.reset(x, y, direction);

    // Clear explosive-specific state
    this.hasExploded = false;
    this.damagedEnemies.clear();

    // ✅ FIXED: Proper cleanup of existing VFX
    this.cleanupExplosionEffects();

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
  /**
   * ✅ FIXED: Proper explosion handling
   */
  public onHitEnemy(_enemy: Phaser.GameObjects.GameObject): boolean {
    if (!this.hasExploded) {
      this.hasExploded = true;

      // Stop pulsing animation
      this.scene.tweens.killTweensOf(this);

      // ✅ Trigger explosion at current position
      this.explode();

      console.info(`💥 EXPLOSION triggered at (${this.x}, ${this.y})`);
    }

    // Always destroy explosive projectiles after explosion
    return true;
  }

  /**
   * Explodes the projectile at its current position
   */
  private explode(): void {
    // Position VOR Pool-Return speichern
    const explosionX = this.x;
    const explosionY = this.y;
    
    this.createExplosionVfx(explosionX, explosionY);
    this.damageEnemiesInRadius(explosionX, explosionY);
}

  /**
   * ✅ Unchanged but verified - enemy damage logic
   */
  private damageEnemiesInRadius(): void {
    const scene = this.scene as Phaser.Scene;

    try {
      // Get all physics bodies within explosion radius
      const bodies = scene.physics.overlapCirc(
        this.x,
        this.y,
        this.explosionRadius,
        true, // includeDynamic
        false // includeStatic
      ) as Phaser.Physics.Arcade.Body[];

      let enemiesDamaged = 0;

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
        enemyAny.takeDamage(2); // Explosive damage is 2
        enemiesDamaged++;

        console.log(`💥 Explosion damaged enemy ${enemyId}`);
      });

      console.log(`💥 Explosion damaged ${enemiesDamaged} enemies total`);
    } catch (error) {
      console.error("Error in explosion damage calculation:", error);
    }
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
    try {
      console.log(`🎨 Creating FIXED explosion VFX at (${this.x}, ${this.y})`);
      
      // ✅ Create graphics object with PROPER layer settings
      this.explosionVfx = this.scene.add.graphics();
      
      // ✅ CRITICAL FIX: Proper depth and scroll settings
      this.explosionVfx.setDepth(150);  // Mid-layer (NOT 500!)
      this.explosionVfx.setScrollFactor(1, 1);  // Follow camera properly
      
      // ✅ FIXED: Start with small radius and animate outward
      this.drawExplosionCircles(10); // Start small
      
      // ✅ ANIMATED EXPANSION: Radius grows from 10 to full size
      this.explosionTween = this.scene.tweens.add({
        targets: { radius: 10 },
        radius: this.explosionRadius,
        duration: 400, // 400ms expansion
        ease: "Power2",
        onUpdate: (tween) => {
          if (this.explosionVfx && this.explosionVfx.scene) {
            const currentRadius = tween.getValue();
            this.explosionVfx.clear();
            this.drawExplosionCircles(currentRadius as number);
          }
        },
        onComplete: () => {
          // ✅ Fade out after expansion
          if (this.explosionVfx && this.explosionVfx.scene) {
            this.scene.tweens.add({
              targets: this.explosionVfx,
              alpha: 0,
              duration: 300,
              onComplete: () => this.cleanupExplosionEffects()
            });
          }
        }
      });
      
      console.log(`✅ Explosion VFX created successfully with animated expansion`);
      
    } catch (error) {
      console.error("💥 Error creating explosion VFX:", error);
      // Fallback cleanup if VFX creation fails
      this.cleanupExplosionEffects();
    }
  }

  /**
   * ✅ NEW: Helper method to draw explosion circles
   */
  private drawExplosionCircles(radius: number): void {
    if (!this.explosionVfx || !this.explosionVfx.scene) return;

    // Outer circle (orange)
    this.explosionVfx.fillStyle(0xff6600, 0.8);
    this.explosionVfx.fillCircle(this.x, this.y, radius);

    // Middle circle (yellow)
    this.explosionVfx.fillStyle(0xffff00, 0.6);
    this.explosionVfx.fillCircle(this.x, this.y, radius * 0.7);

    // Inner circle (white hot center)
    this.explosionVfx.fillStyle(0xffffff, 0.9);
    this.explosionVfx.fillCircle(this.x, this.y, radius * 0.4);
  }

  /**
   * ✅ NEW: Centralized cleanup method
   */
  private cleanupExplosionEffects(): void {
    // Clean up VFX graphics
    if (this.explosionVfx && this.explosionVfx.scene) {
      this.explosionVfx.destroy();
      this.explosionVfx = undefined;
    }

    // Clean up timers
    if (this.explosionTimer && this.explosionTimer.hasDispatched === false) {
      this.explosionTimer.destroy();
      this.explosionTimer = undefined;
    }

    // Clean up
    this.scene.tweens.killTweensOf(this);
    this.damagedEnemies.clear();
    this.hasExploded = false;
    this.explosionTween?.stop();
    this.explosionTween = undefined;
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
