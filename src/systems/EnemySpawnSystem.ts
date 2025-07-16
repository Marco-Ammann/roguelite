// src/systems/EnemySpawnSystem.ts
import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { createEnemy } from '../factories/EntityFactory';
import { EnemyRank } from '../enums/EnemyRank';
import { ServiceManager } from '../services/ServiceManager';
import { GameStateService } from '../services/GameStateService';
import Logger from '../utils/Logger';

export class EnemySpawnSystem {
  private scene: Phaser.Scene;
  private gameStateService: GameStateService;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gameStateService = ServiceManager.getInstance().get<GameStateService>('gameState');
    Logger.info('EnemySpawnSystem initialized');
  }

  spawnInitialEnemies(): Phaser.Physics.Arcade.Group {
    const enemies = this.scene.physics.add.group();
    const config = GameConfig.GAMEPLAY.SPAWN;

    // Spawn standard enemies
    for (let i = 0; i < config.STANDARD_ENEMIES; i++) {
      const enemy = this.createRandomEnemy(EnemyRank.Standard);
      enemies.add(enemy);
    }

    // Spawn elite enemies
    for (let i = 0; i < config.ELITE_ENEMIES; i++) {
      const enemy = this.createRandomEnemy(EnemyRank.Elite);
      enemies.add(enemy);
    }

    // Spawn boss enemies
    for (let i = 0; i < config.BOSS_ENEMIES; i++) {
      const enemy = this.createRandomEnemy(EnemyRank.Boss);
      enemies.add(enemy);
    }

    Logger.info(`Spawned ${enemies.countActive()} enemies`);
    return enemies;
  }

  private createRandomEnemy(rank: EnemyRank): Phaser.GameObjects.GameObject {
    const x = Phaser.Math.Between(50, this.scene.scale.width - 50);
    const y = Phaser.Math.Between(50, this.scene.scale.height - 50);
    
    const baseSpeed = this.getBaseSpeed(rank);
    const difficultyMultiplier = GameConfig.GAMEPLAY.DIFFICULTY.ENEMY_SPEED_MULTIPLIER;
    const speed = baseSpeed * difficultyMultiplier;

    return createEnemy(this.scene, x, y, rank, speed);
  }

  private getBaseSpeed(rank: EnemyRank): number {
    switch (rank) {
      case EnemyRank.Standard: return GameConfig.ENEMY.STANDARD.SPEED;
      case EnemyRank.Elite: return GameConfig.ENEMY.ELITE.SPEED;
      case EnemyRank.Boss: return GameConfig.ENEMY.BOSS.SPEED;
      default: return GameConfig.ENEMY.STANDARD.SPEED;
    }
  }

  spawnWaveEnemies(wave: number): Phaser.GameObjects.GameObject[] {
    const enemies: Phaser.GameObjects.GameObject[] = [];
    const baseCount = GameConfig.GAMEPLAY.SPAWN.STANDARD_ENEMIES;
    const waveMultiplier = Math.floor(wave / 3) + 1; // Every 3 waves, spawn more

    for (let i = 0; i < baseCount * waveMultiplier; i++) {
      const rank = this.selectEnemyRank(wave);
      const enemy = this.createRandomEnemy(rank);
      enemies.push(enemy);
    }

    Logger.info(`Wave ${wave}: Spawned ${enemies.length} enemies`);
    return enemies;
  }

  private selectEnemyRank(wave: number): EnemyRank {
    const random = Math.random();
    
    if (wave >= 5 && random < 0.1) return EnemyRank.Boss;
    if (wave >= 2 && random < 0.3) return EnemyRank.Elite;
    return EnemyRank.Standard;
  }
}

// src/systems/EnemyAISystem.ts
import Phaser from 'phaser';
import Enemy from '../entities/Enemy';
import Player from '../entities/Player';
import Logger from '../utils/Logger';

export class EnemyAISystem {
  private enemies: Phaser.Physics.Arcade.Group;
  private player: Player;

  constructor(enemies: Phaser.Physics.Arcade.Group, player: Player) {
    this.enemies = enemies;
    this.player = player;
    Logger.info('EnemyAISystem initialized');
  }

  update(): void {
    if (this.player.isDead()) return;

    const playerPosition = this.player.getCenter(new Phaser.Math.Vector2());
    
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy;
      if (!enemy.isDead()) {
        this.updateEnemyBehavior(enemy, playerPosition);
      }
    });
  }

  private updateEnemyBehavior(enemy: Enemy, playerPosition: Phaser.Math.Vector2): void {
    // Simple pursuit behavior - can be extended with more complex AI
    enemy.pursue(playerPosition);
  }

  // Future AI behaviors could be added here:
  // - Flocking behavior
  // - Different attack patterns based on enemy type
  // - Formation behavior for groups
  // - Pathfinding around obstacles
}

// src/scenes/MainScene.ts (Refactored)
import Phaser from 'phaser';
import { GameConfig, ConfigValidator } from '../config/GameConfig';
import { ServiceManager } from '../services/ServiceManager';
import { InputService } from '../services/InputService.ts';
import { CollisionService } from '../services/CollisionService';
import { GameStateService } from '../services/GameStateService';
import { EnemySpawnSystem } from '../systems/EnemySpawnSystem';
import { EnemyAISystem } from '../systems/EnemyAISystem';
import { createPlayer } from '../factories/EntityFactory';
import Player from '../entities/Player';
import Enemy from '../entities/Enemy';
import Projectile from '../entities/Projectile';
import DebugOverlay from '../ui/DebugOverlay';
import Logger from '../utils/Logger';

export default class MainScene extends Phaser.Scene {
  // Entities
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;

  // Services
  private serviceManager!: ServiceManager;
  private inputService!: InputService;
  private collisionService!: CollisionService;
  private gameStateService!: GameStateService;

  // Systems
  private enemySpawnSystem!: EnemySpawnSystem;
  private enemyAISystem!: EnemyAISystem;

  // UI
  private debugOverlay!: DebugOverlay;

  constructor() {
    super('MainScene');
  }

  preload(): void {
    // Validate configuration before starting
    if (!ConfigValidator.validate()) {
      throw new Error('Invalid game configuration');
    }
    Logger.info('Game configuration validated successfully');
  }

  create(): void {
    try {
      this.initializeServices();
      this.createEntities();
      this.initializeSystems();
      this.setupUI();
      this.setupEventListeners();
      
      Logger.info('MainScene created successfully');
    } catch (error) {
      Logger.error('Failed to create MainScene:', error);
      throw error;
    }
  }

  private initializeServices(): void {
    this.serviceManager = ServiceManager.getInstance();
    
    // Register services
    this.inputService = new InputService(this);
    this.collisionService = new CollisionService(this);
    this.gameStateService = new GameStateService();
    
    this.serviceManager.register('input', this.inputService);
    this.serviceManager.register('collision', this.collisionService);
    this.serviceManager.register('gameState', this.gameStateService);
    
    Logger.info('Services initialized');
  }

  private createEntities(): void {
    // Create projectiles group
    this.projectiles = this.physics.add.group({ 
      classType: Projectile,
      maxSize: 50, // Limit projectiles for performance
    });

    // Create player
    this.player = createPlayer(
      this,
      this.scale.width / 2,
      this.scale.height / 2,
      this.projectiles
    );

    Logger.info('Entities created');
  }

  private initializeSystems(): void {
    // Enemy spawn system
    this.enemySpawnSystem = new EnemySpawnSystem(this);
    this.enemies = this.enemySpawnSystem.spawnInitialEnemies();

    // Enemy AI system
    this.enemyAISystem = new EnemyAISystem(this.enemies, this.player);

    // Collision system
    this.collisionService.setupCollisions(this.player, this.enemies, this.projectiles);

    Logger.info('Systems initialized');
  }

  private setupUI(): void {
    this.debugOverlay = new DebugOverlay(
      this,
      this.player,
      this.enemies,
      this.projectiles
    );
    
    Logger.info('UI initialized');
  }

  private setupEventListeners(): void {
    // Game state events
    this.gameStateService.subscribe((state) => {
      if (state.wave > 1) {
        this.handleNewWave(state.wave);
      }
    });

    // Clean up destroyed enemies
    this.enemies.on('kill', (enemy: Enemy) => {
      this.gameStateService.defeatedEnemy();
      Logger.info(`Enemy defeated. Score: ${this.gameStateService.getState().score}`);
    });

    Logger.info('Event listeners setup');
  }

  update(time: number, delta: number): void {
    try {
      // Update entities
      this.player.update(time, delta);
      
      // Update systems
      this.enemyAISystem.update();
      
      // Check for wave completion
      this.checkWaveCompletion();
      
    } catch (error) {
      Logger.error('Error in MainScene update:', error);
    }
  }

  private checkWaveCompletion(): void {
    const activeEnemies = this.enemies.countActive(true);
    if (activeEnemies === 0) {
      const currentWave = this.gameStateService.getState().wave;
      this.gameStateService.nextWave();
      Logger.info(`Wave ${currentWave} completed!`);
    }
  }

  private handleNewWave(wave: number): void {
    Logger.info(`Starting wave ${wave}`);
    
    // Spawn new enemies for the wave
    const newEnemies = this.enemySpawnSystem.spawnWaveEnemies(wave);
    newEnemies.forEach(enemy => this.enemies.add(enemy));

    // Increase difficulty
    this.increaseDifficulty(wave);
  }

  private increaseDifficulty(wave: number): void {
    const difficultyIncrease = 1 + (wave - 1) * 0.1; // 10% increase per wave
    GameConfig.GAMEPLAY.DIFFICULTY.ENEMY_SPEED_MULTIPLIER = difficultyIncrease;
    GameConfig.GAMEPLAY.DIFFICULTY.ENEMY_HP_MULTIPLIER = difficultyIncrease;
    
    Logger.info(`Difficulty increased for wave ${wave}: ${difficultyIncrease.toFixed(1)}x`);
  }

  // Scene lifecycle
  shutdown(): void {
    Logger.info('MainScene shutting down');
    this.serviceManager.clear();
    super.shutdown();
  }

  // Public API for debugging/testing
  getPlayer(): Player {
    return this.player;
  }

  getEnemies(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectiles;
  }

  getGameState(): any {
    return this.gameStateService.getState();
  }
}