/**
 * src/entities/Projectile.ts - Fixed TypeScript Issues
 * 
 * FIXES:
 * - Removed private isInitialized to prevent child class conflicts
 * - Added proper type annotations
 * - Fixed unused parameter warnings
 * - Proper cleanup and resource management
 */

import Phaser from 'phaser';
import type { Direction } from '../gfx/TextureGenerator';
import { ensureBulletTexture } from '../gfx/TextureGenerator';

export default class Projectile extends Phaser.Physics.Arcade.Sprite {
  private static readonly SPEED = 300;
  private direction: Direction;
  private autoDestroyTimer?: Phaser.Time.TimerEvent;
  protected isInitialized = false; // Changed to protected so child classes can access

  constructor(scene: Phaser.Scene, x: number, y: number, dir: Direction) {
    ensureBulletTexture(scene);
    super(scene, x, y, 'bullet');
    
    this.direction = dir;
    this.initializeProjectile();
  }

  /**
   * Initialize projectile (called once in constructor)
   */
  private initializeProjectile(): void {
    if (this.isInitialized) return;
    
    // Add to scene
    this.scene.add.existing(this);
    
    // Enable physics
    this.scene.physics.world.enable(this);
    
    // Configure body
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(4, 4);
    }
    
    this.setDepth(5);
    this.isInitialized = true;
  }

  /**
   * Reset projectile for pool reuse
   */
  public reset(x: number, y: number, direction: Direction): void {
    // Clear old timer
    if (this.autoDestroyTimer) {
      this.autoDestroyTimer.destroy();
      this.autoDestroyTimer = undefined;
    }
    
    // Reset position and direction
    this.x = x;
    this.y = y;
    this.direction = direction;
    
    // Reset physics
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      
      // Set velocity based on direction
      switch (direction) {
        case 'left':
          body.setVelocity(-Projectile.SPEED, 0);
          break;
        case 'right':
          body.setVelocity(Projectile.SPEED, 0);
          break;
        case 'up':
          body.setVelocity(0, -Projectile.SPEED);
          break;
        case 'down':
        default:
          body.setVelocity(0, Projectile.SPEED);
          break;
      }
    }
    
    // Reset visual state
    this.setTint(0xffffff);
    this.setAlpha(1);
    
    // Setup auto-destroy timer
    this.autoDestroyTimer = this.scene.time.delayedCall(3000, () => {
      this.returnToPool();
    });
    
    console.log(`🚀 Projectile reset: ${direction} at (${x},${y})`);
  }

  /**
   * Manual destroy override for pool return
   */
  public override destroy(): void {
    this.returnToPool();
  }

  /**
   * Return to pool instead of destroying
   */
  private returnToPool(): void {
    if (!this.active) return; // Already returned
    
    // Clear timer
    if (this.autoDestroyTimer) {
      this.autoDestroyTimer.destroy();
      this.autoDestroyTimer = undefined;
    }
    
    // Disable physics
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }
    
    // Notify pool system to return this projectile
    this.scene.events.emit('projectile:return', this);
    
    console.log('🔄 Projectile returned to pool');
  }

  /**
   * Check if projectile is off-screen
   */
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    
    if (!this.active) return;
    
    // Manual fallback movement if physics fails
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body || (body.velocity.x === 0 && body.velocity.y === 0)) {
      const speed = Projectile.SPEED * (delta / 1000);
      switch (this.direction) {
        case 'left': this.x -= speed; break;
        case 'right': this.x += speed; break;
        case 'up': this.y -= speed; break;
        case 'down': this.y += speed; break;
      }
    }

    // Return to pool if off-screen
    if (this.x < -50 || this.x > this.scene.scale.width + 50 || 
        this.y < -50 || this.y > this.scene.scale.height + 50) {
      this.returnToPool();
    }
  }

  /**
   * Actual destruction (only called when scene ends)
   */
  public actualDestroy(): void {
    if (this.autoDestroyTimer) {
      this.autoDestroyTimer.destroy();
      this.autoDestroyTimer = undefined;
    }
    
    super.destroy();
  }

  /**
   * Get current direction
   */
  public getDirection(): Direction {
    return this.direction;
  }
}