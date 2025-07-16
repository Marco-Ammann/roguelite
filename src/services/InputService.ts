// src/services/InputService.ts
/**
 * Schritt 2: Einfacher Input Service
 * Ersetzt die Input-Logik im Player
 */

import Phaser from 'phaser';
import { Direction } from '../config/GameConfig';

export interface InputState {
  movement: Phaser.Math.Vector2;
  direction: Direction | null;
  isFiring: boolean;
  isDebugToggled: boolean;
}

export class InputService {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  private fireKey!: Phaser.Input.Keyboard.Key;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private scene: Phaser.Scene;
  private isInitialized = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeKeys();
  }

  private initializeKeys(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      console.error('Keyboard input not available');
      return;
    }

    try {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
      this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.debugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
      this.isInitialized = true;
      console.log('InputService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize InputService:', error);
    }
  }

  public getInputState(): InputState {
    if (!this.isInitialized) {
      return this.getEmptyInputState();
    }

    const movement = this.getMovementVector();
    const direction = this.getDirection(movement);
    
    return {
      movement,
      direction,
      isFiring: Phaser.Input.Keyboard.JustDown(this.fireKey),
      isDebugToggled: Phaser.Input.Keyboard.JustDown(this.debugKey),
    };
  }

  private getEmptyInputState(): InputState {
    return {
      movement: new Phaser.Math.Vector2(0, 0),
      direction: null,
      isFiring: false,
      isDebugToggled: false,
    };
  }

  private getMovementVector(): Phaser.Math.Vector2 {
    try {
      const x = (this.cursors.left?.isDown || this.wasd.A?.isDown ? -1 : 0) +
                (this.cursors.right?.isDown || this.wasd.D?.isDown ? 1 : 0);
      
      const y = (this.cursors.up?.isDown || this.wasd.W?.isDown ? -1 : 0) +
                (this.cursors.down?.isDown || this.wasd.S?.isDown ? 1 : 0);

      const vector = new Phaser.Math.Vector2(x, y);
      return vector.length() > 0 ? vector.normalize() : vector;
    } catch (error) {
      console.error('Error getting movement vector:', error);
      return new Phaser.Math.Vector2(0, 0);
    }
  }

  private getDirection(movement: Phaser.Math.Vector2): Direction | null {
    if (movement.length() === 0) return null;

    if (Math.abs(movement.x) > Math.abs(movement.y)) {
      return movement.x < 0 ? 'left' : 'right';
    } else {
      return movement.y < 0 ? 'up' : 'down';
    }
  }

  // Simple getter methods for backward compatibility
  public isMovingLeft(): boolean {
    return this.cursors.left?.isDown || this.wasd.A?.isDown || false;
  }

  public isMovingRight(): boolean {
    return this.cursors.right?.isDown || this.wasd.D?.isDown || false;
  }

  public isMovingUp(): boolean {
    return this.cursors.up?.isDown || this.wasd.W?.isDown || false;
  }

  public isMovingDown(): boolean {
    return this.cursors.down?.isDown || this.wasd.S?.isDown || false;
  }

  public isFirePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.fireKey);
  }

  public isDebugPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.debugKey);
  }

  public destroy(): void {
    // Clean up if needed
    this.isInitialized = false;
    console.log('InputService destroyed');
  }
}