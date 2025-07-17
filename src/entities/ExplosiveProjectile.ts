/**
 * src/entities/ExplosiveProjectile.ts
 * ------------------------------------------------------------
 * Explosive projectile that detonates on first impact and
 * applies single‑frame AOE damage via `physics.overlapCirc`.
 * Strict‑type‑safe für Phaser 3.90 + TypeScript 5.8.
 */

import Phaser from 'phaser';
import Projectile from './Projectile';
import type { Direction } from '../gfx/TextureGenerator';

export default class ExplosiveProjectile extends Projectile {
  private readonly explosionRadius: number;
  private hasExploded = false;

  /** Track enemies already damaged by this explosion */
  private readonly damaged = new Set<string>();

  /**
   * @param scene   Active Phaser scene
   * @param x       World‑X
   * @param y       World‑Y
   * @param dir     Cardinal direction
   * @param radius  AOE radius in px (default 60)
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dir: Direction,
    radius = 60,
  ) {
    super(scene, x, y, dir);
    this.explosionRadius = radius;

    // Orange tint indicates explosive type
    this.setTint(0xff6600);
    console.info(`💥 Explosive projectile created (radius ${radius}px)`);
  }

  /**
   * Triggered by CollisionService on first enemy touch.
   * Always returns `true` so the service removes the projectile.
   */
  public onHitEnemy(): boolean {
    if (!this.hasExploded) {
      this.hasExploded = true;
      this.explode();
    }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /** Detonates, damages nearby enemies and spawns a simple VFX. */
  private explode(): void {
    // Disable physics body ➜ prevents follow‑up overlaps.
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    const scene = this.scene as Phaser.Scene;

    /**
     * Phaser 3.90 signature:
     *   overlapCirc(x, y, radius, includeDynamic = true, includeStatic = false)
     * ➜ liefert ein Array von Bodies (keine Callbacks möglich!).
     */
    const bodies = scene.physics.overlapCirc(
      this.x,
      this.y,
      this.explosionRadius,
      true,   // includeDynamic
      false,  // includeStatic
    ) as Phaser.Physics.Arcade.Body[];

    bodies.forEach((body) => {
      const enemyObj = body.gameObject as Phaser.GameObjects.GameObject;

      // Defensive: body kann zu Partikeln o. Ä. gehören
      if (!enemyObj) return;

      const id =
        (enemyObj as any).enemyId ??
        enemyObj.name ??
        `${(enemyObj as any).x}_${(enemyObj as any).y}`;

      if (this.damaged.has(id)) return;

      this.damaged.add(id);
      (enemyObj as any).takeDamage?.(2); // 2 = base explosive damage
    });

    console.info(
      `💥 Explosion hit ${this.damaged.size} enemies (radius ${this.explosionRadius}px)`,
    );

    this.spawnExplosionVfx();
  }

  /** Simple expanding‑circle VFX – fully procedural. */
  private spawnExplosionVfx(): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(15);

    let current = 10;
    const step = 8;
    const timer = this.scene.time.addEvent({
      delay: 50,
      repeat: Math.ceil(this.explosionRadius / step),
      callback: () => {
        gfx.clear();
        gfx.fillStyle(0xff6600, 0.6 - current / this.explosionRadius / 2);
        gfx.fillCircle(this.x, this.y, current);
        gfx.fillStyle(0xffff00, 0.8 - current / this.explosionRadius / 1.5);
        gfx.fillCircle(this.x, this.y, current * 0.5);
        current += step;
      },
    });

    this.scene.time.delayedCall(400, () => {
      gfx.destroy();
      timer.destroy();
    });
  }

  /** Public getter for UI / debug overlay */
  public getExplosionRadius(): number {
    return this.explosionRadius;
  }
}
