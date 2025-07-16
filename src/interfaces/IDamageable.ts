/**
 * Contract for a game object that can take damage and potentially die.
 */
export interface IDamageable {
  readonly maxHp: number;
  hp: number;

  /**
   * Applies damage. Implementations should clamp to 0 and trigger death logic when hp reaches 0.
   */
  takeDamage(amount: number): void;

  /** True when hp is 0. */
  isDead(): boolean;
}
