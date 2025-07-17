/**
 * src/entities/PierceProjectile.ts
 * ------------------------------------------------------------
 * A projectile that can pierce multiple enemies without being
 * destroyed.  Uses a per‑enemy, per‑frame gate to guarantee
 * **max 1 hit per enemy per game‑frame** – eliminates the
 * classic “multi‑hit in the same frame” bug in Phaser overlap().
 */

import Phaser from 'phaser';
import Projectile from './Projectile';
import type { Direction } from '../gfx/TextureGenerator';

export default class PierceProjectile extends Projectile {
  /** Gate: enemyId ➜ last frame in which this projectile hit */
  private readonly hitGate = new Map<string, number>();

  /** Total unique enemies already hit (for UI / debugging) */
  private readonly hitEnemies = new Set<string>();

  private readonly maxPierceCount: number;
  private currentPierceCount = 0;

  /**
   * @param scene     Active Phaser scene
   * @param x         World‑X
   * @param y         World‑Y
   * @param dir       Cardinal direction enum
   * @param maxHits   How many unique enemies can be pierced
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

    // Yellow tint to indicate pierce projectiles
    this.setTint(0xffff00);
    console.info(`⚡ Pierce projectile created (max ${maxHits} hits)`);
  }

  /**
   * Called once per projectile/​enemy overlap by CollisionService.
   * Returns **true** if the projectile should be destroyed.
   */
  public onHitEnemy(enemy: Phaser.GameObjects.GameObject): boolean {
    const enemyId =
      (enemy as any).enemyId ??
      (enemy as any).name ??
      `${(enemy as Phaser.GameObjects.Sprite).x}_${(
        enemy as Phaser.GameObjects.Sprite
      ).y}`;

    /* --- FRAME‑GATE -------------------------------------------------- */
    const currentFrame = this.scene.game.loop.frame;
    if (this.hitGate.get(enemyId) === currentFrame) {
      // Same enemy, same frame  ➜ ignore duplicate callback
      return false;
    }
    this.hitGate.set(enemyId, currentFrame);
    /* ---------------------------------------------------------------- */

    /* --- UNIQUE‑HIT COUNT ------------------------------------------- */
    if (!this.hitEnemies.has(enemyId)) {
      this.hitEnemies.add(enemyId);
      this.currentPierceCount += 1;
      console.info(
        `⚡ Pierce hit ${this.currentPierceCount}/${this.maxPierceCount} (${enemyId})`,
      );
    }
    /* ---------------------------------------------------------------- */

    // Destroy when exhaustion reached
    return this.currentPierceCount >= this.maxPierceCount;
  }

  /** For HUD / debug overlay */
  public getPierceCount(): number {
    return this.currentPierceCount;
  }

  /** Convenience helper */
  public canPierce(): boolean {
    return this.currentPierceCount < this.maxPierceCount;
  }
}
