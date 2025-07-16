/** Defines how tough an enemy is. */
export const EnemyRank = {
  Standard: 'standard',
  Elite: 'elite',
  Boss: 'boss',
} as const;

export type EnemyRank = typeof EnemyRank[keyof typeof EnemyRank];
