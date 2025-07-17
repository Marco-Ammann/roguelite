/**
 * CollisionDebugOverlay - Visual verification that CollisionService works
 * /src/ui/CollisionDebugOverlay.ts
 */

import Phaser from 'phaser';
import { CollisionService } from '../services/CollisionService';
import Logger from '../utils/Logger';

export default class CollisionDebugOverlay extends Phaser.GameObjects.Text {
  private readonly sceneRef: Phaser.Scene;
  private readonly collisionService: CollisionService;
  private readonly toggleKey: Phaser.Input.Keyboard.Key;
  private lastStatsUpdate = 0;

  constructor(scene: Phaser.Scene, collisionService: CollisionService) {
    super(scene, 4, 120, '', { 
      fontSize: '14px', 
      color: '#ffff00',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 8, y: 4 }
    });
    
    this.sceneRef = scene;
    this.collisionService = collisionService;
    scene.add.existing(this).setScrollFactor(0).setDepth(1001);

    // Toggle F2 (F1 is already used by main debug)
    this.toggleKey = scene.input.keyboard!.addKey('F2');
    this.setVisible(false); // Hidden by default

    // Listen to collision events for immediate feedback
    scene.events.on('collision:projectile-enemy', this.onProjectileHit, this);
    scene.events.on('collision:enemy-player', this.onPlayerHit, this);

    scene.events.on('postupdate', this.updateStats, this);
    Logger.info('CollisionDebugOverlay: Initialized (Press F2 to toggle)');
  }

  /**
   * Real-time collision event feedback
   */
  private onProjectileHit(eventData: any): void {
    this.flashEffect('#00ff00'); // Green flash for projectile hits
  }

  private onPlayerHit(eventData: any): void {
    this.flashEffect('#ff0000'); // Red flash for player hits
  }

  /**
   * Visual flash effect for immediate feedback
   */
  private flashEffect(color: string): void {
    const originalColor = this.style.color;
    this.setColor(color);
    
    this.sceneRef.time.delayedCall(100, () => {
      this.setColor(originalColor);
    });
  }

  /**
   * Update collision statistics display
   */
  private updateStats(): void {
    // Toggle visibility
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.setVisible(!this.visible);
      if (this.visible) {
        Logger.info('CollisionDebugOverlay: Enabled');
      }
    }

    if (!this.visible) return;

    // Update stats every 30 frames (0.5 seconds)
    if (this.sceneRef.time.now - this.lastStatsUpdate < 500) return;
    this.lastStatsUpdate = this.sceneRef.time.now;

    const stats = this.collisionService.getCollisionStats();
    
    this.setText([
      '🎯 COLLISION SERVICE DEBUG',
      '─────────────────────────',
      `💥 Projectile Hits: ${stats.projectileHits || 0}`,
      `😵 Player Hits: ${stats.playerHits || 0}`,
      `💣 Explosive Hits: ${stats.explosiveHits || 0}`,
      `⚡ Effects Applied: ${stats.effectsApplied || 0}`,
      '─────────────────────────',
      'F2: Toggle | Green=Hit | Red=Damage'
    ].join('\n'));
  }

  /**
   * Cleanup event listeners
   */
  override destroy(fromScene?: boolean): void {
    this.sceneRef.events.off('collision:projectile-enemy', this.onProjectileHit, this);
    this.sceneRef.events.off('collision:enemy-player', this.onPlayerHit, this);
    this.sceneRef.events.off('postupdate', this.updateStats, this);
    super.destroy(fromScene);
  }
}