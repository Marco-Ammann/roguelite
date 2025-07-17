/**
 * src/ui/DebugOverlay.ts
 * ------------------------------------------------------------
 * Main debug overlay (F1) – shows FPS, entity counts **und**
 * eine gut lesbare Controls‑Legende für alle Debug‑Tools.
 */

import Phaser from 'phaser';
import Logger from '../utils/Logger';
import Player from '../entities/Player';

export default class DebugOverlay extends Phaser.GameObjects.Text {
  private readonly sceneRef: Phaser.Scene;
  private readonly playerRef: Player;
  private readonly enemies: Phaser.Physics.Arcade.Group;
  private readonly projectiles: Phaser.Physics.Arcade.Group;
  private readonly toggleKey: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    projectiles: Phaser.Physics.Arcade.Group,
  ) {
    super(scene, 4, 4, '', {
      fontSize: '14px',
      color: '#00ff00',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 6, y: 4 },
      fontFamily: 'Courier New',
    });

    this.sceneRef = scene;
    this.playerRef = player;
    this.enemies = enemies;
    this.projectiles = projectiles;

    scene.add.existing(this).setScrollFactor(0).setDepth(1000);

    this.toggleKey = scene.input.keyboard!.addKey('F1');
    this.setVisible(import.meta.env?.DEV ?? true);

    scene.events.on('postupdate', this.updateInfo, this);
    Logger.info('DebugOverlay: Initialized (Press F1 to toggle)');
  }

  /** Update metrics and handle visibility toggle. */
  private updateInfo(): void {
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.setVisible(!this.visible);
    }
    if (!this.visible) return;

    const fps = Math.round(this.sceneRef.game.loop.actualFps);
    const hp = this.playerRef.hp;
    const enemies = this.enemies.countActive(true);
    const bullets = this.projectiles.countActive(true);

    this.setText(
      [
        '🖥 MAIN DEBUG OVERLAY',
        '─────────────────────',
        `FPS: ${fps}`,
        `HP: ${hp}`,
        `Enemies: ${enemies}`,
        `Bullets: ${bullets}`,
        '',
        'CONTROLS',
        '────────',
        'F1: Toggle Main Debug',
        'F2: Collision Debug',
        'F3: Performance Monitor',
        'F4: Memory Monitor',
      ].join('\n'),
    );
  }

  override destroy(fromScene?: boolean): void {
    this.sceneRef.events.off('postupdate', this.updateInfo, this);
    super.destroy(fromScene);
  }
}
