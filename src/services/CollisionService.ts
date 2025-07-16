// src/services/ServiceManager.ts
/**
 * Central service manager using dependency injection pattern
 */
export class ServiceManager {
    private static instance: ServiceManager;
    private services = new Map<string, any>();
  
    static getInstance(): ServiceManager {
      if (!ServiceManager.instance) {
        ServiceManager.instance = new ServiceManager();
      }
      return ServiceManager.instance;
    }
  
    register<T>(name: string, service: T): void {
      this.services.set(name, service);
    }
  
    get<T>(name: string): T {
      const service = this.services.get(name);
      if (!service) {
        throw new Error(`Service ${name} not found. Make sure it's registered.`);
      }
      return service as T;
    }
  
    has(name: string): boolean {
      return this.services.has(name);
    }
  
    clear(): void {
      this.services.clear();
    }
  }
  
  // src/services/InputService.ts
  import Phaser from 'phaser';
  import { GameConfig, type Direction } from '../config/GameConfig';
  import Logger from '../utils/Logger';
  
  export interface InputState {
    movement: Phaser.Math.Vector2;
    direction: Direction | null;
    isFiring: boolean;
    isDebugToggled: boolean;
  }
  
  export class InputService {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
    private fireKey!: Phaser.Input.Keyboard.Key;
    private debugKey!: Phaser.Input.Keyboard.Key;
    private scene: Phaser.Scene;
  
    constructor(scene: Phaser.Scene) {
      this.scene = scene;
      this.initializeKeys();
      Logger.info('InputService initialized');
    }
  
    private initializeKeys(): void {
      const keyboard = this.scene.input.keyboard;
      if (!keyboard) {
        throw new Error('Keyboard input not available');
      }
  
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
      this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.debugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    }
  
    getInputState(): InputState {
      const movement = this.getMovementVector();
      const direction = this.getDirection(movement);
      
      return {
        movement,
        direction,
        isFiring: Phaser.Input.Keyboard.JustDown(this.fireKey),
        isDebugToggled: Phaser.Input.Keyboard.JustDown(this.debugKey),
      };
    }
  
    private getMovementVector(): Phaser.Math.Vector2 {
      const x = (this.cursors.left?.isDown || this.wasd.A?.isDown ? -1 : 0) +
                (this.cursors.right?.isDown || this.wasd.D?.isDown ? 1 : 0);
      
      const y = (this.cursors.up?.isDown || this.wasd.W?.isDown ? -1 : 0) +
                (this.cursors.down?.isDown || this.wasd.S?.isDown ? 1 : 0);
  
      const vector = new Phaser.Math.Vector2(x, y);
      return vector.length() > 0 ? vector.normalize() : vector;
    }
  
    private getDirection(movement: Phaser.Math.Vector2): Direction | null {
      if (movement.length() === 0) return null;
  
      if (Math.abs(movement.x) > Math.abs(movement.y)) {
        return movement.x < 0 ? 'left' : 'right';
      } else {
        return movement.y < 0 ? 'up' : 'down';
      }
    }
  }
  
  // src/services/CollisionService.ts
  import Phaser from 'phaser';
  import Player from '../entities/Player';
  import Enemy from '../entities/Enemy';
  import Projectile from '../entities/Projectile';
  import Logger from '../utils/Logger';
  
  export class CollisionService {
    private scene: Phaser.Scene;
  
    constructor(scene: Phaser.Scene) {
      this.scene = scene;
      Logger.info('CollisionService initialized');
    }
  
    setupCollisions(
      player: Player,
      enemies: Phaser.Physics.Arcade.Group,
      projectiles: Phaser.Physics.Arcade.Group
    ): void {
      // Player vs Enemies
      this.scene.physics.add.overlap(
        player,
        enemies,
        this.handlePlayerEnemyCollision.bind(this),
        undefined,
        this.scene
      );
  
      // Projectiles vs Enemies
      this.scene.physics.add.overlap(
        projectiles,
        enemies,
        this.handleProjectileEnemyCollision.bind(this),
        undefined,
        this.scene
      );
  
      Logger.info('Collision detection setup complete');
    }
  
    private handlePlayerEnemyCollision(
      player: Phaser.GameObjects.GameObject,
      enemy: Phaser.GameObjects.GameObject
    ): void {
      const playerEntity = player as Player;
      const enemyEntity = enemy as Enemy;
  
      if (!playerEntity.isDead() && !enemyEntity.isDead()) {
        const damage = this.getEnemyDamage(enemyEntity.rank);
        playerEntity.takeDamage(damage);
        Logger.info(`Player took ${damage} damage from ${enemyEntity.rank} enemy`);
      }
    }
  
    private handleProjectileEnemyCollision(
      projectile: Phaser.GameObjects.GameObject,
      enemy: Phaser.GameObjects.GameObject
    ): void {
      const projectileEntity = projectile as Projectile;
      const enemyEntity = enemy as Enemy;
  
      if (!enemyEntity.isDead()) {
        enemyEntity.takeDamage(GameConfig.PROJECTILE.DAMAGE);
        projectileEntity.destroy();
        Logger.info(`Enemy took damage: ${enemyEntity.hp}/${enemyEntity.maxHp} HP remaining`);
      }
    }
  
    private getEnemyDamage(rank: string): number {
      switch (rank) {
        case 'standard': return GameConfig.ENEMY.STANDARD.DAMAGE;
        case 'elite': return GameConfig.ENEMY.ELITE.DAMAGE;
        case 'boss': return GameConfig.ENEMY.BOSS.DAMAGE;
        default: return 1;
      }
    }
  }
  
  // src/services/GameStateService.ts
  export interface GameState {
    isPlaying: boolean;
    isPaused: boolean;
    score: number;
    wave: number;
    enemiesDefeated: number;
    playerLevel: number;
  }
  
  export class GameStateService {
    private state: GameState;
    private listeners: ((state: GameState) => void)[] = [];
  
    constructor() {
      this.state = this.getInitialState();
      Logger.info('GameStateService initialized');
    }
  
    private getInitialState(): GameState {
      return {
        isPlaying: true,
        isPaused: false,
        score: 0,
        wave: 1,
        enemiesDefeated: 0,
        playerLevel: 1,
      };
    }
  
    getState(): GameState {
      return { ...this.state };
    }
  
    updateState(updates: Partial<GameState>): void {
      this.state = { ...this.state, ...updates };
      this.notifyListeners();
    }
  
    subscribe(listener: (state: GameState) => void): () => void {
      this.listeners.push(listener);
      return () => {
        const index = this.listeners.indexOf(listener);
        if (index > -1) this.listeners.splice(index, 1);
      };
    }
  
    private notifyListeners(): void {
      this.listeners.forEach(listener => listener(this.state));
    }
  
    reset(): void {
      this.state = this.getInitialState();
      this.notifyListeners();
    }
  
    addScore(points: number): void {
      this.updateState({ score: this.state.score + points });
    }
  
    defeatedEnemy(): void {
      this.updateState({ 
        enemiesDefeated: this.state.enemiesDefeated + 1,
        score: this.state.score + 10,
      });
    }
  
    nextWave(): void {
      this.updateState({ wave: this.state.wave + 1 });
    }
  }