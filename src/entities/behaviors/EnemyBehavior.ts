// src/entities/behaviors/EnemyBehavior.ts
import Phaser from 'phaser';
import Enemy from '../Enemy';

export interface IBehavior {
  update(enemy: Enemy, target: Phaser.Math.Vector2, deltaTime: number): void;
}

export class PursuitBehavior implements IBehavior {
  private speed: number;

  constructor(speed: number) {
    this.speed = speed;
  }

  update(enemy: Enemy, target: Phaser.Math.Vector2): void {
    const direction = target.clone()
      .subtract(enemy.getCenter(new Phaser.Math.Vector2()))
      .normalize();
    
    enemy.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }
}

export class CirclingBehavior implements IBehavior {
  private speed: number;
  private radius: number;
  private angle: number = 0;
  private angularSpeed: number;

  constructor(speed: number, radius: number = 100, angularSpeed: number = 0.02) {
    this.speed = speed;
    this.radius = radius;
    this.angularSpeed = angularSpeed;
  }

  update(enemy: Enemy, target: Phaser.Math.Vector2, deltaTime: number): void {
    this.angle += this.angularSpeed * deltaTime;
    
    const offsetX = Math.cos(this.angle) * this.radius;
    const offsetY = Math.sin(this.angle) * this.radius;
    
    const desiredPosition = new Phaser.Math.Vector2(
      target.x + offsetX,
      target.y + offsetY
    );
    
    const direction = desiredPosition
      .subtract(enemy.getCenter(new Phaser.Math.Vector2()))
      .normalize();
    
    enemy.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }
}

export class FlockingBehavior implements IBehavior {
  private speed: number;
  private separationDistance: number;
  private alignmentDistance: number;
  private cohesionDistance: number;

  constructor(speed: number, separationDistance = 30, alignmentDistance = 50, cohesionDistance = 80) {
    this.speed = speed;
    this.separationDistance = separationDistance;
    this.alignmentDistance = alignmentDistance;
    this.cohesionDistance = cohesionDistance;
  }

  update(enemy: Enemy, target: Phaser.Math.Vector2): void {
    // For flocking, we'd need access to other enemies
    // This is a simplified version that just pursues
    const direction = target.clone()
      .subtract(enemy.getCenter(new Phaser.Math.Vector2()))
      .normalize();
    
    enemy.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }
}

// src/entities/Enemy.ts (Enhanced)
import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import HealthBar from '../ui/HealthBar';
import type { IDamageable } from '../interfaces/IDamageable';
import type { EnemyRank } from '../enums/EnemyRank';
import type { Direction } from '../gfx/TextureGenerator';
import { ensureEnemyTexture } from '../gfx/TextureGenerator';
import { HealthComponent } from './components/HealthComponent';
import { MovementComponent } from './components/MovementComponent';
import type { IBehavior } from './behaviors/EnemyBehavior';
import { PursuitBehavior } from './behaviors/EnemyBehavior';
import { ServiceManager } from '../services/ServiceManager';
import { GameStateService } from '../services/GameStateService';
import Logger from '../utils/Logger';

export default class Enemy extends Phaser.Physics.Arcade.Sprite implements IDamageable {
  // Components
  private healthComponent: HealthComponent;
  private movementComponent: MovementComponent;
  private healthBar: HealthBar;
  
  // Behavior
  private behavior: IBehavior;
  
  // Properties
  readonly rank: EnemyRank;
  private dir: Direction = 'down';
  private gameStateService: GameStateService;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rank: EnemyRank,
    speed: number,
    dir: Direction = 'down'
  ) {
    ensureEnemyTexture(scene, rank, dir);
    super(scene, x, y, `enemy-${rank}-${dir}`);
    
    this.rank = rank;
    this.dir = dir;
    
    this.initializeServices();
    this.initializeComponents(speed);
    this.setupHealthBar();
    this.setupBehavior(speed);
    this.setupEventHandlers();
    
    Logger.info(`${rank} enemy created at (${x}, ${y})`);
  }

  private initializeServices(): void {
    this.gameStateService = ServiceManager.getInstance().get<GameStateService>('gameState');
  }

  private initializeComponents(speed: number): void {
    const hp = this.getMaxHpForRank();
    this.healthComponent = new HealthComponent(hp);
    this.movementComponent = new MovementComponent(this, speed);
  }

  private setupHealthBar(): void {
    this.healthBar = new HealthBar(
      this.scene,
      this as unknown as Phaser.GameObjects.Sprite & IDamageable,
      GameConfig.UI.HEALTH_BAR.WIDTH,
      GameConfig.UI.HEALTH_BAR.HEIGHT
    );
  }

  private setupBehavior(speed: number): void {
    // Default behavior - can be enhanced with factory pattern
    this.behavior = new PursuitBehavior(speed);
  }

  private setupEventHandlers(): void {
    this.healthComponent.onDeath(() => this.handleDeath());
    this.healthComponent.onDamage((damage, hp) => this.handleDamage(damage, hp));
  }

  private getMaxHpForRank(): number {
    const difficultyMultiplier = GameConfig.GAMEPLAY.DIFFICULTY.ENEMY_HP_MULTIPLIER;
    
    switch (this.rank) {
      case 'standard': return Math.ceil(GameConfig.ENEMY.STANDARD.HP * difficultyMultiplier);
      case 'elite': return Math.ceil(GameConfig.ENEMY.ELITE.HP * difficultyMultiplier);
      case 'boss': return Math.ceil(GameConfig.ENEMY.BOSS.HP * difficultyMultiplier);
      default: return GameConfig.ENEMY.STANDARD.HP;
    }
  }

  update(time: number, deltaTime: number): void {
    // Update behavior if needed
    // This could be called from the AI system instead
  }

  pursue(target: Phaser.Math.Vector2): void {
    this.behavior.update(this, target, this.scene.game.loop.delta);
    this.updateDirectionFromVelocity();
  }

  private updateDirectionFromVelocity(): void {
    const velocity = this.body?.velocity;
    if (!velocity || (velocity.x === 0 && velocity.y === 0)) return;

    let newDir: Direction = this.dir;
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      newDir = velocity.x < 0 ? 'left' : 'right';
    } else {
      newDir = velocity.y < 0 ? 'up' : 'down';
    }

    if (newDir !== this.dir) {
      this.updateTexture(newDir);
    }
  }

  private updateTexture(newDir: Direction): void {
    ensureEnemyTexture(this.scene as Phaser.Scene, this.rank, newDir);
    this.setTexture(`enemy-${this.rank}-${newDir}`);
    this.dir = newDir;
  }

  // IDamageable interface
  get maxHp(): number {
    return this.healthComponent.maxHp;
  }

  get hp(): number {
    return this.healthComponent.hp;
  }

  takeDamage(amount: number): void {
    this.healthComponent.takeDamage(amount);
  }

  isDead(): boolean {
    return this.healthComponent.isDead();
  }

  // Event handlers
  private handleDamage(damage: number, currentHp: number): void {
    Logger.info(`${this.rank} enemy took ${damage} damage, ${currentHp}/${this.maxHp} HP remaining`);
    
    // Visual feedback (could add screen shake, particle effects, etc.)
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
  }

  private handleDeath(): void {
    Logger.info(`${this.rank} enemy defeated`);
    
    // Award score based on enemy rank
    const scoreValue = this.getScoreValue();
    this.gameStateService.addScore(scoreValue);
    
    // Clean up
    this.healthBar.destroy();
    
    // Death animation/effects could go here
    this.setTint(0x666666);
    this.scene.time.delayedCall(200, () => {
      this.destroy();
    });
  }

  private getScoreValue(): number {
    switch (this.rank) {
      case 'standard': return 10;
      case 'elite': return 25;
      case 'boss': return 100;
      default: return 10;
    }
  }

  // Behavior modification
  setBehavior(behavior: IBehavior): void {
    this.behavior = behavior;
    Logger.info(`${this.rank} enemy behavior changed`);
  }

  // Status effects (future enhancement)
  applyStun(duration: number): void {
    this.setVelocity(0, 0);
    this.setTint(0x0000ff);
    
    this.scene.time.delayedCall(duration, () => {
      this.clearTint();
    });
    
    Logger.info(`${this.rank} enemy stunned for ${duration}ms`);
  }

  applySlow(multiplier: number, duration: number): void {
    const originalSpeed = this.movementComponent.getSpeed();
    const newSpeed = originalSpeed * multiplier;
    
    this.movementComponent.setSpeed(newSpeed);
    this.setTint(0x00ffff);
    
    this.scene.time.delayedCall(duration, () => {
      this.movementComponent.setSpeed(originalSpeed);
      this.clearTint();
    });
    
    Logger.info(`${this.rank} enemy slowed by ${multiplier}x for ${duration}ms`);
  }

  // Public API
  getPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  getCurrentDirection(): Direction {
    return this.dir;
  }

  getHealthPercentage(): number {
    return this.healthComponent.getHealthPercentage();
  }

  getRank(): EnemyRank {
    return this.rank;
  }
}