/**
 * src/systems/WeaponSystem.ts - Updated mit ProjectilePool
 * 
 * PERFORMANCE BOOST:
 * - Keine new Projectile() calls
 * - Wiederverwendung von Objekten
 * - Konstante Memory Usage
 */

import Phaser from 'phaser';
import ProjectilePool from './ProjectilePool';
import type { Direction } from '../gfx/TextureGenerator';
import { DamageType } from '../interfaces/ICollisionSystem';

export const WeaponType = {
  Normal: 'normal',
  Pierce: 'pierce',
  Explosive: 'explosive',
} as const;

export type WeaponType = typeof WeaponType[keyof typeof WeaponType];

export interface WeaponConfig {
  type: WeaponType;
  damageType: DamageType;
  damage: number;
  fireRate: number;
  name: string;
  color: number;
  description: string;
}

export class WeaponSystem {
  private scene: Phaser.Scene;
  private projectilePool: ProjectilePool;
  private projectileGroup: Phaser.Physics.Arcade.Group;
  private currentWeapon: WeaponType = WeaponType.Normal;
  
  private weapons: Map<WeaponType, WeaponConfig> = new Map([
    [WeaponType.Normal, {
      type: WeaponType.Normal,
      damageType: DamageType.Normal,
      damage: 1,
      fireRate: 250,
      name: 'Standard',
      color: 0xffffff,
      description: 'Reliable single-target damage'
    }],
    [WeaponType.Pierce, {
      type: WeaponType.Pierce,
      damageType: DamageType.Pierce,
      damage: 1,
      fireRate: 400,
      name: 'Pierce',
      color: 0xffff00,
      description: 'Hits up to 3 enemies'
    }],
    [WeaponType.Explosive, {
      type: WeaponType.Explosive,
      damageType: DamageType.Explosive,
      damage: 2,
      fireRate: 800,
      name: 'Explosive',
      color: 0xff6600,
      description: 'AOE damage on impact'
    }]
  ]);

  constructor(scene: Phaser.Scene, projectileGroup: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.projectileGroup = projectileGroup;
    
    // Initialize projectile pool
    this.projectilePool = new ProjectilePool(scene, projectileGroup);
    
    // Listen for projectile return events
    this.scene.events.on('projectile:return', this.handleProjectileReturn, this);
    
    console.log('✅ WeaponSystem: Initialized with ProjectilePool');
  }

  /**
   * Create projectile using pool system
   */
  createProjectile(x: number, y: number, direction: Direction): Phaser.GameObjects.GameObject {
    const projectile = this.projectilePool.getProjectile(this.currentWeapon, x, y, direction);
    
    // Apply weapon-specific visual effects
    this.applyWeaponEffects(projectile);
    
    const config = this.weapons.get(this.currentWeapon)!;
    console.log(`🔫 ${config.name} projectile created (Pool: ${this.projectilePool.getActiveCount()} active)`);
    
    return projectile;
  }

  /**
   * Handle projectile return from pool
   */
  private handleProjectileReturn(projectile: Phaser.GameObjects.GameObject): void {
    this.projectilePool.returnProjectile(projectile);
  }

  /**
   * Apply weapon-specific visual effects
   */
  private applyWeaponEffects(projectile: Phaser.GameObjects.GameObject): void {
    const config = this.weapons.get(this.currentWeapon)!;
    const sprite = projectile as Phaser.GameObjects.Sprite;
    
    // Apply color tint
    sprite.setTint(config.color);
    
    // Apply weapon-specific effects
    switch (this.currentWeapon) {
      case WeaponType.Pierce:
        // Glowing effect for pierce
        sprite.setAlpha(0.9);
        break;
      case WeaponType.Explosive:
        // Pulsing effect for explosive
        this.scene.tweens.add({
          targets: sprite,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          yoyo: true,
          repeat: -1
        });
        break;
    }
  }

  /**
   * Switch to next weapon type
   */
  switchWeapon(): void {
    const types = Array.from(this.weapons.keys());
    const currentIndex = types.indexOf(this.currentWeapon);
    const nextIndex = (currentIndex + 1) % types.length;
    
    this.currentWeapon = types[nextIndex];
    const config = this.weapons.get(this.currentWeapon)!;
    
    console.log(`🔄 Weapon switched to: ${config.name} - ${config.description}`);
    this.scene.events.emit('weapon:switched', config);
  }

  /**
   * Get current weapon config
   */
  getCurrentWeapon(): WeaponConfig {
    return this.weapons.get(this.currentWeapon)!;
  }

  /**
   * Get all available weapons
   */
  getAvailableWeapons(): WeaponConfig[] {
    return Array.from(this.weapons.values());
  }

  /**
   * Get pool statistics for debug
   */
  getPoolStats(): any {
    return this.projectilePool.getStats();
  }

  /**
   * Get active projectiles count
   */
  getActiveProjectilesCount(): number {
    return this.projectilePool.getActiveCount();
  }

  /**
   * Emergency cleanup - return all projectiles to pool
   */
  emergencyCleanup(): void {
    this.projectilePool.emergencyCleanup();
    console.log('⚠️ WeaponSystem: Emergency cleanup performed');
  }

  /**
   * Cleanup when scene ends
   */
  destroy(): void {
    this.scene.events.off('projectile:return', this.handleProjectileReturn, this);
    this.projectilePool.destroy();
    console.log('🧹 WeaponSystem: Destroyed with ProjectilePool');
  }
}