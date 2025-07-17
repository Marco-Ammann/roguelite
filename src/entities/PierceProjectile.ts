/**
 * src/entities/PierceProjectile.ts - Fixed TypeScript Issues
 * 
 * FIXES:
 * - Removed private isInitialized conflict with base class
 * - Uses protected isInitialized from base class
 * - Proper type annotations and cleanup
 * - Fixed unused parameter warnings
 */

import Phaser from 'phaser';
import Projectile from './Projectile';
import type { Direction } from '../gfx/TextureGenerator';

export default class PierceProjectile extends Projectile {
  /** Frame-gate: enemyId → last frame this projectile hit that enemy */
  private readonly hitGate = new Map<string, number>();

  /** Set of unique enemy IDs that have been hit by this projectile */
  private readonly hitEnemies = new Set<string>();

  /** Maximum number of enemies this projectile can pierce through */
  private readonly maxPierceCount: number;
  
  /** Current number of unique enemies hit */
  private currentPierceCount = 0;

  /**
   * Creates a new PierceProjectile instance
   * 
   * @param scene - Active Phaser scene
   * @param x - Initial world X coordinate
   * @param y - Initial world Y coordinate
   * @param dir - Cardinal direction for projectile movement
   * @param maxHits - Maximum number of enemies this projectile can pierce (default: 3)
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dir: Direction,
    maxHits = 3,
  ) {
    super(scene, x, y, dir);
    this.maxPierceCount = maxHits;
    this.initializePierceProjectile();
  }

  /**
   * Initialize pierce-specific properties (called once in constructor)
   */
  private initializePierceProjectile(): void {
    if (this.isInitialized) return;
    
    // Apply yellow tint to indicate pierce projectile
    this.setTint(0xffff00);
    
    console.info(`⚡ Pierce projectile initialized (max ${this.maxPierceCount} hits)`);
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
    
    // Clear pierce-specific state
    this.hitGate.clear();
    this.hitEnemies.clear();
    this.currentPierceCount = 0;
    
    // Reapply pierce projectile visual effects
    this.setTint(0xffff00);
    this.setAlpha(0.9); // Slight transparency for pierce effect
    
    console.info(`⚡ Pierce projectile reset: ${direction} at (${x},${y}) - max ${this.maxPierceCount} hits`);
  }

  /**
   * Handles collision with enemy - called by CollisionService
   * 
   * Uses frame-gate to prevent multiple hits per enemy per frame
   * Tracks unique enemy hits to implement pierce limit
   * 
   * @param enemy - Enemy GameObject that was hit
   * @returns true if projectile should be destroyed, false to continue
   */
  public onHitEnemy(enemy: Phaser.GameObjects.GameObject): boolean {
    // Get enemy identifier - prefer unique ID, fallback to name or position
    const enemyId = this.getEnemyIdentifier(enemy);
    
    // Frame-gate: prevent multiple hits per enemy per frame
    if (!this.shouldProcessHit(enemyId)) {
      return false; // Ignore duplicate hit in same frame
    }
    
    // Track unique enemy hit
    if (!this.hitEnemies.has(enemyId)) {
      this.hitEnemies.add(enemyId);
      this.currentPierceCount += 1;
      
      console.info(
        `⚡ Pierce hit ${this.currentPierceCount}/${this.maxPierceCount} (enemy: ${enemyId})`
      );
      
      // Visual feedback for successful hit
      this.addHitEffect();
    }
    
    // Check if projectile should be destroyed after hitting max enemies
    const shouldDestroy = this.currentPierceCount >= this.maxPierceCount;
    
    if (shouldDestroy) {
      console.info(`⚡ Pierce projectile exhausted - hit ${this.currentPierceCount} enemies`);
    }
    
    return shouldDestroy;
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
   * Frame-gate collision check - prevents multiple hits per enemy per frame
   * 
   * @param enemyId - Unique enemy identifier
   * @returns true if hit should be processed, false if blocked by frame-gate
   */
  private shouldProcessHit(enemyId: string): boolean {
    const currentFrame = this.scene.game.loop.frame;
    const lastFrame = this.hitGate.get(enemyId);
    
    // Block if hit in last 5 frames (not just current frame)
    if (lastFrame && currentFrame - lastFrame < 5) {
      return false;
    }
    
    this.hitGate.set(enemyId, currentFrame);
    return true;
  }

  /**
   * Add visual feedback effect when hitting an enemy
   */
  private addHitEffect(): void {
    // Brief flash effect
    this.setTint(0xffffff);
    
    // Return to yellow tint after short delay
    this.scene.time.delayedCall(50, () => {
      if (this.active) {
        this.setTint(0xffff00);
      }
    });
    
    // Slight scale pulse effect
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
  }

  /**
   * Override destroy to ensure proper cleanup
   */
  public override destroy(): void {
    // Clear all internal state before returning to pool
    this.hitGate.clear();
    this.hitEnemies.clear();
    this.currentPierceCount = 0;
    
    // Call parent destroy (which handles pool return)
    super.destroy();
  }

  /**
   * Actual destruction for scene cleanup - called by pool system
   */
  public override actualDestroy(): void {
    this.hitGate.clear();
    this.hitEnemies.clear();
    super.actualDestroy();
  }

  // ========================================
  // PUBLIC API - Getters for debug/UI
  // ========================================

  /**
   * Get current number of enemies hit by this projectile
   * 
   * @returns Number of unique enemies hit
   */
  public getPierceCount(): number {
    return this.currentPierceCount;
  }

  /**
   * Get maximum number of enemies this projectile can hit
   * 
   * @returns Maximum pierce count
   */
  public getMaxPierceCount(): number {
    return this.maxPierceCount;
  }

  /**
   * Check if projectile can still pierce more enemies
   * 
   * @returns true if projectile can hit more enemies, false if exhausted
   */
  public canPierce(): boolean {
    return this.currentPierceCount < this.maxPierceCount;
  }

  /**
   * Get list of enemy IDs that have been hit by this projectile
   * 
   * @returns Array of enemy identifiers
   */
  public getHitEnemies(): string[] {
    return Array.from(this.hitEnemies);
  }

  /**
   * Get projectile type identifier for debugging
   * 
   * @returns String identifier for this projectile type
   */
  public getProjectileType(): string {
    return 'pierce';
  }
}