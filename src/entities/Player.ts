import Phaser from 'phaser';
import { GameConfig, getPlayerSpeed } from '../config/GameConfig';
import { ensurePlayerTexture } from '../gfx/TextureGenerator';
import type { IDamageable } from '../interfaces/IDamageable';
import type { Direction } from '../gfx/TextureGenerator';
import HealthBar from '../ui/HealthBar';
import Projectile from './Projectile';

export default class Player extends Phaser.Physics.Arcade.Sprite implements IDamageable {
  readonly maxHp = GameConfig.PLAYER.MAX_HP;
  hp = this.maxHp;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: any;
  private healthBar: HealthBar;
  private projectiles: Phaser.Physics.Arcade.Group;
  private fireKey: Phaser.Input.Keyboard.Key;
  
  private lastShot = 0;
  private lastHit = 0;
  private currentDir: Direction = 'down';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    projectiles: Phaser.Physics.Arcade.Group
  ) {
    ensurePlayerTexture(scene, 'down');
    super(scene, x, y, 'player-down');

    // Simplified input system - just use what works
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,S,A,D');
    this.fireKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.projectiles = projectiles;

    this.healthBar = new HealthBar(scene, this);
    
    console.log('✅ Player: Simplified input system loaded');
  }

  update(time: number, _delta: number): void {
    // Movement input
    const moveX = (this.cursors.left?.isDown || this.wasd.A?.isDown ? -1 : 0) +
                  (this.cursors.right?.isDown || this.wasd.D?.isDown ? 1 : 0);
    const moveY = (this.cursors.up?.isDown || this.wasd.W?.isDown ? -1 : 0) +
                  (this.cursors.down?.isDown || this.wasd.S?.isDown ? 1 : 0);

    // Apply movement
    if (moveX !== 0 || moveY !== 0) {
      const speed = getPlayerSpeed();
      const normalizedX = moveX !== 0 ? moveX / Math.sqrt(moveX * moveX + moveY * moveY) : 0;
      const normalizedY = moveY !== 0 ? moveY / Math.sqrt(moveX * moveX + moveY * moveY) : 0;
      
      this.setVelocity(normalizedX * speed, normalizedY * speed);
      
      // Update direction and texture
      let newDir: Direction;
      if (Math.abs(moveX) > Math.abs(moveY)) {
        newDir = moveX < 0 ? 'left' : 'right';
      } else {
        newDir = moveY < 0 ? 'up' : 'down';
      }
      
      if (newDir !== this.currentDir) {
        this.updateTexture(newDir);
      }
    } else {
      this.setVelocity(0, 0);
    }

    // Shooting input - simplified and reliable
    if (this.fireKey.isDown && this.canShoot(time)) {
      this.shoot(time);
    }
  }

  private canShoot(currentTime: number): boolean {
    return currentTime - this.lastShot >= GameConfig.PLAYER.FIRE_DELAY;
  }

  private shoot(currentTime: number): void {
    this.lastShot = currentTime;
    
    const projectile = new Projectile(this.scene, this.x, this.y, this.currentDir);
    this.projectiles.add(projectile);
    
    console.log(`🔫 Player shot ${this.currentDir}`);
  }

  private updateTexture(newDirection: Direction): void {
    ensurePlayerTexture(this.scene, newDirection);
    this.setTexture(`player-${newDirection}`);
    this.currentDir = newDirection;
  }

  // IDamageable implementation
  takeDamage(amount: number, timestamp?: number): void {
    const now = timestamp ?? this.scene.time.now;
    
    if (now - this.lastHit < GameConfig.PLAYER.HIT_COOLDOWN) {
      return;
    }
    
    this.lastHit = now;
    if (this.hp <= 0) return;
    
    this.hp = Math.max(0, this.hp - amount);
    console.log(`💔 Player: ${this.hp}/${this.maxHp} HP`);
    
    if (this.hp === 0) {
      this.die();
    }
  }

  isDead(): boolean {
    return this.hp === 0;
  }

  private die(): void {
    console.log('💀 Player died');
    this.healthBar.destroy();
    this.scene.scene.restart();
  }

  // Public API
  getCurrentDirection(): Direction {
    return this.currentDir;
  }

  getHealthPercentage(): number {
    return this.hp / this.maxHp;
  }
}