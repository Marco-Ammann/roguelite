import Phaser from "phaser";

/**
 * Ensures that the procedural player texture exists in the texture manager.
 * If not present it will be generated using Phaser Graphics.
 */
export function ensurePlayerTexture(scene: Phaser.Scene, dir: Direction = 'down'): void {
    const key = `player-${dir}`;
    if (scene.textures.exists(key)) return;

    const g = scene.add.graphics();

    // outline
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, 24, 24);

    // armor body (blue)
    g.fillStyle(0x2196f3, 1);
    g.fillRect(2, 8, 20, 14);

    // helmet
    g.fillStyle(0x1976d2, 1);
    g.fillRect(4, 2, 16, 8);

    // visor position based on dir (shift x/y)
    const visorY = dir === 'up' ? 3 : dir === 'down' ? 5 : 4;
    const visorOffsetX = dir === 'left' ? -2 : dir === 'right' ? 2 : 0;
    g.fillStyle(0xeeeeee, 1);
    g.fillRect(6 + visorOffsetX, visorY, 12, 3);

    // simple shoulder pads
    g.fillStyle(0x64b5f6, 1);
    g.fillRect(0, 10, 4, 6);
    g.fillRect(20, 10, 4, 6);

    // shading bottom of body
    g.fillStyle(0x1565c0, 1);
    g.fillRect(2, 16, 20, 6);

    g.generateTexture(key, 24, 24);
    g.destroy();
}

/**
 * Ensures that the procedural enemy texture exists.
 */
import { EnemyRank } from '../enums/EnemyRank';

export type Direction = 'down' | 'up' | 'left' | 'right';

export function ensureEnemyTexture(
  scene: Phaser.Scene,
  rank: EnemyRank = EnemyRank.Standard,
  dir: Direction = 'down',
): void {
    const key = `enemy-${rank}-${dir}`;
    if (scene.textures.exists(key)) return;

    const g = scene.add.graphics();

    // Pick colour based on rank
    const colour = rank === EnemyRank.Standard ? 0xe53935 // red
                 : rank === EnemyRank.Elite ? 0x673ab7   // purple
                 : 0xffb300;                             // boss: amber

    // outline
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, 24, 24);

    // inner body
    g.fillStyle(colour, 1);
    g.fillRect(2, 2, 20, 20);

    // bottom shading
    const shade = Phaser.Display.Color.IntegerToColor(colour).darken(20).color;
    g.fillStyle(shade, 1);
    g.fillRect(2, 14, 20, 8);

    // eyes based on direction
    g.fillStyle(0xffffff, 1);
    const eyeY = dir === 'up' ? 5 : dir === 'down' ? 9 : 7;
    const eyeOffsetX = dir === 'left' ? -2 : dir === 'right' ? 2 : 0;
    g.fillRect(6 + eyeOffsetX, eyeY, 3, 3);
    g.fillRect(14 + eyeOffsetX, eyeY, 3, 3);

    // belt / accent for elites and boss + horns
    if (rank !== EnemyRank.Standard) {
      const accentColor = rank === EnemyRank.Elite ? 0xffffff : 0x000000;
      g.fillStyle(accentColor, 1);
      g.fillRect(2, 18, 20, 3);

      // horns
      g.fillStyle(accentColor, 1);
      if (rank === EnemyRank.Elite) {
        // small horns
        g.fillTriangle(6, 2, 9, -4, 12, 2);
        g.fillTriangle(12, 2, 15, -4, 18, 2);
      } else {
        // boss big horns
        g.fillTriangle(4, 2, 9, -6, 14, 2);
        g.fillTriangle(10, 2, 15, -6, 20, 2);
      }
    }

    g.generateTexture(key, 24, 24);
    g.destroy();
}
