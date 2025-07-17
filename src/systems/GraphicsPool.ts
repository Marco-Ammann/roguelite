/**
 * src/systems/GraphicsPool.ts
 * ------------------------------------------------------------
 * Reusable pool for `Phaser.GameObjects.Graphics` plus lightweight
 * stats for debugger overlays.  Zero‑allocation drawing after warmup.
 */

import Phaser from 'phaser';

export interface GraphicsStats {
  inPool: number;
  inUse: number;
  total: number;
}

export default class GraphicsPool {
  /** Scene ➜ pooled (inactive) graphics list */
  private static readonly pools = new Map<
    Phaser.Scene,
    Phaser.GameObjects.Graphics[]
  >();

  /** Scene ➜ currently active (checked‑out) count */
  private static readonly active = new Map<Phaser.Scene, number>();

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */

  /** Acquire a graphics instance; caller **must** {@link release}. */
  public static acquire(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
    const list = this.ensurePool(scene);
    const gfx = list.pop() ?? scene.add.graphics();
    gfx.clear().setVisible(true);

    this.active.set(scene, (this.active.get(scene) ?? 0) + 1);
    return gfx;
  }

  /** Return a graphics instance to the pool or destroy if scene gone. */
  public static release(gfx: Phaser.GameObjects.Graphics): void {
    const scene = gfx.scene;
    if (!this.pools.has(scene)) {
      gfx.destroy();
      return;
    }
    gfx.clear().setVisible(false);
    this.pools.get(scene)!.push(gfx);
    this.active.set(scene, (this.active.get(scene) ?? 1) - 1);
  }

  /** Runtime stats for MemoryDebugOverlay (F4). */
  public static getStats(scene: Phaser.Scene): GraphicsStats {
    const inPool = this.pools.get(scene)?.length ?? 0;
    const inUse = this.active.get(scene) ?? 0;
    return { inPool, inUse, total: inPool + inUse };
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private static ensurePool(scene: Phaser.Scene): Phaser.GameObjects.Graphics[] {
    if (!this.pools.has(scene)) {
      this.pools.set(scene, []);
      this.active.set(scene, 0);
      /* Scene cleanup */
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.pools.get(scene)?.forEach((g) => g.destroy());
        this.pools.delete(scene);
        this.active.delete(scene);
      });
    }
    return this.pools.get(scene)!;
  }
}
