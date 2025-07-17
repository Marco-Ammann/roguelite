/**
 * src/ui/WeaponDisplay.ts
 * Shows current weapon type and switching instructions
 */

import Phaser from 'phaser';
import type { WeaponConfig } from '../systems/WeaponSystem';

export default class WeaponDisplay extends Phaser.GameObjects.Text {
  private currentWeapon: WeaponConfig | null = null;

constructor(scene: Phaser.Scene) {
  super(scene, scene.scale.width - 200, 10, '', {
    fontSize: '16px',
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: { x: 10, y: 5 }
  });

  scene.add.existing(this).setScrollFactor(0).setDepth(1000);
  
  // Set initial text immediately
  this.setText('Weapon: Standard\nType: Normal\nRate: 250ms\nQ: Switch');
  
  // Then listen for changes
  scene.events.on('weapon:switched', this.onWeaponSwitched, this);
}

  private onWeaponSwitched(weaponConfig: WeaponConfig): void {
    this.currentWeapon = weaponConfig;
    this.updateDisplay();
    
    // Flash effect when switching
    this.setColor('#ffff00');
    this.scene.time.delayedCall(200, () => this.setColor('#ffffff'));
  }

  private updateDisplay(): void {
    if (!this.currentWeapon) {
      this.setText('Weapon: Standard\nQ: Switch');
      return;
    }

    const weaponText = [
      `Weapon: ${this.currentWeapon.name}`,
      `Type: ${this.currentWeapon.damageType}`,
      `Rate: ${this.currentWeapon.fireRate}ms`,
      'Q: Switch'
    ].join('\n');

    this.setText(weaponText);
    this.setColor(this.getWeaponColor());
  }

  private getWeaponColor(): string {
    if (!this.currentWeapon) return '#ffffff';
    
    switch (this.currentWeapon.type) {
      case 'pierce': return '#ffff00';
      case 'explosive': return '#ff6600';
      default: return '#ffffff';
    }
  }

  override destroy(fromScene?: boolean): void {
    this.scene.events.off('weapon:switched', this.onWeaponSwitched, this);
    super.destroy(fromScene);
  }
}