// src/services/InputService.ts
/**
 * Sehr einfacher InputService - keine Type-Import Probleme
 */

import Phaser from 'phaser';

// Inline types - vermeidet Import-Probleme
export interface InputState {
  movement: Phaser.Math.Vector2;
  direction: 'up' | 'down' | 'left' | 'right' | null;
  isFiring: boolean;
  isDebugToggled: boolean;
}

export class InputService {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeKeys();
  }

  private initializeKeys(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      console.error('Keyboard not available');
      return;
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,S,A,D');
    this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.debugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
  }

  getInputState(): InputState {
    const movement = this.getMovementVector();
    const direction = this.getDirection(movement);
    
    return {
      movement,
      direction,
      isFiring: Phaser.Input.Keyboard.JustDown(this.fireKey),
      isDebugToggled: Phaser.Input.Keyboard.JustDown(this.debugKey),
    };
  }

  private getMovementVector(): Phaser.Math.Vector2 {
    const x = (this.cursors.left?.isDown || this.wasd.A?.isDown ? -1 : 0) +
              (this.cursors.right?.isDown || this.wasd.D?.isDown ? 1 : 0);
    
    const y = (this.cursors.up?.isDown || this.wasd.W?.isDown ? -1 : 0) +
              (this.cursors.down?.isDown || this.wasd.S?.isDown ? 1 : 0);

    const vector = new Phaser.Math.Vector2(x, y);
    return vector.length() > 0 ? vector.normalize() : vector;
  }

  private getDirection(movement: Phaser.Math.Vector2): 'up' | 'down' | 'left' | 'right' | null {
    if (movement.length() === 0) return null;

    if (Math.abs(movement.x) > Math.abs(movement.y)) {
      return movement.x < 0 ? 'left' : 'right';
    } else {
      return movement.y < 0 ? 'up' : 'down';
    }
  }
}