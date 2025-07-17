/**
 * src/entities/ExplosiveProjectile.ts
 * Projectile that explodes on impact, dealing AOE damage
 */

import Phaser from 'phaser';
import Projectile from './Projectile';
import type { Direction } from '../gfx/TextureGenerator';

export default class ExplosiveProjectile extends Projectile {
  private explosionRadius: number;
  private hasExploded = false;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: Direction, explosionRadius = 60) {
    super(scene, x, y, dir);
    this.explosionRadius = explosionRadius;
    
    // Visual indicator: Orange tint for explosive projectiles
    this.setTint(0xff6600);
    
    console.log(`💣 Explosive Projectile: ${explosionRadius}px radius`);
  }

  /**
   * Called by CollisionService when hitting enemy
   * Returns true if projectile should be destroyed
   */
  onHitEnemy(_enemy: Phaser.GameObjects.GameObject): boolean {
    if (this.hasExploded) return true;
    
    this.hasExploded = true;
    this.explode();
    
    console.log(`💥 Explosive projectile detonated`);
    return true;
  }

  /**
   * Create explosion effect and deal AOE damage
   */
  private explode(): void {
    const explosionCenter = new Phaser.Math.Vector2(this.x, this.y);
    
    // Create visual explosion effect
    this.createExplosionEffect();
    
    // Find all enemies in explosion radius
    const scene = this.scene as Phaser.Scene;
    const enemies = scene.children.getAll().filter(child => 
      child instanceof Phaser.Physics.Arcade.Sprite && 
      (child as any).rank !== undefined
    );

    let hitCount = 0;
    enemies.forEach(enemy => {
      const sprite = enemy as Phaser.GameObjects.Sprite;
      const distance = Phaser.Math.Distance.Between(
        explosionCenter.x, explosionCenter.y,
        sprite.x, sprite.y
      );
      
      if (distance <= this.explosionRadius) {
        const enemyObj = enemy as any;
        if (enemyObj.takeDamage) {
          enemyObj.takeDamage(2); // Explosive damage
          hitCount++;
        }
      }
    });
    
    console.log(`💥 Explosion hit ${hitCount} enemies in ${this.explosionRadius}px radius`);
    
    // Emit event for collision service
    this.scene.events.emit('explosion:damage', {
      center: explosionCenter,
      radius: this.explosionRadius,
      damage: 2,
      hitCount
    });
  }

  /**
   * Create visual explosion effect
   */
  private createExplosionEffect(): void {
    // Create temporary explosion graphics
    const explosion = this.scene.add.graphics();
    explosion.setDepth(15);
    
    // Explosion animation
    let currentRadius = 10;
    const maxRadius = this.explosionRadius;
    
    const timer = this.scene.time.addEvent({
      delay: 50,
      repeat: 6,
      callback: () => {
        explosion.clear();
        
        // Orange explosion circle
        explosion.fillStyle(0xff6600, 0.6 - (currentRadius / maxRadius) * 0.5);
        explosion.fillCircle(this.x, this.y, currentRadius);
        
        // Inner yellow core
        explosion.fillStyle(0xffff00, 0.8 - (currentRadius / maxRadius) * 0.6);
        explosion.fillCircle(this.x, this.y, currentRadius * 0.5);
        
        currentRadius += 10;
      },
      callbackScope: this
    });
    
    // Clean up explosion after animation
    this.scene.time.delayedCall(400, () => {
      explosion.destroy();
      timer.destroy();
    });
  }

  /**
   * Get explosion radius for UI/debugging
   */
  getExplosionRadius(): number {
    return this.explosionRadius;
  }
}