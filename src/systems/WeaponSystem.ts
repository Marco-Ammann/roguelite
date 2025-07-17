/**
 * src/systems/WeaponSystem.ts
 * Manages different weapon types and projectile creation
 */

import Phaser from 'phaser';
import Projectile from '../entities/Projectile';
import PierceProjectile from '../entities/PierceProjectile';
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
}

export class WeaponSystem {
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private currentWeapon: WeaponType = WeaponType.Normal;
  
  private weapons: Map<WeaponType, WeaponConfig> = new Map([
    [WeaponType.Normal, {
      type: WeaponType.Normal,
      damageType: DamageType.Normal,
      damage: 1,
      fireRate: 250,
      name: 'Standard',
      color: 0xffffff
    }],
    [WeaponType.Pierce, {
      type: WeaponType.Pierce,
      damageType: DamageType.Pierce,
      damage: 1,
      fireRate: 400,
      name: 'Pierce',
      color: 0xffff00
    }],
    [WeaponType.Explosive, {
      type: WeaponType.Explosive,
      damageType: DamageType.Explosive,
      damage: 2,
      fireRate: 800,
      name: 'Explosive',
      color: 0xff6600
    }]
  ]);

  constructor(scene: Phaser.Scene, projectiles: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.projectiles = projectiles;
  }

  /**
   * Create projectile based on current weapon
   */
  createProjectile(x: number, y: number, direction: Direction): Phaser.GameObjects.GameObject {
    const config = this.weapons.get(this.currentWeapon)!;
    let projectile: Phaser.GameObjects.GameObject;

    switch (this.currentWeapon) {
      case WeaponType.Pierce:
        projectile = new PierceProjectile(this.scene, x, y, direction, 3);
        break;
      case WeaponType.Explosive:
        // TODO: Implement explosive projectile
        projectile = new Projectile(this.scene, x, y, direction);
        (projectile as any).setTint(config.color);
        break;
      default:
        projectile = new Projectile(this.scene, x, y, direction);
        break;
    }

    this.projectiles.add(projectile);
    return projectile;
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
    
    console.log(`🔫 Weapon switched to: ${config.name}`);
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
}