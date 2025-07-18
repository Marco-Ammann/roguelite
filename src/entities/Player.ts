/**
 * src/entities/Player.ts - Fixed TypeScript Issues
 * 
 * FIXES:
 * - Fixed property initialization errors (strict mode)
 * - Fixed Logger.debug calls (changed to Logger.info)
 * - Fixed wasdKeys type annotation
 * - Fixed unused parameter warnings
 * - Proper type annotations throughout
 */

import Phaser from 'phaser';
import { GameConfig, getPlayerSpeed } from '../config/GameConfig';
import { ensurePlayerTexture } from '../gfx/TextureGenerator';
import type { IDamageable } from '../interfaces/IDamageable';
import type { Direction } from '../gfx/TextureGenerator';
import HealthBar from '../ui/HealthBar';
import { WeaponSystem } from '../systems/WeaponSystem';
import Logger from '../utils/Logger';

export default class Player extends Phaser.Physics.Arcade.Sprite implements IDamageable {
    // ========================================
    // Core Player Properties
    // ========================================
    readonly maxHp = GameConfig.PLAYER.MAX_HP;
    hp = this.maxHp;
    
    // ========================================
    // Input Management - Fixed initialization
    // ========================================
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
    private fireKey!: Phaser.Input.Keyboard.Key;
    private weaponSwitchKey!: Phaser.Input.Keyboard.Key;
    
    // ========================================
    // Visual and Audio Systems - Fixed initialization
    // ========================================
    private healthBar!: HealthBar;
    private currentDirection: Direction = 'down';
    
    // ========================================
    // Weapon and Combat Systems - Fixed initialization
    // ========================================
    private weaponSystem!: WeaponSystem;
    private lastShotTime = 0;
    private lastHitTime = 0;
    
    // ========================================
    // Movement System
    // ========================================
    private movementVector = new Phaser.Math.Vector2();
    private isMoving = false;

    /**
     * Creates a new Player instance with pool-integrated weapon system
     * 
     * @param scene - Active Phaser scene
     * @param x - Initial world X coordinate
     * @param y - Initial world Y coordinate
     * @param projectiles - Projectile group for weapon system
     */
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        projectiles: Phaser.Physics.Arcade.Group
    ) {
        // Initialize sprite with default downward-facing texture
        ensurePlayerTexture(scene, 'down');
        super(scene, x, y, 'player-down');
        
        this.initializeInput();
        this.initializeWeaponSystem(projectiles);
        this.initializeUI();
        this.initializePhysics();
        
        Logger.info('✅ Player: Initialized with pool-integrated weapon system');
    }

    // ========================================
    // Initialization Methods
    // ========================================

    /**
     * Initialize input controls for player movement and actions
     */
    private initializeInput(): void {
        // Movement controls
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        this.wasdKeys = this.scene.input.keyboard!.addKeys('W,S,A,D') as Record<string, Phaser.Input.Keyboard.Key>;
        
        // Action controls
        this.fireKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.weaponSwitchKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        
        Logger.info('Player: Input controls initialized');
    }

    /**
     * Initialize weapon system with projectile pool integration
     * 
     * @param projectiles - Projectile group for weapon system
     */
    private initializeWeaponSystem(projectiles: Phaser.Physics.Arcade.Group): void {
        this.weaponSystem = new WeaponSystem(this.scene, projectiles);
        
        // Listen for weapon switch events for audio/visual feedback
        this.scene.events.on('weapon:switched', this.onWeaponSwitched, this);
        
        Logger.info('Player: Weapon system initialized with pool integration');
    }

    /**
     * Initialize UI elements (health bar, etc.)
     */
    private initializeUI(): void {
        this.healthBar = new HealthBar(this.scene, this);
        Logger.info('Player: UI elements initialized');
    }

    /**
     * Initialize physics properties
     */
    private initializePhysics(): void {
        // Set up physics body
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCollideWorldBounds(true);
            body.setMaxVelocity(getPlayerSpeed(), getPlayerSpeed());
            body.setDrag(800, 800); // Smooth stopping
        }
        
        Logger.info('Player: Physics properties initialized');
    }

    // ========================================
    // Main Update Loop
    // ========================================

    /**
     * Main player update method - handles input, movement, and actions
     * 
     * @param time - Current game time
     * @param delta - Time delta since last update
     */
    update(time: number, _delta: number): void {
        this.handleMovementInput();
        this.handleWeaponInput(time);
        this.handleActionInput();
        this.updateVisuals();
    }

    /**
     * Handle movement input and apply physics-based movement
     */
    private handleMovementInput(): void {
        // Calculate movement input vector
        const inputX = this.getHorizontalInput();
        const inputY = this.getVerticalInput();
        
        // Update movement state
        this.isMoving = (inputX !== 0 || inputY !== 0);
        
        if (this.isMoving) {
            // Normalize diagonal movement for consistent speed
            this.movementVector.set(inputX, inputY).normalize();
            
            // Apply movement with configured speed
            const speed = getPlayerSpeed();
            this.setVelocity(
                this.movementVector.x * speed,
                this.movementVector.y * speed
            );
            
            // Update facing direction for sprite texture
            this.updateFacingDirection(inputX, inputY);
        } else {
            // Stop movement when no input
            this.setVelocity(0, 0);
        }
    }

    /**
     * Get horizontal movement input (-1, 0, or 1)
     * 
     * @returns Horizontal input value
     */
    private getHorizontalInput(): number {
        let horizontal = 0;
        
        if (this.cursors.left?.isDown || this.wasdKeys.A?.isDown) {
            horizontal -= 1;
        }
        if (this.cursors.right?.isDown || this.wasdKeys.D?.isDown) {
            horizontal += 1;
        }
        
        return horizontal;
    }

    /**
     * Get vertical movement input (-1, 0, or 1)
     * 
     * @returns Vertical input value
     */
    private getVerticalInput(): number {
        let vertical = 0;
        
        if (this.cursors.up?.isDown || this.wasdKeys.W?.isDown) {
            vertical -= 1;
        }
        if (this.cursors.down?.isDown || this.wasdKeys.S?.isDown) {
            vertical += 1;
        }
        
        return vertical;
    }

    /**
     * Update player facing direction based on movement input
     * 
     * @param inputX - Horizontal input value
     * @param inputY - Vertical input value
     */
    private updateFacingDirection(inputX: number, inputY: number): void {
        // Determine primary direction based on larger input component
        let newDirection: Direction;
        
        if (Math.abs(inputX) > Math.abs(inputY)) {
            // Horizontal movement is dominant
            newDirection = inputX < 0 ? 'left' : 'right';
        } else {
            // Vertical movement is dominant
            newDirection = inputY < 0 ? 'up' : 'down';
        }
        
        // Update sprite texture if direction changed
        if (newDirection !== this.currentDirection) {
            this.updateDirectionTexture(newDirection);
        }
    }

    /**
     * Handle weapon-related input (shooting and switching)
     * 
     * @param time - Current game time
     */
    private handleWeaponInput(time: number): void {
        // Handle weapon switching
        if (Phaser.Input.Keyboard.JustDown(this.weaponSwitchKey)) {
            this.weaponSystem.switchWeapon();
        }
        
        // Handle shooting
        if (this.fireKey.isDown && this.canShoot(time)) {
            this.shoot(time);
        }
    }

    /**
     * Handle other action inputs (future: special abilities, etc.)
     */
    private handleActionInput(): void {
        // Future: Handle special ability inputs, item usage, etc.
        // Example: Dash ability, shield activation, etc.
    }

    /**
     * Update visual effects and animations
     */
    private updateVisuals(): void {
        // Future: Add movement animations, idle animations, etc.
        // Example: Walking animation, weapon glow effects, etc.
    }

    // ========================================
    // Weapon System Integration
    // ========================================

    /**
     * Check if player can shoot based on weapon fire rate
     * 
     * @param currentTime - Current game time
     * @returns true if player can shoot, false otherwise
     */
    private canShoot(currentTime: number): boolean {
        const weaponConfig = this.weaponSystem.getCurrentWeapon();
        return currentTime - this.lastShotTime >= weaponConfig.fireRate;
    }

    /**
     * Fire weapon using pool-integrated projectile system
     * 
     * @param currentTime - Current game time
     */
    private shoot(currentTime: number): void {
        this.lastShotTime = currentTime;
        
        // Create projectile through weapon system (uses pool)
        const projectile = this.weaponSystem.createProjectile(this.x, this.y, this.currentDirection);
        
        // Log shot with weapon info
        const weaponConfig = this.weaponSystem.getCurrentWeapon();
        Logger.info(`🔫 Player: Fired ${weaponConfig.name} projectile ${this.currentDirection}`);
        
        // Add visual/audio feedback
        this.addShootingEffect();
        
        // Emit event for other systems (audio, screen shake, etc.)
        this.scene.events.emit('player:shoot', {
            weapon: weaponConfig,
            direction: this.currentDirection,
            projectile: projectile
        });
    }

    /**
     * Add visual effects when shooting
     */
    private addShootingEffect(): void {
        // Muzzle flash effect
        this.setTint(0xffffff);
        this.scene.time.delayedCall(50, () => {
            if (this.active) {
                this.clearTint();
            }
        });
        
        // Slight recoil effect
        this.setScale(0.95);
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            duration: 100,
            ease: 'Power2'
        });
    }

    /**
     * Handle weapon switch event
     * 
     * @param weaponConfig - New weapon configuration
     */
    private onWeaponSwitched(weaponConfig: any): void {
        Logger.info(`🔄 Player: Weapon switched to ${weaponConfig.name}`);
        
        // Visual feedback for weapon switch
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
        });
        
        // Audio feedback
        this.scene.events.emit('audio:play', 'weapon-switch', { volume: 0.3 });
    }

    // ========================================
    // Visual System
    // ========================================

    /**
     * Update sprite texture based on facing direction
     * 
     * @param newDirection - New facing direction
     */
    private updateDirectionTexture(newDirection: Direction): void {
        // Ensure texture exists for new direction
        ensurePlayerTexture(this.scene, newDirection);
        
        // Update sprite texture
        this.setTexture(`player-${newDirection}`);
        this.currentDirection = newDirection;
        
        Logger.info(`Player: Direction changed to ${newDirection}`);
    }

    // ========================================
    // Damage System (IDamageable Implementation)
    // ========================================

    /**
     * Apply damage to player with invincibility frames
     * 
     * @param amount - Damage amount to apply
     * @param timestamp - Optional timestamp for damage calculation
     */
    takeDamage(amount: number, timestamp?: number): void {
        const currentTime = timestamp ?? this.scene.time.now;
        
        // Check invincibility frames
        if (currentTime - this.lastHitTime < GameConfig.PLAYER.HIT_COOLDOWN) {
            return; // Still invincible
        }
        
        this.lastHitTime = currentTime;
        
        // Don't damage if already dead
        if (this.hp <= 0) return;
        
        // Apply damage
        this.hp = Math.max(0, this.hp - amount);
        
        Logger.info(`💔 Player: Took ${amount} damage - HP: ${this.hp}/${this.maxHp}`);
        
        // Visual feedback for damage
        this.addDamageEffect();
        
        // Audio feedback
        this.scene.events.emit('audio:play', 'player-hit', { volume: 0.4 });
        
        // Check for death
        if (this.hp === 0) {
            this.die();
        }
    }

    /**
     * Add visual effects when taking damage
     */
    private addDamageEffect(): void {
        // Red flash effect
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => {
            if (this.active) {
                this.clearTint();
            }
        });
        
        // Screen shake
        this.scene.cameras.main.shake(300, 0.02);
        
        // Invincibility visual (flickering)
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 3
        });
    }

    /**
     * Check if player is dead
     * 
     * @returns true if player is dead, false otherwise
     */
    isDead(): boolean {
        return this.hp === 0;
    }

    /**
     * Handle player death
     */
    private die(): void {
        // Sofort Movement stoppen
        this.setVelocity(0, 0);
        this.setActive(false);
        
        // Collision deaktivieren
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) body.enable = false;
        
        // UI safe cleanup
        this.scene.events.emit('player:died');
        
        // Kürzere Verzögerung
        this.scene.time.delayedCall(500, () => {
            this.scene.scene.restart();
        });
    }

    // ========================================
    // Public API
    // ========================================

    /**
     * Get current facing direction
     * 
     * @returns Current facing direction
     */
    getCurrentDirection(): Direction {
        return this.currentDirection;
    }

    /**
     * Get health percentage for UI display
     * 
     * @returns Health percentage (0-1)
     */
    getHealthPercentage(): number {
        return this.hp / this.maxHp;
    }

    /**
     * Get current weapon configuration
     * 
     * @returns Current weapon configuration
     */
    getCurrentWeapon(): any {
        return this.weaponSystem.getCurrentWeapon();
    }

    /**
     * Get weapon system statistics for debugging
     * 
     * @returns Weapon system statistics
     */
    getWeaponStats(): any {
        return {
            currentWeapon: this.weaponSystem.getCurrentWeapon(),
            poolStats: this.weaponSystem.getPoolStats(),
            activeProjectiles: this.weaponSystem.getActiveProjectilesCount()
        };
    }

    /**
     * Check if player is currently moving
     * 
     * @returns true if player is moving, false otherwise
     */
    public isPlayerMoving(): boolean {
        return this.isMoving;
    }

    // ========================================
    // Cleanup and Resource Management
    // ========================================

    /**
     * Cleanup player resources when destroyed
     */
    public override destroy(): void {
        // Safe event cleanup - check if scene exists
        if (this.scene && this.scene.events) {
          this.scene.events.off('weapon:switched', this.onWeaponSwitched, this);
        }
        
        // Safe weapon system cleanup
        if (this.weaponSystem) {
          this.weaponSystem.destroy();
        }
        
        // Safe UI cleanup
        if (this.healthBar && this.healthBar.scene) {
          this.healthBar.destroy();
        }
        
        // Kill tweens safely
        if (this.scene && this.scene.tweens) {
          this.scene.tweens.killTweensOf(this);
        }
        
        Logger.info('🧹 Player: Cleanup complete');
        super.destroy();
      }
}