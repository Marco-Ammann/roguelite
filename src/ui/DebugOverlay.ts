import Phaser from 'phaser';
import Logger from '../utils/Logger';

/**
 * Lightweight on–screen debug overlay showing FPS and entity counts.
 * Toggled with F1 (visible by default in dev mode).
 */
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
    super(scene, 4, 4, '', { fontSize: '16px', color: '#00ff00' });
    this.sceneRef = scene;
    this.playerRef = player;
    this.enemies = enemies;
    this.projectiles = projectiles;
    scene.add.existing(this).setScrollFactor(0).setDepth(1000);

    // Toggle F1
    this.toggleKey = scene.input.keyboard!.addKey('F1');
    this.setVisible(import.meta.env?.DEV ?? true);

    scene.events.on('postupdate', this.updateInfo, this);
    Logger.info('Debug overlay initialised');
  }

  private updateInfo() {
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.setVisible(!this.visible);
    }
    if (!this.visible) return;

    const fps = Math.round(this.sceneRef.game.loop.actualFps);
    const hp = this.playerRef.hp;
    const enemies = this.enemies.countActive(true);
    const bullets = this.projectiles.countActive(true);
    this.setText(`FPS: ${fps}` +
      `\nHP: ${hp}` +
      `\nEnemies: ${enemies}` +
      `\nBullets: ${bullets}`);
  }

  override destroy(fromScene?: boolean): void {
    this.sceneRef.events.off('postupdate', this.updateInfo, this);
    super.destroy(fromScene);
  }
}
