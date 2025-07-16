// src/config/GameConfig.ts
/**
 * Central game configuration with all constants and settings
 */
export const GameConfig = {
    // Display
    CANVAS: {
      WIDTH: window.innerWidth,
      HEIGHT: window.innerHeight,
      PIXEL_ART: true,
    },
  
    // Physics
    PHYSICS: {
      DEBUG: false,
      GRAVITY: { x: 0, y: 0 },
    },
  
    // Player
    PLAYER: {
      SPEED: 150,
      MAX_HP: 10,
      FIRE_DELAY: 250,
      HIT_COOLDOWN: 500,
      SIZE: { width: 24, height: 24 },
    },
  
    // Enemies
    ENEMY: {
      STANDARD: {
        SPEED: 40,
        HP: 5,
        DAMAGE: 1,
      },
      ELITE: {
        SPEED: 50,
        HP: 8,
        DAMAGE: 2,
      },
      BOSS: {
        SPEED: 30,
        HP: 20,
        DAMAGE: 3,
      },
      SIZE: { width: 24, height: 24 },
    },
  
    // Projectiles
    PROJECTILE: {
      SPEED: 300,
      DAMAGE: 1,
      SIZE: { width: 4, height: 4 },
    },
  
    // UI
    UI: {
      HEALTH_BAR: {
        WIDTH: 20,
        HEIGHT: 4,
        OFFSET_Y: 2,
      },
      DEBUG: {
        FONT_SIZE: '16px',
        COLOR: '#00ff00',
      },
    },
  
    // Game Rules
    GAMEPLAY: {
      SPAWN: {
        STANDARD_ENEMIES: 4,
        ELITE_ENEMIES: 1,
        BOSS_ENEMIES: 0,
      },
      DIFFICULTY: {
        ENEMY_SPEED_MULTIPLIER: 1.0,
        ENEMY_HP_MULTIPLIER: 1.0,
        SPAWN_RATE_MULTIPLIER: 1.0,
      },
    },
  
    // Controls
    CONTROLS: {
      MOVE_KEYS: ['WASD', 'ARROWS'],
      FIRE_KEY: 'SPACE',
      DEBUG_KEY: 'F1',
    },
  } as const;
  
  // Type helpers
  export type Direction = 'up' | 'down' | 'left' | 'right';
  export type EnemyType = 'standard' | 'elite' | 'boss';
  
  // Validation
  export class ConfigValidator {
    static validate(): boolean {
      const errors: string[] = [];
      
      if (GameConfig.PLAYER.SPEED <= 0) {
        errors.push('Player speed must be positive');
      }
      
      if (GameConfig.PLAYER.MAX_HP <= 0) {
        errors.push('Player max HP must be positive');
      }
      
      if (errors.length > 0) {
        console.error('Game Configuration Errors:', errors);
        return false;
      }
      
      return true;
    }
  }