// src/entities/components/HealthComponent.ts
import type { IDamageable } from '../../interfaces/IDamageable';
import Logger from '../../utils/Logger';

export class HealthComponent implements IDamageable {
  readonly maxHp: number;
  hp: number;
  private onDeathCallback?: () => void;
  private onDamageCallback?: (damage: number, currentHp: number) => void;

  constructor(maxHp: number) {
    this.maxHp = maxHp;
    this.hp = maxHp;
  }

  takeDamage(amount: number): void {
    if (this.isDead()) return;
    
    const oldHp = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    
    Logger.info(`Health: ${oldHp} -> ${this.hp} (-${amount})`);
    
    this.onDamageCallback?.(amount, this.hp);
    
    if (this.hp === 0) {
      this.onDeathCallback?.();
    }
  }

  heal(amount: number): void {
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    Logger.info(`Healed: ${oldHp} -> ${this.hp} (+${amount})`);
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  getHealthPercentage(): number {
    return this.hp / this.maxHp;
  }

  onDeath(callback: () => void): void {
    this.onDeathCallback = callback;
  }

  onDamage(callback: (damage: number, currentHp: number) => void): void {
    this.onDamageCallback = callback;
  }
}

// src/entities/components/MovementComponent.ts
import Phaser from 'phaser';
import { GameConfig, type Direction } from '../../config/GameConfig';

export class MovementComponent {
  private sprite: Phaser.Physics.Arcade.Sprite;
  private speed: number;
  private currentDirection: Direction;

  constructor(sprite: Phaser.Physics.Arcade.Sprite, speed: number = GameConfig.PLAYER.SPEED) {
    this.sprite = sprite;
    this.speed = speed;
    this.currentDirection = 'down';
  }

  move(direction: Phaser.Math.Vector2): void {
    if (direction.length() > 0) {
      const velocity = direction.clone().scale(this.speed);
      this.sprite.setVelocity(velocity.x, velocity.y);
    } else {
      this.sprite.setVelocity(0, 0);
    }
  }

  getCurrentDirection(): Direction {
    return this.currentDirection;
  }

  updateDirection(newDirection: Direction | null): boolean {
    if (newDirection && newDirection !== this.currentDirection) {
      this.currentDirection = newDirection;
      return true; // Direction changed
    }
    return false; // No change
  }

  stop(): void {
    this.sprite.setVelocity(0, 0);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getSpeed(): number {
    return this.speed;
  }
}

// src/entities/components/WeaponComponent.ts
import Phaser from 'phaser';
import { GameConfig, type Direction } from '../../config/GameConfig';
import Projectile from '../Projectile';
import Logger from '../../utils/Logger';

export class WeaponComponent {
  private scene: Phaser.Scene;
  private sprite: Phaser.Physics.Arcade.Sprite;
  private projectiles: Phaser.Physics.Arcade.Group;
  private lastShotTime: number = 0;
  private fireDelay: number;

  constructor(
    scene: Phaser.Scene,
    sprite: Phaser.Physics.Arcade.Sprite,
    projectiles: Phaser.Physics.Arcade.Group,
    fireDelay: number = GameConfig.PLAYER.FIRE_DELAY
  ) {
    this.scene = scene;
    this.sprite = sprite;
    this.projectiles = projectiles;
    this.fireDelay = fireDelay;
  }

  canFire(currentTime: number): boolean {
    return currentTime - this.lastShotTime >= this.fireDelay;
  }

  fire(direction: Direction, currentTime: number): boolean {
    if (!this.canFire(currentTime)) return false;

    this.lastShotTime = currentTime;
    const projectile = new Projectile(
      this.scene,
      this.sprite.x,
      this.sprite.y,
      direction
    );
    this.projectiles.add(projectile);
    
    Logger.info(`Fired projectile in direction: ${direction}`);
    return true;
  }

  setFireDelay(delay: number): void {
    this.fireDelay = delay;
  }

  getFireDelay(): number {
    return this.fireDelay;
  }
}

// src/entities/Player.ts (Refactored)
import Phaser from 'phaser';
import { GameConfig, type Direction } from '../config/GameConfig';
import { ensurePlayerTexture } from '../gfx/TextureGenerator';
import HealthBar from '../ui/HealthBar';
import { ServiceManager } from '../services/ServiceManager';
import { InputService, type InputState } from '../services/InputService';
import { HealthComponent } from './components/HealthComponent';
import { MovementComponent } from './components/MovementComponent';
import { WeaponComponent } from './components/WeaponComponent';
import Logger from '../utils/Logger';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  // Components
  private healthComponent: HealthComponent;
  private movementComponent: MovementComponent;
  private weaponComponent: WeaponComponent;
  private healthBar: HealthBar;
  
  // Services
  private inputService: InputService;
  
  // State
  private lastHitTime: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    projectiles: Phaser.Physics.Arcade.Group
  ) {
    ensurePlayerTexture(scene, 'down');
    super(scene, x, y, 'player-down');

    this.initializeServices();
    this.initializeComponents(projectiles);
    this.setupHealthBar();
    this.setupEventHandlers();
    
    Logger.info('Player entity created');
  }

  private initializeServices(): void {
    const serviceManager = ServiceManager.getInstance();
    this.inputService = serviceManager.get<InputService>('input');
  }

  private initializeComponents(projectiles: Phaser.Physics.Arcade.Group): void {
    this.healthComponent = new HealthComponent(GameConfig.PLAYER.MAX_HP);
    this.movementComponent = new MovementComponent(this, GameConfig.PLAYER.SPEED);
    this.weaponComponent = new WeaponComponent(
      this.scene,
      this,
      projectiles,
      GameConfig.PLAYER.FIRE_DELAY
    );
  }

  private setupHealthBar(): void {
    this.healthBar = new HealthBar(this.scene, this);
  }

  private setupEventHandlers(): void {
    this.healthComponent.onDeath(() => this.handleDeath());
    this.healthComponent.onDamage((damage, hp) => this.handleDamage(damage, hp));
  }

  update(_time: number, _delta: number): void {
    const input = this.inputService.getInputState();
    this.handleMovement(input);
    this.handleShooting(input, _time);
  }

  private handleMovement(input: InputState): void {
    this.movementComponent.move(input.movement);
    
    if (this.movementComponent.updateDirection(input.direction)) {
      this.updateTexture();
    }
  }

  private handleShooting(input: InputState, currentTime: number): void {
    if (input.isFiring && input.direction) {
      this.weaponComponent.fire(input.direction, currentTime);
    }
  }

  private updateTexture(): void {
    const direction = this.movementComponent.getCurrentDirection();
    ensurePlayerTexture(this.scene, direction);
    this.setTexture(`player-${direction}`);
  }

  // IDamageable interface (delegated to HealthComponent)
  get maxHp(): number {
    return this.healthComponent.maxHp;
  }

  get hp(): number {
    return this.healthComponent.hp;
  }

  takeDamage(amount: number, timestamp?: number): void {
    const now = timestamp ?? this.scene.time.now;
    
    // Hit cooldown check
    if (now - this.lastHitTime < GameConfig.PLAYER.HIT_COOLDOWN) {
      return;
    }
    
    this.lastHitTime = now;
    this.healthComponent.takeDamage(amount);
  }

  isDead(): boolean {
    return this.healthComponent.isDead();
  }

  // Event handlers
  private handleDamage(damage: number, currentHp: number): void {
    Logger.info(`Player damaged: ${damage} damage, ${currentHp} HP remaining`);
    // Could add visual effects, screen shake, etc.
  }

  private handleDeath(): void {
    Logger.info('Player died - restarting scene');
    this.healthBar.destroy();
    this.scene.scene.restart();
  }

  // Public API for external systems
  getPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  getCurrentDirection(): Direction {
    return this.movementComponent.getCurrentDirection();
  }

  getHealthPercentage(): number {
    return this.healthComponent.getHealthPercentage();
  }

  // Upgrades/Power-ups
  upgradeSpeed(multiplier: number): void {
    const newSpeed = this.movementComponent.getSpeed() * multiplier;
    this.movementComponent.setSpeed(newSpeed);
    Logger.info(`Player speed upgraded to: ${newSpeed}`);
  }

  upgradeFireRate(multiplier: number): void {
    const newDelay = this.weaponComponent.getFireDelay() / multiplier;
    this.weaponComponent.setFireDelay(newDelay);
    Logger.info(`Player fire rate upgraded, delay now: ${newDelay}ms`);
  }

  heal(amount: number): void {
    this.healthComponent.heal(amount);
  }
}