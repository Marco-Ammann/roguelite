/**
 * src/systems/GraphicsPool.ts - Reusable Graphics Object Pool
 * 
 * ZWECK:
 * - Eliminiert Graphics-Object Memory Leaks
 * - Reduziert Garbage Collection durch Wiederverwendung
 * - Zentrale Verwaltung aller Graphics-Objekte
 * - Performance-Optimierung durch Pre-Allocation
 * 
 * CLEAN CODE PRINCIPLES:
 * - Single Responsibility: Nur Graphics-Pooling
 * - Open/Closed: Einfach erweiterbar für neue Graphics-Typen
 * - Interface Segregation: Klare API für Graphics-Operationen
 */

import Phaser from 'phaser';
import Logger from '../utils/Logger';

/**
 * Graphics Pool Configuration
 */
interface GraphicsPoolConfig {
  /** Initial pool size for each graphics type */
  initialSize: number;
  /** Maximum pool size (prevent infinite growth) */
  maxSize: number;
  /** Enable automatic pool expansion when exhausted */
  autoExpand: boolean;
}

/**
 * Graphics Pool Statistics for monitoring
 */
interface GraphicsPoolStats {
  created: number;
  reused: number;
  active: number;
  available: number;
  maxUsed: number;
  expansions: number;
}

/**
 * Graphics Pool Item with lifecycle management
 */
interface PooledGraphics {
  graphics: Phaser.GameObjects.Graphics;
  id: string;
  isActive: boolean;
  createdAt: number;
  lastUsed: number;
  useCount: number;
}

/**
 * GraphicsPool - Manages reusable Graphics objects for memory efficiency
 * 
 * Eliminates the need to create new Graphics objects for every texture generation
 * or UI element, significantly reducing memory usage and garbage collection.
 */
export class GraphicsPool {
  private scene: Phaser.Scene;
  private config: GraphicsPoolConfig;
  
  // Pool Storage
  private availableGraphics: PooledGraphics[] = [];
  private activeGraphics: Map<string, PooledGraphics> = new Map();
  
  // Statistics
  private stats: GraphicsPoolStats = {
    created: 0,
    reused: 0,
    active: 0,
    available: 0,
    maxUsed: 0,
    expansions: 0
  };
  
  // Pool Management
  private nextId = 0;
  private cleanupTimer?: Phaser.Time.TimerEvent;
  
  /**
   * Create new GraphicsPool instance
   * 
   * @param scene - Active Phaser scene
   * @param config - Pool configuration options
   */
  constructor(scene: Phaser.Scene, config: Partial<GraphicsPoolConfig> = {}) {
    this.scene = scene;
    this.config = {
      initialSize: 20,
      maxSize: 100,
      autoExpand: true,
      ...config
    };
    
    this.initializePool();
    this.setupCleanupTimer();
    
    Logger.info(`GraphicsPool: Initialized with ${this.config.initialSize} graphics objects`);
  }
  
  /**
   * Initialize pool with pre-allocated Graphics objects
   */
  private initializePool(): void {
    for (let i = 0; i < this.config.initialSize; i++) {
      this.createNewGraphics();
    }
    
    this.updateStats();
    Logger.info(`GraphicsPool: Pre-allocated ${this.config.initialSize} graphics objects`);
  }
  
  /**
   * Create new Graphics object and add to pool
   * 
   * @returns Created PooledGraphics item
   */
  private createNewGraphics(): PooledGraphics {
    const graphics = this.scene.add.graphics();
    const id = `graphics_${this.nextId++}`;
    const now = Date.now();
    
    const pooledGraphics: PooledGraphics = {
      graphics,
      id,
      isActive: false,
      createdAt: now,
      lastUsed: now,
      useCount: 0
    };
    
    // Configure graphics object for pooling
    graphics.setActive(false);
    graphics.setVisible(false);
    graphics.setDepth(-1000); // Hidden depth
    
    this.availableGraphics.push(pooledGraphics);
    this.stats.created++;
    
    return pooledGraphics;
  }
  
  /**
   * Get Graphics object from pool
   * 
   * @param autoAddToScene - Automatically add to scene (default: true)
   * @returns Graphics object ready for use
   */
  public getGraphics(autoAddToScene: boolean = true): Phaser.GameObjects.Graphics {
    let pooledGraphics = this.availableGraphics.pop();
    
    // Create new graphics if pool is empty
    if (!pooledGraphics) {
      if (this.config.autoExpand && this.getTotalPoolSize() < this.config.maxSize) {
        pooledGraphics = this.createNewGraphics();
        this.stats.expansions++;
        Logger.info(`GraphicsPool: Expanded pool (${this.getTotalPoolSize()} total)`);
      } else {
        Logger.warn('GraphicsPool: Pool exhausted and max size reached');
        // Return a temporary graphics object as fallback
        return this.scene.add.graphics();
      }
    }
    
    // Activate graphics object
    pooledGraphics.isActive = true;
    pooledGraphics.lastUsed = Date.now();
    pooledGraphics.useCount++;
    
    // Configure for use
    const graphics = pooledGraphics.graphics;
    graphics.setActive(true);
    graphics.setVisible(true);
    graphics.setDepth(0);
    graphics.clear(); // Clear previous content
    
    // Add to scene if requested
    if (autoAddToScene && !graphics.scene) {
      this.scene.add.existing(graphics);
    }
    
    // Track active graphics
    this.activeGraphics.set(pooledGraphics.id, pooledGraphics);
    
    // Update statistics
    this.stats.reused++;
    this.updateStats();
    
    Logger.info(`GraphicsPool: Graphics ${pooledGraphics.id} checked out (${this.stats.active} active)`);
    
    return graphics;
  }
  
  /**
   * Return Graphics object to pool
   * 
   * @param graphics - Graphics object to return
   * @returns true if successfully returned, false if not from pool
   */
  public returnGraphics(graphics: Phaser.GameObjects.Graphics): boolean {
    // Find the pooled graphics item
    let pooledGraphics: PooledGraphics | undefined;
    
    for (const [id, item] of this.activeGraphics) {
      if (item.graphics === graphics) {
        pooledGraphics = item;
        this.activeGraphics.delete(id);
        break;
      }
    }
    
    if (!pooledGraphics) {
      Logger.warn('GraphicsPool: Attempted to return non-pooled graphics object');
      // Clean up non-pooled graphics
      if (graphics.active) {
        graphics.destroy();
      }
      return false;
    }
    
    // Reset graphics object for reuse
    this.resetGraphicsObject(pooledGraphics);
    
    // Return to available pool
    this.availableGraphics.push(pooledGraphics);
    
    // Update statistics
    this.updateStats();
    
    Logger.info(`GraphicsPool: Graphics ${pooledGraphics.id} returned to pool (${this.stats.available} available)`);
    
    return true;
  }
  
  /**
   * Reset Graphics object to clean state for reuse
   * 
   * @param pooledGraphics - Pooled graphics item to reset
   */
  private resetGraphicsObject(pooledGraphics: PooledGraphics): void {
    const graphics = pooledGraphics.graphics;
    
    // Clear all graphics content
    graphics.clear();
    
    // Reset visual properties
    graphics.setPosition(0, 0);
    graphics.setRotation(0);
    graphics.setScale(1, 1);
    graphics.setAlpha(1);
    graphics.setTint(0xffffff);
    graphics.setDepth(-1000);
    
    // Reset state
    graphics.setActive(false);
    graphics.setVisible(false);
    
    // Update pooled item state
    pooledGraphics.isActive = false;
    pooledGraphics.lastUsed = Date.now();
  }
  
  /**
   * Setup automatic cleanup timer for unused graphics
   */
  private setupCleanupTimer(): void {
    this.cleanupTimer = this.scene.time.addEvent({
      delay: 30000, // 30 seconds
      callback: this.performCleanup,
      callbackScope: this,
      loop: true
    });
  }
  
  /**
   * Perform cleanup of unused graphics objects
   */
  private performCleanup(): void {
    const now = Date.now();
    const cleanupThreshold = 60000; // 1 minute
    let cleanedCount = 0;
    
    // Remove graphics that haven't been used recently
    this.availableGraphics = this.availableGraphics.filter(pooledGraphics => {
      const timeSinceLastUse = now - pooledGraphics.lastUsed;
      
      if (timeSinceLastUse > cleanupThreshold && this.availableGraphics.length > this.config.initialSize) {
        // Destroy the graphics object
        pooledGraphics.graphics.destroy();
        cleanedCount++;
        return false;
      }
      
      return true;
    });
    
    this.updateStats();
    
    if (cleanedCount > 0) {
      Logger.info(`GraphicsPool: Cleaned up ${cleanedCount} unused graphics objects`);
    }
  }
  
  /**
   * Update pool statistics
   */
  private updateStats(): void {
    this.stats.active = this.activeGraphics.size;
    this.stats.available = this.availableGraphics.length;
    this.stats.maxUsed = Math.max(this.stats.maxUsed, this.stats.active);
  }
  
  /**
   * Get total pool size (active + available)
   */
  public getTotalPoolSize(): number {
    return this.stats.active + this.stats.available;
  }
  
  /**
   * Get pool statistics for monitoring
   */
  public getStats(): GraphicsPoolStats {
    return { ...this.stats };
  }
  
  /**
   * Get pool efficiency (reuse rate)
   */
  public getEfficiency(): number {
    const totalOperations = this.stats.created + this.stats.reused;
    return totalOperations > 0 ? (this.stats.reused / totalOperations) * 100 : 0;
  }
  
  /**
   * Force cleanup of specific graphics object
   * 
   * @param graphics - Graphics object to cleanup
   */
  public forceCleanup(graphics: Phaser.GameObjects.Graphics): void {
    this.returnGraphics(graphics);
  }
  
  /**
   * Emergency cleanup - return all active graphics to pool
   */
  public emergencyCleanup(): void {
    let cleanedCount = 0;
    
    // Return all active graphics to pool
    for (const [id, pooledGraphics] of this.activeGraphics) {
      this.resetGraphicsObject(pooledGraphics);
      this.availableGraphics.push(pooledGraphics);
      cleanedCount++;
    }
    
    this.activeGraphics.clear();
    this.updateStats();
    
    Logger.info(`GraphicsPool: Emergency cleanup completed (${cleanedCount} graphics returned)`);
  }
  
  /**
   * Get detailed pool information for debugging
   */
  public getDetailedInfo(): any {
    return {
      config: this.config,
      stats: this.stats,
      efficiency: this.getEfficiency(),
      activeGraphics: Array.from(this.activeGraphics.keys()),
      availableCount: this.availableGraphics.length,
      totalPoolSize: this.getTotalPoolSize()
    };
  }
  
  /**
   * Destroy pool and cleanup all graphics objects
   */
  public destroy(): void {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      this.cleanupTimer.destroy();
      this.cleanupTimer = undefined;
    }
    
    // Destroy all graphics objects
    const allGraphics = [
      ...this.availableGraphics,
      ...Array.from(this.activeGraphics.values())
    ];
    
    allGraphics.forEach(pooledGraphics => {
      if (pooledGraphics.graphics.active) {
        pooledGraphics.graphics.destroy();
      }
    });
    
    // Clear pools
    this.availableGraphics = [];
    this.activeGraphics.clear();
    
    Logger.info(`GraphicsPool: Destroyed pool with ${allGraphics.length} graphics objects`);
  }
}

/**
 * Singleton Graphics Pool Manager
 * 
 * Provides global access to graphics pool for the entire application
 */
export class GraphicsPoolManager {
  private static instance?: GraphicsPool;
  
  /**
   * Initialize global graphics pool
   * 
   * @param scene - Active Phaser scene
   * @param config - Pool configuration
   */
  public static initialize(scene: Phaser.Scene, config?: Partial<GraphicsPoolConfig>): void {
    if (GraphicsPoolManager.instance) {
      Logger.warn('GraphicsPoolManager: Pool already initialized');
      return;
    }
    
    GraphicsPoolManager.instance = new GraphicsPool(scene, config);
    Logger.info('GraphicsPoolManager: Global graphics pool initialized');
  }
  
  /**
   * Get global graphics pool instance
   */
  public static getInstance(): GraphicsPool {
    if (!GraphicsPoolManager.instance) {
      throw new Error('GraphicsPoolManager: Pool not initialized. Call initialize() first.');
    }
    
    return GraphicsPoolManager.instance;
  }
  
  /**
   * Destroy global graphics pool
   */
  public static destroy(): void {
    if (GraphicsPoolManager.instance) {
      GraphicsPoolManager.instance.destroy();
      GraphicsPoolManager.instance = undefined;
      Logger.info('GraphicsPoolManager: Global graphics pool destroyed');
    }
  }
}

/**
 * Convenience function for getting graphics from global pool
 */
export function getPooledGraphics(autoAddToScene: boolean = true): Phaser.GameObjects.Graphics {
  return GraphicsPoolManager.getInstance().getGraphics(autoAddToScene);
}

/**
 * Convenience function for returning graphics to global pool
 */
export function returnPooledGraphics(graphics: Phaser.GameObjects.Graphics): boolean {
  return GraphicsPoolManager.getInstance().returnGraphics(graphics);
}