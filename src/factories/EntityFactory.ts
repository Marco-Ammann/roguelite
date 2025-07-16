import Phaser from 'phaser';
import Player from '../entities/Player';
import Enemy from '../entities/Enemy';
import { EnemyRank } from '../enums/EnemyRank';
import { ensurePlayerTexture, ensureEnemyTexture } from '../gfx/TextureGenerator';

/**
 * Creates and returns a fully-initialised Player instance.
 */
export function createPlayer(scene: Phaser.Scene, x: number, y: number): Player {
    ensurePlayerTexture(scene);
    const p = new Player(scene, x, y);
    scene.add.existing(p);
    scene.physics.add.existing(p);
    return p;
}

/**
 * Creates and returns an Enemy instance.
 */
export function createEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  rank: EnemyRank = EnemyRank.Standard,
  speed = 30,
): Enemy {
    ensureEnemyTexture(scene, rank);
    const e = new Enemy(scene, x, y, rank, speed);
    scene.add.existing(e);
    scene.physics.add.existing(e);
    return e;
}
