import Phaser from 'phaser';
import type { Direction } from '../gfx/TextureGenerator';
import { ensureBulletTexture } from '../gfx/TextureGenerator';

/**
 * SIMPLE projectile that definitely moves!
 */
export default class Projectile extends Phaser.Physics.Arcade.Sprite {
  private static readonly SPEED = 300;
  private direction: Direction;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: Direction) {
    ensureBulletTexture(scene);
    super(scene, x, y, 'bullet');
    
    this.direction = dir;
    
    // Add to scene first
    scene.add.existing(this);
    
    // Enable physics - USE DIFFERENT METHOD
    scene.physics.world.enable(this);
    
    // Get body and configure
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(4, 4);  // Simple square collision
      
      // Set velocity immediately  
      switch (dir) {
        case 'left':
          body.velocity.x = -Projectile.SPEED;
          body.velocity.y = 0;
          break;
        case 'right':
          body.velocity.x = Projectile.SPEED;
          body.velocity.y = 0;
          break;
        case 'up':
          body.velocity.x = 0;
          body.velocity.y = -Projectile.SPEED;
          break;
        case 'down':
        default:
          body.velocity.x = 0;
          body.velocity.y = Projectile.SPEED;
          break;
      }
      
      console.log(`🚀 SIMPLE Projectile: ${dir} at (${x},${y}) vel(${body.velocity.x},${body.velocity.y})`);
    }

    this.setDepth(5);
    
    // Auto-destroy after 3 seconds (fallback)
    scene.time.delayedCall(3000, () => {
      if (this.active) {
        console.log('🗑️ Projectile auto-destroyed after 3s');
        this.destroy();
      }
    });
  }

  // Force update position (if physics fails)
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    
    // Manual fallback movement if physics fails
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body || (body.velocity.x === 0 && body.velocity.y === 0)) {
      // Move manually
      const speed = Projectile.SPEED * (delta / 1000);
      switch (this.direction) {
        case 'left': this.x -= speed; break;
        case 'right': this.x += speed; break;
        case 'up': this.y -= speed; break;
        case 'down': this.y += speed; break;
      }
    }

    // Destroy if off-screen
    if (this.x < -50 || this.x > this.scene.scale.width + 50 || 
        this.y < -50 || this.y > this.scene.scale.height + 50) {
      this.destroy();
    }
  }
}