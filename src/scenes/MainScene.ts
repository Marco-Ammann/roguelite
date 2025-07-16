import Phaser from "phaser";
import Player from "../entities/Player";
import Enemy from '../entities/Enemy';
import { createPlayer, createEnemy } from '../factories/EntityFactory';
import { EnemyRank } from '../enums/EnemyRank';
import DebugOverlay from '../ui/DebugOverlay';
import Projectile from '../entities/Projectile';

export default class MainScene extends Phaser.Scene {
    private player!: Player;
    private enemies!: Phaser.Physics.Arcade.Group;
    private projectiles!: Phaser.Physics.Arcade.Group;

    constructor() {
        super("MainScene");
    }

    preload() {
        // No external assets to load; all textures will be generated at runtime
    }

    create() {
        // Projectile group
        this.projectiles = this.physics.add.group({ classType: Projectile });

        // Create player via factory (centred)
        this.player = createPlayer(
          this,
          this.scale.width / 2,
          this.scale.height / 2,
          this.projectiles,
        );

        // Debug overlay (F1 toggle)
        new DebugOverlay(this, this.player, this.enemies, this.projectiles);

        // Create a group of enemies
        this.enemies = this.physics.add.group();

        // Spawn 4 standard and 1 elite enemy for demo
        for (let i = 0; i < 4; i++) {
            this.enemies.add(
                createEnemy(
                    this,
                    Phaser.Math.Between(0, this.scale.width),
                    Phaser.Math.Between(0, this.scale.height),
                    EnemyRank.Standard,
                    40,
                ),
            );
        }
        this.enemies.add(
            createEnemy(
                this,
                Phaser.Math.Between(0, this.scale.width),
                Phaser.Math.Between(0, this.scale.height),
                EnemyRank.Elite,
                50,
            ),
        );
    }

    update(t: number, dt: number) {
        this.player.update(t, dt);

        // Enemies pursue the player each frame
        this.enemies.getChildren().forEach((child) => {
            const enemy = child as Enemy;
            enemy.pursue(this.player.getCenter(new Phaser.Math.Vector2()));
        });
    }
}
