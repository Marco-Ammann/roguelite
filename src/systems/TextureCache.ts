/**
 * src/systems/TextureCache.ts
 * ------------------------------------------------------------
 * Central helper that guarantees a texture exists exactly once
 * per scene and uses {@link GraphicsPool} for zero‑GC rendering.
 */

import Phaser from 'phaser';
import GraphicsPool from './GraphicsPool';

export default class TextureCache {
  /**
   * Ensures that `key` is present in the scene's texture manager.
   *
   * @param scene  Active Phaser scene
   * @param key    Unique texture key
   * @param size   Width & height in pixels
   * @param draw   Rendering callback – executed **once** if texture is absent
   */
  public static ensure(
    scene: Phaser.Scene,
    key: string,
    size: { width: number; height: number },
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    if (scene.textures.exists(key)) return;

    const gfx = GraphicsPool.acquire(scene);
    draw(gfx);
    gfx.generateTexture(key, size.width, size.height);
    GraphicsPool.release(gfx);
  }
}
