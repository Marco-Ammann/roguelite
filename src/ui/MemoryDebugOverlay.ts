/**
 * src/ui/MemoryDebugOverlay.ts
 * ------------------------------------------------------------
 * F4 overlay: Complete memory monitoring for Phase 1.2
 * Shows JS heap, GraphicsPool stats, TextureCache stats and memory pressure analysis
 * 
 * MONITORING FEATURES:
 * - Real-time JavaScript heap usage tracking
 * - GraphicsPool efficiency and utilization
 * - TextureCache hit rates and memory usage
 * - Memory pressure analysis and warnings
 * - Pool reuse rates and optimization metrics
 */

import Phaser from 'phaser';
import GraphicsPool from '../systems/GraphicsPool';
import TextureCache from '../systems/TextureCache';
import Logger from '../utils/Logger';

export default class MemoryDebugOverlay extends Phaser.GameObjects.Text {
  private readonly sceneRef: Phaser.Scene;
  private readonly toggleKey: Phaser.Input.Keyboard.Key;
  private frameCount = 0;

  // Memory tracking for trends
  private memoryHistory: number[] = [];
  private readonly maxHistoryLength = 60; // 2 seconds at 30fps updates

  constructor(scene: Phaser.Scene) {
    super(scene, 4, 260, '', {
      fontSize: '12px',
      color: '#ffeb3b',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 8, y: 6 },
      fontFamily: 'Courier New',
    });

    this.sceneRef = scene;
    
    scene.add.existing(this).setScrollFactor(0).setDepth(1003);

    this.toggleKey = scene.input.keyboard!.addKey('F4');
    this.setVisible(false); // Start hidden

    scene.events.on('postupdate', this.updateInfo, this);
    Logger.info('MemoryDebugOverlay: Initialized with GraphicsPool + TextureCache monitoring (Press F4)');
  }

  /**
   * Update memory statistics and display
   */
  private updateInfo(): void {
    // Toggle visibility
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.setVisible(!this.visible);
      if (this.visible) {
        Logger.info('MemoryDebugOverlay: Memory monitoring enabled');
      }
    }

    if (!this.visible) return;

    // Update every 30 frames for readability
    this.frameCount++;
    if (this.frameCount % 30 !== 0) return;

    this.updateMemoryTracking();
    this.displayMemoryStats();
  }

  /**
   * Track memory usage trends
   */
  private updateMemoryTracking(): void {
    if ((performance as any).memory) {
      const currentMemory = (performance as any).memory.usedJSHeapSize;
      this.memoryHistory.push(currentMemory);
      
      // Keep only recent history
      if (this.memoryHistory.length > this.maxHistoryLength) {
        this.memoryHistory.shift();
      }
    }
  }

  /**
   * Display comprehensive memory statistics
   */
  private displayMemoryStats(): void {
    const jsHeapStats = this.getJSHeapStats();
    const graphicsPoolStats = GraphicsPool.getStats(this.sceneRef);
    const textureCacheStats = TextureCache.getStats(this.sceneRef);
    const memoryAnalysis = this.analyzeMemoryPressure();

    const text = [
      '🧠 MEMORY MONITOR (Phase 1.2)',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      
      // JavaScript Heap Section
      '📊 JAVASCRIPT HEAP',
      '───────────────────',
      `Used: ${jsHeapStats.usedMB} MB`,
      `Limit: ${jsHeapStats.limitMB} MB`,
      `Trend: ${jsHeapStats.trend}`,
      '',
      
      // Graphics Pool Section
      '🎨 GRAPHICS POOL',
      '───────────────────',
      `In Use: ${graphicsPoolStats.inUse}`,
      `Available: ${graphicsPoolStats.inPool}`,
      `Total Created: ${graphicsPoolStats.created}`,
      `Reuse Rate: ${this.calculateReuseRate(graphicsPoolStats)}%`,
      `Max Concurrent: ${graphicsPoolStats.maxConcurrent}`,
      '',
      
      // Texture Cache Section
      '🖼️ TEXTURE CACHE',
      '───────────────────',
      `Cached Textures: ${textureCacheStats.totalTextures}`,
      `Memory Usage: ${(textureCacheStats.memoryUsage / (1024 * 1024)).toFixed(1)} MB`,
      `Hit Rate: ${textureCacheStats.hitRate.toFixed(1)}%`,
      `Miss Rate: ${textureCacheStats.missRate.toFixed(1)}%`,
      `Total Requests: ${textureCacheStats.totalRequests}`,
      `Evictions: ${textureCacheStats.evictions}`,
      '',
      
      // Memory Analysis
      '⚠️ MEMORY ANALYSIS',
      '───────────────────',
      memoryAnalysis.status,
      memoryAnalysis.recommendation,
      '',
      
      // Controls
      '🎮 CONTROLS',
      '───────────────────',
      'F4: Toggle Memory Monitor',
      'F1: Main | F2: Collision | F3: Performance'
    ].join('\n');

    this.setText(text);
    this.setColor(this.getStatusColor(memoryAnalysis.level));
  }

  /**
   * Get JavaScript heap statistics
   */
  private getJSHeapStats(): {
    usedMB: string;
    limitMB: string;
    trend: string;
  } {
    if (!(performance as any).memory) {
      return {
        usedMB: 'N/A',
        limitMB: 'N/A',
        trend: 'N/A (Chrome only)'
      };
    }

    const memory = (performance as any).memory;
    const usedMB = (memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
    const limitMB = (memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1);
    
    // Calculate trend
    let trend = 'Stable';
    if (this.memoryHistory.length >= 2) {
      const recent = this.memoryHistory.slice(-10);
      const older = this.memoryHistory.slice(-20, -10);
      
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (change > 5) trend = 'Rising ↗️';
        else if (change < -5) trend = 'Falling ↘️';
        else trend = 'Stable ➡️';
      }
    }

    return { usedMB, limitMB, trend };
  }

  /**
   * Calculate pool reuse rate
   */
  private calculateReuseRate(stats: typeof GraphicsPool.getStats): number {
    if (stats.created === 0) return 0;
    return Math.round((stats.reused / (stats.created + stats.reused)) * 100);
  }

  /**
   * Analyze memory pressure and provide recommendations
   */
  private analyzeMemoryPressure(): {
    level: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    recommendation: string;
  } {
    const graphicsStats = GraphicsPool.getStats(this.sceneRef);
    const cacheStats = TextureCache.getStats(this.sceneRef);
    
    // Check Graphics Pool pressure
    const poolUtilization = graphicsStats.total > 0 ? (graphicsStats.inUse / (graphicsStats.inUse + graphicsStats.inPool)) : 0;
    const reuseRate = this.calculateReuseRate(graphicsStats);
    
    // Check Texture Cache pressure
    const cacheMemoryMB = cacheStats.memoryUsage / (1024 * 1024);
    const hitRate = cacheStats.hitRate;
    
    // Determine overall memory pressure
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let status = '🟢 OPTIMAL - All systems efficient';
    let recommendation = 'Memory usage is optimal. Pools are working correctly.';
    
    if (poolUtilization > 0.8 || reuseRate < 70 || cacheMemoryMB > 40 || hitRate < 60) {
      level = 'medium';
      status = '🟡 MODERATE - Some inefficiency detected';
      recommendation = 'Consider monitoring pool usage. Reuse rates could be improved.';
    }
    
    if (poolUtilization > 0.9 || reuseRate < 50 || cacheMemoryMB > 60 || hitRate < 40) {
      level = 'high';
      status = '🟠 HIGH - Memory pressure detected';
      recommendation = 'Pool exhaustion likely. Consider increasing pool sizes or optimizing usage.';
    }
    
    if (poolUtilization >= 1.0 || reuseRate < 30 || cacheMemoryMB > 80 || hitRate < 20) {
      level = 'critical';
      status = '🔴 CRITICAL - Memory system stressed';
      recommendation = 'URGENT: Pool exhaustion! Check for memory leaks or increase limits.';
    }
    
    return { level, status, recommendation };
  }

  /**
   * Get color based on memory pressure level
   */
  private getStatusColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (level) {
      case 'low': return '#00ff00';      // Green
      case 'medium': return '#ffff00';   // Yellow  
      case 'high': return '#ff9900';     // Orange
      case 'critical': return '#ff0000'; // Red
    }
  }

  /**
   * Cleanup event listeners
   */
  override destroy(fromScene?: boolean): void {
    this.sceneRef.events.off('postupdate', this.updateInfo, this);
    super.destroy(fromScene);
  }
}