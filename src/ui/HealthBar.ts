import Phaser from 'phaser';
import type { IDamageable } from '../interfaces/IDamageable';

/**
 * Simple rectangular health bar that tracks a damageable target.
 */
export default class HealthBar extends Phaser.GameObjects.Graphics {
  private target: Phaser.GameObjects.Sprite & IDamageable;
  private readonly width: number;
  private readonly height: number;

  constructor(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Sprite & IDamageable,
    width = 16,
    height = 3,
  ) {
    super(scene);
    this.target = target;
    this.width = width;
    this.height = height;

    this.setDepth(10);
    scene.add.existing(this);

    // Update each frame
    scene.events.on('postupdate', this.updateBar, this);
  }

  private updateBar() {
    if (!this.scene) return;

    // Position above the target
    const x = this.target.x - this.width / 2;
    const y = this.target.y - this.target.height / 2 - this.height - 2;

    this.clear();

    const pct = Phaser.Math.Clamp(this.target.hp / this.target.maxHp, 0, 1);

    // background
    this.fillStyle(0x000000, 0.6);
    this.fillRect(x, y, this.width, this.height);

    // health
    this.fillStyle(0xff5252, 1);
    this.fillRect(x + 1, y + 1, (this.width - 2) * pct, this.height - 2);
  }

  override destroy(fromScene?: boolean): void {
    // Clean up listener
    this.scene?.events.off('postupdate', this.updateBar, this);
    super.destroy(fromScene);
  }
}
