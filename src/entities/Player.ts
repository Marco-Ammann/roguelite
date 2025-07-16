// src/entities/Player.ts (Minimal Update)
/**
 * Schritt 3: Minimale Verbesserung des Players
 * Nur die kritischsten Änderungen ohne Breaking Changes
 */

import Phaser from 'phaser';
import { GameConfig, Direction, getPlayerSpeed } from '../config/GameConfig';
import type { Direction as DirectionType } from '../gfx/TextureGenerator';
import { ensurePlayerTexture } from '../gfx/TextureGenerator';
import type { IDamageable } from '../interfaces/IDamageable';
import HealthBar from '../ui/HealthBar';
import Projectile from './Projectile';
import { InputService, InputState } from '../services/InputService';

export default class Player extends Phaser.Physics.Arcade.Sprite implements IDamageable {
  // Public properties (for backward compatibility)
  readonly maxHp = GameConfig.PLAYER.MAX_HP;
  hp = this.maxHp;

  // Private properties
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private healthBar: HealthBar;
  private projectiles: Phaser.Physics.Arcade.Group;
  private fireKey: Phaser.Input.Keyboard.Key;
  
  // Optional InputService (can be null for backward compatibility)
  private inputService?: InputService;
  
  // State tracking
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

    // Initialize old way for compatibility
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.fireKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.projectiles = projectiles;

    // Try to initialize new InputService (optional)
    try {
      this.inputService = new InputService(scene);
      console.log('Player: Using new InputService');
    } catch (error) {
      console.log('Player: Falling back to old input system');
      this.inputService = undefined;
    }

    // Health bar
    this.healthBar = new HealthBar(scene, this);
    
    console.log('Player created with enhanced input system');
  }

  update(time: number, _delta: number): void {
    // Use new input system if available, otherwise fall back to old
    if (this.inputService) {
      this.updateWithInputService(time);
    } else {
      this.updateLegacy(time);
    }
  }

  // New update method using InputService
  private updateWithInputService(time: number): void {
    const input = this.inputService!.getInputState();
    
    // Handle movement
    this.handleMovement(input.movement, input.direction);
    
    // Handle shooting
    if (input.isFiring && input.direction) {
      this.tryShoot(time, input.direction);
    }
  }

  // Legacy update method (unchanged for compatibility)
  private updateLegacy(time: number): void {
    const dir = new Phaser.Math.Vector2(
      (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0),
      (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0),
    );

    let newDir: Direction | null = null;
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

    // Shoot
    if (Phaser.Input.Keyboard.JustDown(this.fireKey) && newDir) {
      this.tryShoot(time, newDir);
    }

    // Update texture if direction changed
    if (newDir && newDir !== this.currentDir) {
      this.updateTexture(newDir);
    }
  }

  // Shared movement logic
  private handleMovement(movement: Phaser.Math.Vector2, direction: Direction | null): void {
    if (movement.length() > 0) {
      const velocity = movement.clone().scale(getPlayerSpeed());
      this.setVelocity(velocity.x, velocity.y);
      
      if (direction && direction !== this.currentDir) {
        this.updateTexture(direction);
      }
    } else {
      this.setVelocity(0, 0);
    }
  }

  // Shared shooting logic
  private tryShoot(currentTime: number, direction: Direction): boolean {
    if (currentTime - this.lastShot < GameConfig.PLAYER.FIRE_DELAY) {
      return false;
    }

    this.lastShot = currentTime;
    const projectile = new Projectile(this.scene, this.x, this.y, direction as DirectionType);
    this.projectiles.add(projectile);
    return true;
  }

  // Shared texture update
  private updateTexture(newDirection: Direction): void {
    ensurePlayerTexture(this.scene, newDirection);
    this.setTexture(`player-${newDirection}`);
    this.currentDir = newDirection;
  }

  // IDamageable implementation (unchanged)
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
    this.inputService?.destroy();
    this.scene.scene.restart();
  }

  // Public API methods (for external access)
  public getCurrentDirection(): Direction {
    return this.currentDir;
  }

  public getHealthPercentage(): number {
    return this.hp / this.maxHp;
  }

  public getPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  // Upgrade methods (future-proofing)
  public heal(amount: number): void {
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    console.log(`Player healed: ${oldHp} -> ${this.hp} (+${amount})`);
  }

  public isUsingNewInputSystem(): boolean {
    return this.inputService !== undefined;
  }
}