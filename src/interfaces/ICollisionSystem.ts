/**
 * src/interfaces/ICollisionSystem.ts
 * Type-safe collision system interfaces and contracts
 */

import type Phaser from 'phaser';

// Damage Types for Phase 2.2
export const DamageType = {
  Normal: 'normal',      // Standard damage
  Pierce: 'pierce',      // Durchschuss (multiple enemies)
  Explosive: 'explosive', // AOE damage  
  DoT: 'dot'            // Damage over Time
} as const;

export type DamageType = typeof DamageType[keyof typeof DamageType];

// Effect Types for Phase 2.3
export const EffectType = {
  Knockback: 'knockback',
  Slow: 'slow',
  Burn: 'burn',
  Freeze: 'freeze',
} as const;

export type EffectType = typeof EffectType[keyof typeof EffectType];

// ✨ NEW: Collision Event Data
export interface CollisionEventData {
  attacker: Phaser.GameObjects.GameObject;
  target: Phaser.GameObjects.GameObject;
  damageType: DamageType;
  damage: number;
  effects?: EffectType[];
  position: Phaser.Math.Vector2;
  timestamp: number;
}

// ✨ NEW: Type-safe Collision Callbacks
export interface CollisionCallbacks {
  onProjectileHitEnemy?: (eventData: CollisionEventData) => void;
  onEnemyHitPlayer?: (eventData: CollisionEventData) => void;
  onExplosiveDamage?: (eventData: CollisionEventData) => void;
  onEffectApplied?: (eventData: CollisionEventData) => void;
}

// ✨ NEW: Collision Groups Definition
export interface CollisionGroups {
  player: Phaser.Physics.Arcade.Sprite;
  enemies: Phaser.Physics.Arcade.Group;
  projectiles: Phaser.Physics.Arcade.Group;
  effects?: Phaser.Physics.Arcade.Group; // Future: Effect particles
}

// ✨ NEW: CollisionService Contract
export interface ICollisionService {
  initialize(groups: CollisionGroups, callbacks: CollisionCallbacks): void;
  destroy(): void;
  
  // Future expansion methods
  addDamageMultiplier(type: DamageType, multiplier: number): void;
  getCollisionStats(): Record<string, number>;
}