/**
 * src/ui/HealthBar.ts
 * ------------------------------------------------------------
 * Lightweight, pooled health bar.  Uses two Graphics objects
 * from {@link GraphicsPool} — zero allocations after first draw.
 */

import Phaser from 'phaser';
import GraphicsPool from '../systems/GraphicsPool';

export default class HealthBar extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly fg: Phaser.GameObjects.Graphics;
  private readonly maxWidth: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width = 40,
    height = 6,
  ) {
    super(scene, x, y);
    scene.add.existing(this);

    this.maxWidth = width;

    this.bg = GraphicsPool.acquire(scene);
    this.fg = GraphicsPool.acquire(scene);

    this.add([this.bg, this.fg]);
    this.drawBackground(width, height);
    this.setDepth(500);
  }

  /** Redraw background once – no per‑frame cost. */
  private drawBackground(w: number, h: number): void {
    this.bg.fillStyle(0x000000, 0.6).fillRect(-w / 2, -h / 2, w, h);
  }

  /** Update bar fill (0 → 1). */
  public setPercent(p: number): void {
    const clamped = Phaser.Math.Clamp(p, 0, 1);
    this.fg.clear()
      .fillStyle(0xe53935)
      .fillRect(-this.maxWidth / 2, -2, this.maxWidth * clamped, 4);
  }

  override destroy(fromScene?: boolean): void {
    GraphicsPool.release(this.bg);
    GraphicsPool.release(this.fg);
    super.destroy(fromScene);
  }
}
