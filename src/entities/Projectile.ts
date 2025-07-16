import Phaser from 'phaser';
import type { Direction } from '../gfx/TextureGenerator';
import { ensureBulletTexture } from '../gfx/TextureGenerator';

/**
 * Simple projectile fired by the player. Flies straight and destroys itself
 * on impact or when leaving the world bounds.
 */
export default class Projectile extends Phaser.Physics.Arcade.Sprite {
  private static readonly SPEED = 300;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: Direction) {
    ensureBulletTexture(scene);
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCircle(2);

    switch (dir) {
      case 'left':
        this.setVelocity(-Projectile.SPEED, 0);
        break;
      case 'right':
        this.setVelocity(Projectile.SPEED, 0);
        break;
      case 'up':
        this.setVelocity(0, -Projectile.SPEED);
        break;
      case 'down':
      default:
        this.setVelocity(0, Projectile.SPEED);
        break;
    }

    this.setDepth(5);

    // Destroy when leaving world
    this.setCollideWorldBounds(true);
    scene.physics.world.on('worldbounds', (b: Phaser.Physics.Arcade.Body) => {
      if (b.gameObject === this) this.destroy();
    });
    body.onWorldBounds = true;
  }
}
