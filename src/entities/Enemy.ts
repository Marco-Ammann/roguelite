import Phaser from 'phaser';
import { ENEMY_SPEED } from '../config/constants';
import HealthBar from '../ui/HealthBar';
import type { IDamageable } from '../interfaces/IDamageable';
import type { EnemyRank } from '../enums/EnemyRank';
import type { Direction } from '../gfx/TextureGenerator';
import { ensureEnemyTexture } from '../gfx/TextureGenerator';

/**
 * Simple enemy that pursues a target position.
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite implements IDamageable {
    private speed: number;
  readonly rank: EnemyRank;
  private dir: Direction = 'down';
  readonly maxHp = 5;
  hp = this.maxHp;
  private readonly healthBar: HealthBar;

    /**
     * Creates a new enemy at the specified position.
     *
     * @param scene The scene this enemy belongs to.
     * @param x The x-coordinate of the enemy's position.
     * @param y The y-coordinate of the enemy's position.
     * @param speed The speed of the enemy (optional, defaults to ENEMY_SPEED).
     */
    constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rank: EnemyRank,
    speed: number = ENEMY_SPEED,
    dir: Direction = 'down',
  ) {
        ensureEnemyTexture(scene, rank, dir);
        super(scene, x, y, `enemy-${rank}-${dir}`);
        this.rank = rank;
        this.speed = speed;
        this.dir = dir;
        // health bar UI
        this.healthBar = new HealthBar(scene, this as unknown as Phaser.GameObjects.Sprite & IDamageable, 20, 4);
    }

    /**
     * Updates velocity so the enemy moves straight toward the given target.
     *
     * @param target World-space target position (e.g., the player's centre).
     */
    pursue(target: Phaser.Math.Vector2): void {
        const vec = target.clone().subtract(this.getCenter(new Phaser.Math.Vector2())).normalize();
        this.setVelocity(vec.x * this.speed, vec.y * this.speed);

        // determine facing direction
        let newDir: Direction = this.dir;
        if (Math.abs(vec.x) > Math.abs(vec.y)) {
            newDir = vec.x < 0 ? 'left' : 'right';
        } else {
            newDir = vec.y < 0 ? 'up' : 'down';
        }
        if (newDir !== this.dir) {
            ensureEnemyTexture(this.scene as Phaser.Scene, this.rank, newDir);
            this.setTexture(`enemy-${this.rank}-${newDir}`);
            this.dir = newDir;
        }
    }
}
