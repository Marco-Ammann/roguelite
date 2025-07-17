/**
 * src/entities/PierceProjectile.ts
 * Projectile that can hit multiple enemies without being destroyed
 */

import Phaser from 'phaser';
import Projectile from './Projectile';
import type { Direction } from '../gfx/TextureGenerator';

export default class PierceProjectile extends Projectile {
  private hitEnemies: Set<string> = new Set();
  private maxPierceCount: number;
  private currentPierceCount = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: Direction, maxPierceCount = 3) {
    super(scene, x, y, dir);
    this.maxPierceCount = maxPierceCount;
    
    // Visual indicator: Yellow tint for pierce projectiles
    this.setTint(0xffff00);
    
    console.log(`⚡ Pierce Projectile: Max ${maxPierceCount} hits`);
  }

  /**
   * Called by CollisionService when hitting enemy
   * Returns true if projectile should be destroyed
   */
  onHitEnemy(enemy: Phaser.GameObjects.GameObject): boolean {
    const enemySprite = enemy as any; // Cast to access enemyId
    const enemyId = enemySprite.enemyId || `fallback_${(enemy as Phaser.GameObjects.Sprite).x}_${(enemy as Phaser.GameObjects.Sprite).y}`;
    
    // Skip if already hit this enemy
    if (this.hitEnemies.has(enemyId)) {
      return false; // Don't process collision, but don't destroy projectile
    }
    
    this.hitEnemies.add(enemyId);
    this.currentPierceCount++;
    
    console.log(`🎯 Pierce hit ${this.currentPierceCount}/${this.maxPierceCount} (${enemyId})`);
    
    // Destroy if reached max pierce count
    if (this.currentPierceCount >= this.maxPierceCount) {
      console.log(`💥 Pierce projectile exhausted`);
      return true;
    }
    
    return false;
  }

  /**
   * Get current pierce count for UI/debugging
   */
  getPierceCount(): number {
    return this.currentPierceCount;
  }

  /**
   * Check if projectile can still pierce
   */
  canPierce(): boolean {
    return this.currentPierceCount < this.maxPierceCount;
  }
}