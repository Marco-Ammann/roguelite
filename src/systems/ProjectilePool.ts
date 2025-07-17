/**
 * src/systems/ProjectilePool.ts - Fixed TypeScript Issues
 *
 * FIXES:
 * - Fixed PoolableProjectile interface to extend GameObject
 * - Fixed type conversion issues
 * - Proper return type handling
 * - Fixed method chaining issues
 */

import Phaser from "phaser";
import Projectile from "../entities/Projectile";
import PierceProjectile from "../entities/PierceProjectile";
import ExplosiveProjectile from "../entities/ExplosiveProjectile";
import { WeaponType } from "./WeaponSystem";
import type { Direction } from "../gfx/TextureGenerator";
import Logger from "../utils/Logger";

export default class ProjectilePool {
  private scene: Phaser.Scene;
  private projectileGroup: Phaser.Physics.Arcade.Group;

  // Separate pools für jeden Projektil-Typ
  private normalPool: Projectile[] = [];
  private piercePool: PierceProjectile[] = [];
  private explosivePool: ExplosiveProjectile[] = [];

  // Pool-Konfiguration
  private readonly POOL_SIZE = {
    normal: 50, // Viele normale Projektile
    pierce: 15, // Weniger Pierce (langsamer fire rate)
    explosive: 8, // Wenige Explosive (sehr langsam)
  };

  // Statistiken für Debug
  private stats = {
    created: { normal: 0, pierce: 0, explosive: 0 },
    reused: { normal: 0, pierce: 0, explosive: 0 },
    active: { normal: 0, pierce: 0, explosive: 0 },
  };

  constructor(
    scene: Phaser.Scene,
    projectileGroup: Phaser.Physics.Arcade.Group
  ) {
    this.scene = scene;
    this.projectileGroup = projectileGroup;

    this.preAllocatePools();
    Logger.info("ProjectilePool: Initialized with pre-allocated pools");
  }

  /**
   * Pre-allocate pools for optimal performance
   */
  private preAllocatePools(): void {
    // Normal Projectiles
    for (let i = 0; i < this.POOL_SIZE.normal; i++) {
      const projectile = new Projectile(this.scene, 0, 0, "down");
      projectile.setActive(false);
      projectile.setVisible(false);
      this.normalPool.push(projectile);
      this.stats.created.normal++;
    }

    // Pierce Projectiles
    for (let i = 0; i < this.POOL_SIZE.pierce; i++) {
      const projectile = new PierceProjectile(this.scene, 0, 0, "down", 3);
      projectile.setActive(false);
      projectile.setVisible(false);
      this.piercePool.push(projectile);
      this.stats.created.pierce++;
    }

    // Explosive Projectiles
    for (let i = 0; i < this.POOL_SIZE.explosive; i++) {
      const projectile = new ExplosiveProjectile(this.scene, 0, 0, "down", 60);
      projectile.setActive(false);
      projectile.setVisible(false);
      this.explosivePool.push(projectile);
      this.stats.created.explosive++;
    }

    Logger.info(
      `ProjectilePool: Pre-allocated ${this.getTotalPoolSize()} projectiles`
    );
  }

  /**
   * Get projectile from pool (main API)
   */
  public getProjectile(
    type: WeaponType,
    x: number,
    y: number,
    direction: Direction
  ): Phaser.GameObjects.GameObject {
    let projectile: Phaser.Physics.Arcade.Sprite;

    switch (type) {
      case WeaponType.Pierce:
        projectile = this.getPierceProjectile();
        this.stats.active.pierce++;
        break;
      case WeaponType.Explosive:
        projectile = this.getExplosiveProjectile();
        this.stats.active.explosive++;
        break;
      default:
        projectile = this.getNormalProjectile();
        this.stats.active.normal++;
        break;
    }

    // Reset position und direction
    (projectile as any).reset(x, y, direction);
    projectile.setActive(true);
    projectile.setVisible(true); // Jetzt funktioniert es!

    // Add to Phaser group
    this.projectileGroup.add(projectile);

    return projectile;
  }

  /**
   * Return projectile to pool
   */
  public returnProjectile(projectile: Phaser.GameObjects.GameObject): void {
    const proj = projectile as any;

    // Determine type by constructor name
    const type = this.getProjectileType(proj);

    // Remove from active group
    this.projectileGroup.remove(projectile);

    // Deactivate
    proj.setActive(false);
    proj.setVisible(false);

    // Return to appropriate pool
    switch (type) {
      case "pierce":
        this.piercePool.push(proj);
        this.stats.active.pierce--;
        break;
      case "explosive":
        this.explosivePool.push(proj);
        this.stats.active.explosive--;
        break;
      default:
        this.normalPool.push(proj);
        this.stats.active.normal--;
        break;
    }
  }

  /**
   * Get normal projectile from pool
   */
  private getNormalProjectile(): Projectile {
    let projectile = this.normalPool.pop();

    if (!projectile) {
      // Pool exhausted - create new one
      projectile = new Projectile(this.scene, 0, 0, "down");
      this.stats.created.normal++;
      Logger.warn(
        "ProjectilePool: Normal pool exhausted, creating new projectile"
      );
    } else {
      this.stats.reused.normal++;
    }

    return projectile;
  }

  /**
   * Get pierce projectile from pool
   */
  private getPierceProjectile(): PierceProjectile {
    let projectile = this.piercePool.pop();

    if (!projectile) {
      projectile = new PierceProjectile(this.scene, 0, 0, "down", 3);
      this.stats.created.pierce++;
      Logger.warn(
        "ProjectilePool: Pierce pool exhausted, creating new projectile"
      );
    } else {
      this.stats.reused.pierce++;
    }

    return projectile;
  }

  /**
   * Get explosive projectile from pool
   */
  private getExplosiveProjectile(): ExplosiveProjectile {
    let projectile = this.explosivePool.pop();

    if (!projectile) {
      projectile = new ExplosiveProjectile(this.scene, 0, 0, "down", 60);
      this.stats.created.explosive++;
      Logger.warn(
        "ProjectilePool: Explosive pool exhausted, creating new projectile"
      );
    } else {
      this.stats.reused.explosive++;
    }

    return projectile;
  }

  /**
   * Determine projectile type by constructor
   */
  private getProjectileType(
    projectile: any
  ): "normal" | "pierce" | "explosive" {
    if (projectile.constructor.name === "PierceProjectile") return "pierce";
    if (projectile.constructor.name === "ExplosiveProjectile")
      return "explosive";
    return "normal";
  }

  /**
   * Get pool statistics for debug overlay
   */
  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Get total pool size
   */
  public getTotalPoolSize(): number {
    return (
      this.normalPool.length +
      this.piercePool.length +
      this.explosivePool.length
    );
  }

  /**
   * Get active projectiles count
   */
  public getActiveCount(): number {
    return (
      this.stats.active.normal +
      this.stats.active.pierce +
      this.stats.active.explosive
    );
  }

  /**
   * Emergency cleanup - return all active projectiles
   */
  public emergencyCleanup(): void {
    this.projectileGroup.children.entries.forEach((child) => {
      this.returnProjectile(child);
    });
    Logger.info("ProjectilePool: Emergency cleanup completed");
  }

  /**
   * Cleanup when scene ends
   */
  public destroy(): void {
    this.emergencyCleanup();

    // Destroy all pooled projectiles
    [...this.normalPool, ...this.piercePool, ...this.explosivePool].forEach(
      (proj) => {
        proj.destroy();
      }
    );

    this.normalPool = [];
    this.piercePool = [];
    this.explosivePool = [];

    Logger.info("ProjectilePool: Destroyed all pools");
  }
}
