import Phaser from 'phaser';
import { PLAYER_SPEED } from '../config/constants';
import type { Direction } from '../gfx/TextureGenerator';
import { ensurePlayerTexture } from '../gfx/TextureGenerator';
import type { IDamageable } from '../interfaces/IDamageable';
import HealthBar from '../ui/HealthBar';

/**
 * The controllable player character.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite implements IDamageable {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  readonly maxHp = 10;
  hp = this.maxHp;
  private readonly healthBar: HealthBar;
  private currentDir: Direction = 'down';

    /**
     * Creates a new player character.
     * 
     * @param scene The scene this player belongs to.
     * @param x The initial x-coordinate of the player.
     * @param y The initial y-coordinate of the player.
     */
    constructor(scene: Phaser.Scene, x: number, y: number) {
        ensurePlayerTexture(scene, 'down');
        super(scene, x, y, 'player-down');
        // The input plugin is guaranteed to exist for this scene, so we can safely use the non-null assertion
        this.cursors = scene.input.keyboard!.createCursorKeys();

    // Health bar
    this.healthBar = new HealthBar(scene, this);
    }

    /**
     * Polls keyboard state and moves the player. Diagonal movement retains the
     * same overall speed by normalising the direction vector.
     * 
     * @param _t The current time.
     * @param _dt The time since the last update.
     */
    update(_t: number, _dt: number) {
        const dir = new Phaser.Math.Vector2(
            (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0),
            (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0),
        );

        let newDir: Direction | null = null;
        if (dir.lengthSq() > 0) {
            dir.normalize().scale(PLAYER_SPEED);
            this.setVelocity(dir.x, dir.y);

            // Determine facing direction
            if (Math.abs(dir.x) > Math.abs(dir.y)) {
                newDir = dir.x < 0 ? 'left' : 'right';
            } else {
                newDir = dir.y < 0 ? 'up' : 'down';
            }
        } else {
            this.setVelocity(0, 0);
        }

        // Update texture if direction changed
        if (newDir && newDir !== this.currentDir) {
            ensurePlayerTexture(this.scene, newDir);
            this.setTexture(`player-${newDir}`);
            this.currentDir = newDir;
        }
    }

  /** Applies damage to the player. */
  takeDamage(amount: number): void {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.die();
    }
  }

  isDead(): boolean {
    return this.hp === 0;
  }

  private die() {
    // Clean up UI element then restart the scene
    this.healthBar.destroy();
    this.scene.scene.restart();
  }
}