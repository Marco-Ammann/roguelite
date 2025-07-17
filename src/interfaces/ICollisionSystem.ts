/**
 * Type-safe Collision System Interfaces
 * src/interfaces/ICollisionSystem.ts
 */

import type Phaser from 'phaser';

// Damage Types
export enum DamageType {
  Normal = 'normal',     // Standard damage
  Pierce = 'pierce',     // Through damage (multiple enemies)
  Explosive = 'explosive', // Area of Effect damage  
  DoT = 'dot'           // Damage over Time
}

// Effect Types
export enum EffectType {
  Knockback = 'knockback',
  Slow = 'slow',
  Burn = 'burn',
  Freeze = 'freeze',
}

// Collision Event Data
export interface CollisionEventData {
  attacker: Phaser.GameObjects.GameObject;
  target: Phaser.GameObjects.GameObject;
  damageType: DamageType;
  damage: number;
  effects?: EffectType[];
  position: Phaser.Math.Vector2;
  timestamp: number;
}

// Type-safe Collision Callbacks
export interface CollisionCallbacks {
  onProjectileHitEnemy?: (eventData: CollisionEventData) => void;
  onEnemyHitPlayer?: (eventData: CollisionEventData) => void;
  onExplosiveDamage?: (eventData: CollisionEventData) => void;
  onEffectApplied?: (eventData: CollisionEventData) => void;
}

// Collision Groups Definition
export interface CollisionGroups {
  player: Phaser.Physics.Arcade.Sprite;
  enemies: Phaser.Physics.Arcade.Group;
  projectiles: Phaser.Physics.Arcade.Group;
  effects?: Phaser.Physics.Arcade.Group; // Future: Effect particles
}

// CollisionService Contract
export interface ICollisionService {
  initialize(groups: CollisionGroups, callbacks: CollisionCallbacks): void;
  destroy(): void;
  
  // Future expansion methods
  addDamageMultiplier(type: DamageType, multiplier: number): void;
  getCollisionStats(): Record<string, number>;
}