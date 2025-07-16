// src/config/GameConfig.ts
/**
 * Schritt 1: Einfache, mutable Konfiguration
 * Ersetzt src/config/constants.ts
 */

// Types für bessere Typisierung
export type Direction = 'up' | 'down' | 'left' | 'right';
export type EnemyType = 'standard' | 'elite' | 'boss';

// Mutable configuration (damit wir Difficulty ändern können)
export const GameConfig = {
  // Display
  CANVAS: {
    WIDTH: window.innerWidth,
    HEIGHT: window.innerHeight,
    PIXEL_ART: true,
  },

  // Player (ersetzt PLAYER_SPEED constant)
  PLAYER: {
    SPEED: 150,           // war PLAYER_SPEED
    MAX_HP: 10,
    FIRE_DELAY: 250,      // ms between shots
    HIT_COOLDOWN: 500,    // ms invincibility after hit
    SIZE: { width: 24, height: 24 },
  },

  // Enemies (ersetzt ENEMY_SPEED constant) 
  ENEMY: {
    STANDARD: {
      SPEED: 40,          // war ENEMY_SPEED
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

  // UI Settings
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
    // Mutable difficulty (kann sich während Spiel ändern)
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
};

// Simple validation function
export function validateConfig(): boolean {
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

// Helper functions for easier access
export function getPlayerSpeed(): number {
  return GameConfig.PLAYER.SPEED;
}

export function getEnemySpeed(type: EnemyType = 'standard'): number {
  switch (type) {
    case 'standard': return GameConfig.ENEMY.STANDARD.SPEED;
    case 'elite': return GameConfig.ENEMY.ELITE.SPEED;
    case 'boss': return GameConfig.ENEMY.BOSS.SPEED;
    default: return GameConfig.ENEMY.STANDARD.SPEED;
  }
}

export function getEnemyHp(type: EnemyType = 'standard'): number {
  const multiplier = GameConfig.GAMEPLAY.DIFFICULTY.ENEMY_HP_MULTIPLIER;
  
  switch (type) {
    case 'standard': return Math.ceil(GameConfig.ENEMY.STANDARD.HP * multiplier);
    case 'elite': return Math.ceil(GameConfig.ENEMY.ELITE.HP * multiplier);
    case 'boss': return Math.ceil(GameConfig.ENEMY.BOSS.HP * multiplier);
    default: return Math.ceil(GameConfig.ENEMY.STANDARD.HP * multiplier);
  }
}

export function getEnemyDamage(type: EnemyType = 'standard'): number {
  switch (type) {
    case 'standard': return GameConfig.ENEMY.STANDARD.DAMAGE;
    case 'elite': return GameConfig.ENEMY.ELITE.DAMAGE;
    case 'boss': return GameConfig.ENEMY.BOSS.DAMAGE;
    default: return GameConfig.ENEMY.STANDARD.DAMAGE;
  }
}

// Difficulty scaling functions
export function increaseDifficulty(wave: number): void {
  const increase = 1 + (wave - 1) * 0.1; // 10% per wave
  GameConfig.GAMEPLAY.DIFFICULTY.ENEMY_SPEED_MULTIPLIER = increase;
  GameConfig.GAMEPLAY.DIFFICULTY.ENEMY_HP_MULTIPLIER = increase;
  console.log(`Difficulty increased for wave ${wave}: ${increase.toFixed(1)}x`);
}