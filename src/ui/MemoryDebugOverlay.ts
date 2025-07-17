/**
 * src/ui/MemoryDebugOverlay.ts
 * ------------------------------------------------------------
 * F4 overlay: shows JS heap, texture count and GraphicsPool stats.
 * Uses `performance.memory` where available (Chrome), otherwise "n/a".
 */

import Phaser from 'phaser';
import GraphicsPool from '../systems/GraphicsPool';

export default class MemoryDebugOverlay extends Phaser.GameObjects.Text {
  private readonly toggleKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    super(scene, 4, 260, '', {
      fontSize: '14px',
      color: '#ffeb3b',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 6, y: 4 },
      fontFamily: 'Courier New',
    });

    scene.add.existing(this).setScrollFactor(0).setDepth(1000);

    this.toggleKey = scene.input.keyboard!.addKey('F4');
    this.setVisible(import.meta.env?.DEV ?? false);

    scene.events.on('postupdate', this.updateInfo, this);
    console.info('MemoryDebugOverlay: Initialized (Press F4 to toggle)');
  }

  private updateInfo(): void {
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.setVisible(!this.visible);
    }
    if (!this.visible) return;

    const heap =
      (performance as any).memory?.usedJSHeapSize ??
      (performance as any).memory?.jsHeapSizeLimit ??
      'n/a';

    const textures = Object.keys(this.scene.textures.list).length;
    const { inPool, inUse, total } = GraphicsPool.getStats(this.scene);

    this.setText(
      [
        '🧠 MEMORY MONITOR',
        '─────────────────────────',
        `Heap: ${typeof heap === 'number' ? (heap / 1048576).toFixed(1) + ' MB' : 'n/a'}`,
        `Textures: ${textures}`,
        '',
        'GraphicsPool',
        '─────────────',
        `In Use: ${inUse}`,
        `In Pool: ${inPool}`,
        `Total: ${total}`,
        '',
        'CONTROLS',
        '────────',
        'F4: Toggle Memory Monitor',
        'F1/F2/F3: Other Debug Panels',
      ].join('\n'),
    );
  }

  override destroy(fromScene?: boolean): void {
    this.scene.events.off('postupdate', this.updateInfo, this);
    super.destroy(fromScene);
  }
}
