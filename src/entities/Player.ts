// src/entities/Player.ts (Fixed Version)
/**
 * Minimale Verbesserung ohne Type-Import Probleme
 */

import Phaser from 'phaser';
import { GameConfig, getPlayerSpeed } from '../config/GameConfig';
import { ensurePlayerTexture } from '../gfx/TextureGenerator';
import type { IDamageable } from '../interfaces/IDamageable';
import type { Direction } from '../gfx/TextureGenerator';
import HealthBar from '../ui/HealthBar';
import Projectile from './Projectile';
import { InputService } from '../services/InputService';

export default class Player extends Phaser.Physics.Arcade.Sprite implements IDamageable {
  // Properties
  readonly maxHp = GameConfig.PLAYER.MAX_HP;
  hp = this.maxHp;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private healthBar: HealthBar;
  private projectiles: Phaser.Physics.Arcade.Group;
  private fireKey: Phaser.Input.Keyboard.Key;
  
  // Optional InputService
  private inputService?: InputService;
  
  private lastShot = 0;
  private lastHit = 0;
  private currentDir: 'up' | 'down' | 'left' | 'right' = 'down';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    projectiles: Phaser.Physics.Arcade.Group
  ) {
    ensurePlayerTexture(scene, 'down');
    super(scene, x, y, 'player-down');

    // Old system (always works)
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.fireKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.projectiles = projectiles;

    // Try new system (optional)
    try {
      this.inputService = new InputService(scene);
      console.log('Player: Using enhanced input');
    } catch (error) {
      console.log('Player: Using standard input');
    }

    this.healthBar = new HealthBar(scene, this);
  }

  update(time: number, _delta: number): void {
    if (this.inputService) {
      this.updateWithNewInput(time);
    } else {
      this.updateLegacy(time);
    }
  }

  private updateWithNewInput(time: number): void {
    const input = this.inputService!.getInputState();
    
    // Movement
    if (input.movement.length() > 0) {
      const velocity = input.movement.clone().scale(getPlayerSpeed());
      this.setVelocity(velocity.x, velocity.y);
      
      if (input.direction && input.direction !== this.currentDir) {
        this.updateTexture(input.direction);
      }
    } else {
      this.setVelocity(0, 0);
    }
    
    // Shooting
    if (input.isFiring && input.direction) {
      this.tryShoot(time, input.direction);
    }
  }

  private updateLegacy(time: number): void {
    const dir = new Phaser.Math.Vector2(
      (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0),
      (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0),
    );

    let newDir: 'up' | 'down' | 'left' | 'right' | null = null;
    
    if (dir.lengthSq() > 0) {
      dir.normalize().scale(getPlayerSpeed());
      this.setVelocity(dir.x, dir.y);

      if (Math.abs(dir.x) > Math.abs(dir.y)) {
        newDir = dir.x < 0 ? 'left' : 'right';
      } else {
        newDir = dir.y < 0 ? 'up' : 'down';
      }
    } else {
      this.setVelocity(0, 0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.fireKey) && newDir) {
      this.tryShoot(time, newDir);
    }

    if (newDir && newDir !== this.currentDir) {
      this.updateTexture(newDir);
    }
  }

  private tryShoot(currentTime: number, direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (currentTime - this.lastShot < GameConfig.PLAYER.FIRE_DELAY) {
      return false;
    }

    this.lastShot = currentTime;
    const projectile = new Projectile(this.scene, this.x, this.y, direction as Direction);
    this.projectiles.add(projectile);
    return true;
  }

  private updateTexture(newDirection: 'up' | 'down' | 'left' | 'right'): void {
    ensurePlayerTexture(this.scene, newDirection);
    this.setTexture(`player-${newDirection}`);
    this.currentDir = newDirection;
  }

  // IDamageable
  takeDamage(amount: number, timestamp?: number): void {
    const now = timestamp ?? this.scene.time.now;
    
    if (now - this.lastHit < GameConfig.PLAYER.HIT_COOLDOWN) {
      return;
    }
    
    this.lastHit = now;
    if (this.hp <= 0) return;
    
    this.hp = Math.max(0, this.hp - amount);
    console.log(`Player took ${amount} damage, ${this.hp}/${this.maxHp} HP remaining`);
    
    if (this.hp === 0) {
      this.die();
    }
  }

  isDead(): boolean {
    return this.hp === 0;
  }

  private die(): void {
    console.log('Player died - restarting scene');
    this.healthBar.destroy();
    this.scene.scene.restart();
  }

  // Public API
  public getCurrentDirection(): 'up' | 'down' | 'left' | 'right' {
    return this.currentDir;
  }

  public getHealthPercentage(): number {
    return this.hp / this.maxHp;
  }

  public getPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  public heal(amount: number): void {
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    console.log(`Player healed: ${oldHp} -> ${this.hp} (+${amount})`);
  }
}