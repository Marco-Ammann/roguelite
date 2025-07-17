/**
 * src/ui/PerformanceDebugOverlay.ts
 * 
 * ZWECK:
 * - Pool-Statistiken anzeigen  
 * - Memory Usage tracking
 * - Performance Metriken
 * - Toggle mit F3
 */

import Phaser from 'phaser';
import { WeaponSystem } from '../systems/WeaponSystem';
import Logger from '../utils/Logger';

export default class PerformanceDebugOverlay extends Phaser.GameObjects.Text {
  private readonly sceneRef: Phaser.Scene;
  private readonly weaponSystem: WeaponSystem;
  private readonly toggleKey: Phaser.Input.Keyboard.Key;
  private frameCount = 0;
  private startTime = 0;
  
  // Performance tracking
  private memoryUsage = { used: 0, total: 0 };
  private fpsHistory: number[] = [];
  private avgFps = 60;

  constructor(scene: Phaser.Scene, weaponSystem: WeaponSystem) {
    super(scene, scene.scale.width - 300, 10, '', {
      fontSize: '12px',
      color: '#00ffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 10, y: 8 },
      fontFamily: 'Courier New'
    });
    
    this.sceneRef = scene;
    this.weaponSystem = weaponSystem;
    this.startTime = performance.now();
    
    scene.add.existing(this).setScrollFactor(0).setDepth(1002);
    
    this.toggleKey = scene.input.keyboard!.addKey('F3');
    this.setVisible(false);
    
    scene.events.on('postupdate', this.updateStats, this);
    
    Logger.info('PerformanceDebugOverlay: Initialized (Press F3 to toggle)');
  }

  /**
   * Update performance statistics
   */
  private updateStats(): void {
    // Toggle visibility
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.setVisible(!this.visible);
      if (this.visible) {
        Logger.info('PerformanceDebugOverlay: Enabled');
      }
    }

    if (!this.visible) return;

    // Update every 30 frames for readability
    this.frameCount++;
    if (this.frameCount % 30 !== 0) return;

    this.updateMemoryUsage();
    this.updateFpsHistory();
    this.displayStats();
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryUsage(): void {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024)
      };
    }
  }

  /**
   * Track FPS history for averages
   */
  private updateFpsHistory(): void {
    const currentFps = Math.round(this.sceneRef.game.loop.actualFps);
    this.fpsHistory.push(currentFps);
    
    // Keep only last 60 samples (2 seconds at 30 fps updates)
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
    
    // Calculate average FPS
    this.avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
  }

  /**
   * Display all performance statistics
   */
  private displayStats(): void {
    const poolStats = this.weaponSystem.getPoolStats();
    const activeProjectiles = this.weaponSystem.getActiveProjectilesCount();
    const currentFps = Math.round(this.sceneRef.game.loop.actualFps);
    const uptime = Math.round((performance.now() - this.startTime) / 1000);
    
    // Calculate efficiency metrics
    const totalCreated = poolStats.created.normal + poolStats.created.pierce + poolStats.created.explosive;
    const totalReused = poolStats.reused.normal + poolStats.reused.pierce + poolStats.reused.explosive;
    const reuseRate = totalCreated > 0 ? Math.round((totalReused / totalCreated) * 100) : 0;
    
    const text = [
      '⚡ PERFORMANCE MONITOR',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `🎯 FPS: ${currentFps} (avg: ${this.avgFps.toFixed(1)})`,
      `⏱️ Uptime: ${uptime}s`,
      `🧠 Memory: ${this.memoryUsage.used}MB / ${this.memoryUsage.total}MB`,
      '',
      '🚀 PROJECTILE POOL STATS',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `📊 Active: ${activeProjectiles}`,
      `🔄 Reuse Rate: ${reuseRate}%`,
      '',
      '📈 Pool Breakdown:',
      `  Normal: ${poolStats.active.normal}/${poolStats.created.normal} (${poolStats.reused.normal} reused)`,
      `  Pierce: ${poolStats.active.pierce}/${poolStats.created.pierce} (${poolStats.reused.pierce} reused)`,
      `  Explosive: ${poolStats.active.explosive}/${poolStats.created.explosive} (${poolStats.reused.explosive} reused)`,
      '',
      '🎮 CONTROLS',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'F3: Toggle Performance Monitor',
      'F1: Main Debug | F2: Collision Debug',
      '',
      this.getPerformanceIndicator()
    ].join('\n');
    
    this.setText(text);
  }

  /**
   * Get performance indicator based on metrics
   */
  private getPerformanceIndicator(): string {
    const currentFps = Math.round(this.sceneRef.game.loop.actualFps);
    const activeProjectiles = this.weaponSystem.getActiveProjectilesCount();
    
    if (currentFps >= 58 && activeProjectiles < 50) {
      return '🟢 OPTIMAL PERFORMANCE';
    } else if (currentFps >= 45 && activeProjectiles < 80) {
      return '🟡 GOOD PERFORMANCE';
    } else if (currentFps >= 30) {
      return '🟠 MODERATE PERFORMANCE';
    } else {
      return '🔴 POOR PERFORMANCE - CHECK POOLS';
    }
  }

  /**
   * Cleanup event listeners
   */
  override destroy(fromScene?: boolean): void {
    this.sceneRef.events.off('postupdate', this.updateStats, this);
    super.destroy(fromScene);
  }
}