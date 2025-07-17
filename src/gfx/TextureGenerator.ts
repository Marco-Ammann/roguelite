/**
 * src/gfx/TextureGenerator.ts
 * ------------------------------------------------------------
 * Procedural texture generator for player, enemy and bullet
 * sprites.  Relies on {@link TextureCache} to avoid duplicate
 * generation and on {@link GraphicsPool} for zero‑GC drawing.
 */

import Phaser from 'phaser';
import TextureCache from '../systems/TextureCache';
import { EnemyRank } from '../enums/EnemyRank';

export type Direction = 'down' | 'up' | 'left' | 'right';

/* -------------------------------------------------------------------------- */
/* Bullet                                                                    */
/* -------------------------------------------------------------------------- */

/** 4×4 white pixel – used for all projectile variants */
export function ensureBulletTexture(scene: Phaser.Scene): void {
  TextureCache.ensure(scene, 'bullet', { width: 4, height: 4 }, (g) => {
    g.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
  });
}

/* -------------------------------------------------------------------------- */
/* Player                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Blue knight sprite (24×24) with visor that moves depending
 * on facing {@link Direction}.
 */
export function ensurePlayerTexture(
  scene: Phaser.Scene,
  dir: Direction = 'down',
): void {
  const key = `player-${dir}`;
  TextureCache.ensure(scene, key, { width: 24, height: 24 }, (g) => {
    const visorY = dir === 'up' ? 3 : dir === 'down' ? 5 : 4;
    const visorDX = dir === 'left' ? -2 : dir === 'right' ? 2 : 0;

    g.fillStyle(0x000000).fillRect(0, 0, 24, 24); // outline
    g.fillStyle(0x2196f3).fillRect(2, 8, 20, 14); // body
    g.fillStyle(0x1976d2).fillRect(4, 2, 16, 8);  // helmet
    g.fillStyle(0xeeeeee).fillRect(6 + visorDX, visorY, 12, 3); // visor
    g.fillStyle(0x64b5f6)
      .fillRect(0, 10, 4, 6)
      .fillRect(20, 10, 4, 6);                      // shoulders
    g.fillStyle(0x1565c0).fillRect(2, 16, 20, 6);  // shading
  });
}

/* -------------------------------------------------------------------------- */
/* Enemy                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Enemy sprite (24×24).  Colour & accents vary by {@link EnemyRank}.
 */
export function ensureEnemyTexture(
  scene: Phaser.Scene,
  rank: EnemyRank = EnemyRank.Standard,
  dir: Direction = 'down',
): void {
  const key = `enemy-${rank}-${dir}`;
  TextureCache.ensure(scene, key, { width: 24, height: 24 }, (g) => {
    const base =
      rank === EnemyRank.Standard
        ? 0xe53935
        : rank === EnemyRank.Elite
        ? 0x673ab7
        : 0xffb300;

    const eyeY = dir === 'up' ? 5 : dir === 'down' ? 9 : 7;
    const eyeDX = dir === 'left' ? -2 : dir === 'right' ? 2 : 0;

    g.fillStyle(0x000000).fillRect(0, 0, 24, 24); // outline
    g.fillStyle(base).fillRect(2, 2, 20, 20);     // body
    g.fillStyle(
      Phaser.Display.Color.IntegerToColor(base).darken(20).color,
    ).fillRect(2, 14, 20, 8);                     // shading

    g.fillStyle(0xffffff)
      .fillRect(6 + eyeDX, eyeY, 3, 3)
      .fillRect(14 + eyeDX, eyeY, 3, 3);          // eyes

    if (rank !== EnemyRank.Standard) {
      const accent = rank === EnemyRank.Elite ? 0xffffff : 0x000000;
      g.fillStyle(accent).fillRect(2, 18, 20, 3); // belt

      // horns
      if (rank === EnemyRank.Elite) {
        g.fillTriangle(6, 2, 9, -4, 12, 2)
          .fillTriangle(12, 2, 15, -4, 18, 2);
      } else {
        g.fillTriangle(4, 2, 9, -6, 14, 2)
          .fillTriangle(10, 2, 15, -6, 20, 2);
      }
    }
  });
}
