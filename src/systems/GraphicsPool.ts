/**
 * src/systems/GraphicsPool.ts
 * ------------------------------------------------------------
 * A light‑weight object pool for `Phaser.GameObjects.Graphics`.
 * Avoids frequent allocations and GC spikes when procedural
 * textures or debug overlays create short‑lived graphics.
 */

import Phaser from 'phaser';

export default class GraphicsPool {
  /** One pool per active scene to avoid cross‑scene artefacts */
  private static readonly pools = new Map<
    Phaser.Scene,
    Phaser.GameObjects.Graphics[]
  >();

  /**
   * Acquire a graphics instance.  
   * The caller **must** return it via {@link release}.
   */
  public static acquire(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
    let list = this.pools.get(scene);
    if (!list) {
      list = [];
      this.pools.set(scene, list);

      /* Auto‑cleanup when the scene shuts down */
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        list?.forEach((g) => g.destroy());
        this.pools.delete(scene);
      });
    }

    const gfx = list.pop() ?? scene.add.graphics();
    gfx.clear().setVisible(true);
    return gfx;
  }

  /**
   * Return a graphics instance to the pool.  
   * If the originating scene is gone, the object is destroyed.
   */
  public static release(gfx: Phaser.GameObjects.Graphics): void {
    const scene = gfx.scene;
    const list = this.pools.get(scene);

    if (list) {
      gfx.clear().setVisible(false);
      list.push(gfx);
    } else {
      gfx.destroy();
    }
  }
}
